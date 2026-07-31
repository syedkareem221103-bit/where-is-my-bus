import React from 'react';

export interface MarkerProps {
  lat: number;
  lng: number;
  label?: string;
}

export interface BusMarkerProps extends MarkerProps {
  heading?: number | null;
  speed?: number | null;
  accuracy?: number; // In meters
  isOffline?: boolean;
}

export const BusMarker: React.FC<BusMarkerProps> = ({ heading, accuracy, isOffline, label = 'Bus' }) => {
  // Placeholder rendering for the marker logic. 
  // In a real SDK (like Google Maps), this would be a <Marker /> component with custom icons.
  
  const rotation = heading ? `rotate(${heading}deg)` : 'none';
  const color = isOffline ? 'bg-slate-400' : 'bg-blue-500';

  return (
    <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: '50%', top: '50%' }}>
      {/* Accuracy Radius Indicator */}
      {accuracy && accuracy > 20 && (
        <div 
          className="absolute rounded-full bg-blue-500/20 border border-blue-500/30"
          style={{ width: `${accuracy * 2}px`, height: `${accuracy * 2}px` }} 
        />
      )}
      
      {/* Bus Icon */}
      <div 
        className={`w-8 h-8 rounded-md shadow-lg flex items-center justify-center text-white ${color} relative z-10 transition-transform duration-500`}
        style={{ transform: rotation }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v7a2 2 0 002 2h4a2 2 0 002-2V6a4 4 0 00-4-4zm-2 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
        </svg>
      </div>
      
      {label && (
        <div className="mt-1 px-2 py-0.5 bg-white rounded shadow-sm text-xs font-medium text-slate-700 whitespace-nowrap z-20">
          {label}
        </div>
      )}
    </div>
  );
};

export const SchoolMarker: React.FC<MarkerProps> = ({ label = 'School' }) => {
  return (
    <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: '40%', top: '40%' }}>
      <div className="w-8 h-8 rounded-full shadow-md flex items-center justify-center bg-green-500 text-white relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
        </svg>
      </div>
      {label && <div className="mt-1 px-2 py-0.5 bg-white rounded shadow-sm text-xs font-medium text-slate-700 whitespace-nowrap z-20">{label}</div>}
    </div>
  );
};

export const HomeMarker: React.FC<MarkerProps> = ({ label = 'Home' }) => {
  return (
    <div className="absolute flex flex-col items-center justify-center transform -translate-x-1/2 -translate-y-1/2 pointer-events-none" style={{ left: '60%', top: '60%' }}>
      <div className="w-8 h-8 rounded-full shadow-md flex items-center justify-center bg-orange-500 text-white relative z-10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
        </svg>
      </div>
      {label && <div className="mt-1 px-2 py-0.5 bg-white rounded shadow-sm text-xs font-medium text-slate-700 whitespace-nowrap z-20">{label}</div>}
    </div>
  );
};

export interface RoutePolylineProps {
  path: { lat: number; lng: number }[];
  color?: string;
  isDeviated?: boolean;
}

export const RoutePolyline: React.FC<RoutePolylineProps> = ({ isDeviated }) => {
  // Placeholder rendering for the polyline.
  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex items-center justify-center opacity-30">
      <svg className="w-64 h-64" viewBox="0 0 100 100">
        <polyline 
          points="20,20 40,40 40,80 80,80" 
          fill="none" 
          stroke={isDeviated ? '#f59e0b' : '#3b82f6'} 
          strokeWidth="3" 
          strokeDasharray={isDeviated ? '5,5' : 'none'}
        />
      </svg>
    </div>
  );
};
