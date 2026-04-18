import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequestScheduler } from '../../lib/chat/request-scheduler.js';

test('request scheduler serializes tasks and enforces a minimum gap', async () => {
  let now = 0;
  const sleeps = [];
  const scheduler = createRequestScheduler({
    getMinGapMs: () => 50,
    nowImpl: () => now,
    sleepImpl: async (ms) => {
      sleeps.push(ms);
      now += ms;
    }
  });

  const events = [];
  await Promise.all([
    scheduler.enqueue(async () => {
      events.push(['start', 'a', now]);
      now += 10;
      events.push(['end', 'a', now]);
      return 'a';
    }),
    scheduler.enqueue(async () => {
      events.push(['start', 'b', now]);
      now += 5;
      events.push(['end', 'b', now]);
      return 'b';
    })
  ]);

  assert.deepEqual(sleeps, [50]);
  assert.deepEqual(events, [
    ['start', 'a', 0],
    ['end', 'a', 10],
    ['start', 'b', 60],
    ['end', 'b', 65]
  ]);
});

test('request scheduler honors retry-after style cooldowns after errors', async () => {
  let now = 0;
  const sleeps = [];
  const scheduler = createRequestScheduler({
    nowImpl: () => now,
    sleepImpl: async (ms) => {
      sleeps.push(ms);
      now += ms;
    }
  });

  await assert.rejects(() => scheduler.enqueue(async () => {
    const error = new Error('Rate limited');
    error.retryAfterMs = 120;
    throw error;
  }));

  await scheduler.enqueue(async () => {
    now += 1;
  });

  assert.deepEqual(sleeps, [120]);
});
