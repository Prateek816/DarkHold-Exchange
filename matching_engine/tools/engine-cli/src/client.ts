// Thin HTTP and SSE client. Token from ENGINE_TOKEN, base URL from ENGINE_URL.

export interface ClientConfig {
  baseUrl: string;
  token: string;
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): ClientConfig {
  return {
    baseUrl: (env.ENGINE_URL ?? 'http://127.0.0.1:7000').replace(/\/+$/, ''),
    token: env.ENGINE_TOKEN ?? '',
  };
}

export interface HttpResult {
  status: number;
  body: unknown;
}

export interface SseFrame {
  event?: string;
  id?: string;
  data?: string;
  comment?: string;
}

export function parseSseFrame(raw: string): SseFrame | null {
  const f: SseFrame = {};
  let any = false;
  for (const line of raw.split('\n')) {
    if (line === '') continue;
    any = true;
    if (line.startsWith(':')) f.comment = line.slice(1).trim();
    else if (line.startsWith('event:')) f.event = line.slice(6).trim();
    else if (line.startsWith('id:')) f.id = line.slice(3).trim();
    else if (line.startsWith('data:')) {
      const v = line.slice(5).replace(/^ /, '');
      f.data = f.data === undefined ? v : `${f.data}\n${v}`;
    }
  }
  return any ? f : null;
}

export class EngineClient {
  constructor(private readonly cfg: ClientConfig) {}

  private headers(auth: boolean): Record<string, string> {
    const h: Record<string, string> = {};
    if (auth) h['X-Engine-Token'] = this.cfg.token;
    return h;
  }

  async request(method: 'GET' | 'POST', path: string, body?: unknown, auth = true): Promise<HttpResult> {
    const headers = this.headers(auth);
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(this.cfg.baseUrl + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text === '' ? null : JSON.parse(text);
    } catch {
      /* keep raw text */
    }
    return { status: res.status, body: parsed };
  }

  command(cmd: unknown): Promise<HttpResult> {
    return this.request('POST', '/v1/commands', cmd);
  }

  get(path: string, auth = true): Promise<HttpResult> {
    return this.request('GET', path, undefined, auth);
  }

  /** Streams SSE frames until the server closes or the signal aborts. */
  async tail(path: string, onFrame: (f: SseFrame) => void, signal?: AbortSignal): Promise<{ status: number; error?: unknown }> {
    const res = await fetch(this.cfg.baseUrl + path, { headers: this.headers(true), signal });
    if (res.status !== 200 || res.body === null) {
      const text = await res.text();
      let body: unknown = text;
      try {
        body = JSON.parse(text);
      } catch {
        /* raw */
      }
      return { status: res.status, error: body };
    }
    const decoder = new TextDecoder();
    let buf = '';
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      buf += decoder.decode(chunk, { stream: true }).replace(/\r\n/g, '\n');
      let pos: number;
      while ((pos = buf.indexOf('\n\n')) >= 0) {
        const raw = buf.slice(0, pos);
        buf = buf.slice(pos + 2);
        const f = parseSseFrame(raw);
        if (f) onFrame(f);
      }
    }
    return { status: 200 };
  }
}
