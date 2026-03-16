'use babel';

export function getEditorDiffStyleSheetText() {
  return `
    atom-text-editor.editor .mcp-diff-added,
    atom-text-editor.editor .mcp-diff-added-gutter {
      background-color: rgba(0, 117, 162, 0.25);
    }
    atom-text-editor.editor .mcp-diff-removed,
    atom-text-editor.editor .mcp-diff-removed-gutter {
      background-color: rgba(0, 117, 162, 0.25);
    }
  `;
}
