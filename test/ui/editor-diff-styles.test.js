import test from 'node:test';
import assert from 'node:assert/strict';
import { getEditorDiffStyleSheetText } from '../../lib/ui/editor-diff-styles.js';

test('editor diff stylesheet does not use deprecated shadow selectors', () => {
  const stylesheet = getEditorDiffStyleSheetText();

  assert.doesNotMatch(stylesheet, /::shadow/);
  assert.match(stylesheet, /atom-text-editor\.editor \.mcp-diff-added/);
  assert.match(stylesheet, /atom-text-editor\.editor \.mcp-diff-removed/);
});
