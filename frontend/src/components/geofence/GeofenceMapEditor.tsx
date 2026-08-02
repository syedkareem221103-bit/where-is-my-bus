import React, { useState } from 'react';
import { useGeofences, useCreateGeofence, useDeleteGeofence } from '../../hooks/geofence/useGeofences';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Map, MapPin, Plus, Trash2 } from 'lucide-react';

// A mock simplified Map Editor since integrating a full map component requires complex libraries
export const GeofenceMapEditor: React.FC = () => {
  const { data: geofences, isLoading } = useGeofences();
  const createGeofence = useCreateGeofence();
  const deleteGeofence = useDeleteGeofence();
  const [newGeofenceName, setNewGeofenceName] = useState('');

  const handleCreateMockGeofence = () => {
    if (!newGeofenceName) return;
    createGeofence.mutate({
      name: newGeofenceName,
      type: 'RESTRICTED',
      geometry: {
        type: 'Point',
        coordinates: [-122.4194, 37.7749],
        radius: 500,
      },
      isActive: true,
    });
    setNewGeofenceName('');
  };

  if (isLoading) return <div>Loading geofences...</div>;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="text-blue-500" />
          Geofence Map Editor
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            placeholder="New Geofence Name" 
            className="border rounded p-2 flex-grow"
            value={newGeofenceName}
            onChange={(e) => setNewGeofenceName(e.target.value)}
          />
          <Button onClick={handleCreateMockGeofence} disabled={createGeofence.isPending}>
            <Plus size={16} className="mr-1" /> Add Point Geofence
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-gray-700">Active Geofences</h3>
          {geofences?.length === 0 ? (
            <p className="text-gray-500">No geofences found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {geofences?.map((gf) => (
                <div key={gf.id} className="p-4 border rounded flex justify-between items-start bg-gray-50">
                  <div>
                    <h4 className="font-bold flex items-center gap-2">
                      <MapPin size={16} /> {gf.name}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">Type: {gf.type}</p>
                    <p className="text-xs text-gray-400 mt-1">Geometry: {gf.geometry.type}</p>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteGeofence.mutate(gf.id)}
                    disabled={deleteGeofence.isPending}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
