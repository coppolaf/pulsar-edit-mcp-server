'use babel';

import { z } from 'zod';
import { createDocumentWriteService } from './document-write-service.js';

export function registerWriteTools(server, { diffHighlighter, documentWriteService = createDocumentWriteService({ diffHighlighter }) }) {
  registerReplaceTextTool(server, documentWriteService);
  registerReplaceDocumentTool(server, documentWriteService);
  registerInsertLineTool(server, documentWriteService);
  registerInsertTextAtLineTool(server, documentWriteService);
  registerDeleteLineTool(server, documentWriteService);
  registerDeleteLineRangeTool(server, documentWriteService);
  registerUndoTool(server, documentWriteService);
  registerRedoTool(server, documentWriteService);
}

function registerReplaceTextTool(server, documentWriteService) {
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
      const result = documentWriteService.replaceText({ query, replacement, regex, caseSensitive, all });
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerReplaceDocumentTool(server, documentWriteService) {
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
      const result = documentWriteService.replaceDocument({ text });
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerInsertLineTool(server, documentWriteService) {
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
      const result = documentWriteService.insertLine({ lineNumber, text });
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerInsertTextAtLineTool(server, documentWriteService) {
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
      const result = documentWriteService.insertTextAtLine({ lineNumber, text });
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerDeleteLineTool(server, documentWriteService) {
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
      console.log(`CMD: ${curTool}, ARGS:`, { lineNumber });
      const result = documentWriteService.deleteLine({ lineNumber });
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerDeleteLineRangeTool(server, documentWriteService) {
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
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ startLine, endLine })}`);
      const result = documentWriteService.deleteLineRange({ startLine, endLine });
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerUndoTool(server, documentWriteService) {
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
      const result = documentWriteService.undo();
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}

function registerRedoTool(server, documentWriteService) {
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
      const result = documentWriteService.redo();
      return {
        content: [{ type: 'text', text: result.message }]
      };
    }
  );
}
