'use babel';

import { diffLines } from 'diff';
import { buildSearchPattern, getActiveEditorOrThrow, getActiveFileName, getActiveFilePath } from './editor-context.js';

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

export const WRITE_POLICY_MODES = Object.freeze({
  IMMEDIATE_ONLY: 'immediate-only',
  PROPOSAL_OR_APPLY: 'proposal-or-apply'
});

const DEFAULT_EXECUTION_MODE = WRITE_EXECUTION_MODES.APPLY;
const DIFF_PREVIEW_LINE_LIMIT = 200;

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

function countLines(text) {
  return text.split(/\r?\n/).length;
}

function buildDiffPreview(beforeText, afterText) {
  const segments = diffLines(beforeText, afterText);
  const hunks = [];
  let beforeLine = 1;
  let afterLine = 1;
  let addedLineCount = 0;
  let removedLineCount = 0;
  let changedSegmentCount = 0;
  let previewLineBudget = DIFF_PREVIEW_LINE_LIMIT;
  let truncated = false;

  for (const segment of segments) {
    const rawLines = segment.value.length === 0
      ? []
      : segment.value.replace(/\n$/, '').split(/\n/);
    const lineCount = rawLines.length;

    if (segment.added || segment.removed) {
      changedSegmentCount += 1;
      const kind = segment.added ? 'added' : 'removed';
      if (segment.added) {
        addedLineCount += lineCount;
      }
      if (segment.removed) {
        removedLineCount += lineCount;
      }

      const beforeStartLine = segment.removed ? beforeLine : null;
      const beforeEndLine = segment.removed ? beforeLine + Math.max(lineCount - 1, 0) : null;
      const afterStartLine = segment.added ? afterLine : null;
      const afterEndLine = segment.added ? afterLine + Math.max(lineCount - 1, 0) : null;
      const includedLines = rawLines.slice(0, Math.max(previewLineBudget, 0));
      if (includedLines.length < rawLines.length) {
        truncated = true;
      }
      previewLineBudget -= includedLines.length;

      hunks.push({
        kind,
        beforeStartLine,
        beforeEndLine,
        afterStartLine,
        afterEndLine,
        lineCount,
        lines: includedLines
      });
    }

    if (segment.removed) {
      beforeLine += lineCount;
      continue;
    }

    if (segment.added) {
      afterLine += lineCount;
      continue;
    }

    beforeLine += lineCount;
    afterLine += lineCount;
  }

  return {
    beforeLineCount: countLines(beforeText),
    afterLineCount: countLines(afterText),
    beforeCharCount: beforeText.length,
    afterCharCount: afterText.length,
    addedLineCount,
    removedLineCount,
    changedSegmentCount,
    hunks,
    truncated
  };
}

function buildProposalRecord({ proposalId, plan, preview, editor, beforeText }) {
  const fullPath = getActiveFilePath(editor);
  const filename = getActiveFileName(editor);
  const afterText = Object.prototype.hasOwnProperty.call(preview, 'afterText') ? preview.afterText : null;

  return {
    id: proposalId,
    kind: plan.kind,
    args: preview.normalizedArgs,
    baseText: beforeText,
    summary: preview.summary,
    applyMessage: preview.applyMessage,
    createdAt: new Date().toISOString(),
    policy: plan.policy,
    document: {
      filename,
      fullPath,
      baseLineCount: countLines(beforeText),
      baseCharCount: beforeText.length
    },
    preview: {
      ...(afterText === null ? {} : { afterText }),
      ...(preview.previewData || (afterText === null ? {} : { diff: buildDiffPreview(beforeText, afterText) })),
      ...(preview.selection || {}),
      ...(preview.target || {})
    }
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
  const operationPolicies = new Map([
    [WRITE_OPERATION_KINDS.REPLACE_TEXT, WRITE_POLICY_MODES.PROPOSAL_OR_APPLY],
    [WRITE_OPERATION_KINDS.REPLACE_DOCUMENT, WRITE_POLICY_MODES.PROPOSAL_OR_APPLY],
    [WRITE_OPERATION_KINDS.INSERT_LINE, WRITE_POLICY_MODES.PROPOSAL_OR_APPLY],
    [WRITE_OPERATION_KINDS.INSERT_TEXT_AT_LINE, WRITE_POLICY_MODES.PROPOSAL_OR_APPLY],
    [WRITE_OPERATION_KINDS.DELETE_LINE, WRITE_POLICY_MODES.PROPOSAL_OR_APPLY],
    [WRITE_OPERATION_KINDS.DELETE_LINE_RANGE, WRITE_POLICY_MODES.PROPOSAL_OR_APPLY],
    [WRITE_OPERATION_KINDS.UNDO, WRITE_POLICY_MODES.IMMEDIATE_ONLY],
    [WRITE_OPERATION_KINDS.REDO, WRITE_POLICY_MODES.IMMEDIATE_ONLY]
  ]);

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
      if (plan.policy !== WRITE_POLICY_MODES.PROPOSAL_OR_APPLY) {
        throw new Error(`${plan.kind} does not support executionMode=propose. This tool is immediate-only.`);
      }
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

    const proposal = buildProposalRecord({
      proposalId: createProposalId(),
      plan,
      preview,
      editor,
      beforeText
    });

    pendingProposals.set(proposal.id, proposal);

    return {
      changed: false,
      mode: WRITE_EXECUTION_MODES.PROPOSE,
      message: `${preview.summary} Proposal stored as ${proposal.id}. Use get-pending-proposals or get-proposal to inspect it, then apply-proposal to execute it.`,
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

  function getProposal({ proposalId }) {
    const proposal = pendingProposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Unknown proposalId: ${proposalId}`);
    }

    return { ...proposal };
  }

  function clearPendingProposals() {
    pendingProposals.clear();
  }

  function createReplaceTextPlan({ query, replacement, regex = false, caseSensitive = false, all = false }) {
    return {
      kind: WRITE_OPERATION_KINDS.REPLACE_TEXT,
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.REPLACE_TEXT),
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
          applyMessage: `Replaced ${matchCount} occurrence${matchCount === 1 ? '' : 's'}.`,
          afterText: nextText
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.REPLACE_DOCUMENT),
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
          applyMessage: 'Document replaced successfully.',
          afterText: text
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.INSERT_LINE),
      lineNumber,
      text,
      computeAfterText({ beforeText }) {
        const lines = beforeText.split(/\r?\n/);
        lines.splice(lineNumber - 1, 0, text);
        return lines.join('\n');
      },
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.INSERT_TEXT_AT_LINE),
      lineNumber,
      text,
      computeAfterText({ beforeText }) {
        const lines = beforeText.split(/\r?\n/);
        const insertedLines = text.replace(/\n$/, '').split(/\n/);
        lines.splice(lineNumber - 1, 0, ...insertedLines);
        return lines.join('\n');
      },
      apply({ buffer, rowIndex }) {
        buffer.insert([rowIndex, 0], text + '\n');
      },
      applyMessage: `Inserted text at line ${lineNumber}.`
    });
  }

  function createLineInsertionPlan({ kind, policy, lineNumber, text, computeAfterText, apply, applyMessage }) {
    return {
      kind,
      policy,
      preview({ buffer, beforeText }) {
        const totalLines = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > totalLines + 1) {
          throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines + 1})`);
        }

        return {
          changed: true,
          normalizedArgs: { lineNumber, text },
          summary: `Prepared ${kind} proposal at line ${lineNumber}.`,
          applyMessage,
          afterText: computeAfterText({ beforeText }),
          target: { targetLineStart: lineNumber, targetLineEnd: lineNumber }
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.DELETE_LINE),
      preview({ buffer, beforeText }) {
        const totalLines = buffer.getLineCount();
        const rowIndex = lineNumber - 1;

        if (rowIndex < 0 || rowIndex >= totalLines) {
          throw new Error(`lineNumber ${lineNumber} is out of range (1–${totalLines})`);
        }

        const lines = beforeText.split(/\r?\n/);
        lines.splice(rowIndex, 1);

        return {
          changed: true,
          normalizedArgs: { lineNumber },
          summary: `Prepared delete-line proposal for line ${lineNumber}.`,
          applyMessage: `Deleted line ${lineNumber}`,
          afterText: lines.join('\n'),
          target: { targetLineStart: lineNumber, targetLineEnd: lineNumber }
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.DELETE_LINE_RANGE),
      preview({ buffer, beforeText }) {
        const totalLines = buffer.getLineCount();
        const startRow = Math.max(0, startLine - 1);
        const endRow = Math.min(endLine - 1, totalLines - 1);

        if (startRow > endRow) {
          throw new Error(`startLine (${startLine}) must be ≤ endLine (${endLine})`);
        }

        const lines = beforeText.split(/\r?\n/);
        lines.splice(startRow, endRow - startRow + 1);

        return {
          changed: true,
          normalizedArgs: { startLine, endLine },
          summary: `Prepared delete-line-range proposal for lines ${startLine} to ${endLine}.`,
          applyMessage: `Deleted lines ${startLine} to ${endLine}`,
          deletedLineCount: endRow - startRow + 1,
          afterText: lines.join('\n'),
          target: { targetLineStart: startLine, targetLineEnd: endLine }
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.UNDO),
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
      policy: operationPolicies.get(WRITE_OPERATION_KINDS.REDO),
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
    getProposal,
    clearPendingProposals,
    getExecutionModes() {
      return { ...WRITE_EXECUTION_MODES };
    },
    getOperationKinds() {
      return { ...WRITE_OPERATION_KINDS };
    },
    getOperationPolicies() {
      return Object.fromEntries(operationPolicies);
    },
    getWritePolicySummary() {
      return {
        defaultExecutionMode: DEFAULT_EXECUTION_MODE,
        supportsProposalWorkflow: Object.fromEntries(
          Array.from(operationPolicies.entries()).map(([kind, policy]) => [kind, policy === WRITE_POLICY_MODES.PROPOSAL_OR_APPLY])
        ),
        operationPolicies: Object.fromEntries(operationPolicies)
      };
    }
  };
}
