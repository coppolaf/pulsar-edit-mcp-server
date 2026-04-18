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

test('model client surfaces HTTP status and provider error message', async () => {
  const client = createModelClient({
    fetchImpl: async () => createJsonResponse({
      ok: false,
      status: 429,
      statusText: '',
      body: { error: { message: 'Rate limit exceeded.' } }
    }),
    getConfig: () => ({ apiEndpointPrefix: 'https://api.example.com', apiKey: 'secret' }),
    sleepImpl: async () => {},
    maxRetries: 0
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
    getConfig: () => ({ apiEndpointPrefix: 'https://api.example.com', apiKey: 'secret' }),
    sleepImpl: async (ms) => { delays.push(ms); },
    maxRetries: 1
  });

  const result = await client.createChatCompletion({ model: 'gpt-test', messages: [], tools: [] });

  assert.equal(attempts, 2);
  assert.deepEqual(delays, [0]);
  assert.equal(result.choices[0].message.content, 'ok');
});
