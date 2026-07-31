import React, { useCallback } from 'react';
import { useAttendanceBroadcaster } from '../../hooks/attendance/useAttendanceBroadcaster';
import { useAttendanceStore } from '../../store/useAttendanceStore';
import type { AttendanceStatus } from '../../types/attendance.types';

export const SyncStatusBadge: React.FC = () => {
  const offlineQueueLength = useAttendanceStore(state => state.offlineQueue.length);

  if (offlineQueueLength === 0) {
    return null; // Don't show if synced
  }

  return (
    <div className="flex items-center space-x-2 bg-amber-50 px-3 py-1.5 rounded-full shadow-sm border border-amber-200">
      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
      <span className="text-xs font-medium text-amber-800">
        {offlineQueueLength} update{offlineQueueLength > 1 ? 's' : ''} pending
      </span>
    </div>
  );
};

export interface AttendanceToggleProps {
  tripId: string;
  studentId: string;
  initialStatus: AttendanceStatus;
}

export const AttendanceToggle: React.FC<AttendanceToggleProps> = ({ tripId, studentId, initialStatus }) => {
  const { markAttendance } = useAttendanceBroadcaster(tripId);
  
  // React Rendering Optimization: Use a selector to subscribe ONLY to this student's status changes
  const liveStatus = useAttendanceStore(
    useCallback(state => state.liveAttendanceState[studentId]?.status, [studentId])
  );

  const displayStatus = liveStatus || initialStatus;

  const handleToggle = () => {
    // Basic toggle logic for Driver
    const nextStatus: AttendanceStatus = displayStatus === 'BOARDED' ? 'ALIGHTED' : 'BOARDED';
    markAttendance(studentId, nextStatus);
  };

  const handleAbsent = () => {
    markAttendance(studentId, 'ABSENT');
  };

  return (
    <div className="flex items-center space-x-2">
      <button 
        onClick={handleToggle}
        className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors
          ${displayStatus === 'BOARDED' ? 'bg-green-100 text-green-800 border border-green-200' : ''}
          ${displayStatus === 'ALIGHTED' ? 'bg-blue-100 text-blue-800 border border-blue-200' : ''}
          ${displayStatus === 'PENDING' ? 'bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200' : ''}
          ${displayStatus === 'ABSENT' ? 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-500' : ''}
        `}
        disabled={displayStatus === 'ABSENT' || displayStatus === 'ALIGHTED'}
      >
        {displayStatus === 'BOARDED' ? 'Boarded' : displayStatus === 'ALIGHTED' ? 'Alighted' : 'Mark Boarded'}
      </button>

      {displayStatus === 'PENDING' && (
        <button 
          onClick={handleAbsent}
          className="px-3 py-2 rounded-md text-sm font-semibold text-red-600 hover:bg-red-50 border border-transparent transition-colors"
        >
          Absent
        </button>
      )}

      {displayStatus === 'ABSENT' && (
        <span className="px-3 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-md">
          Absent
        </span>
      )}
    </div>
  );
};
