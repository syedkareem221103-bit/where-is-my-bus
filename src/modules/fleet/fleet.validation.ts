import { z } from 'zod';
import { FleetStatus } from './fleet.types';

export const FleetStatusEnum = z.nativeEnum(FleetStatus);

export const VehicleStateSchema = z.object({
  vehicleId: z.string().uuid(),
  driverId: z.string().uuid(),
  tripId: z.string().uuid().nullable(),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  heading: z.number().min(0).max(360),
  speed: z.number().min(0),
  status: FleetStatusEnum,
  // Zod accepts strings for datetimes, but since the type uses Date, we might need to coerce or accept string depending on whether this is used to validate incoming socket data (string) or internal state (Date)
  // We'll accept a string datetime for parsing, or a Date object
  lastHeartbeat: z.union([z.string().datetime(), z.date()])
});
