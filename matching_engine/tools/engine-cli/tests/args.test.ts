import { describe, expect, it } from 'vitest';
import {
  ArgError,
  MAX_SAFE,
  buildCancel,
  buildConfigure,
  buildEventsQuery,
  buildHalt,
  buildQuery,
  buildSubmit,
  parseUInt,
} from '../src/args';
import { formatFrame } from '../src/format';
import { parseSseFrame } from '../src/client';

const ID = '0b6d5c2e-7c1a-4b9f-8f0a-2f3e9d1a4c11';

describe('parseUInt', () => {
  it('accepts integers up to MAX_SAFE', () => {
    expect(parseUInt('qty', '5')).toBe(5);
    expect(parseUInt('qty', String(MAX_SAFE))).toBe(MAX_SAFE);
  });
  it('rejects negatives, decimals, text and overflow', () => {
    for (const bad of ['-1', '1.5', 'abc', '', String(MAX_SAFE + 2), '1e3']) {
      expect(() => parseUInt('qty', bad)).toThrow(ArgError);
    }
  });
});

describe('buildSubmit', () => {
  it('builds the exact SubmitOrder wire shape', () => {
    const c = buildSubmit({ asset: 'DFEST-WKND', user: 'u-1', side: 'buy', qty: '5', price: '10000', id: ID });
    expect(c).toEqual({
      type: 'SubmitOrder',
      order_id: ID,
      asset: 'DFEST-WKND',
      user_id: 'u-1',
      side: 'BUY',
      order_type: 'LIMIT',
      tif: 'GTC',
      qty: 5,
      price: 10000,
    });
  });
  it('defaults MARKET to IOC and generates an id when absent', () => {
    const c = buildSubmit({ asset: 'A', user: 'u', side: 'SELL', type: 'market', qty: '1', price: '9' }, () => ID);
    expect(c.order_type).toBe('MARKET');
    expect(c.tif).toBe('IOC');
    expect(c.order_id).toBe(ID);
  });
  it('rejects bad enums, assets, users and ids', () => {
    const ok = { asset: 'A', user: 'u', side: 'BUY', qty: '1', price: '1', id: ID };
    expect(() => buildSubmit({ ...ok, side: 'HOLD' })).toThrow(ArgError);
    expect(() => buildSubmit({ ...ok, asset: 'lower' })).toThrow(ArgError);
    expect(() => buildSubmit({ ...ok, user: 'a b' })).toThrow(ArgError);
    expect(() => buildSubmit({ ...ok, id: 'nope' })).toThrow(ArgError);
    expect(() => buildSubmit({ ...ok, tif: 'FOK' })).toThrow(ArgError);
  });
});

describe('buildConfigure', () => {
  it('maps flags to ConfigureAsset', () => {
    expect(buildConfigure('TEST-A', { tick: '1', min: '1', max: '1000' })).toEqual({
      type: 'ConfigureAsset',
      asset: 'TEST-A',
      tick_size: 1,
      min_qty: 1,
      max_qty: 1000,
      collar_max_price: null,
      status: 'ACTIVE',
    });
    const c = buildConfigure('TEST-A', { tick: '5', min: '1', max: '10', collar: '200', halted: true });
    expect(c.collar_max_price).toBe(200);
    expect(c.status).toBe('HALTED');
  });
});

describe('cancel, halt, queries', () => {
  it('builds cancel with default reason', () => {
    expect(buildCancel(ID)).toEqual({ type: 'CancelOrder', order_id: ID, reason: 'USER' });
    expect(buildCancel(ID, 'admin').reason).toBe('ADMIN');
    expect(() => buildCancel(ID, 'BOSS')).toThrow(ArgError);
  });
  it('builds halt', () => {
    expect(buildHalt('TEST-A')).toEqual({ type: 'HaltAsset', asset: 'TEST-A' });
  });
  it('builds query strings', () => {
    expect(buildQuery('/v1/open-orders', {})).toBe('/v1/open-orders');
    expect(buildQuery('/v1/books/A', { depth: '5' })).toBe('/v1/books/A?depth=5');
    expect(buildEventsQuery('10', 'e-0000abcd')).toBe('/v1/events?after=10&epoch=e-0000abcd');
    expect(buildEventsQuery()).toBe('/v1/events');
    expect(() => buildEventsQuery('x')).toThrow(ArgError);
  });
});

describe('sse parsing and formatting', () => {
  it('parses frames', () => {
    expect(parseSseFrame('event: OrderFilled\nid: 5\ndata: {"seq":5}')).toEqual({ event: 'OrderFilled', id: '5', data: '{"seq":5}' });
    expect(parseSseFrame(': hb')).toEqual({ comment: 'hb' });
    expect(parseSseFrame('')).toBeNull();
  });
  it('formats a trade on one line', () => {
    const line = formatFrame({
      event: 'TradeExecuted',
      id: '4',
      data: JSON.stringify({ seq: 4, asset: 'TEST-A', qty: 5, price: 100, taker_side: 'BUY', buy_user_id: 'U2', sell_user_id: 'U1', trade_id: 'e-test0001:4' }),
    });
    expect(line).toBe('#4 TradeExecuted TEST-A 5@100 taker=BUY buy=U2 sell=U1 id=e-test0001:4');
    expect(line.includes('\n')).toBe(false);
  });
});
