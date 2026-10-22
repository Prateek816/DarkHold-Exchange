import { describe, expect, it } from 'vitest';
import { bucketEnd, bucketStart, intervalMs } from '../src';

describe('intervals and buckets', () => {
  it('maps names to milliseconds', () => {
    expect(intervalMs('5s')).toBe(5000);
    expect(intervalMs('1m')).toBe(60000);
  });
  it('throws on unknown names', () => {
    expect(() => intervalMs('1h' as never)).toThrow();
  });
  it('floors to the bucket start', () => {
    expect(bucketStart(0, 5000)).toBe(0);
    expect(bucketStart(4999, 5000)).toBe(0);
    expect(bucketStart(5000, 5000)).toBe(5000);
    expect(bucketStart(1700000012345, 60000)).toBe(1699999980000);
    expect(bucketEnd(5000, 5000)).toBe(10000);
  });
});
