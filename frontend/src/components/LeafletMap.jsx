import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon path problem in React builds
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Premium SVG Icons for the live map
const schoolIcon = L.divIcon({
  html: `
    <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-red-600 flex items-center justify-center border border-white/20 shadow-lg shadow-rose-500/20 text-white font-bold text-[10px]">
      🏫
    </div>
  `,
  className: 'custom-school-icon',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const studentStopIcon = L.divIcon({
  html: `
    <div class="w-7 h-7 rounded-full bg-slate-900 border-2 border-cyan-400 flex items-center justify-center shadow-md shadow-cyan-400/20 text-cyan-400 font-bold text-[10px]">
      📍
    </div>
  `,
  className: 'custom-stop-icon',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const busIcon = L.divIcon({
  html: `
    <div class="w-10 h-10 rounded-full bg-amber-500 border border-slate-900 flex items-center justify-center shadow-lg shadow-amber-500/40 text-slate-950 font-bold text-lg animate-bounce">
      🚌
    </div>
  `,
  className: 'custom-bus-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Helper component to programmatically pan/zoom map on coordinate changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
}

export default function LeafletMap({ 
  schoolLocation = [40.730610, -73.935242], // St. Mary's School coordinates
  stops = [], 
  busLocation = null, 
  polylinePoints = [],
  activeBuses = [],
  zoom = 13
}) {
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-inner shadow-slate-950/45">
      <MapContainer 
        center={schoolLocation} 
        zoom={zoom} 
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Adjust Map View */}
        <ChangeView center={busLocation ? [busLocation.lat, busLocation.lng] : schoolLocation} zoom={zoom} />

        {/* School Base Marker */}
        <Marker position={schoolLocation} icon={schoolIcon}>
          <Popup>
            <div className="p-1 font-semibold text-slate-200">
              <span className="block text-xs uppercase text-rose-400 font-bold">Destination</span>
              St. Mary's School
            </div>
          </Popup>
        </Marker>

        {/* Student Stop Markers */}
        {stops.map((stop, i) => (
          <Marker 
            key={stop.id || i} 
            position={[stop.lat || stop.pickupLat, stop.lng || stop.pickupLng]} 
            icon={studentStopIcon}
          >
            <Popup>
              <div className="p-1">
                <span className="block text-[10px] uppercase text-cyan-400 font-bold">Stop #{stop.sequenceOrder || i+1}</span>
                <span className="block font-semibold text-slate-100 text-sm mt-0.5">{stop.name || `${stop.user?.firstName} ${stop.user?.lastName}`}</span>
                <span className="block text-slate-400 text-xs mt-1">{stop.address || stop.pickupAddress}</span>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Live Bus Location Marker (Single child tracking) */}
        {busLocation && busLocation.lat && busLocation.lng && (
          <Marker position={[busLocation.lat, busLocation.lng]} icon={busIcon}>
            <Popup>
              <div className="p-1 font-semibold">
                <span className="block text-xs uppercase text-amber-400 font-bold">LIVE BUS</span>
                Speed: {Math.round(busLocation.speed || 0)} km/h
              </div>
            </Popup>
          </Marker>
        )}

        {/* Multi Bus tracking (Admin Console tracking) */}
        {activeBuses && activeBuses.map((bus) => (
          bus.lastLat && bus.lastLng ? (
            <Marker key={bus.id} position={[bus.lastLat, bus.lastLng]} icon={busIcon}>
              <Popup>
                <div className="p-1 font-semibold text-slate-200 text-xs">
                  <span className="block text-xs uppercase text-amber-400 font-bold">Bus #{bus.busNumber}</span>
                  <span className="block text-[9px] text-slate-400">License: {bus.licensePlate}</span>
                  <span className="block text-slate-200 mt-1 font-bold">Speed: {Math.round(bus.lastSpeed || 0)} km/h</span>
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* Optimized Route Polyline */}
        {polylinePoints && polylinePoints.length > 0 && (
          <Polyline 
            positions={polylinePoints} 
            color="#22d3ee" 
            weight={4} 
            opacity={0.8} 
            dashArray="8, 8"
          />
        )}
      </MapContainer>
    </div>
  );
}
