'use babel';

import { z } from 'zod';
import { buildSearchPattern, getActiveEditorOrThrow } from './editor-context.js';

export function registerWriteTools(server, { diffHighlighter }) {
  registerReplaceTextTool(server, diffHighlighter);
  registerReplaceDocumentTool(server, diffHighlighter);
  registerInsertLineTool(server, diffHighlighter);
  registerInsertTextAtLineTool(server, diffHighlighter);
  registerDeleteLineTool(server, diffHighlighter);
  registerDeleteLineRangeTool(server, diffHighlighter);
  registerUndoTool(server);
  registerRedoTool(server);
}

function registerReplaceTextTool(server, diffHighlighter) {
  const curTool = 'replace-text';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Replace Text',
      description: [
        'Search the active editor for `query` and replace it with `replacement`.',
        '`all` controls whether every match is replaced or only the first (`false` by default).',
        'Workflow hint: Call `get-filename` and `get-document` first to confirm document and for freshest text.'
      ].join(' '),
      inputSchema: {
        query: z.string(),
        replacement: z.string(),
        regex: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        all: z.boolean().optional()
      }
    },
    async ({ query, replacement, regex = false, caseSensitive = false, all = false }) => {
      console.log(`CMD: ${curTool}, ARGS:`, { query, replacement, regex, caseSensitive, all });

      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const pattern = buildSearchPattern(query, { regex, caseSensitive, global: all });
      const originalText = buffer.getText();
      let matchCount = 0;

      const nextText = originalText.replace(pattern, () => {
        matchCount += 1;
        return replacement;
      });

      if (matchCount === 0) {
        return {
          content: [{ type: 'text', text: 'No matches → nothing replaced.' }]
        };
      }

      buffer.setTextViaDiff(nextText);
      diffHighlighter.decorateEditedLines(editor, originalText, nextText);

      return {
        content: [{ type: 'text', text: `Replaced ${matchCount} occurrence${matchCount === 1 ? '' : 's'}.` }]
      };
    }
  );
}

function registerReplaceDocumentTool(server, diffHighlighter) {
  const curTool = 'replace-document';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Replace Document',
      description: [
        'Replace the entire contents of the editor with rewritten text.',
        "Useful for large edits. Do not include document line numbers that didn't exist before the edit.",
        'Try to maintain surrounding text where possible.',
        'Workflow hint: ALWAYS call `get-filename` and `get-document` first for most up to date context and to confirm edits are made to correct document.'
      ].join(' '),
      inputSchema: { text: z.string() }
    },
    async ({ text }) => {
      console.log(`CMD: ${curTool}, ARGS: { text: /*${text.length} chars*/ }`);

      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const original = buffer.getText();

      if (text === original) {
        return {
          content: [{ type: 'text', text: 'No changes → document identical.' }]
        };
      }

      buffer.setTextViaDiff(text);
      diffHighlighter.decorateEditedLines(editor, original, text);

      return {
        content: [{ type: 'text', text: 'Document replaced successfully.' }]
      };
    }
  );
}

function registerInsertLineTool(server, diffHighlighter) {
  const curTool = 'insert-line';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Insert Line',
      description: 'Insert the given text as a new line at the specified 1-based line number, shifting existing lines down. Prefer replace-document for large edits.',
      inputSchema: { lineNumber: z.number(), text: z.string() }
    },
    async ({ lineNumber, text }) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ lineNumber, text })}`);
      const editor = getActiveEditorOrThrow();
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
        content: [{ type: 'text', text: `Inserted line at ${lineNumber}: "${text}"` }]
      };
    }
  );
}

function registerInsertTextAtLineTool(server, diffHighlighter) {
  const curTool = 'insert-text-at-line';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Insert Text At Line',
      description: 'Insert a block of text at the specified line number, shifting existing text down. Prefer replace-document for large edits.',
      inputSchema: { lineNumber: z.number(), text: z.string() }
    },
    async ({ lineNumber, text }) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ lineNumber, text })}`);
      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const totalLines = buffer.getLineCount();

      if (lineNumber < 1 || lineNumber > totalLines + 1) {
        throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines + 1})`);
      }

      const rowIndex = lineNumber - 1;
      buffer.insert([rowIndex, 0], text + '\n');
      diffHighlighter.decorateLine(editor, rowIndex, 'added');

      return {
        content: [{ type: 'text', text: `Inserted text at line ${lineNumber}.` }]
      };
    }
  );
}

function registerDeleteLineTool(server, diffHighlighter) {
  const curTool = 'delete-line';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Delete Line',
      description: 'Delete the specified line number (1-based). Prefer replace-document for large edits.',
      inputSchema: { lineNumber: z.number() }
    },
    async ({ lineNumber }) => {
      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const totalLines = buffer.getLineCount();
      const rowIndex = lineNumber - 1;

      if (rowIndex < 0 || rowIndex >= totalLines) {
        throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines})`);
      }

      buffer.deleteRow(rowIndex);
      diffHighlighter.decorateLine(editor, rowIndex, 'removed');

      console.log(`CMD: ${curTool}, ARGS:`, { lineNumber });
      return {
        content: [{ type: 'text', text: `Deleted line ${lineNumber}` }]
      };
    }
  );
}

function registerDeleteLineRangeTool(server, diffHighlighter) {
  const curTool = 'delete-line-range';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Delete Line Range',
      description: 'Delete all lines from startLine to endLine (inclusive). For a single line, set startLine === endLine. Line numbers are 1-based. Prefer replace-document for large edits. Consider doing a get-document to confirm range is possible.',
      inputSchema: { startLine: z.number(), endLine: z.number() }
    },
    async ({ startLine, endLine }) => {
      const editor = getActiveEditorOrThrow();
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

      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ startLine, endLine })}`);
      return {
        content: [{ type: 'text', text: `Deleted lines ${startLine} to ${endLine}` }]
      };
    }
  );
}

function registerUndoTool(server) {
  const curTool = 'undo';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Undo',
      description: 'Undo the last change in the active editor.',
      inputSchema: {}
    },
    async (args) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify(args)}`);
      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const before = buffer.getText();
      editor.undo();
      const after = buffer.getText();

      return {
        content: [{ type: 'text', text: before !== after ? 'Undo completed.' : 'Nothing to undo.' }]
      };
    }
  );
}

function registerRedoTool(server) {
  const curTool = 'redo';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Redo',
      description: 'Redo the last undone change in the active editor.',
      inputSchema: {}
    },
    async (args) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify(args)}`);
      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const before = buffer.getText();
      editor.redo();
      const after = buffer.getText();

      return {
        content: [{ type: 'text', text: before !== after ? 'Redo completed.' : 'Nothing to redo.' }]
      };
    }
  );
}
