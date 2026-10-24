// Pure argument parsing and command building. No I/O, so it is unit tested.
import { randomUUID } from 'node:crypto';

export const MAX_SAFE = 9007199254740991;

export class ArgError extends Error {}

export type Side = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET';
export type Tif = 'GTC' | 'IOC';
export type CancelReason = 'USER' | 'POLICY_BREACH' | 'ADMIN';

export function parseUInt(name: string, raw: string): number {
  if (!/^\d+$/.test(raw)) throw new ArgError(`${name} must be a non-negative integer, got "${raw}"`);
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n > MAX_SAFE) throw new ArgError(`${name} exceeds ${MAX_SAFE}`);
  return n;
}

export function parseEnum<T extends string>(name: string, raw: string, allowed: readonly T[]): T {
  const up = raw.toUpperCase() as T;
  if (!allowed.includes(up)) throw new ArgError(`${name} must be one of ${allowed.join(', ')}, got "${raw}"`);
  return up;
}

export function checkAsset(raw: string): string {
  if (!/^[A-Z0-9_-]{1,32}$/.test(raw)) throw new ArgError(`asset must match ^[A-Z0-9_-]{1,32}$, got "${raw}"`);
  return raw;
}

export function checkUserId(raw: string): string {
  if (!/^[\x21-\x7e]{1,64}$/.test(raw)) throw new ArgError('user must be 1 to 64 printable ASCII characters without spaces');
  return raw;
}

export function checkUuid(raw: string): string {
  const v = raw.toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)) {
    throw new ArgError(`order id must be a uuid, got "${raw}"`);
  }
  return v;
}

export interface ConfigureOpts {
  tick: string;
  min: string;
  max: string;
  collar?: string;
  halted?: boolean;
}

export function buildConfigure(asset: string, o: ConfigureOpts) {
  return {
    type: 'ConfigureAsset',
    asset: checkAsset(asset),
    tick_size: parseUInt('tick', o.tick),
    min_qty: parseUInt('min', o.min),
    max_qty: parseUInt('max', o.max),
    collar_max_price: o.collar === undefined ? null : parseUInt('collar', o.collar),
    status: o.halted ? 'HALTED' : 'ACTIVE',
  };
}

export interface SubmitOpts {
  asset: string;
  user: string;
  side: string;
  type?: string;
  tif?: string;
  qty: string;
  price: string;
  id?: string;
}

export function buildSubmit(o: SubmitOpts, genId: () => string = randomUUID) {
  const orderType = parseEnum('type', o.type ?? 'LIMIT', ['LIMIT', 'MARKET'] as const);
  const tif = parseEnum('tif', o.tif ?? (orderType === 'MARKET' ? 'IOC' : 'GTC'), ['GTC', 'IOC'] as const);
  return {
    type: 'SubmitOrder',
    order_id: o.id === undefined ? genId() : checkUuid(o.id),
    asset: checkAsset(o.asset),
    user_id: checkUserId(o.user),
    side: parseEnum('side', o.side, ['BUY', 'SELL'] as const),
    order_type: orderType,
    tif,
    qty: parseUInt('qty', o.qty),
    price: parseUInt('price', o.price),
  };
}

export function buildCancel(orderId: string, reason?: string) {
  return {
    type: 'CancelOrder',
    order_id: checkUuid(orderId),
    reason: parseEnum('reason', reason ?? 'USER', ['USER', 'POLICY_BREACH', 'ADMIN'] as const),
  };
}

export function buildHalt(asset: string) {
  return { type: 'HaltAsset', asset: checkAsset(asset) };
}

export function buildResume(asset: string) {
  return { type: 'ResumeAsset', asset: checkAsset(asset) };
}

export function buildQuery(path: string, params: Record<string, string | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
    .join('&');
  return q ? `${path}?${q}` : path;
}

export function buildEventsQuery(after?: string, epoch?: string): string {
  return buildQuery('/v1/events', {
    after: after === undefined ? undefined : String(parseUInt('after', after)),
    epoch,
  });
}
