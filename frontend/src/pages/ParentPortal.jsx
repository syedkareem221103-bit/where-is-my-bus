import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import LeafletMap from '../components/LeafletMap';
import { 
  Bell, 
  MapPin, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  XCircle,
  HelpCircle,
  QrCode
} from 'lucide-react';

export default function ParentPortal() {
  const { authFetch, user } = useAuth();
  const { socket, joinTrip, leaveTrip } = useSocket();

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [etaDetails, setEtaDetails] = useState(null);
  const [busLocation, setBusLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState({ emergencies: [], delays: [] });

  // QR Code Badge modal states
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrToken, setQrToken] = useState('');

  const fetchParentData = async () => {
    try {
      setLoading(true);
      
      // Fetch linked students (contains todayStop)
      const studentsRes = await authFetch('/api/parent/students');
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
        if (studentsData.length > 0 && !selectedStudent) {
          handleSelectStudent(studentsData[0]);
        } else if (selectedStudent) {
          const updatedStudent = studentsData.find(s => s.id === selectedStudent.id);
          if (updatedStudent) handleSelectStudent(updatedStudent);
        }
      }

      // Fetch alerts/notifications
      const notifsRes = await authFetch('/api/parent/notifications');
      if (notifsRes.ok) {
        const notifsData = await notifsRes.json();
        setNotifications(notifsData);
      }

      // Fetch active emergencies and delays
      const emergencyRes = await authFetch('/api/parent/emergencies');
      if (emergencyRes.ok) {
        const alertData = await emergencyRes.json();
        setActiveAlerts(alertData);
      }
    } catch (err) {
      console.error('Error fetching parent data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData();
  }, []);

  // WebSockets listeners
  useEffect(() => {
    if (!socket || !selectedStudent || !selectedStudent.activeTrip) {
      setBusLocation(null);
      setEtaDetails(null);
      return;
    }

    const tripId = selectedStudent.activeTrip.id;
    
    joinTrip(tripId);

    socket.on('location-changed', (data) => {
      setBusLocation(data);
      fetchETA(tripId);
    });

    socket.on('eta-updates', (etaResults) => {
      if (selectedStudent && selectedStudent.todayStop) {
        const match = etaResults.find(r => r.routeStopId === selectedStudent.todayStop.id);
        if (match) {
          fetchETA(tripId);
        }
      }
    });

    socket.on('emergency-reported', (data) => {
      setActiveAlerts(prev => ({
        ...prev,
        emergencies: [data, ...prev.emergencies]
      }));
    });

    socket.on('emergency-resolved', (data) => {
      setActiveAlerts(prev => ({
        ...prev,
        emergencies: prev.emergencies.filter(e => e.id !== data.eventId)
      }));
      fetchParentData();
    });

    socket.on('delay-reported', (data) => {
      setActiveAlerts(prev => ({
        ...prev,
        delays: [data, ...prev.delays]
      }));
    });

    socket.on('stop-updated', (data) => {
      if (selectedStudent.todayStop && selectedStudent.todayStop.id === data.stopId) {
        setSelectedStudent(prev => ({
          ...prev,
          todayStop: {
            ...prev.todayStop,
            status: data.status,
          }
        }));
      }
    });

    socket.on('trip-status-changed', (data) => {
      if (data.status === 'COMPLETED') {
        setBusLocation(null);
        setEtaDetails(null);
        fetchParentData();
      }
    });

    fetchETA(tripId);

    return () => {
      leaveTrip(tripId);
      socket.off('location-changed');
      socket.off('eta-updates');
      socket.off('emergency-reported');
      socket.off('emergency-resolved');
      socket.off('delay-reported');
      socket.off('stop-updated');
      socket.off('trip-status-changed');
    };
  }, [socket, selectedStudent]);

  useEffect(() => {
    if (!socket || !user) return;

    socket.on(`notification:${user.id}`, (newNotif) => {
      setNotifications(prev => [newNotif, ...prev]);
      fetchParentData();
    });

    return () => {
      socket.off(`notification:${user.id}`);
    };
  }, [socket, user]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setBusLocation(null);
    setEtaDetails(null);
  };

  const fetchETA = async (tripId) => {
    try {
      const res = await authFetch(`/api/parent/trips/${tripId}/eta`);
      if (res.ok) {
        const data = await res.json();
        setEtaDetails(data);
        setBusLocation(data.currentBusLocation);
      }
    } catch (err) {
      console.error('Error fetching ETA:', err);
    }
  };

  const handleToggleAttendance = async (requiresRide) => {
    if (!selectedStudent) return;

    try {
      setSubmittingCheckIn(true);
      const res = await authFetch('/api/parent/attendance', {
        method: 'POST',
        body: JSON.stringify({
          studentId: selectedStudent.id,
          requiresRide,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchParentData();
      } else {
        alert(data.error || 'Failed to submit attendance');
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleShowQRModal = async () => {
    try {
      const res = await authFetch('/api/parent/student-qr');
      if (res.ok) {
        const data = await res.json();
        setQrToken(data.qrToken);
        setShowQrModal(true);
      } else {
        alert('Failed to retrieve boarding QR Code');
      }
    } catch (err) {
      console.error('QR retrieve error:', err);
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      const res = await authFetch(`/api/parent/notifications/${notifId}/read`, {
        method: 'PUT',
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Error reading notification:', err);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-cyan-400">
        <RefreshCw className="w-8 h-8 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading Portal Details...</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 glass-panel border-slate-800/40 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="font-bold text-slate-200">No Student Found</h3>
        <p className="text-sm text-slate-400 mt-2">
          Your parent profile is currently not linked to any active students. Please coordinate with the institution admin.
        </p>
      </div>
    );
  }

  const getStopStep = () => {
    if (!selectedStudent || !selectedStudent.todayStop) return 0;
    const status = selectedStudent.todayStop.status;
    if (status === 'PENDING') return 1;
    if (status === 'BOARDED') return 2;
    if (status === 'DEBOARDED') return 3;
    if (status === 'MISSED') return -1;
    return 0;
  };

  const stepIndex = getStopStep();

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Left Column: child details & notifications */}
      <div className="space-y-6 lg:col-span-1 flex flex-col">
        {/* Student card & attendance */}
        {selectedStudent && (
          <div className="glass-panel rounded-2xl p-6 border-slate-800/40 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 text-sm flex items-center justify-center font-bold text-cyan-400">
                {selectedStudent.user.firstName[0]}
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">{selectedStudent.user.firstName} {selectedStudent.user.lastName}</h3>
                <p className="text-xs text-slate-400">Route: {selectedStudent.route?.name || 'Unassigned'}</p>
              </div>
            </div>

            {/* Show QR Code button */}
            <button
              onClick={handleShowQRModal}
              className="w-full py-2.5 rounded-xl border border-cyan-500/25 bg-cyan-950/15 text-cyan-400 hover:bg-cyan-950/25 font-bold text-xs tracking-wider cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2 select-none"
            >
              <QrCode className="w-4 h-4" />
              SHOW BOARDING QR BADGE
            </button>

            {/* Attendance checklist panel */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/15 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily ride status</span>
              {selectedStudent.attendance.length > 0 ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedStudent.attendance[0].requiresRide ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                        <span className="text-xs font-medium text-slate-200">RIDE REQUIRED TODAY</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <span className="text-xs font-medium text-slate-200">ABSENT / SKIPPING RIDE</span>
                      </>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleToggleAttendance(!selectedStudent.attendance[0].requiresRide)}
                    disabled={submittingCheckIn}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold hover:underline cursor-pointer select-none"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-400">Please declare if your child requires bus pickup today before cutoff.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleToggleAttendance(true)}
                      disabled={submittingCheckIn}
                      className="py-2 px-1 text-[11px] rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95 select-none"
                    >
                      Yes, Ride Required
                    </button>
                    <button
                      onClick={() => handleToggleAttendance(false)}
                      disabled={submittingCheckIn}
                      className="py-2 px-1 text-[11px] rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 transition-all cursor-pointer active:scale-95 select-none"
                    >
                      No, Skipping Ride
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Travel Progress Pipeline Indicator */}
            {selectedStudent.todayStop && (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/5 space-y-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transportation Progress</span>
                
                {stepIndex === -1 ? (
                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-950/10 text-xs text-rose-400 font-medium flex gap-2">
                    <XCircle className="w-5 h-5 shrink-0" />
                    <span>Pickup missed. Please contact administration.</span>
                  </div>
                ) : (
                  <div className="relative pl-6 border-l border-slate-800 space-y-5 text-xs">
                    <div className="relative">
                      <span className="absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border bg-emerald-500 border-slate-900 flex items-center justify-center text-[8px] text-slate-950 font-bold">✓</span>
                      <p className="font-bold text-slate-200">Checked In Present</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Transportation scheduled.</p>
                    </div>

                    <div className="relative">
                      <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                        selectedStudent.activeTrip 
                          ? 'bg-emerald-500 border-slate-900 text-slate-950' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {selectedStudent.activeTrip ? '✓' : '2'}
                      </span>
                      <p className={`font-bold ${selectedStudent.activeTrip ? 'text-slate-200' : 'text-slate-500'}`}>Bus En Route</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {selectedStudent.activeTrip ? 'The bus is actively running.' : 'Awaiting trip initialization.'}
                      </p>
                    </div>

                    <div className="relative">
                      <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                        stepIndex >= 2 
                          ? 'bg-emerald-500 border-slate-900 text-slate-950' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {stepIndex >= 2 ? '✓' : '3'}
                      </span>
                      <p className={`font-bold ${stepIndex >= 2 ? 'text-slate-200' : 'text-slate-500'}`}>Student Boarded</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {stepIndex >= 2 ? 'Child boarded bus safely.' : 'Waiting at pickup stop.'}
                      </p>
                    </div>

                    <div className="relative">
                      <span className={`absolute -left-[30px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold ${
                        stepIndex >= 3 
                          ? 'bg-cyan-400 border-slate-900 text-slate-950' 
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}>
                        {stepIndex >= 3 ? '✓' : '4'}
                      </span>
                      <p className={`font-bold ${stepIndex >= 3 ? 'text-cyan-400' : 'text-slate-500'}`}>Reached Institution</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {stepIndex >= 3 ? 'Safely arrived at destination.' : 'Awaiting arrival.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Alerts Feed */}
        <div className="glass-panel rounded-2xl p-6 border-slate-800/40 flex-1 flex flex-col min-h-[250px]">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Bell className="w-4 h-4 text-cyan-400 animate-bounce" />
              Notifications Feed
            </h4>
            <button 
              onClick={fetchParentData}
              className="text-[10px] text-cyan-400 hover:underline hover:text-cyan-300 cursor-pointer font-bold select-none"
            >
              Refresh
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar flex-1 pr-1">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">No alerts dispatched yet.</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                    notif.isRead 
                      ? 'border-slate-800 bg-slate-900/5 text-slate-400' 
                      : 'border-cyan-500/20 bg-cyan-950/10 text-slate-200 hover:bg-cyan-950/15'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${notif.isRead ? 'text-slate-400' : 'text-cyan-400'}`}>
                      {notif.title}
                    </span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="leading-relaxed font-medium">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Maps + Tracking */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Active Emergency & Delay Banners */}
        {selectedStudent && selectedStudent.activeTrip && (
          <div className="space-y-4">
            {activeAlerts.emergencies.length > 0 && (
              <div className="glass-panel border-red-500 bg-red-950/20 rounded-2xl p-5 text-red-200 animate-pulse border flex gap-3 shadow-lg shadow-red-500/10">
                <span className="text-2xl shrink-0">🚨</span>
                <div>
                  <h4 className="font-extrabold uppercase text-xs tracking-wider text-red-400">
                    Active Emergency Alert
                  </h4>
                  <p className="text-xs font-semibold mt-1">
                    A {activeAlerts.emergencies[0].type} emergency has been reported for Bus #{selectedStudent?.bus?.busNumber || 'assigned to your student'}.
                  </p>
                  {activeAlerts.emergencies[0].description && (
                    <p className="text-[10px] text-red-300 italic mt-0.5">
                      Details: {activeAlerts.emergencies[0].description}
                    </p>
                  )}
                </div>
              </div>
            )}

            {activeAlerts.emergencies.length === 0 && activeAlerts.delays.length > 0 && (
              <div className="glass-panel border-amber-500/40 bg-amber-950/10 rounded-2xl p-5 text-amber-200 border flex gap-3 shadow-lg shadow-amber-500/5">
                <span className="text-xl shrink-0">⚠️</span>
                <div>
                  <h4 className="font-extrabold uppercase text-xs tracking-wider text-amber-400">
                    Route Delay Active
                  </h4>
                  <p className="text-xs font-semibold mt-1">
                    The bus is experiencing a delay of approximately <strong>{activeAlerts.delays[0].estimatedDelayMins} minutes</strong> due to <strong>{activeAlerts.delays[0].reason}</strong>.
                  </p>
                  {activeAlerts.delays[0].description && (
                    <p className="text-[10px] text-amber-300 italic mt-0.5">
                      Details: {activeAlerts.delays[0].description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Trip Info card */}
        {selectedStudent && selectedStudent.activeTrip ? (
          <div className="glass-panel rounded-2xl p-6 border-slate-800/40 grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-full bg-cyan-500/5 blur-3xl pointer-events-none"></div>

            <div className="md:col-span-2 space-y-2">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5" />
                Bus Route in Progress
              </span>
              <h3 className="font-extrabold text-slate-100 flex items-center gap-2">
                Bus #{selectedStudent.bus?.busNumber}
                <ArrowRight className="w-4 h-4 text-cyan-400" />
                Heading towards {selectedStudent.user.firstName}'s Stop
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                The driver is active and broadcasting coordinates every 5 seconds.
              </p>
            </div>

            <div className="border-t md:border-t-0 md:border-l border-slate-800/60 pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
              {etaDetails ? (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-slate-500 font-bold uppercase text-[9px] tracking-wider mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      Estimated Arrival
                    </div>
                    <div className="text-3xl font-black text-white">{etaDetails.etaMinutes} mins</div>
                    <div className="text-[11px] text-cyan-400 font-semibold">{etaDetails.distanceKm} km remaining</div>
                    {etaDetails.predictedArrival && (
                      <div className="text-[10px] text-slate-400 font-semibold mt-1">
                        Expected: {new Date(etaDetails.predictedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {etaDetails.routeProgress !== undefined && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                      <div className="flex justify-between text-[9px] text-slate-500 font-extrabold uppercase tracking-wide">
                        <span>Route Progress</span>
                        <span className="text-cyan-400 font-black">{etaDetails.routeProgress}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-400 via-purple-500 to-cyan-500 transition-all duration-500 rounded-full"
                          style={{ width: `${etaDetails.routeProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-500 font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                  Calculating ETA details...
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 border-slate-800/40 text-center py-8">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
            <h4 className="font-bold text-slate-300">Bus Currently Inactive</h4>
            <p className="text-xs text-slate-400 mt-1">
              There is no active morning run happening for this student's bus right now.
            </p>
          </div>
        )}

        {/* Live Map */}
        {selectedStudent && (
          <div className="glass-panel rounded-2xl p-4 border border-slate-800/40 min-h-[400px] flex flex-col">
            <h3 className="font-semibold text-slate-200 mb-4 px-2">Live Trip Map</h3>
            <div className="flex-1 min-h-[350px]">
              <LeafletMap
                stops={[{
                  id: selectedStudent.id,
                  pickupLat: selectedStudent.pickupLat,
                  pickupLng: selectedStudent.pickupLng,
                  sequenceOrder: selectedStudent.todayStop?.sequenceOrder || 1,
                  name: `${selectedStudent.user.firstName}'s Stop`,
                  address: selectedStudent.pickupAddress
                }]}
                busLocation={busLocation}
                zoom={14}
              />
            </div>
          </div>
        )}

      </div>

      {/* QR Badge Modal */}
      {showQrModal && qrToken && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel-heavy max-w-sm w-full rounded-3xl p-6 text-center border border-cyan-500/20 shadow-xl shadow-cyan-500/5 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-2">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Boarding QR Code
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Show this code to the bus driver when boarding/exiting.
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mx-auto">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrToken}`} 
                alt="Student QR Badge"
                className="w-[180px] h-[180px] object-contain"
              />
            </div>

            <div>
              <p className="text-xs font-bold text-cyan-400 font-mono tracking-wider">{qrToken}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">Student: {selectedStudent.user.firstName} {selectedStudent.user.lastName}</p>
            </div>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-xs tracking-wider cursor-pointer select-none active:scale-98 transition-all"
            >
              CLOSE BADGE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
