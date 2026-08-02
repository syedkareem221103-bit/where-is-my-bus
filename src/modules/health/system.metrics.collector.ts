import os from 'os';
import { performance } from 'perf_hooks';

export class SystemMetricsCollector {
  /**
   * Captures the CPU usage as a percentage (0-100).
   * This is a rough estimation of load average over CPUs.
   */
  public static getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0, totalTick = 0;
    
    for (let i = 0, len = cpus.length; i < len; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    return 100 - Math.floor((idle / total) * 100);
  }

  /**
   * Captures the memory usage as a percentage (0-100).
   */
  public static getMemoryUsage(): number {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    return Math.floor((usedMem / totalMem) * 100);
  }

  /**
   * Measures Event Loop Delay using perf_hooks.
   * Resolves with the delay in milliseconds.
   */
  public static getEventLoopDelay(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        resolve(performance.now() - start);
      });
    });
  }
}
