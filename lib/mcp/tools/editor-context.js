'use babel';

import path from 'path';

export function getActiveEditorOrThrow() {
  const editor = atom.workspace.getActiveTextEditor();
  if (!editor) {
    throw new Error('No active editor');
  }
  return editor;
}

export function getActiveBufferOrThrow() {
  return getActiveEditorOrThrow().getBuffer();
}

export function buildSearchPattern(query, {
  regex = false,
  caseSensitive = false,
  global = false
} = {}) {
  let source = query;
  if (!regex) {
    source = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const flags = `${global ? 'g' : ''}${caseSensitive ? '' : 'i'}`;
  return new RegExp(source, flags);
}

export function getDocumentPayload(editor = getActiveEditorOrThrow()) {
  const rawLines = editor.getText().split(/\r?\n/);
  return {
    lineCount: rawLines.length,
    lines: rawLines.map((text, index) => ({ n: index + 1, text }))
  };
}

export function getActiveFilePath(editor = getActiveEditorOrThrow()) {
  return editor.getPath() || '[untitled]';
}

export function getActiveFileName(editor = getActiveEditorOrThrow()) {
  const fullPath = editor.getPath();
  return fullPath ? path.basename(fullPath) : '[untitled]';
}

export function getProjectPaths() {
  return atom.project.getPaths();
}

export async function openWorkspaceFile(filePath) {
  return atom.workspace.open(filePath);
}
