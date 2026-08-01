import { eventBus } from '../../utils/event-bus';
import { EventDispatcher } from '../../realtime/services/event-dispatcher.service';
import { FleetService } from './fleet.service';
import { FleetStatus } from './fleet.types';
import logger from '../../utils/logger';

export class FleetAggregator {
  private static instance: FleetAggregator;
  private fleetService = FleetService.getInstance();
  private eventDispatcher = EventDispatcher.getInstance();
  
  // Maintain batched updates to avoid thrashing
  private pendingDeltas = new Map<string, any[]>();
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initListeners();
    this.startDeltaFlusher();
  }

  public static getInstance(): FleetAggregator {
    if (!FleetAggregator.instance) {
      FleetAggregator.instance = new FleetAggregator();
    }
    return FleetAggregator.instance;
  }

  private initListeners() {
    eventBus.on('socket:broadcast', (data: any) => {
      this.handleSocketEvent(data);
    });
  }

  private handleSocketEvent(data: { room: string; eventName: string; organizationId: string; payload: any; tripId?: string }) {
    const { eventName, organizationId, payload, tripId } = data;
    if (!organizationId) return;

    try {
      if (eventName === 'server:trip:location:updated') {
        const delta = this.fleetService.updateVehicleState(organizationId, payload.vehicleId || `unknown-${tripId}`, {
          location: { lat: payload.latitude, lng: payload.longitude },
          speed: payload.speed,
          heading: payload.heading,
          status: FleetStatus.ON_TIME, // Placeholder, real logic would query ETA engine
          lastHeartbeat: new Date(payload.timestamp || Date.now()),
          tripId: tripId || null,
        });
        
        this.queueDelta(organizationId, delta);
      }
      
      // Handle Emergency / Notifications
      if (eventName === 'server:notification:broadcast' || eventName === 'notification:broadcast') {
        // Forward notification directly to admin dashboard
        this.eventDispatcher.broadcast(`admin_${organizationId}`, 'fleet:notification', organizationId, payload);
      }
    } catch (err) {
      logger.error('Error in FleetAggregator handleSocketEvent', err);
    }
  }

  private queueDelta(organizationId: string, delta: any) {
    if (!this.pendingDeltas.has(organizationId)) {
      this.pendingDeltas.set(organizationId, []);
    }
    const queue = this.pendingDeltas.get(organizationId)!;
    // Bounded cache to prevent memory leak
    if (queue.length > 500) {
      queue.shift();
    }
    queue.push(delta);
  }

  private startDeltaFlusher() {
    this.flushInterval = setInterval(() => {
      for (const [orgId, deltas] of this.pendingDeltas.entries()) {
        if (deltas.length > 0) {
          const latestVersion = Math.max(...deltas.map(d => d.version));
          const mergedVehicles = new Map<string, any>();
          
          for (const delta of deltas) {
            for (const v of delta.vehicles) {
              mergedVehicles.set(v.vehicleId, v);
            }
          }

          const mergedDelta = {
            version: latestVersion,
            vehicles: Array.from(mergedVehicles.values()),
            removedVehicles: []
          };

          this.eventDispatcher.broadcast(`admin_${orgId}`, 'fleet:delta', orgId, mergedDelta);
          
          this.pendingDeltas.set(orgId, []);
        }
      }
    }, 3000);
  }

  public shutdown() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.pendingDeltas.clear();
  }
}
