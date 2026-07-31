import { ETAEngineService } from './eta-engine.service';
import { EventDispatcher } from './event-dispatcher.service';
import { ETA_CONFIG } from '../../constants/eta.config';

jest.mock('./event-dispatcher.service', () => {
  return {
    EventDispatcher: {
      getInstance: jest.fn().mockReturnValue({
        broadcast: jest.fn(),
      }),
    },
  };
});

describe('ETAEngineService', () => {
  let engine: ETAEngineService;
  let broadcastMock: jest.Mock;

  beforeEach(() => {
    // Reset singleton if possible, or just clear trips
    engine = ETAEngineService.getInstance();
    // Use prototype to access private method for testing, or rely on clearTrip
    const anyEngine = engine as any;
    anyEngine.trips.clear();
    
    broadcastMock = EventDispatcher.getInstance().broadcast as jest.Mock;
    broadcastMock.mockClear();
    
    jest.useFakeTimers();
    jest.setSystemTime(1000000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const generateLocation = (lat: number, lon: number, speed: number = 10, accuracy: number = 10) => ({
    latitude: lat,
    longitude: lon,
    speed,
    heading: 0,
    accuracy,
    timestamp: Date.now()
  });

  it('should ignore noisy GPS (low accuracy)', () => {
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(0, 0, 10, 100)); // 100m accuracy
    expect(broadcastMock).not.toHaveBeenCalled();
    expect(engine.getSnapshot('trip-1')).toBeNull();
  });

  it('should ignore noisy GPS (impossible speed)', () => {
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(0, 0, 50, 10)); // 50m/s = 180km/h
    expect(broadcastMock).not.toHaveBeenCalled();
    expect(engine.getSnapshot('trip-1')).toBeNull();
  });

  it('should broadcast initial ETA', () => {
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40, -74));
    
    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledWith(
      'trip_room:trip-1',
      'server:eta:update',
      'org-1',
      expect.objectContaining({
        tripId: 'trip-1',
        confidence: 'LOW' // Only 1 speed sample
      }),
      'trip-1'
    );
    
    const snapshot = engine.getSnapshot('trip-1');
    expect(snapshot).not.toBeNull();
    expect(snapshot?.snapshotVersion).toBe(1);
  });

  it('should throttle broadcasts if movement and ETA delta are small', () => {
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40.0, -74.0));
    broadcastMock.mockClear();

    // Move slightly, but ETA delta < 30s
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40.0001, -74.0));
    expect(broadcastMock).not.toHaveBeenCalled(); // Throttled

    // Advance time by 31s (heartbeat)
    jest.setSystemTime(1031000);
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40.0002, -74.0));
    expect(broadcastMock).toHaveBeenCalledTimes(1); // Heartbeat triggered
  });

  it('should detect delay if stationary for too long', () => {
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40.0, -74.0, 10));
    
    // Stationary update
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40.0, -74.0, 0));
    
    // Advance time past stationary timeout
    jest.setSystemTime(1000000 + ETA_CONFIG.DELAY_STATIONARY_TIMEOUT_MS + 1000);
    
    broadcastMock.mockClear();
    // Heartbeat will trigger broadcast
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40.0, -74.0, 0));
    
    expect(broadcastMock).toHaveBeenCalledTimes(1);
    const callArgs = broadcastMock.mock.calls[0];
    expect(callArgs[3].isDelayed).toBe(true);
  });

  it('should trigger APPROACHING, ARRIVED, and DEPARTED events based on geofences', () => {
    const anyEngine = engine as any;
    
    // Mock calculateDistanceMeters to control geofencing deterministic behavior
    anyEngine.calculateDistanceMeters = jest.fn()
      .mockReturnValueOnce(600) // Ping 1: remainingDistance
      .mockReturnValueOnce(20)  // Ping 2: distanceMoved
      .mockReturnValueOnce(400) // Ping 2: remainingDistance
      .mockReturnValueOnce(20)  // Ping 3: distanceMoved
      .mockReturnValueOnce(30)  // Ping 3: remainingDistance
      .mockReturnValueOnce(20)  // Ping 4: distanceMoved
      .mockReturnValueOnce(60); // Ping 4: remainingDistance

    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40, -74, 10)); // 600m
    expect(broadcastMock).toHaveBeenCalledWith(
        expect.any(String), 'server:eta:update', expect.any(String), expect.any(Object), expect.any(String)
    );
    broadcastMock.mockClear();

    jest.setSystemTime(Date.now() + 1000);
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40, -74, 10)); // 400m
    expect(broadcastMock).toHaveBeenCalledWith(
      'trip_room:trip-1', 'server:stop:approaching', 'org-1', expect.any(Object), 'trip-1'
    );
    broadcastMock.mockClear();

    jest.setSystemTime(Date.now() + 1000);
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40, -74, 10)); // 30m
    expect(broadcastMock).toHaveBeenCalledWith(
      'trip_room:trip-1', 'server:stop:arrived', 'org-1', expect.any(Object), 'trip-1'
    );
    broadcastMock.mockClear();

    jest.setSystemTime(Date.now() + 1000);
    engine.processLocationUpdate('org-1', 'trip-1', generateLocation(40, -74, 10)); // 60m
    expect(broadcastMock).toHaveBeenCalledWith(
      'trip_room:trip-1', 'server:stop:departed', 'org-1', expect.any(Object), 'trip-1'
    );
  });
});
