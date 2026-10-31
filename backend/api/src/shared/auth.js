let jwksCache = null;
const CACHE_TTL_MS = 10 * 60 * 1e3;
function clearJWKSCache() {
  jwksCache = null;
}
function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
function decodeJSON(b64url) {
  const bytes = base64UrlDecode(b64url);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text);
}
function extractBearer(request) {
  if (!request) return null;
  let authHeader = null;
  if (typeof request === "string") {
    authHeader = request;
  } else if (typeof request === "object" && "headers" in request && request.headers) {
    const headers = request.headers;
    if (typeof headers.get === "function") {
      authHeader = headers.get("authorization") || headers.get("Authorization");
    } else {
      authHeader = headers["authorization"] || headers["Authorization"] || headers["AUTHORIZATION"];
    }
  }
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}
async function fetchJWKS(supabaseUrl, customFetch) {
  const now = Date.now();
  if (jwksCache && now - jwksCache.fetchedAt < CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const fetchImpl = typeof customFetch === "function" ? customFetch : customFetch && typeof customFetch === "object" && typeof customFetch.fetch === "function" ? customFetch.fetch : globalThis.fetch;
  if (!fetchImpl) {
    throw new Error("No fetch implementation available");
  }
  const baseUrl = supabaseUrl.replace(/\/+$/, "");
  const jwksUrl = `${baseUrl}/auth/v1/.well-known/jwks.json`;
  const res = await fetchImpl(jwksUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch JWKS from ${jwksUrl}: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.keys)) {
    throw new Error("Invalid JWKS payload structure");
  }
  jwksCache = {
    keys: data.keys,
    fetchedAt: now
  };
  return jwksCache.keys;
}
async function verifyJWT(token, env, customFetch) {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT format");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  let payload;
  try {
    header = decodeJSON(headerB64);
  } catch (err) {
    throw new Error("Failed to parse JWT header");
  }
  try {
    payload = decodeJSON(payloadB64);
  } catch (err) {
    throw new Error("Failed to parse JWT payload");
  }
  if (header.alg !== "ES256") {
    throw new Error(`Unsupported algorithm: ${header.alg}`);
  }
  if (!header.kid) {
    throw new Error("Missing kid in JWT header");
  }
  const nowSec = Math.floor(Date.now() / 1e3);
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Token expired");
  }
  const expectedIss = `${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1`;
  if (payload.iss !== expectedIss) {
    throw new Error(`Invalid issuer: expected ${expectedIss}, got ${payload.iss}`);
  }
  const isAudValid = Array.isArray(payload.aud) ? payload.aud.includes("authenticated") : payload.aud === "authenticated";
  if (!isAudValid) {
    throw new Error("Invalid audience: expected authenticated");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Missing sub claim");
  }
  const keys = await fetchJWKS(env.SUPABASE_URL, customFetch);
  const matchingKey = keys.find((k) => k.kid === header.kid);
  if (!matchingKey) {
    throw new Error(`Key with kid '${header.kid}' not found in JWKS`);
  }
  let cryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      "jwk",
      matchingKey,
      {
        name: "ECDSA",
        namedCurve: "P-256"
      },
      false,
      ["verify"]
    );
  } catch (err) {
    throw new Error(`Failed to import JWK: ${err.message || err}`);
  }
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlDecode(signatureB64);
  const isValid = await crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: { name: "SHA-256" }
    },
    cryptoKey,
    signatureBytes,
    signedData
  );
  if (!isValid) {
    throw new Error("Invalid JWT signature");
  }
  return {
    sub: payload.sub,
    email: payload.email
  };
}
export {
  clearJWKSCache,
  extractBearer,
  verifyJWT
};
