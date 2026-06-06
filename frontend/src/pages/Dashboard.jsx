import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LeafletMap from '../components/LeafletMap';
import { 
  Bus, 
  Flame, 
  Users, 
  RefreshCw, 
  MapPin, 
  Navigation,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

export default function Dashboard() {
  const { authFetch } = useAuth();
  const { socket, joinAdminTracker, leaveAdminTracker } = useSocket();
  const [metrics, setMetrics] = useState({
    activeBuses: 0,
    totalBuses: 0,
    totalStudents: 0,
    presentStudents: 0,
    absentStudents: 0,
    attendanceRate: 100,
    fuelSavings: { todayGallons: 0, monthGallons: 0 }
  });
  
  const [routes, setRoutes] = useState([]);
  const [activeBuses, setActiveBuses] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [polylinePoints, setPolylinePoints] = useState([]);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [etaAnalytics, setEtaAnalytics] = useState(null);

  // Emergency & Delay States
  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [emergencyAnalytics, setEmergencyAnalytics] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [resolveDesc, setResolveDesc] = useState('');

  const fetchActiveEmergenciesOnly = async () => {
    try {
      const activeEmergenciesRes = await authFetch('/api/admin/emergencies/active');
      if (activeEmergenciesRes.ok) {
        const activeEmergenciesData = await activeEmergenciesRes.json();
        setActiveEmergencies(activeEmergenciesData);
      }
      const emergencyAnalyticsRes = await authFetch('/api/admin/analytics/emergencies');
      if (emergencyAnalyticsRes.ok) {
        const emergencyAnalyticsData = await emergencyAnalyticsRes.json();
        setEmergencyAnalytics(emergencyAnalyticsData);
      }
    } catch (err) {
      console.error('Error fetching active emergencies:', err);
    }
  };

  const handleResolveEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmergency) return;

    try {
      const res = await authFetch(`/api/admin/emergencies/${selectedEmergency.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ description: resolveDesc })
      });

      if (res.ok) {
        alert('Emergency resolved successfully.');
        setShowResolveModal(false);
        setResolveDesc('');
        setSelectedEmergency(null);
        fetchDashboardData();
      } else {
        alert('Failed to resolve emergency');
      }
    } catch (err) {
      console.error('Resolve emergency error:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch metrics
      const metricsRes = await authFetch('/api/admin/analytics');
      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.metrics);
      }

      // Fetch routes
      const routesRes = await authFetch('/api/admin/routes');
      if (routesRes.ok) {
        const routesData = await routesRes.json();
        setRoutes(routesData);
        if (routesData.length > 0 && !selectedRoute) {
          handleSelectRoute(routesData[0]);
        } else if (selectedRoute) {
          const updatedRoute = routesData.find(r => r.id === selectedRoute.id);
          if (updatedRoute) handleSelectRoute(updatedRoute);
        }
      }

      // Fetch active buses locations cache
      const busesRes = await authFetch('/api/admin/buses');
      if (busesRes.ok) {
        const busesData = await busesRes.json();
        setActiveBuses(busesData.filter(b => b.status === 'EN_ROUTE' || b.lastLat !== null));
      }

      // Fetch ETA history analytics
      const etaRes = await authFetch('/api/admin/analytics/eta');
      if (etaRes.ok) {
        const etaData = await etaRes.json();
        setEtaAnalytics(etaData);
      }

      // Fetch active emergencies and safety analytics
      await fetchActiveEmergenciesOnly();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Listen to multi-bus updates globally
  useEffect(() => {
    if (!socket) return;

    joinAdminTracker();

    socket.on('bus-location-changed', (data) => {
      console.log('Global admin track updated:', data);
      setActiveBuses(prev => {
        const exists = prev.some(b => b.id === data.busId);
        if (exists) {
          return prev.map(b => b.id === data.busId ? {
            ...b,
            lastLat: data.lat,
            lastLng: data.lng,
            lastSpeed: data.speed,
            lastHeading: data.bearing,
            lastUpdated: new Date()
          } : b);
        } else {
          return [...prev, {
            id: data.busId,
            busNumber: data.busNumber,
            licensePlate: data.licensePlate,
            lastLat: data.lat,
            lastLng: data.lng,
            lastSpeed: data.speed,
            lastHeading: data.bearing,
            lastUpdated: new Date()
          }];
        }
      });
    });

    socket.on('bus-emergency-reported', () => {
      console.log('Emergency reported via WebSocket.');
      fetchActiveEmergenciesOnly();
    });

    socket.on('bus-emergency-resolved', () => {
      console.log('Emergency resolved via WebSocket.');
      fetchActiveEmergenciesOnly();
    });

    return () => {
      leaveAdminTracker();
      socket.off('bus-location-changed');
      socket.off('bus-emergency-reported');
      socket.off('bus-emergency-resolved');
    };
  }, [socket]);

  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    
    // Parse stops
    if (route.students) {
      setStops(route.students.map(s => ({
        id: s.id,
        pickupLat: s.pickupLat,
        pickupLng: s.pickupLng,
        sequenceOrder: s.sequenceOrder,
        address: s.pickupAddress,
        name: `${s.user?.firstName} ${s.user?.lastName}`,
      })).sort((a, b) => a.sequenceOrder - b.sequenceOrder));
    }

    // Parse polyline
    if (route.polyline) {
      try {
        const points = JSON.parse(route.polyline);
        setPolylinePoints(points);
      } catch (err) {
        console.error('Error parsing polyline:', err);
        setPolylinePoints([]);
      }
    } else {
      setPolylinePoints([]);
    }
  };

  const handleOptimize = async () => {
    if (!selectedRoute) return;
    try {
      setOptimizing(true);
      const res = await authFetch(`/api/admin/routes/${selectedRoute.id}/optimize`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (res.ok) {
        // Refresh routes and analytics
        await fetchDashboardData();
        alert(data.message || 'Route optimized successfully');
      } else {
        alert(data.error || 'Failed to optimize route');
      }
    } catch (err) {
      console.error('Optimization error:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const [generatingSchedules, setGeneratingSchedules] = useState(false);

  const handleGenerateSchedules = async () => {
    try {
      setGeneratingSchedules(true);
      const res = await authFetch('/api/admin/schedules/generate', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Schedules generated successfully');
        await fetchDashboardData();
      } else {
        alert(data.error || 'Failed to generate daily schedules');
      }
    } catch (err) {
      console.error('Schedule generation error:', err);
    } finally {
      setGeneratingSchedules(false);
    }
  };

  if (loading && routes.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-cyan-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading Transport Analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Active Incident Warning logs banner */}
      {activeEmergencies.length > 0 && (
        <div className="glass-panel border-red-500 bg-red-950/20 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-red-950 pb-2">
            <h3 className="font-extrabold uppercase text-xs tracking-wider text-red-400 flex items-center gap-2 animate-pulse">
              🚨 ACTIVE EMERGENCY WARNINGS ({activeEmergencies.length})
            </h3>
            <span className="text-[10px] text-red-300 font-extrabold tracking-wider">ADMIN ACTION REQUIRED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEmergencies.map((e) => (
              <div key={e.id} className="bg-slate-950/40 border border-red-500/20 p-4 rounded-xl flex justify-between items-center gap-4 animate-pulse">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-950/50 text-red-400 font-extrabold border border-red-500/30 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider">
                      {e.type}
                    </span>
                    <span className="text-slate-200 text-xs font-bold">Bus #{e.bus.busNumber}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Driver: {e.driver.firstName} {e.driver.lastName} ({e.driver.phone || 'No phone'})</p>
                  <p className="text-[10px] text-slate-300 font-bold pt-1">Location GPS: {e.lat.toFixed(5)}, {e.lng.toFixed(5)}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEmergency(e);
                    setShowResolveModal(true);
                  }}
                  className="py-2 px-4 bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-red-500/10 cursor-pointer transition-all active:scale-95 shrink-0 select-none"
                >
                  RESOLVE STATUS
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Active Buses Card */}
        <div className="glass-panel rounded-2xl p-6 neon-border-cyan flex items-center justify-between relative overflow-hidden">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Buses</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{metrics.activeBuses}</span>
              <span className="text-xs text-slate-500 font-semibold">/ {metrics.totalBuses} Total</span>
            </div>
            <div className="flex gap-4 text-[11px] text-slate-400 font-medium pt-2">
              <span>On Route: <strong className="text-cyan-400">{metrics.activeBuses}</strong></span>
              <span>Delay: <strong className="text-rose-400">0</strong></span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/5">
            <Bus className="w-6 h-6" />
          </div>
        </div>

        {/* Daily Attendance Card */}
        <div className="glass-panel rounded-2xl p-6 neon-border-purple flex items-center justify-between relative overflow-hidden">
          <div className="space-y-2 flex-1 mr-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daily Attendance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{metrics.attendanceRate}%</span>
              <span className="text-xs text-slate-500 font-semibold">{metrics.presentStudents} Present</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-950/40 h-2 rounded-full overflow-hidden mt-2 border border-slate-800/40">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full" 
                style={{ width: `${metrics.attendanceRate}%` }}
              ></div>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-md shadow-purple-500/5">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Fuel Saved Card */}
        <div className="glass-panel rounded-2xl p-6 neon-border-green flex items-center justify-between relative overflow-hidden">
          <div className="space-y-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estimated Fuel Saved</p>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{metrics.fuelSavings.todayGallons} Gal</span>
              <span className="text-[11px] text-emerald-400 font-bold bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/10">Active</span>
            </div>
            <div className="flex gap-4 text-[11px] text-slate-400 font-medium pt-2">
              <span>Today: <strong className="text-emerald-400">{metrics.fuelSavings.todayGallons} Gal</strong></span>
              <span>This Month: <strong className="text-emerald-400">{metrics.fuelSavings.monthGallons} Gal</strong></span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/5">
            <Flame className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Route list & details */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800/40 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Routes Directory</h3>
              <button 
                onClick={fetchDashboardData}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleGenerateSchedules}
              disabled={generatingSchedules}
              className="mb-4 w-full py-2.5 rounded-xl border border-dashed border-cyan-500/40 bg-cyan-950/5 text-cyan-400 text-xs font-bold hover:bg-cyan-950/15 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generatingSchedules ? 'animate-spin' : ''}`} />
              {generatingSchedules ? 'GENERATING...' : 'GENERATE DAILY SCHEDULES'}
            </button>

            <div className="space-y-3">
              {routes.map((route) => {
                const isSelected = selectedRoute?.id === route.id;
                return (
                  <button
                    key={route.id}
                    onClick={() => handleSelectRoute(route)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-cyan-500/30 bg-cyan-950/10 shadow-md'
                        : 'border-slate-800 bg-slate-900/10 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-semibold text-sm ${isSelected ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {route.name}
                      </span>
                      <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded-md text-slate-400 font-bold border border-slate-800">
                        {route.students?.length || 0} stops
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="truncate">{route.polyline ? 'Optimized' : 'Draft'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Optimization Panel */}
          {selectedRoute && (
            <div className="mt-8 pt-6 border-t border-slate-800/40 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-slate-200">{selectedRoute.name}</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Re-runs traveler calculations dynamically, excluding any student reported absent for the day.
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-yellow-500/20 bg-yellow-950/10 text-[11px] text-yellow-400 font-medium flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  Today: <strong>{selectedRoute.students?.filter(s => s.attendance[0]?.requiresRide !== false).length || 0} present students</strong> out of {selectedRoute.students?.length} assigned will be routed.
                </div>
              </div>

              <button
                onClick={handleOptimize}
                disabled={optimizing}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-xs tracking-wider cursor-pointer shadow-lg shadow-cyan-500/15 active:scale-95 transition-all select-none disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {optimizing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    RUNNING OPTIMIZER...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    RUN SMART OPTIMIZATION
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Interactive Leaflet Map */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-800/40 min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center mb-4 px-2">
            <div>
              <h3 className="font-semibold text-slate-200">
                {selectedRoute ? `${selectedRoute.name} - Path View` : 'Live Tracker Map'}
              </h3>
              <p className="text-xs text-slate-400">
                {selectedRoute?.polyline ? 'Cyan dashed path shows optimized traveling sequence.' : 'Select a route to view stop locations.'}
              </p>
            </div>
            <div className="flex gap-2">
              <span className="w-3.5 h-3.5 rounded bg-cyan-400 inline-block"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">Optimal Route</span>
            </div>
          </div>
          <div className="flex-1 min-h-[420px]">
            <LeafletMap 
              stops={stops} 
              polylinePoints={polylinePoints} 
              activeBuses={activeBuses}
              zoom={13} 
            />
          </div>
        </div>
      </div>

      {/* Historical Delay Analytics Section */}
      {etaAnalytics && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800/40 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-850 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 uppercase tracking-wider">
                <TrendingUp className="w-5 h-5 text-cyan-400" />
                Intelligent ETA & Delay Analytics
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                On-time performance logs, average speeds, and late arrival statistics.
              </p>
            </div>
            <span className="text-[10px] bg-cyan-950/40 text-cyan-400 font-extrabold px-3 py-1 rounded-full border border-cyan-500/20">
              {etaAnalytics.totalTrips} Completed Trips Analyzed
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Route Duration</p>
              <p className="text-2xl font-black text-white mt-1">{etaAnalytics.averageRouteDuration} mins</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Across all historical runs</p>
            </div>
            
            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Delay Frequency</p>
              <p className={`text-2xl font-black mt-1 ${etaAnalytics.delayFrequency > 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {etaAnalytics.delayFrequency}%
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Percentage of delayed trips</p>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">On-Time Performance</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">
                {etaAnalytics.onTimeTrips} / {etaAnalytics.totalTrips}
              </p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Trips completed within threshold</p>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Fleet Avg Speed</p>
              <p className="text-2xl font-black text-purple-400 mt-1">{etaAnalytics.averageSpeed} km/h</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold font-mono">Real-time GPS derived speed</p>
            </div>
          </div>

          {/* Route breakdown and Logs grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Route Stats Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Route Performance Breakdown</h4>
              <div className="border border-slate-800/40 rounded-xl overflow-hidden bg-slate-900/10">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-850 bg-slate-950/50 text-slate-400 font-bold">
                      <th className="p-3">Route Name</th>
                      <th className="p-3 text-center">Trips</th>
                      <th className="p-3 text-center">Avg Time</th>
                      <th className="p-3 text-center">Avg Speed</th>
                      <th className="p-3 text-right">Delay Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300 font-medium">
                    {etaAnalytics.routeStats.map((stat) => (
                      <tr key={stat.routeId} className="hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-200">{stat.routeName}</td>
                        <td className="p-3 text-center">{stat.tripCount}</td>
                        <td className="p-3 text-center">{stat.averageDuration}m</td>
                        <td className="p-3 text-center">{stat.averageSpeed} km/h</td>
                        <td className={`p-3 text-right font-bold ${stat.delayRate > 25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {stat.delayRate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Delay Log Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Executions Log</h4>
              <div className="border border-slate-800/40 rounded-xl bg-slate-900/10 max-h-[190px] overflow-y-auto custom-scrollbar">
                <div className="divide-y divide-slate-850 text-xs">
                  {etaAnalytics.historyLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-3 flex justify-between items-center hover:bg-slate-900/20 transition-colors">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200">Execution Date: {log.date}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">Avg Speed: {log.averageSpeed} km/h</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-slate-300">{log.totalDuration} mins</p>
                        <span className={`inline-block text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                          log.onTimeStatus === 'DELAYED' 
                            ? 'bg-rose-950/20 text-rose-400 border border-rose-500/15' 
                            : 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/15'
                        }`}>
                          {log.onTimeStatus === 'DELAYED' ? 'DELAYED' : 'ON TIME'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Incident History & Delay Summary */}
      {emergencyAnalytics && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800/40 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-850 pb-4">
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2 uppercase tracking-wider">
                🛡️ Incident Analytics & Safety Tracking
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Vehicle breakdowns, medical alerts, delay reason distributions, and average emergency response/resolution metrics.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Emergency Events</p>
              <p className="text-2xl font-black text-white mt-1">{emergencyAnalytics.counts.total}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">All-time reported alerts</p>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Resolution Time</p>
              <p className="text-2xl font-black text-cyan-400 mt-1">{emergencyAnalytics.avgResolutionMins} mins</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Report to resolved duration</p>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Delays Reported</p>
              <p className="text-2xl font-black text-purple-400 mt-1">{emergencyAnalytics.delayMetrics.totalDelayReports}</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Route delay alerts filed</p>
            </div>

            <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-4">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Avg Delay Duration</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{emergencyAnalytics.delayMetrics.averageDelayMins} mins</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Estimated delay shifts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Emergency Types Breakdown</h4>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 space-y-3 text-xs font-semibold">
                <div className="flex justify-between items-center text-slate-300">
                  <span>🚨 SOS Emergency Alerts</span>
                  <span className="text-red-400 font-bold">{emergencyAnalytics.counts.SOS}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>🔧 Mechanical Vehicle Breakdowns</span>
                  <span className="text-orange-400 font-bold">{emergencyAnalytics.counts.BREAKDOWN}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>🚑 Medical Emergency Alerts</span>
                  <span className="text-purple-400 font-bold">{emergencyAnalytics.counts.MEDICAL}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>🚧 Road Obstructions / Construction</span>
                  <span className="text-yellow-500 font-bold">{emergencyAnalytics.counts.OBSTRUCTION}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>🚗 Severe Traffic Delays</span>
                  <span className="text-amber-500 font-bold">{emergencyAnalytics.counts.TRAFFIC}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Delay Reason Distributions</h4>
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/30 space-y-3 text-xs font-semibold">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Traffic Delay</span>
                  <span className="text-amber-400 font-bold">{emergencyAnalytics.delayMetrics.reasons.TRAFFIC}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Road Obstruction</span>
                  <span className="text-yellow-500 font-bold">{emergencyAnalytics.delayMetrics.reasons.OBSTRUCTION}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Mechanical Issue</span>
                  <span className="text-orange-400 font-bold">{emergencyAnalytics.delayMetrics.reasons.BREAKDOWN}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Medical Issue</span>
                  <span className="text-purple-400 font-bold">{emergencyAnalytics.delayMetrics.reasons.MEDICAL}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Other Reasons</span>
                  <span className="text-slate-400 font-bold">{emergencyAnalytics.delayMetrics.reasons.OTHER}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Resolution Modal overlay */}
      {showResolveModal && selectedEmergency && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleResolveEmergencySubmit} className="glass-panel-heavy max-w-sm w-full rounded-3xl p-6 border border-red-500/20 shadow-xl shadow-red-500/5 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🚨 Resolve Emergency Event
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Enter details of the resolution. Parents and drivers will be notified.
              </p>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">Emergency Type</label>
                <div className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-red-400 font-bold uppercase tracking-wider">
                  {selectedEmergency.type} - Bus #{selectedEmergency.bus.busNumber}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Resolution Description / Notes</label>
                <textarea
                  required
                  value={resolveDesc}
                  onChange={(e) => setResolveDesc(e.target.value)}
                  placeholder="e.g. Mechanical backup bus dispatched, students boarded, route completed."
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500/50 h-28 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowResolveModal(false);
                  setResolveDesc('');
                  setSelectedEmergency(null);
                }}
                className="py-3 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs tracking-wider cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="py-3 rounded-xl bg-red-500 hover:bg-red-400 text-slate-950 font-bold text-xs tracking-wider cursor-pointer shadow-lg shadow-red-500/10 active:scale-98 transition-all"
              >
                MARK RESOLVED
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
