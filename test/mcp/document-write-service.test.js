import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentWriteService, WRITE_EXECUTION_MODES } from '../../lib/mcp/tools/document-write-service.js';

function createBuffer(text) {
  const state = {
    text,
    lines: text.split('\n')
  };

  return {
    getText() {
      return state.text;
    },
    setTextViaDiff(nextText) {
      state.text = nextText;
      state.lines = nextText.split('\n');
    },
    getLineCount() {
      return state.lines.length;
    },
    insert(position, insertedText) {
      const row = position[0];
      state.lines.splice(row, 0, insertedText.replace(/\n$/, ''));
      state.text = state.lines.join('\n');
    },
    deleteRow(row) {
      state.lines.splice(row, 1);
      state.text = state.lines.join('\n');
    }
  };
}

test('document-write-service centralizes replace-text mutations and diff highlighting', () => {
  const events = [];
  const buffer = createBuffer('alpha\nbeta\nalpha');
  const editor = {
    getBuffer() {
      return buffer;
    }
  };
  const service = createDocumentWriteService({
    diffHighlighter: {
      decorateEditedLines(editorArg, before, after) {
        events.push({ type: 'decorateEditedLines', editor: editorArg, before, after });
      },
      decorateLine() {}
    },
    getEditor() {
      return editor;
    },
    createSearchPattern(query, options) {
      assert.equal(query, 'alpha');
      assert.equal(options.global, true);
      return /alpha/g;
    }
  });

  const result = service.replaceText({ query: 'alpha', replacement: 'omega', all: true });

  assert.equal(result.changed, true);
  assert.equal(result.matchCount, 2);
  assert.equal(result.mode, WRITE_EXECUTION_MODES.APPLY);
  assert.equal(buffer.getText(), 'omega\nbeta\nomega');
  assert.equal(events.length, 1);
  assert.equal(events[0].before, 'alpha\nbeta\nalpha');
  assert.equal(events[0].after, 'omega\nbeta\nomega');
});

test('document-write-service can stage a proposal and apply it later', () => {
  const events = [];
  const buffer = createBuffer('alpha\nbeta\nalpha');
  const editor = {
    getBuffer() {
      return buffer;
    }
  };
  const service = createDocumentWriteService({
    diffHighlighter: {
      decorateEditedLines(editorArg, before, after) {
        events.push({ type: 'decorateEditedLines', editor: editorArg, before, after });
      },
      decorateLine() {}
    },
    getEditor() {
      return editor;
    },
    createProposalId() {
      return 'proposal-1';
    }
  });

  const proposalResult = service.replaceText(
    { query: 'alpha', replacement: 'omega', all: true },
    { executionMode: WRITE_EXECUTION_MODES.PROPOSE }
  );

  assert.equal(proposalResult.changed, false);
  assert.equal(proposalResult.mode, WRITE_EXECUTION_MODES.PROPOSE);
  assert.equal(proposalResult.proposal.id, 'proposal-1');
  assert.equal(buffer.getText(), 'alpha\nbeta\nalpha');
  assert.equal(service.listPendingProposals().length, 1);

  const applyResult = service.applyProposal({ proposalId: 'proposal-1' });
  assert.equal(applyResult.changed, true);
  assert.equal(applyResult.proposalId, 'proposal-1');
  assert.equal(buffer.getText(), 'omega\nbeta\nomega');
  assert.equal(service.listPendingProposals().length, 0);
  assert.equal(events.length, 1);
});

test('document-write-service rejects stale proposals when buffer changed', () => {
  const buffer = createBuffer('alpha\nbeta');
  const editor = {
    getBuffer() {
      return buffer;
    }
  };
  const service = createDocumentWriteService({
    diffHighlighter: {
      decorateEditedLines() {},
      decorateLine() {}
    },
    getEditor() {
      return editor;
    },
    createProposalId() {
      return 'proposal-stale';
    }
  });

  service.replaceDocument({ text: 'omega\nbeta' }, { executionMode: WRITE_EXECUTION_MODES.PROPOSE });
  buffer.setTextViaDiff('manually changed');

  assert.throws(() => service.applyProposal({ proposalId: 'proposal-stale' }), /document changed since proposal creation/);
});

test('document-write-service centralizes single-line insert/delete operations', () => {
  const events = [];
  const buffer = createBuffer('one\ntwo');
  const editor = {
    getBuffer() {
      return buffer;
    },
    setCursorBufferPosition(position) {
      events.push({ type: 'cursor', position });
    },
    insertText(insertedText) {
      buffer.insert([0, 0], insertedText);
      events.push({ type: 'insertText', insertedText });
    },
    undo() {},
    redo() {}
  };

  const service = createDocumentWriteService({
    diffHighlighter: {
      decorateEditedLines() {},
      decorateLine(editorArg, row, kind) {
        events.push({ type: 'decorateLine', editor: editorArg, row, kind });
      }
    },
    getEditor() {
      return editor;
    }
  });

  const insertResult = service.insertLine({ lineNumber: 1, text: 'zero' });
  const deleteResult = service.deleteLine({ lineNumber: 2 });

  assert.equal(insertResult.message, 'Inserted line at 1: "zero"');
  assert.equal(deleteResult.message, 'Deleted line 2');
  assert.equal(buffer.getText(), 'zero\ntwo');
  assert.deepEqual(events.filter((entry) => entry.type === 'decorateLine').map(({ row, kind }) => ({ row, kind })), [
    { row: 0, kind: 'added' },
    { row: 1, kind: 'removed' }
  ]);
});
