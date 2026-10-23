import type { IntervalName } from './types';

export function intervalMs(name: IntervalName): number {
  switch (name) {
    case '5s':
      return 5000;
    case '1m':
      return 60000;
    default:
      throw new Error(`unknown interval: ${String(name)}`);
  }
}
