const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function compile(relativePath, mocks = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: (name) => { assert.ok(name in mocks, `Unexpected import: ${name}`); return mocks[name]; },
    process: { env: { NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:9' } },
  });
  return module.exports;
}

function harness({ refreshFails = false, writeDenied = false, networkFailure = false } = {}) {
  const state = { auth: { accessToken: 'qa-expired-token' } };
  const calls = [];
  const api = { getState: () => state, dispatch(action) {
    if (action.type === 'set') state.auth.accessToken = action.payload.accessToken;
    if (action.type === 'clear') state.auth.accessToken = null;
  } };
  const refresh = compile('src/shared/store/refresh-session.ts');
  const { baseApi } = compile('src/shared/store/base-api.ts', {
    '@reduxjs/toolkit/query/react': {
      createApi: (configuration) => configuration,
      fetchBaseQuery: (configuration) => async (args) => {
        const request = typeof args === 'string' ? { url: args } : args;
        calls.push({ method: request.method || 'GET', url: request.url, credential: Boolean(request.body?.apiKey) });
        if (request.url === '/api/v1/auth/refresh') {
          await new Promise((resolve) => setImmediate(resolve));
          return refreshFails ? { error: { status: 401 } } : { data: { accessToken: 'qa-fresh-token', user: { id: 1 } } };
        }
        const headers = new Map();
        configuration.prepareHeaders?.(headers, api);
        if (networkFailure) return { error: { status: 'FETCH_ERROR' } };
        if (writeDenied || headers.get('authorization') !== 'Bearer qa-fresh-token') return { error: { status: 401 } };
        return { data: { configured: true } };
      },
    },
    '@shared/config/api-routes': { API_ROUTES: { AUTH: {
      LOGIN: '/api/v1/auth/login', REFRESH: '/api/v1/auth/refresh', LOGOUT: '/api/v1/auth/logout',
    } } },
    './refresh-session': refresh,
    './auth-slice': { setCredentials: (payload) => ({ type: 'set', payload }), clearCredentials: () => ({ type: 'clear' }) },
  });
  const submit = () => baseApi.baseQuery({
    url: '/api/v1/registrars/namesilo/profiles/qa-main', method: 'PUT', body: { apiKey: 'qa-test-key-only' },
  }, api, { skipReauthRetry: true, refreshBeforeRequest: true });
  return { submit, calls, state, baseApi, api };
}

test('expired access is refreshed before one credential submission', async () => {
  const h = harness(); const result = await h.submit();
  assert.equal(result.data.configured, true);
  assert.deepEqual(h.calls.map((c) => c.method), ['POST', 'PUT']);
  assert.equal(h.calls.filter((c) => c.credential).length, 1);
});

test('failed refresh prevents credential transmission', async () => {
  const h = harness({ refreshFails: true }); const result = await h.submit();
  assert.equal(result.error.status, 401); assert.equal(h.state.auth.accessToken, null);
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].credential, false);
});

test('a denied credential request is never replayed', async () => {
  const h = harness({ writeDenied: true }); const result = await h.submit();
  assert.equal(result.error.status, 401);
  assert.deepEqual(h.calls.map((c) => c.method), ['POST', 'PUT']);
});

test('network failure never retries the credential request', async () => {
  const h = harness({ networkFailure: true }); const result = await h.submit();
  assert.equal(result.error.status, 'FETCH_ERROR'); assert.equal(h.calls.filter((c) => c.credential).length, 1);
});

test('concurrent requests share one refresh while each explicit write is sent once', async () => {
  const h = harness(); const results = await Promise.all([h.submit(), h.submit()]);
  assert.ok(results.every((r) => r.data.configured));
  assert.equal(h.calls.filter((c) => c.url === '/api/v1/auth/refresh').length, 1);
  assert.equal(h.calls.filter((c) => c.credential).length, 2);
});

test('ordinary reads retain existing refresh and retry behavior', async () => {
  const h = harness(); const result = await h.baseApi.baseQuery('/api/v1/projects', h.api, {});
  assert.equal(result.data.configured, true);
  assert.deepEqual(h.calls.map((c) => c.method), ['GET', 'POST', 'GET']);
});
