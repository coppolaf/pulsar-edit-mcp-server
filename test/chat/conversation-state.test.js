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
