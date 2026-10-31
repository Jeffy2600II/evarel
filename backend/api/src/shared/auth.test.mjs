import assert from 'node:assert/strict';
import { verifyJWT, extractBearer, clearJWKSCache } from './auth.js';

function base64UrlEncode(buffer) {
  let bytes;
  if (typeof buffer === 'string') {
    bytes = new TextEncoder().encode(buffer);
  } else if (buffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(buffer);
  } else {
    bytes = buffer;
  }
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function createKeyPairAndJWK(kid = 'key-1') {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );

  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
  publicJwk.kid = kid;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';

  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicJwk,
    kid
  };
}

async function makeJWT(header, payload, privateKey) {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    data
  );

  const sigB64 = base64UrlEncode(signature);
  return `${headerB64}.${payloadB64}.${sigB64}`;
}

async function runTests() {
  console.log('--- Starting Auth Unit Tests ---');
  const env = { SUPABASE_URL: 'https://test.supabase.co' };
  const keyData = await createKeyPairAndJWK('key-1');
  const keyData2 = await createKeyPairAndJWK('key-2');

  const createMockFetch = (jwksKeys) => {
    return async (url) => {
      assert.equal(url, 'https://test.supabase.co/auth/v1/.well-known/jwks.json');
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ keys: jwksKeys })
      };
    };
  };

  const defaultFetch = createMockFetch([keyData.publicJwk]);

  // Test 1: valid passes
  {
    clearJWKSCache();
    const header = { alg: 'ES256', typ: 'JWT', kid: keyData.kid };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = await makeJWT(header, payload, keyData.privateKey);
    const res = await verifyJWT(token, env, defaultFetch);
    assert.deepEqual(res, { sub: 'usr_12345', email: 'user@example.com' });
    console.log('✓ valid passes');
  }

  // Test 2: expired fails
  {
    clearJWKSCache();
    const header = { alg: 'ES256', typ: 'JWT', kid: keyData.kid };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) - 100
    };
    const token = await makeJWT(header, payload, keyData.privateKey);
    await assert.rejects(
      async () => verifyJWT(token, env, defaultFetch),
      /Token expired/
    );
    console.log('✓ expired fails');
  }

  // Test 3: bad signature fails
  {
    clearJWKSCache();
    const header = { alg: 'ES256', typ: 'JWT', kid: keyData.kid };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    // Signed with keyData2.privateKey, but JWKS will serve keyData.publicJwk
    const token = await makeJWT(header, payload, keyData2.privateKey);
    await assert.rejects(
      async () => verifyJWT(token, env, defaultFetch),
      /Invalid JWT signature/
    );
    console.log('✓ bad signature fails');
  }

  // Test 4: wrong kid fails
  {
    clearJWKSCache();
    const header = { alg: 'ES256', typ: 'JWT', kid: 'unknown-kid' };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = await makeJWT(header, payload, keyData.privateKey);
    await assert.rejects(
      async () => verifyJWT(token, env, defaultFetch),
      /not found in JWKS/
    );
    console.log('✓ wrong kid fails');
  }

  // Test 5: wrong iss fails
  {
    clearJWKSCache();
    const header = { alg: 'ES256', typ: 'JWT', kid: keyData.kid };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://wrong-domain.com/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = await makeJWT(header, payload, keyData.privateKey);
    await assert.rejects(
      async () => verifyJWT(token, env, defaultFetch),
      /Invalid issuer/
    );
    console.log('✓ wrong iss fails');
  }

  // Test 6: wrong aud fails
  {
    clearJWKSCache();
    const header = { alg: 'ES256', typ: 'JWT', kid: keyData.kid };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'unauthenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const token = await makeJWT(header, payload, keyData.privateKey);
    await assert.rejects(
      async () => verifyJWT(token, env, defaultFetch),
      /Invalid audience/
    );
    console.log('✓ wrong aud fails');
  }

  // Test 7: alg none/HS256 header rejected
  {
    clearJWKSCache();
    // Test alg: none
    const headerNone = { alg: 'none', typ: 'JWT', kid: keyData.kid };
    const payload = {
      sub: 'usr_12345',
      email: 'user@example.com',
      iss: 'https://test.supabase.co/auth/v1',
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const tokenNone = await makeJWT(headerNone, payload, keyData.privateKey);
    await assert.rejects(
      async () => verifyJWT(tokenNone, env, defaultFetch),
      /Unsupported algorithm: none/
    );

    // Test alg: HS256
    const headerHS = { alg: 'HS256', typ: 'JWT', kid: keyData.kid };
    const tokenHS = await makeJWT(headerHS, payload, keyData.privateKey);
    await assert.rejects(
      async () => verifyJWT(tokenHS, env, defaultFetch),
      /Unsupported algorithm: HS256/
    );
    console.log('✓ alg none/HS256 header rejected');
  }

  // Test extractBearer
  {
    assert.equal(extractBearer('Bearer token123'), 'token123');
    assert.equal(extractBearer('bearer token456'), 'token456');
    assert.equal(extractBearer({ headers: { authorization: 'Bearer token789' } }), 'token789');
    assert.equal(extractBearer({ headers: { Authorization: 'Bearer tokenABC' } }), 'tokenABC');
    assert.equal(extractBearer(null), null);
    assert.equal(extractBearer('Basic xyz'), null);
    console.log('✓ extractBearer passes');
  }

  console.log('--- All Auth Unit Tests Passed Successfully ---');
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
