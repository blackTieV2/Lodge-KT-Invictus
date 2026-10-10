// Access verifies the login; this origin also verifies the signed assertion.
const cache = new Map();
const decode = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
export async function authenticate(request, env) {
  const issuer = env.ACCESS_ISSUER;
  let roles;
  try { roles = JSON.parse(env.OFFICER_ROLES || ''); } catch { /* fail closed below */ }
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer || '') ||
      !env.ACCESS_AUD || !roles || Array.isArray(roles) || typeof roles !== 'object') {
    throw new HttpError(503, 'Online access is not configured. No register data has been exposed.');
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 20000) throw new HttpError(401, 'Please sign in to continue.');
  let header, claims, parts;
  try {
    parts = token.split('.');
    if (parts.length !== 3 || parts.some(x => !/^[A-Za-z0-9_-]+$/.test(x))) throw Error();
    header = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(decode(parts[1])));
    const now = Date.now() / 1000;
    if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.crit ||
        claims.iss !== issuer || !Array.isArray(claims.aud) || !claims.aud.includes(env.ACCESS_AUD) ||
        !Number.isFinite(claims.exp) || claims.exp <= now ||
        !Number.isFinite(claims.iat) || claims.iat > now + 30 ||
        (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now + 30)) ||
        typeof claims.sub !== 'string' || !claims.sub || typeof claims.email !== 'string') throw Error();
  } catch { throw new HttpError(401, 'Sign-in is invalid or expired. Please sign in again.'); }
  let entry = cache.get(issuer);
  // Bounded refresh on rotation; unknown key IDs cannot force unlimited fetches.
  if (!entry || Date.now() - entry.at > 300000 ||
      (!entry.keys.some(k => k.kid === header.kid) && Date.now() - entry.at > 30000)) {
    try {
      // Workerd supports manual redirects; reject non-2xx below without following
      // another location. Do not use redirect:'error' (rejected by the runtime).
      const response = await fetch(issuer + '/cdn-cgi/access/certs', { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw Error();
      const body = await response.json();
      if (!Array.isArray(body.keys) || body.keys.length > 20) throw Error();
      entry = { at: Date.now(), keys: body.keys }; cache.set(issuer, entry);
    } catch { throw new HttpError(503, 'Sign-in verification is temporarily unavailable.'); }
  }
  try {
    const jwk = entry.keys.find(k => k.kid === header.kid && k.kty === 'RSA' && (!k.alg || k.alg === 'RS256'));
    if (!jwk) throw Error();
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, decode(parts[2]), new TextEncoder().encode(parts[0] + '.' + parts[1]))) throw Error();
  } catch { throw new HttpError(401, 'Sign-in could not be verified.'); }
  const email = claims.email.trim().toLowerCase();
  const role = Object.hasOwn(roles, email) ? roles[email] : '';
  if (!['admin', 'registrar', 'treasurer', 'viewer'].includes(role)) throw new HttpError(403, 'This account has not been granted register access.');
  return { email, role };
}
