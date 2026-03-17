'use babel';

import { buildSearchPattern, getActiveEditorOrThrow } from './editor-context.js';

export function createDocumentWriteService({
  diffHighlighter,
  getEditor = getActiveEditorOrThrow,
  createSearchPattern = buildSearchPattern
} = {}) {
  if (!diffHighlighter) {
    throw new Error('document-write-service requires a diffHighlighter instance');
  }

  function replaceText({ query, replacement, regex = false, caseSensitive = false, all = false }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const pattern = createSearchPattern(query, { regex, caseSensitive, global: all });
    const originalText = buffer.getText();
    let matchCount = 0;

    const nextText = originalText.replace(pattern, () => {
      matchCount += 1;
      return replacement;
    });

    if (matchCount === 0) {
      return {
        changed: false,
        message: 'No matches → nothing replaced.'
      };
    }

    buffer.setTextViaDiff(nextText);
    diffHighlighter.decorateEditedLines(editor, originalText, nextText);

    return {
      changed: true,
      message: `Replaced ${matchCount} occurrence${matchCount === 1 ? '' : 's'}.`,
      matchCount
    };
  }

  function replaceDocument({ text }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const original = buffer.getText();

    if (text === original) {
      return {
        changed: false,
        message: 'No changes → document identical.'
      };
    }

    buffer.setTextViaDiff(text);
    diffHighlighter.decorateEditedLines(editor, original, text);

    return {
      changed: true,
      message: 'Document replaced successfully.'
    };
  }

  function insertLine({ lineNumber, text }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const totalLines = buffer.getLineCount();

    if (lineNumber < 1 || lineNumber > totalLines + 1) {
      throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines + 1})`);
    }

    const rowIndex = lineNumber - 1;
    editor.setCursorBufferPosition([rowIndex, 0]);
    editor.insertText(text + '\n');
    diffHighlighter.decorateLine(editor, rowIndex, 'added');

    return {
      changed: true,
      message: `Inserted line at ${lineNumber}: "${text}"`,
      lineNumber
    };
  }

  function insertTextAtLine({ lineNumber, text }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const totalLines = buffer.getLineCount();

    if (lineNumber < 1 || lineNumber > totalLines + 1) {
      throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines + 1})`);
    }

    const rowIndex = lineNumber - 1;
    buffer.insert([rowIndex, 0], text + '\n');
    diffHighlighter.decorateLine(editor, rowIndex, 'added');

    return {
      changed: true,
      message: `Inserted text at line ${lineNumber}.`,
      lineNumber
    };
  }

  function deleteLine({ lineNumber }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const totalLines = buffer.getLineCount();
    const rowIndex = lineNumber - 1;

    if (rowIndex < 0 || rowIndex >= totalLines) {
      throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines})`);
    }

    buffer.deleteRow(rowIndex);
    diffHighlighter.decorateLine(editor, rowIndex, 'removed');

    return {
      changed: true,
      message: `Deleted line ${lineNumber}`,
      lineNumber
    };
  }

  function deleteLineRange({ startLine, endLine }) {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const totalLines = buffer.getLineCount();
    const startRow = Math.max(0, startLine - 1);
    const endRow = Math.min(endLine - 1, totalLines - 1);

    if (startRow > endRow) {
      throw new Error(`startLine (${startLine}) must be ≤ endLine (${endLine})`);
    }

    for (let row = endRow; row >= startRow; row -= 1) {
      buffer.deleteRow(row);
      diffHighlighter.decorateLine(editor, row, 'removed');
    }

    return {
      changed: true,
      message: `Deleted lines ${startLine} to ${endLine}`,
      deletedLineCount: endRow - startRow + 1
    };
  }

  function undo() {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const before = buffer.getText();
    editor.undo();
    const after = buffer.getText();

    return {
      changed: before !== after,
      message: before !== after ? 'Undo completed.' : 'Nothing to undo.'
    };
  }

  function redo() {
    const editor = getEditor();
    const buffer = editor.getBuffer();
    const before = buffer.getText();
    editor.redo();
    const after = buffer.getText();

    return {
      changed: before !== after,
      message: before !== after ? 'Redo completed.' : 'Nothing to redo.'
    };
  }

  return {
    replaceText,
    replaceDocument,
    insertLine,
    insertTextAtLine,
    deleteLine,
    deleteLineRange,
    undo,
    redo
  };
}
