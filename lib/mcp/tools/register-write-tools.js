'use babel';

import { z } from 'zod';
import { createDocumentWriteService, WRITE_EXECUTION_MODES } from './document-write-service.js';

const executionModeSchema = z.enum([WRITE_EXECUTION_MODES.PROPOSE, WRITE_EXECUTION_MODES.APPLY]).optional();

function buildExecutionModeDescription(baseDescription) {
  return [
    baseDescription,
    'Optional `executionMode` controls the write taxonomy: `apply` mutates immediately, `propose` stores a pending proposal for later `apply-proposal`.'
  ].join(' ');
}

function formatWriteResult(result) {
  if (result.mode === WRITE_EXECUTION_MODES.PROPOSE && result.proposal) {
    return [
      result.message,
      `proposalId: ${result.proposal.id}`,
      `kind: ${result.proposal.kind}`,
      `createdAt: ${result.proposal.createdAt}`
    ].join('\n');
  }

  return result.message;
}

export function registerWriteTools(server, { diffHighlighter, documentWriteService = createDocumentWriteService({ diffHighlighter }) }) {
  registerReplaceTextTool(server, documentWriteService);
  registerReplaceDocumentTool(server, documentWriteService);
  registerInsertLineTool(server, documentWriteService);
  registerInsertTextAtLineTool(server, documentWriteService);
  registerDeleteLineTool(server, documentWriteService);
  registerDeleteLineRangeTool(server, documentWriteService);
  registerUndoTool(server, documentWriteService);
  registerRedoTool(server, documentWriteService);
  registerApplyProposalTool(server, documentWriteService);
}

function registerReplaceTextTool(server, documentWriteService) {
  const curTool = 'replace-text';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Replace Text',
      description: buildExecutionModeDescription([
        'Search the active editor for `query` and replace it with `replacement`.',
        '`all` controls whether every match is replaced or only the first (`false` by default).',
        'Workflow hint: Call `get-filename` and `get-document` first to confirm document and for freshest text.'
      ].join(' ')),
      inputSchema: {
        query: z.string(),
        replacement: z.string(),
        regex: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        all: z.boolean().optional(),
        executionMode: executionModeSchema
      }
    },
    async ({ query, replacement, regex = false, caseSensitive = false, all = false, executionMode }) => {
      console.log(`CMD: ${curTool}, ARGS:`, { query, replacement, regex, caseSensitive, all, executionMode });
      const result = documentWriteService.replaceText({ query, replacement, regex, caseSensitive, all }, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription([
        'Replace the entire contents of the editor with rewritten text.',
        "Useful for large edits. Do not include document line numbers that didn't exist before the edit.",
        'Try to maintain surrounding text where possible.',
        'Workflow hint: ALWAYS call `get-filename` and `get-document` first for most up to date context and to confirm edits are made to correct document.'
      ].join(' ')),
      inputSchema: { text: z.string(), executionMode: executionModeSchema }
    },
    async ({ text, executionMode }) => {
      console.log(`CMD: ${curTool}, ARGS: { text: /*${text.length} chars*/, executionMode: ${executionMode || 'apply'} }`);
      const result = documentWriteService.replaceDocument({ text }, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription('Insert the given text as a new line at the specified 1-based line number, shifting existing lines down. Prefer replace-document for large edits.'),
      inputSchema: { lineNumber: z.number(), text: z.string(), executionMode: executionModeSchema }
    },
    async ({ lineNumber, text, executionMode }) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ lineNumber, text, executionMode })}`);
      const result = documentWriteService.insertLine({ lineNumber, text }, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription('Insert a block of text at the specified line number, shifting existing text down. Prefer replace-document for large edits.'),
      inputSchema: { lineNumber: z.number(), text: z.string(), executionMode: executionModeSchema }
    },
    async ({ lineNumber, text, executionMode }) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ lineNumber, text, executionMode })}`);
      const result = documentWriteService.insertTextAtLine({ lineNumber, text }, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription('Delete the specified line number (1-based). Prefer replace-document for large edits.'),
      inputSchema: { lineNumber: z.number(), executionMode: executionModeSchema }
    },
    async ({ lineNumber, executionMode }) => {
      console.log(`CMD: ${curTool}, ARGS:`, { lineNumber, executionMode });
      const result = documentWriteService.deleteLine({ lineNumber }, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription('Delete all lines from startLine to endLine (inclusive). For a single line, set startLine === endLine. Line numbers are 1-based. Prefer replace-document for large edits. Consider doing a get-document to confirm range is possible.'),
      inputSchema: { startLine: z.number(), endLine: z.number(), executionMode: executionModeSchema }
    },
    async ({ startLine, endLine, executionMode }) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ startLine, endLine, executionMode })}`);
      const result = documentWriteService.deleteLineRange({ startLine, endLine }, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription('Undo the last change in the active editor.'),
      inputSchema: { executionMode: executionModeSchema }
    },
    async ({ executionMode } = {}) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ executionMode })}`);
      const result = documentWriteService.undo({}, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
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
      description: buildExecutionModeDescription('Redo the last undone change in the active editor.'),
      inputSchema: { executionMode: executionModeSchema }
    },
    async ({ executionMode } = {}) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ executionMode })}`);
      const result = documentWriteService.redo({}, { executionMode });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
      };
    }
  );
}

function registerApplyProposalTool(server, documentWriteService) {
  const curTool = 'apply-proposal';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Apply Proposal',
      description: 'Apply a pending write proposal created earlier with executionMode=`propose`. Fails if the active document changed since the proposal was created.',
      inputSchema: { proposalId: z.string() }
    },
    async ({ proposalId }) => {
      console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify({ proposalId })}`);
      const result = documentWriteService.applyProposal({ proposalId });
      return {
        content: [{ type: 'text', text: formatWriteResult(result) }]
      };
    }
  );
}
