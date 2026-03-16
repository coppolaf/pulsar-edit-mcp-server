import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationState } from '../../lib/chat/conversation-state.js';
import { createChatOrchestrator } from '../../lib/chat/chat-orchestrator.js';

test('orchestrator resolves tool calls and renders assistant reply', async () => {
  const state = createConversationState({ systemPrompt: 'system prompt' });
  const rendered = [];
  const chatDisplay = {
    appendChild(node) {
      rendered.push(node);
    }
  };

  global.document = {
    createElement() {
      return {
        classList: { add() {} },
        querySelectorAll() { return []; },
        scrollIntoView() {}
      };
    }
  };

  const marked = { parse: (text) => `<p>${text}</p>` };
  const DOMPurify = { sanitize: (html) => html };

  let completions = 0;
  const modelClient = {
    async createChatCompletion() {
      completions += 1;
      if (completions === 1) {
        return {
          choices: [{
            message: {
              role: 'assistant',
              content: '',
              tool_calls: [{
                id: 'tool-1',
                function: {
                  name: 'get-document',
                  arguments: JSON.stringify({})
                }
              }]
            }
          }]
        };
      }

      return {
        choices: [{
          message: {
            role: 'assistant',
            content: 'done'
          }
        }]
      };
    }
  };

  const toolCatalog = { async getTools() { return []; } };
  const orchestrator = createChatOrchestrator({
    conversationState: state,
    modelClient,
    toolCatalog
  });

  const toolCalls = [];
  const thinkingEvents = [];
  const result = await orchestrator.handleSendMessage({
    chatObj: { thinkingOnOff(value) { thinkingEvents.push(value); } },
    chatDisplay,
    marked,
    DOMPurify,
    message: 'hello',
    model: 'gpt-4o',
    mcpClient: {
      async callTool(input) {
        toolCalls.push(input);
        return { content: [{ type: 'text', text: 'file content' }] };
      }
    }
  });

  assert.equal(result, 'done');
  assert.equal(completions, 2);
  assert.deepEqual(toolCalls, [{ name: 'get-document', arguments: {} }]);
  assert.deepEqual(thinkingEvents, [true, false]);
  assert.equal(rendered.length, 2);
});
