'use babel';

import {
  buildSearchPattern,
  getActiveEditorOrThrow,
  getActiveBufferOrThrow,
  getDocumentPayload,
  getActiveFileName,
  getActiveFilePath
} from './editor-context.js';

export function createDocumentReadService({
  getEditor = getActiveEditorOrThrow,
  getBuffer = getActiveBufferOrThrow,
  createSearchPattern = buildSearchPattern,
  createDocumentPayload = getDocumentPayload,
  getFilename = getActiveFileName,
  getFullPath = getActiveFilePath
} = {}) {
  function getContextAround({ query, regex = false, caseSensitive = false, radiusLines = 5, occurrence = 1 }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const totalLines = buffer.getLineCount();
    const pattern = createSearchPattern(query, { regex, caseSensitive });
    const ranges = buffer.findAllSync(pattern);

    if (ranges.length === 0) {
      throw new Error('No matches for query.');
    }

    if (occurrence < 1 || occurrence > ranges.length) {
      throw new Error(`occurrence (${occurrence}) is out of range (1–${ranges.length}).`);
    }

    const range = ranges[occurrence - 1];
    const startRow = range.start.row;
    const endRow = range.end.row;
    const contextStart = Math.max(0, startRow - radiusLines);
    const contextEnd = Math.min(totalLines - 1, endRow + radiusLines);
    const lines = buffer.getTextInRange([
      [contextStart, 0],
      [contextEnd, buffer.lineLengthForRow(contextEnd)]
    ]).split(/\r?\n/);

    return {
      before: lines.slice(0, startRow - contextStart),
      match: lines.slice(startRow - contextStart, endRow - contextStart + 1),
      after: lines.slice(endRow - contextStart + 1),
      matchStartLine: startRow + 1,
      matchEndLine: endRow + 1
    };
  }

  function findText({ query, regex = false, caseSensitive = false, maxMatches = 50 }) {
    const buffer = getBuffer();
    const pattern = createSearchPattern(query, { regex, caseSensitive });
    const ranges = buffer.findAllSync(pattern, { limit: maxMatches }) || [];

    return ranges.map((range) => ({
      startLine: range.start.row + 1,
      startCol: range.start.column + 1,
      endLine: range.end.row + 1,
      endCol: range.end.column + 1
    }));
  }

  function getSelection() {
    const editor = getEditor();
    return editor.getSelectedText() || '[no text selected]';
  }

  function getDocument() {
    return createDocumentPayload(getEditor());
  }

  function getLineCount() {
    return getBuffer().getLineCount();
  }

  function getFilenameValue() {
    return getFilename(getEditor());
  }

  function getFullPathValue() {
    return getFullPath(getEditor());
  }

  return {
    getContextAround,
    findText,
    getSelection,
    getDocument,
    getLineCount,
    getFilename: getFilenameValue,
    getFullPath: getFullPathValue
  };
}
