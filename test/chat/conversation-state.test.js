import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationState } from '../../lib/chat/conversation-state.js';

test('conversation state reset preserves the system prompt', () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });
  state.append({ role: 'user', content: 'hello' });
  state.reset();

  assert.deepEqual(state.getMessages(), [
    { role: 'system', content: 'system prompt' }
  ]);
});

test('conversation state normalizes null assistant content', () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });
  state.append({ role: 'assistant', content: null });

  const messages = state.getMessages();
  assert.equal(messages[1].content, '');
});

test('conversation state builds provider payload from recent user turns and truncates tool content', () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });
  state.append({ role: 'user', content: 'first' });
  state.append({ role: 'assistant', content: 'drafting', tool_calls: [{ id: 't1', function: { name: 'x', arguments: '{}' } }] });
  state.append({ role: 'tool', content: '1234567890', tool_call_id: 't1' });
  state.append({ role: 'assistant', content: 'done first' });
  state.append({ role: 'user', content: 'second' });
  state.append({ role: 'assistant', content: 'done second' });

  const providerMessages = state.getMessagesForProvider({
    maxUserMessages: 1,
    toolContentCharLimit: 5
  });

  assert.deepEqual(providerMessages, [
    { role: 'system', content: 'system prompt' },
    { role: 'user', content: 'second' },
    { role: 'assistant', content: 'done second' }
  ]);
});
