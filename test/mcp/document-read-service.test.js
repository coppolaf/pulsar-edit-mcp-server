import test from 'node:test';
import assert from 'node:assert/strict';
import { createDocumentReadService } from '../../lib/mcp/tools/document-read-service.js';

function createRange(startRow, startColumn, endRow, endColumn) {
  return {
    start: { row: startRow, column: startColumn },
    end: { row: endRow, column: endColumn }
  };
}

test('document-read-service finds text and maps positions to 1-based coordinates', () => {
  const service = createDocumentReadService({
    getBuffer() {
      return {
        findAllSync(pattern) {
          assert.equal(pattern.source, 'alpha');
          return [createRange(0, 0, 0, 5), createRange(2, 1, 2, 6)];
        }
      };
    },
    createSearchPattern(query) {
      return new RegExp(query, 'i');
    }
  });

  assert.deepEqual(service.findText({ query: 'alpha' }), [
    { startLine: 1, startCol: 1, endLine: 1, endCol: 6 },
    { startLine: 3, startCol: 2, endLine: 3, endCol: 7 }
  ]);
});

test('document-read-service builds context payload around the requested match occurrence', () => {
  const service = createDocumentReadService({
    getEditor() {
      return {
        getBuffer() {
          return {
            getLineCount() {
              return 5;
            },
            findAllSync() {
              return [createRange(1, 0, 1, 5), createRange(3, 0, 3, 4)];
            },
            lineLengthForRow() {
              return 5;
            },
            getTextInRange(range) {
              const allLines = ['one', 'two', 'three', 'four', 'five'];
              const startRow = range[0][0];
              const endRow = range[1][0];
              return allLines.slice(startRow, endRow + 1).join('\n');
            }
          };
        }
      };
    },
    createSearchPattern() {
      return /two/i;
    }
  });

  assert.deepEqual(service.getContextAround({ query: 'two', radiusLines: 1, occurrence: 2 }), {
    before: ['three'],
    match: ['four'],
    after: ['five'],
    matchStartLine: 4,
    matchEndLine: 4
  });
});
