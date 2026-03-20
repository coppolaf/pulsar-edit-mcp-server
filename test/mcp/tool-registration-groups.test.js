import test from 'node:test';
import assert from 'node:assert/strict';
import { registerReadTools } from '../../lib/mcp/tools/register-read-tools.js';
import { registerNavigationTools } from '../../lib/mcp/tools/register-navigation-tools.js';
import { registerWriteTools } from '../../lib/mcp/tools/register-write-tools.js';

function createFakeServer() {
  const names = [];
  return {
    names,
    registerTool(name) {
      names.push(name);
    }
  };
}

test('read, navigation and write tool groups register the expected tools', () => {
  const readServer = createFakeServer();
  registerReadTools(readServer);
  assert.deepEqual(readServer.names, [
    'get-context-around',
    'find-text',
    'get-selection',
    'get-document',
    'get-line-count',
    'get-filename',
    'get-full-path'
  ]);

  const navigationServer = createFakeServer();
  registerNavigationTools(navigationServer);
  assert.deepEqual(navigationServer.names, [
    'get-project-files',
    'open-file'
  ]);

  const writeServer = createFakeServer();
  registerWriteTools(writeServer, {
    diffHighlighter: {
      decorateEditedLines() {},
      decorateLine() {}
    }
  });
  assert.deepEqual(writeServer.names, [
    'replace-text',
    'replace-document',
    'insert-line',
    'insert-text-at-line',
    'delete-line',
    'delete-line-range',
    'undo',
    'redo',
    'get-pending-proposals',
    'get-proposal',
    'get-write-policy',
    'apply-proposal'
  ]);
});
