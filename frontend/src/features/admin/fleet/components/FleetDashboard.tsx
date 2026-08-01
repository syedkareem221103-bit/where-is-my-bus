import React, { useEffect } from 'react';
import { FleetSummary } from './FleetSummary';
import { FleetMap } from './FleetMap';
import { EmergencyPanel } from './EmergencyPanel';
import { useFleetMonitoring } from '../../../../hooks/fleet/useFleetMonitoring';

export const FleetDashboard: React.FC = () => {
  const { requestSnapshot } = useFleetMonitoring();

  useEffect(() => {
    // Request initial state snapshot on mount
    requestSnapshot();
  }, [requestSnapshot]);

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Fleet Operations</h1>
          <p className="text-muted-foreground mt-1">Real-time monitoring and dispatch control center.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="search" 
            placeholder="Search vehicles, drivers..." 
            className="px-4 py-2 bg-background border rounded-md text-sm w-64 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <EmergencyPanel />
      <FleetSummary />
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <FleetMap />
        </div>
        
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card border rounded-lg p-4 h-[600px] flex flex-col">
            <h3 className="font-semibold mb-4 text-lg">Active Trips</h3>
            
            <div className="flex gap-2 mb-4">
              <button className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium">All</button>
              <button className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded-full font-medium">Delayed</button>
              <button className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-full font-medium">SOS</button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              <p className="text-sm text-muted-foreground text-center mt-10">
                Trip list populates automatically when vehicles begin routes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDashboard;
