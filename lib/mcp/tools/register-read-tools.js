'use babel';

import { z } from 'zod';
import { createDocumentReadService } from './document-read-service.js';

export function registerReadTools(server, { documentReadService = createDocumentReadService() } = {}) {
  registerGetContextAroundTool(server, documentReadService);
  registerFindTextTool(server, documentReadService);
  registerGetSelectionTool(server, documentReadService);
  registerGetDocumentTool(server, documentReadService);
  registerGetLineCountTool(server, documentReadService);
  registerGetFilenameTool(server, documentReadService);
  registerGetFullPathTool(server, documentReadService);
}

function registerGetContextAroundTool(server, documentReadService) {
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
      const payload = documentReadService.getContextAround({ query, regex, caseSensitive, radiusLines, occurrence });
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
      };
    }
  );
}

function registerFindTextTool(server, documentReadService) {
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
      const results = documentReadService.findText({ query, regex, caseSensitive, maxMatches });

      if (results.length === 0) {
        return { content: [{ type: 'text', text: 'No matches.' }] };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
      };
    }
  );
}

function registerGetSelectionTool(server, documentReadService) {
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
      return {
        content: [{ type: 'text', text: documentReadService.getSelection() }]
      };
    }
  );
}

function registerGetDocumentTool(server, documentReadService) {
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
      const payload = documentReadService.getDocument();
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }]
      };
    }
  );
}

function registerGetLineCountTool(server, documentReadService) {
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
      return {
        content: [{ type: 'text', text: String(documentReadService.getLineCount()) }]
      };
    }
  );
}

function registerGetFilenameTool(server, documentReadService) {
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
        content: [{ type: 'text', text: documentReadService.getFilename() }]
      };
    }
  );
}

function registerGetFullPathTool(server, documentReadService) {
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
        content: [{ type: 'text', text: documentReadService.getFullPath() }]
      };
    }
  );
}
