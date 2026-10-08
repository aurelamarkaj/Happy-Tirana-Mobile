import { sessionExpired, sessionSchema, type Session, type Role } from '../contracts/auth';

export interface SessionStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

// Serialize storage changes and reject results of requests from an old session.
export class SessionManager {
  private session: Session | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private revision = 0;
  private expiredRole: Role | null = null;
  private listeners = new Set<() => void>();
  constructor(private storage: SessionStorage, private clearPrivateData: () => void) {}
  getSession = () => this.session;
  getRevision = () => this.revision;
  getExpiredRole = () => this.expiredRole;
  dismissExpiry = () => { this.expiredRole = null; };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };
  private notify() { this.listeners.forEach(listener => listener()); }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => undefined);
    return result;
  }
  restore() {
    return this.serialize(async () => {
      const raw = await this.storage.read();
      if (!raw) return;
      let parsed: Session | null = null;
      try { parsed = sessionSchema.parse(JSON.parse(raw)); } catch { /* Invalid saved session. */ }
      if (!parsed || sessionExpired(parsed)) {
        this.expiredRole = parsed?.role ?? null;
        await this.storage.remove();
        return;
      }
      this.session = parsed;
      this.revision++;
      this.notify();
    });
  }
  save(session: Session, expectedRevision: number) {
    return this.serialize(async () => {
      if (this.revision !== expectedRevision) throw new Error('Hyrja u anulua. Provo përsëri.');
      const validated = sessionSchema.parse(session);
      if (sessionExpired(validated)) throw new Error('Sesioni i kthyer nga API-ja ka skaduar.');
      await this.storage.write(JSON.stringify(validated));
      this.clearPrivateData();
      this.session = validated;
      this.expiredRole = null;
      this.revision++;
      this.notify();
    });
  }
  logout = (expectedToken?: string) => this.serialize(async () => {
    if (expectedToken && this.session?.account.token !== expectedToken) return;
    this.expiredRole = expectedToken ? this.session?.role ?? null : null;
    this.session = null;
    this.revision++;
    this.clearPrivateData();
    this.notify();
    await this.storage.remove();
  });
}
