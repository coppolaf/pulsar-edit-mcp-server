'use babel';

import { z } from 'zod';
import {
  buildSearchPattern,
  getActiveEditorOrThrow,
  getActiveBufferOrThrow,
  getDocumentPayload,
  getActiveFileName,
  getActiveFilePath
} from './editor-context.js';

export function registerReadTools(server) {
  registerGetContextAroundTool(server);
  registerFindTextTool(server);
  registerGetSelectionTool(server);
  registerGetDocumentTool(server);
  registerGetLineCountTool(server);
  registerGetFilenameTool(server);
  registerGetFullPathTool(server);
}

function registerGetContextAroundTool(server) {
  const curTool = 'get-context-around';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Context Around',
      description: [
        'Return up-to `radiusLines` lines before and after the *N-th* match of',
        '`query` in the active editor. Useful for content-aware edits.',
        'Workflow hint: Call `get-document` first for freshest text.',
        'Use larger `radiusLines` for code blocks for better context understanding.'
      ].join(' '),
      inputSchema: {
        query: z.string(),
        regex: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        radiusLines: z.number().optional(),
        occurrence: z.number().optional()
      }
    },
    async ({ query, regex = false, caseSensitive = false, radiusLines = 5, occurrence = 1 }) => {
      console.log(`CMD: ${curTool}, ARGS:`, { query, regex, caseSensitive, radiusLines, occurrence });

      const editor = getActiveEditorOrThrow();
      const buffer = editor.getBuffer();
      const totalLines = buffer.getLineCount();
      const pattern = buildSearchPattern(query, { regex, caseSensitive });
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

      const payload = {
        before: lines.slice(0, startRow - contextStart),
        match: lines.slice(startRow - contextStart, endRow - contextStart + 1),
        after: lines.slice(endRow - contextStart + 1),
        matchStartLine: startRow + 1,
        matchEndLine: endRow + 1
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
      };
    }
  );
}

function registerFindTextTool(server) {
  const curTool = 'find-text';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Find Text',
      description: [
        'Search the active editor for a substring or regular expression and',
        'return the positions of each occurrence (up to `maxMatches`).'
      ].join(' '),
      inputSchema: {
        query: z.string(),
        regex: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        maxMatches: z.number().optional()
      }
    },
    async ({ query, regex = false, caseSensitive = false, maxMatches = 50 }) => {
      console.log(`CMD: ${curTool}, ARGS:`, { query, regex, caseSensitive, maxMatches });

      const buffer = getActiveBufferOrThrow();
      const pattern = buildSearchPattern(query, { regex, caseSensitive });
      const ranges = buffer.findAllSync(pattern, { limit: maxMatches }) || [];

      if (ranges.length === 0) {
        return { content: [{ type: 'text', text: 'No matches.' }] };
      }

      const results = ranges.map((range) => ({
        startLine: range.start.row + 1,
        startCol: range.start.column + 1,
        endLine: range.end.row + 1,
        endCol: range.end.column + 1
      }));

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
      };
    }
  );
}

function registerGetSelectionTool(server) {
  const curTool = 'get-selection';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Selection',
      description: 'Return the text currently selected in the active editor.',
      inputSchema: {}
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const editor = getActiveEditorOrThrow();
      const selection = editor.getSelectedText();
      return {
        content: [{ type: 'text', text: selection || '[no text selected]' }]
      };
    }
  );
}

function registerGetDocumentTool(server) {
  const curTool = 'get-document';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Document (JSON)',
      description: [
        'Return an array of lines with their 1-based line numbers.',
        'Example: { lines: [{ n: 1, text: "const x = 1;" }, ...] } .',
        'Consider doing a `get-filename` to see if you are looking at the expected document.',
        'Do a `open-file` first if you are looking for a specific document.'
      ].join(' '),
      inputSchema: {}
    },
    async () => {
      const payload = getDocumentPayload();
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
      };
    }
  );
}

function registerGetLineCountTool(server) {
  const curTool = 'get-line-count';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Line Count',
      description: 'Return the total number of lines in the active editor.',
      inputSchema: {}
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const lineCount = getActiveBufferOrThrow().getLineCount();
      return {
        content: [{ type: 'text', text: String(lineCount) }]
      };
    }
  );
}

function registerGetFilenameTool(server) {
  const curTool = 'get-filename';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Filename',
      description: 'Return the filename of the active editor (or [untitled] if none).',
      inputSchema: {}
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      return {
        content: [{ type: 'text', text: getActiveFileName() }]
      };
    }
  );
}

function registerGetFullPathTool(server) {
  const curTool = 'get-full-path';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Full File Path',
      description: 'Return the full absolute path of the active editor.',
      inputSchema: {}
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      return {
        content: [{ type: 'text', text: getActiveFilePath() }]
      };
    }
  );
}
