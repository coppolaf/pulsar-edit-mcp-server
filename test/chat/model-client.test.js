import test from 'node:test';
import assert from 'node:assert/strict';
import { createModelClient } from '../../lib/chat/model-client.js';

function createJsonResponse({ ok = true, status = 200, statusText = 'OK', body = {}, headers = {} } = {}) {
  return {
    ok,
    status,
    statusText,
    headers: {
      get(name) {
        return headers[String(name).toLowerCase()] ?? null;
      }
    },
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    }
  };
}

function createConfig(overrides = {}) {
  return {
    apiEndpointPrefix: 'https://api.example.com',
    apiKey: 'secret',
    providerTimeoutMs: 30000,
    chatMaxRetries: 0,
    chatRetryBaseDelayMs: 750,
    ...overrides
  };
}

test('model client surfaces HTTP status and provider error message', async () => {
  const client = createModelClient({
    fetchImpl: async () => createJsonResponse({
      ok: false,
      status: 429,
      statusText: '',
      body: { error: { message: 'Rate limit exceeded.' } }
    }),
    getConfig: () => createConfig({ chatMaxRetries: 0 }),
    sleepImpl: async () => {}
  });

  await assert.rejects(
    () => client.createChatCompletion({ model: 'gpt-test', messages: [], tools: [] }),
    (error) => {
      assert.equal(error.name, 'HttpError');
      assert.equal(error.status, 429);
      assert.match(error.message, /HTTP 429/);
      assert.match(error.message, /Rate limit exceeded/);
      return true;
    }
  );
});

test('model client retries retryable responses before succeeding', async () => {
  let attempts = 0;
  const delays = [];
  const client = createModelClient({
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) {
        return createJsonResponse({
          ok: false,
          status: 429,
          statusText: '',
          body: { error: { message: 'Too many requests' } },
          headers: { 'retry-after': '0' }
        });
      }

      return createJsonResponse({
        body: {
          choices: [{ message: { role: 'assistant', content: 'ok' } }]
        }
      });
    },
    getConfig: () => createConfig({ chatMaxRetries: 1 }),
    sleepImpl: async (ms) => { delays.push(ms); }
  });

  const result = await client.createChatCompletion({ model: 'gpt-test', messages: [], tools: [] });

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [0]);
  assert.equal(result.choices[0].message.content, 'ok');
});

test('model client converts aborted fetches into timeout errors', async () => {
  const client = createModelClient({
    fetchImpl: async (_url, init) => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    },
    getConfig: () => createConfig({ providerTimeoutMs: 1234, chatMaxRetries: 0 }),
    sleepImpl: async () => {}
  });

  await assert.rejects(
    () => client.createChatCompletion({ model: 'gpt-test', messages: [], tools: [] }),
    (error) => {
      assert.equal(error.name, 'TimeoutError');
      assert.equal(error.status, 408);
      assert.equal(error.retryAfterMs, 1234);
      assert.match(error.message, /1234/);
      return true;
    }
  );
});
