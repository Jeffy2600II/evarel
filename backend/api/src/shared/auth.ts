export interface AuthEnv {
  SUPABASE_URL: string;
}

export interface JWK {
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  kid?: string;
  alg?: string;
  use?: string;
  [key: string]: unknown;
}

export interface JWKSResponse {
  keys: JWK[];
}

interface JWKSCache {
  keys: JWK[];
  fetchedAt: number;
}

let jwksCache: JWKSCache | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function clearJWKSCache(): void {
  jwksCache = null;
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function decodeJSON<T>(b64url: string): T {
  const bytes = base64UrlDecode(b64url);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

export function extractBearer(
  request: Request | { headers: Headers | Record<string, string | undefined> | { get(name: string): string | null } } | string | null | undefined
): string | null {
  if (!request) return null;
  let authHeader: string | null | undefined = null;
  if (typeof request === 'string') {
    authHeader = request;
  } else if (typeof request === 'object' && 'headers' in request && request.headers) {
    const headers = request.headers as any;
    if (typeof headers.get === 'function') {
      authHeader = headers.get('authorization') || headers.get('Authorization');
    } else {
      authHeader = headers['authorization'] || headers['Authorization'] || headers['AUTHORIZATION'];
    }
  }
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function fetchJWKS(
  supabaseUrl: string,
  customFetch?: typeof fetch | { fetch?: typeof fetch }
): Promise<JWK[]> {
  const now = Date.now();
  if (jwksCache && (now - jwksCache.fetchedAt < CACHE_TTL_MS)) {
    return jwksCache.keys;
  }

  const fetchImpl = typeof customFetch === 'function'
    ? customFetch
    : (customFetch && typeof customFetch === 'object' && typeof customFetch.fetch === 'function')
      ? customFetch.fetch
      : globalThis.fetch;

  if (!fetchImpl) {
    throw new Error('No fetch implementation available');
  }

  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const jwksUrl = `${baseUrl}/auth/v1/.well-known/jwks.json`;

  const res = await fetchImpl(jwksUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUrl}: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as JWKSResponse;
  if (!data || !Array.isArray(data.keys)) {
    throw new Error('Invalid JWKS payload structure');
  }

  jwksCache = {
    keys: data.keys,
    fetchedAt: now
  };

  return jwksCache.keys;
}

export async function verifyJWT(
  token: string,
  env: AuthEnv,
  customFetch?: typeof fetch | { fetch?: typeof fetch }
): Promise<{ sub: string; email?: string }> {
  if (!token || typeof token !== 'string') {
    throw new Error('Invalid token');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  let header: { alg?: string; kid?: string; typ?: string };
  let payload: { sub?: string; email?: string; exp?: number; iss?: string; aud?: string | string[]; [key: string]: any };

  try {
    header = decodeJSON(headerB64);
  } catch (err) {
    throw new Error('Failed to parse JWT header');
  }

  try {
    payload = decodeJSON(payloadB64);
  } catch (err) {
    throw new Error('Failed to parse JWT payload');
  }

  if (header.alg !== 'ES256') {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }

  if (!header.kid) {
    throw new Error('Missing kid in JWT header');
  }

  // Claim validations
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Token expired');
  }

  const expectedIss = `${env.SUPABASE_URL.replace(/\/+$/, '')}/auth/v1`;
  if (payload.iss !== expectedIss) {
    throw new Error(`Invalid issuer: expected ${expectedIss}, got ${payload.iss}`);
  }

  const isAudValid = Array.isArray(payload.aud)
    ? payload.aud.includes('authenticated')
    : payload.aud === 'authenticated';
  if (!isAudValid) {
    throw new Error('Invalid audience: expected authenticated');
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Missing sub claim');
  }

  // Fetch JWKS and find matching key
  const keys = await fetchJWKS(env.SUPABASE_URL, customFetch);
  const matchingKey = keys.find(k => k.kid === header.kid);
  if (!matchingKey) {
    throw new Error(`Key with kid '${header.kid}' not found in JWKS`);
  }

  // Import key using WebCrypto
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'jwk',
      matchingKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      false,
      ['verify']
    );
  } catch (err: any) {
    throw new Error(`Failed to import JWK: ${err.message || err}`);
  }

  // Verify signature
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlDecode(signatureB64);

  const isValid = await crypto.subtle.verify(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' }
    },
    cryptoKey,
    signatureBytes,
    signedData
  );

  if (!isValid) {
    throw new Error('Invalid JWT signature');
  }

  return {
    sub: payload.sub,
    email: payload.email
  };
}
