'use babel';

import { buildSearchPattern, getActiveEditorOrThrow } from './editor-context.js';

export const WRITE_EXECUTION_MODES = Object.freeze({
  PROPOSE: 'propose',
  APPLY: 'apply'
});

export const WRITE_OPERATION_KINDS = Object.freeze({
  REPLACE_TEXT: 'replace-text',
  REPLACE_DOCUMENT: 'replace-document',
  INSERT_LINE: 'insert-line',
  INSERT_TEXT_AT_LINE: 'insert-text-at-line',
  DELETE_LINE: 'delete-line',
  DELETE_LINE_RANGE: 'delete-line-range',
  UNDO: 'undo',
  REDO: 'redo'
});

const DEFAULT_EXECUTION_MODE = WRITE_EXECUTION_MODES.APPLY;

function normalizeExecutionMode(executionMode = DEFAULT_EXECUTION_MODE) {
  return executionMode === WRITE_EXECUTION_MODES.PROPOSE
    ? WRITE_EXECUTION_MODES.PROPOSE
    : WRITE_EXECUTION_MODES.APPLY;
}

function createProposalIdFactory() {
  let sequence = 0;
  return () => {
    sequence += 1;
    return `proposal-${sequence}`;
  };
}

export function createDocumentWriteService({
  diffHighlighter,
  getEditor = getActiveEditorOrThrow,
  createSearchPattern = buildSearchPattern,
  createProposalId = createProposalIdFactory()
} = {}) {
  if (!diffHighlighter) {
    throw new Error('document-write-service requires a diffHighlighter instance');
  }

  const pendingProposals = new Map();

  function getBufferText(editor = getEditor()) {
    return editor.getBuffer().getText();
  }

  function createMutationPlan(kind, args) {
    switch (kind) {
      case WRITE_OPERATION_KINDS.REPLACE_TEXT:
        return createReplaceTextPlan(args);
      case WRITE_OPERATION_KINDS.REPLACE_DOCUMENT:
        return createReplaceDocumentPlan(args);
      case WRITE_OPERATION_KINDS.INSERT_LINE:
        return createInsertLinePlan(args);
      case WRITE_OPERATION_KINDS.INSERT_TEXT_AT_LINE:
        return createInsertTextAtLinePlan(args);
      case WRITE_OPERATION_KINDS.DELETE_LINE:
        return createDeleteLinePlan(args);
      case WRITE_OPERATION_KINDS.DELETE_LINE_RANGE:
        return createDeleteLineRangePlan(args);
      case WRITE_OPERATION_KINDS.UNDO:
        return createUndoPlan();
      case WRITE_OPERATION_KINDS.REDO:
        return createRedoPlan();
      default:
        throw new Error(`Unsupported write operation kind: ${kind}`);
    }
  }

  function executePlan(kind, args, { executionMode = DEFAULT_EXECUTION_MODE } = {}) {
    const editor = getEditor();
    const plan = createMutationPlan(kind, args);
    const mode = normalizeExecutionMode(executionMode);

    if (mode === WRITE_EXECUTION_MODES.PROPOSE) {
      return createProposal(editor, plan);
    }

    return applyPlan(editor, plan, { clearProposalId: null });
  }

  function createProposal(editor, plan) {
    const buffer = editor.getBuffer();
    const beforeText = buffer.getText();
    const preview = plan.preview({ editor, buffer, beforeText });

    if (preview.changed === false) {
      return {
        changed: false,
        mode: WRITE_EXECUTION_MODES.PROPOSE,
        message: preview.noopMessage,
        proposal: null
      };
    }

    const proposal = {
      id: createProposalId(),
      kind: plan.kind,
      args: preview.normalizedArgs,
      baseText: beforeText,
      summary: preview.summary,
      applyMessage: preview.applyMessage,
      createdAt: new Date().toISOString()
    };

    pendingProposals.set(proposal.id, proposal);

    return {
      changed: false,
      mode: WRITE_EXECUTION_MODES.PROPOSE,
      message: `${preview.summary} Proposal stored as ${proposal.id}. Use apply-proposal to execute it.`,
      proposal
    };
  }

  function applyPlan(editor, plan, { clearProposalId = null } = {}) {
    const buffer = editor.getBuffer();
    const beforeText = buffer.getText();
    const outcome = plan.apply({ editor, buffer, beforeText });

    if (clearProposalId) {
      pendingProposals.delete(clearProposalId);
    }

    return {
      changed: outcome.changed,
      mode: WRITE_EXECUTION_MODES.APPLY,
      message: outcome.message,
      matchCount: outcome.matchCount,
      lineNumber: outcome.lineNumber,
      deletedLineCount: outcome.deletedLineCount,
      proposalId: clearProposalId || undefined
    };
  }

  function applyProposal({ proposalId }) {
    const proposal = pendingProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Unknown proposalId: ${proposalId}`);
    }

    const editor = getEditor();
    const currentText = getBufferText(editor);
    if (currentText !== proposal.baseText) {
      throw new Error(
        `Cannot apply ${proposalId}: document changed since proposal creation. Refresh with get-document and create a new proposal.`
      );
    }

    const plan = createMutationPlan(proposal.kind, proposal.args);
    return applyPlan(editor, plan, { clearProposalId: proposalId });
  }

  function listPendingProposals() {
    return Array.from(pendingProposals.values()).map((proposal) => ({ ...proposal }));
  }

  function clearPendingProposals() {
    pendingProposals.clear();
  }

  function createReplaceTextPlan({ query, replacement, regex = false, caseSensitive = false, all = false }) {
    return {
      kind: WRITE_OPERATION_KINDS.REPLACE_TEXT,
      preview({ beforeText }) {
        const pattern = createSearchPattern(query, { regex, caseSensitive, global: all });
        let matchCount = 0;
        const nextText = beforeText.replace(pattern, () => {
          matchCount += 1;
          return replacement;
        });

        if (matchCount === 0) {
          return {
            changed: false,
            noopMessage: 'No matches → nothing replaced.'
          };
        }

        return {
          changed: true,
          normalizedArgs: { query, replacement, regex, caseSensitive, all },
          summary: `Prepared replace-text proposal for ${matchCount} occurrence${matchCount === 1 ? '' : 's'}.`,
          applyMessage: `Replaced ${matchCount} occurrence${matchCount === 1 ? '' : 's'}.`
        };
      },
      apply({ editor, buffer, beforeText }) {
        const preview = this.preview({ editor, buffer, beforeText });
        if (preview.changed === false) {
          return {
            changed: false,
            message: preview.noopMessage
          };
        }

        const pattern = createSearchPattern(query, { regex, caseSensitive, global: all });
        let matchCount = 0;
        const nextText = beforeText.replace(pattern, () => {
          matchCount += 1;
          return replacement;
        });

        buffer.setTextViaDiff(nextText);
        diffHighlighter.decorateEditedLines(editor, beforeText, nextText);

        return {
          changed: true,
          message: `Replaced ${matchCount} occurrence${matchCount === 1 ? '' : 's'}.`,
          matchCount
        };
      }
    };
  }

  function createReplaceDocumentPlan({ text }) {
    return {
      kind: WRITE_OPERATION_KINDS.REPLACE_DOCUMENT,
      preview({ beforeText }) {
        if (text === beforeText) {
          return {
            changed: false,
            noopMessage: 'No changes → document identical.'
          };
        }

        return {
          changed: true,
          normalizedArgs: { text },
          summary: 'Prepared replace-document proposal for the active editor.',
          applyMessage: 'Document replaced successfully.'
        };
      },
      apply({ editor, buffer, beforeText }) {
        const preview = this.preview({ editor, buffer, beforeText });
        if (preview.changed === false) {
          return {
            changed: false,
            message: preview.noopMessage
          };
        }

        buffer.setTextViaDiff(text);
        diffHighlighter.decorateEditedLines(editor, beforeText, text);

        return {
          changed: true,
          message: 'Document replaced successfully.'
        };
      }
    };
  }

  function createInsertLinePlan({ lineNumber, text }) {
    return createLineInsertionPlan({
      kind: WRITE_OPERATION_KINDS.INSERT_LINE,
      lineNumber,
      text,
      apply({ editor, rowIndex }) {
        editor.setCursorBufferPosition([rowIndex, 0]);
        editor.insertText(text + '\n');
      },
      applyMessage: `Inserted line at ${lineNumber}: "${text}"`
    });
  }

  function createInsertTextAtLinePlan({ lineNumber, text }) {
    return createLineInsertionPlan({
      kind: WRITE_OPERATION_KINDS.INSERT_TEXT_AT_LINE,
      lineNumber,
      text,
      apply({ buffer, rowIndex }) {
        buffer.insert([rowIndex, 0], text + '\n');
      },
      applyMessage: `Inserted text at line ${lineNumber}.`
    });
  }

  function createLineInsertionPlan({ kind, lineNumber, text, apply, applyMessage }) {
    return {
      kind,
      preview({ buffer }) {
        const totalLines = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > totalLines + 1) {
          throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines + 1})`);
        }

        return {
          changed: true,
          normalizedArgs: { lineNumber, text },
          summary: `Prepared ${kind} proposal at line ${lineNumber}.`,
          applyMessage
        };
      },
      apply({ editor, buffer, beforeText }) {
        this.preview({ editor, buffer, beforeText });
        const rowIndex = lineNumber - 1;
        apply({ editor, buffer, rowIndex, beforeText });
        diffHighlighter.decorateLine(editor, rowIndex, 'added');

        return {
          changed: true,
          message: applyMessage,
          lineNumber
        };
      }
    };
  }

  function createDeleteLinePlan({ lineNumber }) {
    return {
      kind: WRITE_OPERATION_KINDS.DELETE_LINE,
      preview({ buffer }) {
        const totalLines = buffer.getLineCount();
        const rowIndex = lineNumber - 1;

        if (rowIndex < 0 || rowIndex >= totalLines) {
          throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines})`);
        }

        return {
          changed: true,
          normalizedArgs: { lineNumber },
          summary: `Prepared delete-line proposal for line ${lineNumber}.`,
          applyMessage: `Deleted line ${lineNumber}`
        };
      },
      apply({ editor, buffer, beforeText }) {
        this.preview({ editor, buffer, beforeText });
        const rowIndex = lineNumber - 1;
        buffer.deleteRow(rowIndex);
        diffHighlighter.decorateLine(editor, rowIndex, 'removed');

        return {
          changed: true,
          message: `Deleted line ${lineNumber}`,
          lineNumber
        };
      }
    };
  }

  function createDeleteLineRangePlan({ startLine, endLine }) {
    return {
      kind: WRITE_OPERATION_KINDS.DELETE_LINE_RANGE,
      preview({ buffer }) {
        const totalLines = buffer.getLineCount();
        const startRow = Math.max(0, startLine - 1);
        const endRow = Math.min(endLine - 1, totalLines - 1);

        if (startRow > endRow) {
          throw new Error(`startLine (${startLine}) must be ≤ endLine (${endLine})`);
        }

        return {
          changed: true,
          normalizedArgs: { startLine, endLine },
          summary: `Prepared delete-line-range proposal for lines ${startLine} to ${endLine}.`,
          applyMessage: `Deleted lines ${startLine} to ${endLine}`,
          deletedLineCount: endRow - startRow + 1
        };
      },
      apply({ editor, buffer, beforeText }) {
        const preview = this.preview({ editor, buffer, beforeText });
        const startRow = Math.max(0, startLine - 1);
        const endRow = Math.min(endLine - 1, buffer.getLineCount() - 1);

        for (let row = endRow; row >= startRow; row -= 1) {
          buffer.deleteRow(row);
          diffHighlighter.decorateLine(editor, row, 'removed');
        }

        return {
          changed: true,
          message: `Deleted lines ${startLine} to ${endLine}`,
          deletedLineCount: preview.deletedLineCount
        };
      }
    };
  }

  function createUndoPlan() {
    return {
      kind: WRITE_OPERATION_KINDS.UNDO,
      preview() {
        return {
          changed: true,
          normalizedArgs: {},
          summary: 'Prepared undo proposal for the active editor.',
          applyMessage: 'Undo completed.'
        };
      },
      apply({ editor, buffer, beforeText }) {
        editor.undo();
        const afterText = buffer.getText();
        return {
          changed: beforeText !== afterText,
          message: beforeText !== afterText ? 'Undo completed.' : 'Nothing to undo.'
        };
      }
    };
  }

  function createRedoPlan() {
    return {
      kind: WRITE_OPERATION_KINDS.REDO,
      preview() {
        return {
          changed: true,
          normalizedArgs: {},
          summary: 'Prepared redo proposal for the active editor.',
          applyMessage: 'Redo completed.'
        };
      },
      apply({ editor, buffer, beforeText }) {
        editor.redo();
        const afterText = buffer.getText();
        return {
          changed: beforeText !== afterText,
          message: beforeText !== afterText ? 'Redo completed.' : 'Nothing to redo.'
        };
      }
    };
  }

  function replaceText(args, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.REPLACE_TEXT, args, options);
  }

  function replaceDocument(args, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.REPLACE_DOCUMENT, args, options);
  }

  function insertLine(args, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.INSERT_LINE, args, options);
  }

  function insertTextAtLine(args, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.INSERT_TEXT_AT_LINE, args, options);
  }

  function deleteLine(args, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.DELETE_LINE, args, options);
  }

  function deleteLineRange(args, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.DELETE_LINE_RANGE, args, options);
  }

  function undo(args = {}, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.UNDO, args, options);
  }

  function redo(args = {}, options = {}) {
    return executePlan(WRITE_OPERATION_KINDS.REDO, args, options);
  }

  return {
    replaceText,
    replaceDocument,
    insertLine,
    insertTextAtLine,
    deleteLine,
    deleteLineRange,
    undo,
    redo,
    applyProposal,
    listPendingProposals,
    clearPendingProposals,
    getExecutionModes() {
      return { ...WRITE_EXECUTION_MODES };
    },
    getOperationKinds() {
      return { ...WRITE_OPERATION_KINDS };
    }
  };
}
