import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLocalPostToolResponse,
  shouldShortCircuitPostTool
} from '../../lib/chat/post-tool-response.js';

test('post-tool response policy short-circuits deterministic apply-proposal results', () => {
  const executions = [{
    name: 'apply-proposal',
    result: { content: [{ type: 'text', text: 'Replaced 1 match. proposalId: proposal-1' }] }
  }];

  assert.equal(shouldShortCircuitPostTool(executions), true);
  assert.equal(buildLocalPostToolResponse(executions), 'Replaced 1 match. proposalId: proposal-1');
});

test('post-tool response policy keeps non-deterministic read tools on provider loop', () => {
  assert.equal(shouldShortCircuitPostTool([{ name: 'get-document', result: { content: [] } }]), false);
});
