import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentWriteService } from '../../lib/mcp/tools/document-write-service.js';

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
  assert.equal(buffer.getText(), 'omega\nbeta\nomega');
  assert.equal(events.length, 1);
  assert.equal(events[0].before, 'alpha\nbeta\nalpha');
  assert.equal(events[0].after, 'omega\nbeta\nomega');
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
