import React from 'react';
import { CountdownTimer } from './CountdownTimer';
import { LiveETA } from './LiveETA';
import { useETAStore } from '../../store/useETAStore';

interface StopArrivalCardProps {
  stopName: string;
  stopId: string;
}

export const StopArrivalCard: React.FC<StopArrivalCardProps> = ({ stopName, stopId }) => {
  const currentETA = useETAStore(state => state.currentETA);
  
  // Is this ETA for the requested stop?
  const isForThisStop = currentETA?.nextStopId === stopId;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 flex flex-col items-center justify-center space-y-4 max-w-sm w-full transition-all duration-300 hover:shadow-xl relative overflow-hidden">
      
      {/* Decorative top bar */}
      <div className={`absolute top-0 left-0 w-full h-1 ${isForThisStop && currentETA?.isDelayed ? 'bg-red-500' : 'bg-blue-500'}`} />

      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 text-center uppercase tracking-wide">
        {stopName}
      </h3>

      <div className="flex flex-col items-center py-4 bg-slate-50 dark:bg-slate-900/50 w-full rounded-lg">
        {isForThisStop ? (
          <>
            <CountdownTimer />
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              <LiveETA />
            </div>
            
            {!currentETA.isDelayed && currentETA.remainingDistanceMeters > 0 && (
              <div className="mt-4 text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {Math.round(currentETA.remainingDistanceMeters)}m away
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-500 dark:text-slate-400 py-6">
            Waiting for updates...
          </div>
        )}
      </div>

    </div>
  );
};
