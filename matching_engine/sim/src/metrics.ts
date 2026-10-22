function bump(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

function toObject(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Persona name is the part of the bot key before the first dash (mm-01 -> mm). */
export function personaOf(botKey: string): string {
  const i = botKey.indexOf('-');
  return i > 0 ? botKey.slice(0, i) : botKey;
}

export class Metrics {
  private ordersSent = 0;
  private ordersAccepted = 0;
  private cancelsSent = 0;
  private apiRequests = 0;
  private rejectedByCode = new Map<string, number>();
  private apiErrorsByStatus = new Map<string, number>();
  private ordersByPersona = new Map<string, number>();
  private cancelsByPersona = new Map<string, number>();

  orderSent(botKey: string): void {
    this.ordersSent++;
    bump(this.ordersByPersona, personaOf(botKey));
  }

  orderAccepted(_botKey: string): void {
    this.ordersAccepted++;
  }

  orderRejected(_botKey: string, code: string): void {
    bump(this.rejectedByCode, code);
  }

  cancelSent(botKey: string): void {
    this.cancelsSent++;
    bump(this.cancelsByPersona, personaOf(botKey));
  }

  apiRequest(): void {
    this.apiRequests++;
  }

  apiError(status: string | number): void {
    bump(this.apiErrorsByStatus, String(status));
  }

  snapshot() {
    return {
      ordersSent: this.ordersSent,
      ordersAccepted: this.ordersAccepted,
      ordersRejectedByCode: toObject(this.rejectedByCode),
      cancelsSent: this.cancelsSent,
      apiRequests: this.apiRequests,
      apiErrorsByStatus: toObject(this.apiErrorsByStatus),
      ordersByPersona: toObject(this.ordersByPersona),
      cancelsByPersona: toObject(this.cancelsByPersona),
    };
  }
}

export type MetricsSnapshot = ReturnType<Metrics['snapshot']>;
