// Central fetch helper: preserves RestroNex JWT ?token= AND forwards E2B traffic token for Arena preview
export function getPreviewToken(): string | null {
  try {
    const p = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const tok = p.get('token');
    if (tok) {
      try { localStorage.setItem('restronex_preview_token', tok); } catch {}
      return tok;
    }
    try { return localStorage.getItem('restronex_preview_token'); } catch { return null; }
  } catch { return null; }
}
export function getE2BTrafficToken(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const p = new URLSearchParams(window.location.search);
    // E2B docs: header 'e2b-traffic-access-token' — Arena may also pass as ?e2b_token, ?tokenE2B, ?access_token or via parent
    const candidates = [
      p.get('e2b-traffic-access-token'),
      p.get('e2b_traffic_access_token'),
      p.get('e2bToken'),
      p.get('e2b_token'),
      // try hash fragment (Arena sometimes injects there)
      new URLSearchParams(window.location.hash.replace(/^#/, '')).get('e2b-traffic-access-token'),
    ].filter(Boolean) as string[];
    if (candidates[0]) {
      try { localStorage.setItem('e2b_traffic_token', candidates[0]); } catch {}
      return candidates[0];
    }
    try {
      const stored = localStorage.getItem('e2b_traffic_token');
      if (stored) return stored;
    } catch {}
    // Also check if Arena exposed token on window (some proxies set window.__E2B_TOKEN__)
    const w = window as unknown as Record<string, unknown>;
    if (typeof w['__E2B_TOKEN__'] === 'string') return w['__E2B_TOKEN__'] as string;
    if (typeof w['E2B_TRAFFIC_TOKEN'] === 'string') return w['E2B_TRAFFIC_TOKEN'] as string;
    return null;
  } catch { return null; }
}
export function withPreviewToken(url: string): string {
  try {
    const tok = getPreviewToken();
    if (!tok) return url;
    if (url.includes('token=')) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}token=${encodeURIComponent(tok)}`;
  } catch { return url; }
}
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = withPreviewToken(input);
  const headers: Record<string,string> = { ...(init?.headers as Record<string,string> || {}) };
  // Forward E2B edge token if we have it — prevents outer 403 when sandbox allowPublicTraffic=false
  const e2b = getE2BTrafficToken();
  if (e2b && !headers['e2b-traffic-access-token']) headers['e2b-traffic-access-token'] = e2b;
  return fetch(url, { ...init, headers, credentials: 'same-origin' });
}
// For direct SDK use (Node): sandbox.getHost + header pattern you pasted
// const sandbox = await Sandbox.create({ network:{ allowPublicTraffic:false }});
// const host = sandbox.getHost(3000);
// await fetch(`https://${host}/api/orders`, { headers:{ 'e2b-traffic-access-token': sandbox.trafficAccessToken }});
