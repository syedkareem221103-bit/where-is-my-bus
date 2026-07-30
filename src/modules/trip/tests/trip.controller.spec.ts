import { Request, Response } from 'express';
import TripController from '../trip.controller';
import { TripService } from '../trip.service';
import { GpsTrackingService } from '../gps.tracking.service';

jest.mock('../trip.service');
jest.mock('../gps.tracking.service');

describe('TripController', () => {
  let controller: TripController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    controller = new TripController();
    mockRequest = {
      user: { id: 'driver-1', organizationId: 'org-1', email: 'driver@test.com', role: 'DRIVER' } as any,
      body: {},
      params: {},
      ip: '127.0.0.1'
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assign', () => {
    it('should assign a trip and return 201', async () => {
      mockRequest.body = { vehicleId: 'v-1', driverId: 'd-1', routeId: 'r-1', scheduleId: 's-1', serviceDate: '2026-07-30' };
      (TripService.prototype.assignTrip as jest.Mock).mockResolvedValue({ id: 'trip-1' });

      await controller.assign(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Trip assigned successfully'
      }));
    });

    it('should pass errors to next()', async () => {
      const err = new Error('Assign failed');
      (TripService.prototype.assignTrip as jest.Mock).mockRejectedValue(err);

      await controller.assign(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalledWith(err);
    });
  });

  describe('ping', () => {
    it('should record ping and return 200', async () => {
      mockRequest.params = { id: 'trip-1' };
      mockRequest.body = { latitude: 10, longitude: 20, speed: 30, accuracy: 5, recordedAt: new Date().toISOString() };
      
      (GpsTrackingService.prototype.recordPing as jest.Mock).mockResolvedValue({
        ping: { id: 'ping-1' },
        discarded: false
      });

      await controller.ping(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'success',
        message: 'Telemetry recorded successfully'
      }));
    });
  });
});
