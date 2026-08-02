import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = AnalyticsService.getInstance();
  });

  afterAll(() => {
    service.shutdown();
  });

  it('should be a singleton', () => {
    const instance2 = AnalyticsService.getInstance();
    expect(service).toBe(instance2);
  });

  it('should initialize live state correctly for a new organization', () => {
    const orgId = 'test-org-123';
    const liveKPIs = service.getLiveKPIs(orgId);
    
    expect(liveKPIs).toBeDefined();
    expect(liveKPIs.fleetUtilizationPercent).toBe(0);
    expect(liveKPIs.activeEmergencyCount).toBe(0);
  });
});
