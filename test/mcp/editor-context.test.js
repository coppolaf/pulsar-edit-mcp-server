import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSearchPattern, getDocumentPayload } from '../../lib/mcp/tools/editor-context.js';

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
