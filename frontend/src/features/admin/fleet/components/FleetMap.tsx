import React from 'react';
import { useFleetStore, type FleetStatus } from '../../../../store/useFleetStore';
import { Bus, Navigation } from 'lucide-react';

export const FleetMap: React.FC = () => {
  const { vehicles } = useFleetStore();
  const vehicleList = Object.values(vehicles);

  const getStatusColor = (status: FleetStatus) => {
    switch (status) {
      case 'ON_TIME': return 'bg-green-500';
      case 'DELAYED': return 'bg-yellow-500';
      case 'EMERGENCY': return 'bg-red-500';
      case 'OFFLINE': return 'bg-gray-400';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="relative w-full h-[600px] bg-slate-100 dark:bg-slate-900 rounded-lg border overflow-hidden flex items-center justify-center">
      {/* Map Background Mock */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }} />
      
      {/* Overlay UI Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="bg-white dark:bg-card p-2 rounded shadow border hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
          <Navigation className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Simulated Markers */}
      <div className="relative w-full h-full">
        {vehicleList.map((vehicle) => {
          // In a real app, lat/lng would map to pixels. Here we just pseudo-randomize for demo
          // based on some hash of vehicleId if static, or just position centrally.
          const top = `${((vehicle.location.lat + 90) / 180) * 100}%`;
          const left = `${((vehicle.location.lng + 180) / 360) * 100}%`;
          
          return (
            <div 
              key={vehicle.vehicleId}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              style={{ top, left, transition: 'all 0.5s ease' }}
              title={`Vehicle: ${vehicle.vehicleId}\nSpeed: ${vehicle.speed}km/h\nStatus: ${vehicle.status}`}
            >
              <div className={`w-8 h-8 rounded-full ${getStatusColor(vehicle.status)} flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-800 relative z-10`}>
                <Bus className="w-4 h-4 text-white" />
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-black/80 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20">
                <p className="font-bold mb-1">ID: {vehicle.vehicleId.substring(0, 8)}</p>
                <p>Speed: {vehicle.speed} km/h</p>
                <p>Status: {vehicle.status}</p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-black/80" />
              </div>
            </div>
          );
        })}

        {vehicleList.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-muted-foreground bg-white/80 dark:bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm shadow-sm border">
              Waiting for fleet GPS telemetry...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
