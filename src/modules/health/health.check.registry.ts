import { ServiceHealth, HealthStatus } from './health.types';

export class HealthCheckRegistry {
  private static instance: HealthCheckRegistry;
  private services: Map<string, ServiceHealth> = new Map();

  private constructor() {}

  public static getInstance(): HealthCheckRegistry {
    if (!HealthCheckRegistry.instance) {
      HealthCheckRegistry.instance = new HealthCheckRegistry();
    }
    return HealthCheckRegistry.instance;
  }

  public registerService(name: string, status: HealthStatus, message?: string, latencyMs?: number): void {
    this.services.set(name, {
      status,
      message,
      latencyMs,
      updatedAt: new Date().toISOString(),
    });
  }

  public getServiceHealth(name: string): ServiceHealth | undefined {
    return this.services.get(name);
  }

  public getAllServices(): Record<string, ServiceHealth> {
    const result: Record<string, ServiceHealth> = {};
    for (const [key, value] of this.services.entries()) {
      result[key] = value;
    }
    return result;
  }
}
