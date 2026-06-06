import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LeafletMap from '../components/LeafletMap';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Bus, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  RotateCw,
  XCircle,
  HelpCircle,
  QrCode,
  Clock
} from 'lucide-react';

export default function DriverPortal() {
  const { authFetch } = useAuth();
  const { socket, joinTrip, leaveTrip, emitGpsUpdate } = useSocket();

  const [assignment, setAssignment] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [stopsList, setStopsList] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Real GPS Geolocation states
  const [gpsError, setGpsError] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const lastEmitTimeRef = useRef(0);

  // QR Code Scanner states
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const scannerRef = useRef(null);

  // Delay & Emergency States
  const [showDelayModal, setShowDelayModal] = useState(false);
  const [delayMins, setDelayMins] = useState(10);
  const [delayReason, setDelayReason] = useState('TRAFFIC');
  const [delayDesc, setDelayDesc] = useState('');

  const handleReportEmergency = async (type) => {
    if (!activeTrip) return;
    const confirmReport = window.confirm(`Are you sure you want to report a ${type} emergency? Admins and parents will be notified immediately.`);
    if (!confirmReport) return;

    const lat = currentLocation ? currentLocation.lat : 40.730610;
    const lng = currentLocation ? currentLocation.lng : -73.935242;

    try {
      const res = await authFetch('/api/driver/emergency', {
        method: 'POST',
        body: JSON.stringify({
          type,
          lat,
          lng,
          description: `Driver triggered emergency status: ${type}`
        })
      });

      if (res.ok) {
        alert(`${type} Emergency reported successfully.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to report emergency');
      }
    } catch (err) {
      console.error(err);
      alert('Network error reporting emergency');
    }
  };

  const handleSubmitDelay = async (e) => {
    e.preventDefault();
    if (!activeTrip) return;

    try {
      const res = await authFetch('/api/driver/delay', {
        method: 'POST',
        body: JSON.stringify({
          estimatedDelayMins: delayMins,
          reason: delayReason,
          description: delayDesc
        })
      });

      if (res.ok) {
        alert(`Successfully reported delay of ${delayMins} minutes.`);
        setShowDelayModal(false);
        setDelayDesc('');
        fetchDriverAssignment();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to report delay');
      }
    } catch (err) {
      console.error(err);
      alert('Network error reporting delay');
    }
  };

  const fetchDriverAssignment = async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/driver/assigned-schedule');
      if (res.ok) {
        const data = await res.json();
        setAssignment(data);

        // If it is a RouteSchedule
        if (data.stops) {
          setStopsList(data.stops);
          const runningTrip = data.trips?.find(t => t.status === 'RUNNING') || null;
          setActiveTrip(runningTrip);
          if (runningTrip) {
            joinTrip(runningTrip.id);
            startGpsTracking(runningTrip.id);
          }
        } else {
          // Backward compatibility fallback to base assignment
          setStopsList(data.students.map(s => ({
            id: s.id,
            studentId: s.id,
            student: s,
            sequenceOrder: s.sequenceOrder,
            status: s.pickupStatus || 'PENDING',
            lat: s.pickupLat,
            lng: s.pickupLng,
            address: s.pickupAddress,
          })));
        }
      } else {
        setAssignment(null);
      }
    } catch (err) {
      console.error('Error fetching driver assignment:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverAssignment();
    return () => {
      stopGpsTracking();
      stopScanner();
    };
  }, []);

  useEffect(() => {
    if (socket && activeTrip) {
      const handleEtaUpdates = (etaResults) => {
        console.log("Received ETA Updates from socket:", etaResults);
        // Map the etaResults onto the stopsList
        setStopsList(prevStops => prevStops.map(stop => {
          const match = etaResults.find(r => r.routeStopId === stop.id);
          if (match) {
            return {
              ...stop,
              predictedArrival: match.predictedArrival,
              distanceKm: match.distanceKm,
              etaMinutes: match.etaMinutes
            };
          }
          return stop;
        }));

        // Update next stop metrics
        const nextPending = etaResults[0]; // first unvisited/pending stop
        if (nextPending) {
          setAssignment(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              nextStopMetrics: {
                name: nextPending.studentName || 'Next Stop',
                address: prev.stops?.find(s => s.id === nextPending.routeStopId)?.address || 'Pickup Spot',
                distanceKm: nextPending.distanceKm,
                etaMinutes: nextPending.etaMinutes,
                predictedArrival: nextPending.predictedArrival
              }
            };
          });
        } else {
          setAssignment(prev => {
            if (!prev) return prev;
            return { ...prev, nextStopMetrics: null };
          });
        }
      };

      socket.on('eta-updates', handleEtaUpdates);
      return () => {
        socket.off('eta-updates', handleEtaUpdates);
      };
    }
  }, [socket, activeTrip]);

  // WebSockets coordinates transmitter
  const startGpsTracking = (tripId) => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser/device.');
      return;
    }

    setGpsError(null);
    lastEmitTimeRef.current = 0;

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        const now = Date.now();

        setCurrentLocation({ lat: latitude, lng: longitude, speed, bearing: heading });

        // Throttle: Send coordinates every 5 seconds
        if (now - lastEmitTimeRef.current >= 5000) {
          console.log(`Real GPS Frame sent: Lat ${latitude}, Lng ${longitude}`);
          emitGpsUpdate({
            tripId,
            lat: latitude,
            lng: longitude,
            speed: speed || 0,
            bearing: heading || 0,
          });
          lastEmitTimeRef.current = now;
        }
      },
      (error) => {
        console.error('GPS Watch Error:', error);
        let errorMsg = 'Failed to acquire location updates.';
        if (error.code === 1) {
          errorMsg = 'GPS Permission Denied. Please enable location settings in your browser.';
        } else if (error.code === 2) {
          errorMsg = 'GPS Signal Lost or position unavailable.';
        } else if (error.code === 3) {
          errorMsg = 'GPS acquisition timed out.';
        }
        setGpsError(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    setWatchId(id);
  };

  const stopGpsTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setCurrentLocation(null);
    setGpsError(null);
  };

  const handleStartTrip = async () => {
    if (!assignment) return;

    try {
      let res;
      let tripData;

      if (assignment.stops) {
        // Start RouteSchedule Trip
        res = await authFetch('/api/driver/trips/start-schedule', {
          method: 'POST',
          body: JSON.stringify({ scheduleId: assignment.id }),
        });
        const data = await res.json();
        res.ok ? tripData = data.trip : alert(data.error || 'Failed to start scheduled trip');
      } else {
        // Start Base Route Trip fallback
        res = await authFetch('/api/driver/trips/start', {
          method: 'POST',
          body: JSON.stringify({
            busId: assignment.bus.id,
            routeId: assignment.route.id,
          }),
        });
        const data = await res.json();
        res.ok ? tripData = data.trip : alert(data.error || 'Failed to start trip');
      }

      if (res.ok && tripData) {
        setActiveTrip(tripData);
        joinTrip(tripData.id);
        
        // Launch Watcher
        startGpsTracking(tripData.id);
        alert('Trip started. Real GPS Tracking is now active!');
      }
    } catch (err) {
      console.error('Error starting trip:', err);
    }
  };

  const handleStopTrip = async () => {
    if (!activeTrip) return;

    try {
      const res = await authFetch(`/api/driver/trips/${activeTrip.id}/stop`, {
        method: 'POST',
      });

      if (res.ok) {
        stopGpsTracking();
        stopScanner();
        leaveTrip(activeTrip.id);
        setActiveTrip(null);
        fetchDriverAssignment();
        alert('Trip completed successfully.');
      } else {
        alert('Failed to stop trip');
      }
    } catch (err) {
      console.error('Error stopping trip:', err);
    }
  };

  // Cycle stop status (Manual fallback)
  const handleCycleStopStatus = async (stopId, currentStatus) => {
    if (!activeTrip) return;

    let nextStatus = 'BOARDED';
    if (currentStatus === 'BOARDED') nextStatus = 'DEBOARDED';
    else if (currentStatus === 'DEBOARDED') nextStatus = 'MISSED';
    else if (currentStatus === 'MISSED') nextStatus = 'PENDING';

    try {
      let res;
      if (assignment.stops) {
        res = await authFetch(`/api/driver/stops/${stopId}/status`, {
          method: 'POST',
          body: JSON.stringify({ status: nextStatus }),
        });
      } else {
        res = await authFetch('/api/driver/trips/student-pickup', {
          method: 'POST',
          body: JSON.stringify({ studentId: stopId, status: nextStatus }),
        });
      }

      if (res.ok) {
        setStopsList(prev => prev.map(s => s.id === stopId ? { ...s, status: nextStatus } : s));
      } else {
        alert('Failed to update stop status');
      }
    } catch (err) {
      console.error('Error updating stop status:', err);
    }
  };

  // Camera QR Scanner control methods
  const startScanner = () => {
    setScannerOpen(true);
    setManualToken('');
    setTimeout(() => {
      try {
        const qrScanner = new Html5Qrcode("reader");
        scannerRef.current = qrScanner;

        qrScanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            handleVerifyQRToken(decodedText);
            stopScanner();
          },
          (error) => {
            // Ignore normal tracking failures
          }
        ).catch(err => {
          console.error("QR Scanner start failed:", err);
        });
      } catch (err) {
        console.error(err);
      }
    }, 150);
  };

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        scannerRef.current = null;
      }).catch(err => console.error(err));
    }
    setScannerOpen(false);
  };

  const handleVerifyQRToken = async (token) => {
    if (!token) return;

    // Use current coordinates or default Manhattan center
    const lat = currentLocation ? currentLocation.lat : 40.730610;
    const lng = currentLocation ? currentLocation.lng : -73.935242;

    try {
      const res = await authFetch('/api/driver/qr/verify', {
        method: 'POST',
        body: JSON.stringify({
          qrToken: token,
          lat,
          lng
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'QR Verification successful!');
        fetchDriverAssignment();
      } else {
        alert(data.error || 'QR Verification failed');
      }
    } catch (err) {
      console.error(err);
      alert('Verification request failed');
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-cyan-400">
        <RotateCw className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading Driver Schedule...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="max-w-md mx-auto mt-12 glass-panel border-slate-800/40 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="font-bold text-slate-200">No Schedule Assigned</h3>
        <p className="text-sm text-slate-400 mt-2">
          You are currently not assigned to any active vehicle or route for today. Please wait for the admin to generate schedules.
        </p>
      </div>
    );
  }

  const bus = assignment.bus;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Route list & Controls */}
      <div className="space-y-6">
        {/* Bus Info Panel */}
        <div className="glass-panel rounded-2xl p-6 border-slate-800/40 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-200 flex items-center gap-2">
              <Bus className="w-5 h-5 text-cyan-400" />
              Bus #{bus.busNumber}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
              activeTrip 
                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400 animate-pulse' 
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}>
              {activeTrip ? 'RUNNING' : 'SCHEDULED'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold py-3 border-y border-slate-800/40">
            <div>
              <p className="text-slate-500">PLATE</p>
              <p className="text-slate-300 mt-1">{bus.licensePlate}</p>
            </div>
            <div>
              <p className="text-slate-500">CAPACITY</p>
              <p className="text-slate-300 mt-1">{stopsList.length} / {bus.capacity} stops</p>
            </div>
          </div>

          {/* GPS Error Card */}
          {gpsError && (
            <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/10 text-[11px] text-rose-400 font-semibold flex gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <div>
                <strong>GPS Offline:</strong> {gpsError}
                <button
                  onClick={() => activeTrip && startGpsTracking(activeTrip.id)}
                  className="block text-cyan-400 font-bold hover:underline mt-1"
                >
                  Retry Geolocation Link
                </button>
              </div>
            </div>
          )}

          {/* QR Verification Trigger */}
          <div className="pt-2 text-xs">
            <button
              onClick={startScanner}
              disabled={!activeTrip}
              className="w-full py-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/10 text-cyan-400 hover:bg-cyan-950/20 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/5 active:scale-98 select-none disabled:opacity-30 disabled:cursor-not-allowed mb-3"
            >
              <QrCode className="w-4 h-4 text-cyan-400" />
              OPEN SCANNER CAMERA
            </button>

            <span className="text-slate-500 font-bold uppercase tracking-wider block mb-2">Trip controls</span>
            {!activeTrip ? (
              <button
                onClick={handleStartTrip}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10 active:scale-98 select-none"
              >
                <Play className="w-4 h-4 fill-current" />
                START TODAY'S TRIP
              </button>
            ) : (
              <button
                onClick={handleStopTrip}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-500/15 active:scale-98 select-none"
              >
                <Square className="w-4 h-4 fill-current" />
                STOP / COMPLETE TRIP
              </button>
            )}
          </div>
        </div>

        {/* Next Stop Card */}
        {activeTrip && assignment.nextStopMetrics && (
          <div className="glass-panel rounded-2xl p-5 border-cyan-500/25 bg-cyan-950/10 space-y-3 shadow-lg shadow-cyan-500/5 animate-fade-in">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 px-2 py-0.5 rounded bg-cyan-950/50 border border-cyan-500/20">
                Next Pickup Stop
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                ETA: {assignment.nextStopMetrics.predictedArrival ? new Date(assignment.nextStopMetrics.predictedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}
              </span>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-100 text-sm">
                {assignment.nextStopMetrics.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {assignment.nextStopMetrics.address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/50">
              <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/30">
                <p className="text-[9px] text-slate-500 font-bold uppercase">Distance</p>
                <p className="text-cyan-400 font-extrabold text-sm mt-0.5">
                  {assignment.nextStopMetrics.distanceKm !== null ? `${assignment.nextStopMetrics.distanceKm} km` : '--'}
                </p>
              </div>
              <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/30">
                <p className="text-[9px] text-slate-500 font-bold uppercase">Estimated Time</p>
                <p className="text-purple-400 font-extrabold text-sm mt-0.5">
                  {assignment.nextStopMetrics.etaMinutes !== null ? `${assignment.nextStopMetrics.etaMinutes} mins` : 'calculating...'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Emergency & Incident Controls Panel */}
        {activeTrip && (
          <div className="glass-panel rounded-2xl p-5 border-rose-500/20 bg-slate-900/10 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              Safety & Incident Controls
            </h4>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => handleReportEmergency('SOS')}
                className="py-2.5 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 hover:bg-red-950/30 active:scale-95 transition-all text-center uppercase cursor-pointer"
              >
                🚨 SOS Alert
              </button>
              <button
                type="button"
                onClick={() => handleReportEmergency('BREAKDOWN')}
                className="py-2.5 rounded-lg border border-orange-500/30 bg-orange-950/20 text-orange-400 hover:bg-orange-950/30 active:scale-95 transition-all text-center uppercase cursor-pointer"
              >
                🔧 Breakdown
              </button>
              <button
                type="button"
                onClick={() => handleReportEmergency('MEDICAL')}
                className="py-2.5 rounded-lg border border-purple-500/30 bg-purple-950/20 text-purple-400 hover:bg-purple-950/30 active:scale-95 transition-all text-center uppercase cursor-pointer"
              >
                🚑 Medical Help
              </button>
              <button
                type="button"
                onClick={() => handleReportEmergency('OBSTRUCTION')}
                className="py-2.5 rounded-lg border border-yellow-600/30 bg-yellow-950/10 text-yellow-500 hover:bg-yellow-950/20 active:scale-95 transition-all text-center uppercase cursor-pointer"
              >
                🚧 Obstruction
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => handleReportEmergency('TRAFFIC')}
              className="w-full py-2 rounded-lg border border-amber-500/25 bg-amber-950/10 text-amber-500 hover:bg-amber-950/20 text-[10px] font-bold active:scale-95 transition-all uppercase cursor-pointer"
            >
              🚗 Heavy Traffic Delay
            </button>

            <button
              type="button"
              onClick={() => setShowDelayModal(true)}
              className="w-full py-2.5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-950/20 text-cyan-400 font-extrabold text-xs tracking-wider transition-all cursor-pointer"
            >
              ⏰ REPORT ROUTE DELAY MINS
            </button>
          </div>
        )}

        {/* Passengers / Stops List */}
        <div className="glass-panel rounded-2xl p-6 border-slate-800/40 flex-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
            Optimized Daily Route Checklist ({stopsList.length})
          </h4>

          <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
            {stopsList.map((stop, i) => {
              const status = stop.status || 'PENDING';
              return (
                <div 
                  key={stop.id}
                  className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                    status === 'BOARDED' 
                      ? 'border-emerald-500/20 bg-emerald-950/5' 
                      : status === 'DEBOARDED'
                      ? 'border-cyan-500/25 bg-cyan-950/5'
                      : status === 'MISSED'
                      ? 'border-rose-500/20 bg-rose-950/5'
                      : 'border-slate-800 bg-slate-900/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-cyan-400 font-bold flex items-center justify-center">
                      {stop.sequenceOrder}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-200">
                        {stop.student?.user?.firstName || 'Student'} {stop.student?.user?.lastName || ''}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate w-24 md:w-32">{stop.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                      status === 'BOARDED'
                        ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10'
                        : status === 'DEBOARDED'
                        ? 'bg-cyan-950/30 text-cyan-400 border border-cyan-500/10'
                        : status === 'MISSED'
                        ? 'bg-rose-950/30 text-rose-400 border border-rose-500/10'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {status}
                    </span>

                    <button
                      onClick={() => handleCycleStopStatus(stop.id, status)}
                      disabled={!activeTrip}
                      title="Click to cycle status: PENDING -> BOARDED -> DEBOARDED -> MISSED"
                      className={`p-2 rounded-lg border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed select-none ${
                        status !== 'PENDING'
                          ? 'border-cyan-500/30 bg-cyan-950/20 text-cyan-400' 
                          : 'border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {status === 'BOARDED' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : status === 'DEBOARDED' ? <CheckCircle2 className="w-4 h-4 text-cyan-400" /> : status === 'MISSED' ? <XCircle className="w-4 h-4 text-rose-400" /> : <HelpCircle className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column: GPS Map */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-4 border border-slate-800/40 flex flex-col justify-between min-h-[450px]">
        <div className="mb-4 px-2 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-slate-200">Trip Navigator Map</h3>
            {currentLocation ? (
              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                GPS LINK ACTIVE: Lat {currentLocation.lat.toFixed(5)}, Lng {currentLocation.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Awaiting GPS location signal from browser geolocation sensor...
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-[380px] mb-2">
          <LeafletMap
            stops={stopsList.map((s, idx) => ({
              id: s.id,
              lat: s.lat,
              lng: s.lng,
              sequenceOrder: idx + 1,
              name: `${s.student?.user?.firstName}'s Stop`,
              address: s.address
            }))}
            busLocation={currentLocation}
            zoom={14}
          />
        </div>
      </div>

      {/* Delay Reporting Modal overlay */}
      {showDelayModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSubmitDelay} className="glass-panel-heavy max-w-sm w-full rounded-3xl p-6 border border-cyan-500/20 shadow-xl shadow-cyan-500/5 space-y-5">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-cyan-400" />
                Report Route Delay
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Parents will receive immediate push alert updates and estimated ETAs will shift.
              </p>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="text-slate-400">Delay Duration (Minutes)</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="120"
                  value={delayMins}
                  onChange={(e) => setDelayMins(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Primary Reason</label>
                <select
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                >
                  <option value="TRAFFIC">Heavy Traffic</option>
                  <option value="OBSTRUCTION">Road Obstruction/Construction</option>
                  <option value="BREAKDOWN">Vehicle Issue/Inspection</option>
                  <option value="MEDICAL">Medical Event</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400">Additional Details (Optional)</label>
                <textarea
                  value={delayDesc}
                  onChange={(e) => setDelayDesc(e.target.value)}
                  placeholder="e.g. Lane closed due to water main leak"
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500/50 h-20 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDelayModal(false)}
                className="py-3 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs tracking-wider cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider cursor-pointer shadow-lg shadow-cyan-500/10 active:scale-98 transition-all"
              >
                SUBMIT DELAY
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Camera QR Scanner Modal overlay */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col p-6 items-center justify-center">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Scan Student QR Badge
              </h3>
              <p className="text-xs text-slate-400 mt-1">Point your camera feed at the student's phone</p>
            </div>

            {/* Scanning viewport reader */}
            <div className="w-full aspect-square max-w-[320px] mx-auto overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 flex items-center justify-center relative shadow-lg shadow-cyan-500/5">
              <div id="reader" className="w-full h-full"></div>
            </div>

            {/* Sandbox Mock Scan Fallback */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-3">
              <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sandbox Mock Scan Fallback</span>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="e.g. qr_token_alex"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
                />
                <button
                  onClick={() => {
                    handleVerifyQRToken(manualToken);
                    stopScanner();
                  }}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer select-none active:scale-95 transition-all"
                >
                  MOCK SCAN
                </button>
              </div>
            </div>

            <button
              onClick={stopScanner}
              className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs tracking-wider cursor-pointer active:scale-98 transition-all"
            >
              CANCEL SCANNING
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
