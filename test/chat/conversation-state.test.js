import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationState } from '../../lib/chat/conversation-state.js';

test('conversation state reset preserves the system prompt', () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });

  state.append({ role: 'user', content: 'hello' });
  const resetMessages = state.reset();

  assert.equal(resetMessages.length, 1);
  assert.deepEqual(resetMessages[0], { role: 'system', content: 'system prompt' });
});

test('conversation state normalizes null assistant content', () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });

  state.append({ role: 'assistant', content: null });
  const messages = state.getMessages();

  assert.equal(messages[1].content, '');
});

test('conversation state compacts context while preserving the system prompt', () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });

  state.append({ role: 'user', content: 'u1' });
  state.append({ role: 'assistant', content: 'a1' });
  state.append({ role: 'tool', content: '0123456789abcdef' });
  state.append({ role: 'user', content: 'u2' });

  const messages = state.getMessages({ maxMessages: 3, toolContentCharLimit: 8 });

  assert.equal(messages.length, 3);
  assert.deepEqual(messages[0], { role: 'system', content: 'system prompt' });
  assert.equal(messages[1].role, 'tool');
  assert.match(messages[1].content, /truncated/);
  assert.deepEqual(messages[2], { role: 'user', content: 'u2' });
});
