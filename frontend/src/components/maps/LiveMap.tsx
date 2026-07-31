import React from 'react';

export type MapProvider = 'google' | 'leaflet' | 'mapbox';

export interface MapConfig {
  provider: MapProvider;
  apiKey?: string;
  theme?: 'light' | 'dark';
  defaultZoom?: number;
}

export interface LiveMapProps {
  config: MapConfig;
  center: { lat: number; lng: number };
  zoom?: number;
  children?: React.ReactNode;
}

/**
 * Agnostic Map Provider Wrapper
 * Currently a placeholder architecture before SDK integration.
 */
export const LiveMap: React.FC<LiveMapProps> = ({ config, center, zoom = 14, children }) => {
  return (
    <div 
      className="live-map-container bg-slate-100 flex items-center justify-center rounded-md border border-slate-200"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}
    >
      <div className="absolute top-2 left-2 z-10 bg-white p-2 rounded shadow text-sm">
        <p className="font-semibold text-slate-700">Map Provider: {config.provider}</p>
        <p className="text-slate-500">Center: {center.lat.toFixed(4)}, {center.lng.toFixed(4)}</p>
        <p className="text-slate-500">Zoom: {zoom}</p>
      </div>
      
      {/* Placeholder for actual canvas/SVG rendering area */}
      <div className="provider-canvas w-full h-full flex items-center justify-center text-slate-400">
        [ {config.provider.toUpperCase()} MAP CANVAS PLACEHOLDER ]
      </div>

      {children}
    </div>
  );
};
