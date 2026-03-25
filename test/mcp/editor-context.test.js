import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchPattern,
  getDocumentPayload,
  listWorkspaceRoots,
  resolveWorkspaceRoot
} from '../../lib/mcp/tools/editor-context.js';

function createPathModule() {
  return {
    sep: '/',
    basename(value) {
      return value.split('/').filter(Boolean).pop() || '';
    },
    resolve(value) {
      return value.replace(/\/+/g, '/');
    },
    relative(from, to) {
      if (from === to) {
        return '';
      }
      if (to.startsWith(`${from}/`)) {
        return to.slice(from.length + 1);
      }
      return `../${to}`;
    },
    isAbsolute(value) {
      return value.startsWith('/');
    }
  };
}

test('buildSearchPattern escapes plain text and applies requested flags', () => {
  const plain = buildSearchPattern('a+b', { regex: false, caseSensitive: false, global: true });
  assert.equal(plain.source, 'a\\+b');
  assert.equal(plain.flags, 'gi');

  const regex = buildSearchPattern('a+b', { regex: true, caseSensitive: true, global: false });
  assert.equal(regex.source, 'a+b');
  assert.equal(regex.flags, '');
});

test('getDocumentPayload preserves 1-based line numbering', () => {
  const payload = getDocumentPayload({
    getText() {
      return 'alpha\nbeta';
    }
  });

  assert.equal(payload.lineCount, 2);
  assert.deepEqual(payload.lines, [
    { n: 1, text: 'alpha' },
    { n: 2, text: 'beta' }
  ]);
});

test('resolveWorkspaceRoot selects the requested project name in a multi-root workspace', () => {
  const result = resolveWorkspaceRoot({ projectName: 'beta' }, {
    getRoots() {
      return ['/workspace/alpha', '/workspace/beta'];
    },
    pathModule: createPathModule()
  });

  assert.deepEqual(result, {
    rootPath: '/workspace/beta',
    rootName: 'beta',
    strategy: 'projectName'
  });
});

test('listWorkspaceRoots marks the active root based on the active file path', () => {
  const result = listWorkspaceRoots({
    getRoots() {
      return ['/workspace/alpha', '/workspace/beta'];
    },
    activeFilePath: '/workspace/beta/src/index.js',
    pathModule: createPathModule()
  });

  assert.deepEqual(result, [
    { name: 'alpha', path: '/workspace/alpha', isActive: false },
    { name: 'beta', path: '/workspace/beta', isActive: true }
  ]);
});
