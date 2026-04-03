import { Logger } from '@nestjs/common';

/**
 * In-memory Redis mock for local development without Docker/Redis.
 * Implements the subset of ioredis commands used across the codebase.
 * Logs a warning on init so developers know caching is not persistent.
 */
export class InMemoryRedisClient {
  private readonly logger = new Logger('InMemoryRedisClient');
  private readonly store = new Map<string, string>();
  private readonly ttls = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.logger.warn(
      'Redis is NOT configured — using in-memory stub. Cache will not persist across restarts.',
    );
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, value);
    this.setTtl(key, seconds);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) {
        count++;
      }
      this.clearTtl(key);
    }
    return count;
  }

  async incr(key: string): Promise<number> {
    const current = parseInt(this.store.get(key) ?? '0', 10);
    const next = current + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<number> {
    if (!this.store.has(key)) return 0;
    this.setTtl(key, seconds);
    return 1;
  }

  pipeline(): PipelineStub {
    return new PipelineStub(this);
  }

  // ── internal helpers ──

  private setTtl(key: string, seconds: number): void {
    this.clearTtl(key);
    const timeout = setTimeout(() => {
      this.store.delete(key);
      this.ttls.delete(key);
    }, seconds * 1000);
    // Prevent the timer from keeping the Node process alive
    if (timeout.unref) timeout.unref();
    this.ttls.set(key, timeout);
  }

  private clearTtl(key: string): void {
    const existing = this.ttls.get(key);
    if (existing) {
      clearTimeout(existing);
      this.ttls.delete(key);
    }
  }
}

/**
 * Minimal pipeline stub that batches commands and executes them sequentially.
 */
class PipelineStub {
  private readonly commands: Array<() => Promise<unknown>> = [];

  constructor(private readonly client: InMemoryRedisClient) {}

  incr(key: string): this {
    this.commands.push(() => this.client.incr(key));
    return this;
  }

  expire(key: string, seconds: number): this {
    this.commands.push(() => this.client.expire(key, seconds));
    return this;
  }

  get(key: string): this {
    this.commands.push(() => this.client.get(key));
    return this;
  }

  set(key: string, value: string): this {
    this.commands.push(() => this.client.set(key, value));
    return this;
  }

  setex(key: string, seconds: number, value: string): this {
    this.commands.push(() => this.client.setex(key, seconds, value));
    return this;
  }

  del(...keys: string[]): this {
    this.commands.push(() => this.client.del(...keys));
    return this;
  }

  async exec(): Promise<Array<[Error | null, unknown]>> {
    const results: Array<[Error | null, unknown]> = [];
    for (const cmd of this.commands) {
      try {
        const result = await cmd();
        results.push([null, result]);
      } catch (err) {
        results.push([err as Error, null]);
      }
    }
    return results;
  }
}
