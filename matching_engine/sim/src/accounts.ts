import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import type { Clock } from './clock';

export const ROLES = [
  'issuer',
  'market_maker',
  'noise',
  'momentum',
  'profit_taker',
  'pump',
  'scalper',
  'judge_seller',
  'judge_buyer',
  'admin',
  'bench',
] as const;
export type Role = (typeof ROLES)[number];

const AccountSchema = z.object({
  key: z.string().min(1),
  email: z.string().min(3),
  role: z.enum(ROLES),
  is_simulated: z.boolean(),
  starter_credits: z.number().int().nonnegative(),
  initial_units: z.record(z.string(), z.number().int().nonnegative()),
  quotes: z.array(z.string()).optional(),
});

const FileSchema = z.object({
  schema_version: z.literal(1),
  password: z.string().min(1),
  accounts: z.array(AccountSchema).min(1),
});

export interface Account {
  key: string;
  email: string;
  password: string;
  role: Role;
  isSimulated: boolean;
  starterCredits: number;
  initialUnits: Record<string, number>;
  quotes: string[];
}

export interface LoginResult {
  token: string;
  userId: string;
  expiresInSec?: number;
}

export type LoginFn = (email: string, password: string) => Promise<LoginResult>;

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

export class Accounts {
  private byKey = new Map<string, Account>();
  private sessions = new Map<string, Session>();
  private inflight = new Map<string, Promise<Session>>();
  private loginFn: LoginFn | undefined;

  constructor(private readonly opts: { clock: Clock; files: string[]; login?: LoginFn }) {
    this.loginFn = opts.login;
  }

  setLogin(fn: LoginFn): void {
    this.loginFn = fn;
  }

  async load(): Promise<void> {
    for (const file of this.opts.files) {
      const raw: unknown = JSON.parse(await readFile(file, 'utf8'));
      const parsed = FileSchema.parse(raw);
      for (const a of parsed.accounts) {
        if (this.byKey.has(a.key)) throw new Error(`duplicate account key ${a.key} in ${file}`);
        this.byKey.set(a.key, {
          key: a.key,
          email: a.email,
          password: parsed.password,
          role: a.role,
          isSimulated: a.is_simulated,
          starterCredits: a.starter_credits,
          initialUnits: a.initial_units,
          quotes: a.quotes ?? [],
        });
      }
    }
  }

  has(key: string): boolean {
    return this.byKey.has(key);
  }

  get(key: string): Account {
    const a = this.byKey.get(key);
    if (!a) throw new Error(`unknown account key: ${key}`);
    return a;
  }

  list(filter?: { role?: Role | Role[]; prefix?: string }): Account[] {
    const roles = filter?.role === undefined ? undefined : Array.isArray(filter.role) ? filter.role : [filter.role];
    const out: Account[] = [];
    for (const a of this.byKey.values()) {
      if (roles && !roles.includes(a.role)) continue;
      if (filter?.prefix && !a.key.startsWith(filter.prefix)) continue;
      out.push(a);
    }
    return out.sort((x, y) => (x.key < y.key ? -1 : x.key > y.key ? 1 : 0));
  }

  login(key: string): Promise<Session> {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const fn = this.loginFn;
    if (!fn) return Promise.reject(new Error('accounts: login function not set'));
    const acct = this.get(key);
    const p = fn(acct.email, acct.password)
      .then((r) => {
        const now = this.opts.clock.now();
        const lifetimeMs = (r.expiresInSec ?? 600) * 1000 - 30000;
        const session: Session = { token: r.token, userId: r.userId, expiresAt: now + Math.max(1000, lifetimeMs) };
        this.sessions.set(key, session);
        return session;
      })
      .finally(() => {
        this.inflight.delete(key);
      });
    this.inflight.set(key, p);
    return p;
  }

  private async session(key: string): Promise<Session> {
    const s = this.sessions.get(key);
    if (s && s.expiresAt > this.opts.clock.now()) return s;
    return this.login(key);
  }

  async getToken(key: string): Promise<string> {
    return (await this.session(key)).token;
  }

  async getUserId(key: string): Promise<string> {
    return (await this.session(key)).userId;
  }

  invalidate(key: string): void {
    this.sessions.delete(key);
  }
}
