import React from 'react';
import { useSocketStore } from '../../store/useSocketStore';

export const ConnectionIndicator: React.FC = () => {
  const status = useSocketStore((state) => state.status);
  
  let color = 'bg-slate-500';
  let text = 'Offline';
  
  if (status === 'CONNECTED') {
    color = 'bg-green-500';
    text = 'Live';
  } else if (status === 'CONNECTING' || status === 'RECONNECTING') {
    color = 'bg-yellow-500';
    text = 'Reconnecting...';
  }

  return (
    <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
      <div className={`w-2.5 h-2.5 rounded-full ${color} ${status === 'CONNECTED' ? 'animate-pulse' : ''}`} />
      <span className="text-xs font-medium text-slate-600">{text}</span>
    </div>
  );
};

export interface ETACardProps {
  etaMinutes: number | null;
  distanceKm: number | null;
}

export const ETACard: React.FC<ETACardProps> = ({ etaMinutes, distanceKm }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center min-w-[120px]">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ETA</div>
      <div className="text-2xl font-bold text-slate-800">
        {etaMinutes !== null ? `${etaMinutes} min` : '--'}
      </div>
      {distanceKm !== null && (
        <div className="text-xs text-slate-400 mt-1">{distanceKm.toFixed(1)} km away</div>
      )}
    </div>
  );
};

export interface DriverStatusCardProps {
  driverName: string;
  vehiclePlate: string;
  status: string;
}

export const DriverStatusCard: React.FC<DriverStatusCardProps> = ({ driverName, vehiclePlate, status }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 flex-1">
      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-800">{driverName}</div>
        <div className="text-xs text-slate-500">{vehiclePlate} • {status.replace('_', ' ')}</div>
      </div>
    </div>
  );
};

export interface TrackingStatusBannerProps {
  isDeviated: boolean;
  gpsAccuracy?: number;
  isDriverOffline?: boolean;
  emergency?: { type: string; message: string };
}

export const TrackingStatusBanner: React.FC<TrackingStatusBannerProps> = ({ isDeviated, gpsAccuracy, isDriverOffline, emergency }) => {
  if (emergency) {
    return (
      <div className="w-full bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Emergency: {emergency.type}</h3>
            <p className="mt-1 text-sm text-red-700">{emergency.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isDeviated) {
    return (
      <div className="w-full bg-amber-50 border-l-4 border-amber-500 p-4 mb-4 rounded-r-md">
        <p className="text-sm font-medium text-amber-800">Bus has deviated from planned route.</p>
      </div>
    );
  }

  if (isDriverOffline) {
    return (
      <div className="w-full bg-slate-50 border-l-4 border-slate-500 p-4 mb-4 rounded-r-md">
        <p className="text-sm font-medium text-slate-800">Driver is currently offline or has paused tracking.</p>
      </div>
    );
  }

  if (gpsAccuracy && gpsAccuracy > 50) {
    return (
      <div className="w-full bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded-r-md">
        <p className="text-sm font-medium text-yellow-800">Poor GPS Signal. Location may be inaccurate.</p>
      </div>
    );
  }

  return null;
};
