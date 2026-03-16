import test from 'node:test';
import assert from 'node:assert/strict';
import { createToolCatalog } from '../../lib/chat/tool-catalog.js';

test('tool catalog caches adapted MCP tools per client', async () => {
  const catalog = createToolCatalog();
  let calls = 0;
  const client = {
    async listTools() {
      calls += 1;
      return {
        tools: [
          {
            name: 'get-document',
            description: 'Read the active document',
            inputSchema: { type: 'object', properties: {} }
          }
        ]
      };
    }
  };

  const first = await catalog.getTools(client);
  const second = await catalog.getTools(client);

  assert.equal(calls, 1);
  assert.deepEqual(first, second);
  assert.equal(first[0].function.name, 'get-document');
});
