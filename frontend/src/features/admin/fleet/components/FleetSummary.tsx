import React from 'react';
import { useFleetStore } from '../../../../store/useFleetStore';

export const FleetSummary: React.FC = () => {
  const { summary } = useFleetStore();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <div className="bg-card text-card-foreground p-4 rounded-lg border shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Total Vehicles</h3>
        <p className="text-2xl font-bold">{summary.totalVehicles}</p>
      </div>
      <div className="bg-card text-card-foreground p-4 rounded-lg border shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Active Vehicles</h3>
        <p className="text-2xl font-bold text-green-600">{summary.activeVehicles}</p>
      </div>
      <div className="bg-card text-card-foreground p-4 rounded-lg border shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Running Trips</h3>
        <p className="text-2xl font-bold text-blue-600">{summary.runningTrips}</p>
      </div>
      <div className="bg-card text-card-foreground p-4 rounded-lg border shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Delayed Trips</h3>
        <p className="text-2xl font-bold text-yellow-600">{summary.delayedTrips}</p>
      </div>
      <div className="bg-card text-card-foreground p-4 rounded-lg border shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Emergencies</h3>
        <p className="text-2xl font-bold text-red-600">{summary.emergencies}</p>
      </div>
      <div className="bg-card text-card-foreground p-4 rounded-lg border shadow-sm flex flex-col justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Drivers Online</h3>
        <p className="text-2xl font-bold">{summary.driversOnline}</p>
      </div>
    </div>
  );
};
