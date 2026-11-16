/**
 * Import proxy. Browsers cannot read another site's HTML directly, so the app
 * asks this small server to fetch a product page (or image) on the user's
 * behalf. It only speaks http(s), refuses private and loopback addresses, caps
 * sizes and time, and identifies itself honestly — shops that block automated
 * clients are handled by the bookmarklet instead of by disguising requests.
 */
import { lookup } from 'node:dns/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { isIP } from 'node:net';

const USER_AGENT = 'AtelierFitSimulator/0.1 (personal product import; single page on user request)';
const MAX_HTML = 6 * 1024 * 1024;
const MAX_IMAGE = 12 * 1024 * 1024;
const TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 5;

/** Expand an IPv6 literal to its eight 16-bit groups, or null if malformed. */
function ipv6Groups(ip: string): number[] | null {
  let v = ip.toLowerCase().split('%')[0];
  // Trailing dotted quad (e.g. ::ffff:10.0.0.1) → two hex groups.
  const quad = v.match(/^(.*:)(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (quad) {
    const [a, b, c, d] = quad.slice(2).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    v = `${quad[1]}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = v.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const groups = [...head, ...new Array<string>(fill).fill('0'), ...tail].map((g) => (/^[0-9a-f]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));
  return groups.length === 8 && groups.every((g) => !Number.isNaN(g)) ? groups : null;
}

function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    const g = ipv6Groups(ip);
    if (!g) return true;
    const v4 = (hi: number, lo: number) => isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
    if (g.slice(0, 5).every((x) => x === 0)) {
      // ::, ::1, IPv4-compatible and IPv4-mapped (::ffff:a.b.c.d) addresses.
      if (g[5] === 0xffff || g[5] === 0) return g[5] === 0 && g[6] === 0 && g[7] <= 1 ? true : v4(g[6], g[7]);
    }
    if (g[0] === 0x64 && g[1] === 0xff9b) return v4(g[6], g[7]); // NAT64
    if (g[0] === 0x2002) return v4(g[1], g[2]); // 6to4
    return (
      (g[0] & 0xfe00) === 0xfc00 || // unique local
      (g[0] & 0xffc0) === 0xfe80 || // link local
      (g[0] & 0xffc0) === 0xfec0 || // site local (deprecated)
      (g[0] & 0xff00) === 0xff00 // multicast
    );
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

const viaProxy = () => !!(process.env.HTTPS_PROXY || process.env.https_proxy);

/** Throws unless the URL is a public http(s) address. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Not a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only http and https addresses can be imported.');
  if (url.username || url.password) throw new Error('Addresses with credentials are not supported.');
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('Local addresses cannot be imported.');
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Private network addresses cannot be imported.');
    return url;
  }
  try {
    const addrs = await lookup(host, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) throw new Error('Private network addresses cannot be imported.');
  } catch (err) {
    // Behind an outbound proxy the name is resolved by the proxy, not here.
    if (err instanceof Error && err.message.startsWith('Private')) throw err;
    if (!viaProxy()) throw new Error(`Could not find ${host}.`);
  }
  return url;
}

async function fetchPublic(raw: string, accept: string): Promise<Response> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertPublicUrl(current);
    const res = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': USER_AGENT, accept, 'accept-language': 'en-US,en;q=0.8' },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location')!, url).toString();
      await res.body?.cancel();
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects.');
}

async function readCapped(res: Response, limit: number): Promise<Buffer> {
  const declared = Number(res.headers.get('content-length'));
  if (declared > limit) throw new Error('The response is too large to import.');
  const chunks: Buffer[] = [];
  let total = 0;
  if (!res.body) return Buffer.alloc(0);
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error('The response is too large to import.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}

const describe = (err: unknown) => {
  if (err instanceof Error) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'The shop took too long to answer.';
    if (err.message === 'fetch failed') return 'The shop could not be reached.';
    return err.message;
  }
  return 'The request failed.';
};

type Next = (err?: unknown) => void;

export function apiMiddleware() {
  return async (req: IncomingMessage, res: ServerResponse, next: Next) => {
    const reqUrl = new URL(req.url ?? '/', 'http://app.invalid');
    if (!reqUrl.pathname.startsWith('/api/')) return next();
    if (req.method !== 'GET') return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
    const target = reqUrl.searchParams.get('url') ?? '';

    if (reqUrl.pathname === '/api/health') return sendJson(res, 200, { ok: true });

    if (reqUrl.pathname === '/api/fetch') {
      try {
        const upstream = await fetchPublic(target, 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5');
        const type = upstream.headers.get('content-type') ?? '';
        if (!upstream.ok) {
          await upstream.body?.cancel();
          const why =
            upstream.status === 403 || upstream.status === 429 || upstream.status === 503
              ? `The shop refused the request (HTTP ${upstream.status}).`
              : upstream.status === 404
                ? 'The shop says that page does not exist (HTTP 404).'
                : `The shop answered with HTTP ${upstream.status}.`;
          return sendJson(res, 200, { ok: false, status: upstream.status, error: why });
        }
        if (!/html|json|javascript|text\/plain/i.test(type)) {
          await upstream.body?.cancel();
          return sendJson(res, 200, { ok: false, status: upstream.status, error: 'That address is not a web page.' });
        }
        const buf = await readCapped(upstream, MAX_HTML);
        const charset = /charset=([^;]+)/i.exec(type)?.[1]?.trim().replace(/"/g, '') ?? 'utf-8';
        let body: string;
        try {
          body = new TextDecoder(charset).decode(buf);
        } catch {
          body = buf.toString('utf8');
        }
        return sendJson(res, 200, { ok: true, status: upstream.status, finalUrl: upstream.url || target, body });
      } catch (err) {
        return sendJson(res, 200, { ok: false, error: describe(err) });
      }
    }

    if (reqUrl.pathname === '/api/image') {
      try {
        const upstream = await fetchPublic(target, 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8');
        const type = upstream.headers.get('content-type') ?? '';
        if (!upstream.ok || !/^image\/(png|jpe?g|webp|avif|gif)/i.test(type)) {
          await upstream.body?.cancel();
          res.writeHead(502, { 'content-type': 'text/plain' });
          return res.end('Not an image.');
        }
        const buf = await readCapped(upstream, MAX_IMAGE);
        res.writeHead(200, {
          'content-type': type.split(';')[0],
          'cache-control': 'public, max-age=86400',
          'x-content-type-options': 'nosniff',
          'content-security-policy': "default-src 'none'",
        });
        return res.end(buf);
      } catch (err) {
        res.writeHead(502, { 'content-type': 'text/plain' });
        return res.end(describe(err));
      }
    }

    return sendJson(res, 404, { ok: false, error: 'Unknown endpoint.' });
  };
}
