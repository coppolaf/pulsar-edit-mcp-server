'use babel';

import { diffLines } from 'diff';
import { CompositeDisposable, Disposable } from 'atom';

function addDecoration(editor, disp, fromRow, toRow, klass) {
  const marker = editor.getBuffer().markRange(
    [[fromRow, 0], [toRow, Infinity]],
    { invalidate: 'never' }
  );
  disp.add(new Disposable(() => marker.destroy()));

  const decoLine = editor.decorateMarker(marker, { type: 'line', class: klass });
  const decoGutter = editor.decorateMarker(marker, {
    type: 'gutter',
    gutterName: 'line-number',
    class: `${klass}-gutter`
  });

  disp.add(new Disposable(() => decoLine.destroy()));
  disp.add(new Disposable(() => decoGutter.destroy()));
}

export function createDiffHighlighter() {
  const packageDisposables = new CompositeDisposable();
  const activeHighlightSets = [];

  function decorateEditedLines(editor, original, updated, { ttl = 8000 } = {}) {
    const disp = new CompositeDisposable();
    activeHighlightSets.push(disp);
    packageDisposables.add(disp);

    const hunks = diffLines(original, updated);
    let newRow = 0;
    hunks.forEach((hunk) => {
      const lineCount = hunk.count ?? hunk.value.split(/\r?\n/).length - 1;
      if (hunk.added || hunk.removed) {
        const startRow = newRow;
        const endRow = newRow + (hunk.added ? lineCount - 1 : 0);
        if (hunk.added) {
          addDecoration(editor, disp, startRow, endRow, 'mcp-diff-added');
        } else if (hunk.removed) {
          addDecoration(editor, disp, startRow, startRow, 'mcp-diff-removed');
        }
      }
      if (!hunk.removed) {
        newRow += lineCount;
      }
    });

    disp.add(editor.getBuffer().onDidChange(() => disp.dispose()));
    if (ttl > 0) {
      const timer = setTimeout(() => disp.dispose(), ttl);
      disp.add(new Disposable(() => clearTimeout(timer)));
    }

    disp.add(new Disposable(() => {
      const index = activeHighlightSets.indexOf(disp);
      if (index !== -1) {
        activeHighlightSets.splice(index, 1);
      }
    }));

    return disp;
  }

  function decorateLine(editor, row, kind = 'added', { ttl = 8000 } = {}) {
    editor.setCursorBufferPosition([row, 0], { autoscroll: true });
    const disp = new CompositeDisposable();
    const klass = kind === 'removed' ? 'mcp-diff-removed' : 'mcp-diff-added';
    addDecoration(editor, disp, row, row, klass);

    if (ttl > 0) {
      const timer = setTimeout(() => disp.dispose(), ttl);
      disp.add(new Disposable(() => clearTimeout(timer)));
    }

    return disp;
  }

  function dispose() {
    packageDisposables.dispose();
    activeHighlightSets.length = 0;
  }

  return {
    decorateEditedLines,
    decorateLine,
    dispose,
    getActiveHighlightCount() {
      return activeHighlightSets.length;
    }
  };
}
