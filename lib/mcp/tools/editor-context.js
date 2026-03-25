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

export function getActiveEditorPath() {
  const editor = atom.workspace.getActiveTextEditor();
  return editor ? editor.getPath() : null;
}

export function normalizeProjectPath(filePath, { pathModule = path } = {}) {
  return pathModule.resolve(filePath);
}

export function isPathWithinRoot(filePath, rootPath, { pathModule = path } = {}) {
  const normalizedFilePath = normalizeProjectPath(filePath, { pathModule });
  const normalizedRootPath = normalizeProjectPath(rootPath, { pathModule });
  const relativePath = pathModule.relative(normalizedRootPath, normalizedFilePath);

  return relativePath === '' || (!relativePath.startsWith('..') && !pathModule.isAbsolute(relativePath));
}

export function findContainingProjectPath(filePath, projectPaths = getProjectPaths(), { pathModule = path } = {}) {
  if (!filePath) {
    return null;
  }

  const normalizedProjectPaths = [...projectPaths]
    .map((entry) => normalizeProjectPath(entry, { pathModule }))
    .sort((left, right) => right.length - left.length);

  for (const projectPath of normalizedProjectPaths) {
    if (isPathWithinRoot(filePath, projectPath, { pathModule })) {
      return projectPath;
    }
  }

  return null;
}

export function listWorkspaceRoots({
  getRoots = getProjectPaths,
  activeFilePath = getActiveEditorPath(),
  pathModule = path
} = {}) {
  const roots = getRoots();
  const activeRootPath = findContainingProjectPath(activeFilePath, roots, { pathModule });

  return [...roots]
    .map((rootPath) => ({
      name: pathModule.basename(rootPath),
      path: normalizeProjectPath(rootPath, { pathModule }),
      isActive: Boolean(activeRootPath && normalizeProjectPath(rootPath, { pathModule }) === activeRootPath)
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function resolveWorkspaceRoot({
  projectName,
  projectPath,
  activeFilePath
} = {}, {
  getRoots = getProjectPaths,
  pathModule = path
} = {}) {
  const roots = [...getRoots()].map((root) => normalizeProjectPath(root, { pathModule }));

  if (roots.length === 0) {
    throw new Error('No workspace roots available');
  }

  if (projectPath) {
    const normalizedProjectPath = normalizeProjectPath(projectPath, { pathModule });
    const exactMatch = roots.find((root) => root === normalizedProjectPath);
    if (!exactMatch) {
      throw new Error(`Workspace root not found for projectPath: ${projectPath}`);
    }

    return {
      rootPath: exactMatch,
      rootName: pathModule.basename(exactMatch),
      strategy: 'projectPath'
    };
  }

  if (projectName) {
    const exactMatches = roots.filter((root) => pathModule.basename(root) === projectName);
    if (exactMatches.length === 1) {
      return {
        rootPath: exactMatches[0],
        rootName: pathModule.basename(exactMatches[0]),
        strategy: 'projectName'
      };
    }
    if (exactMatches.length > 1) {
      throw new Error(`Workspace root is ambiguous for projectName: ${projectName}`);
    }

    const caseInsensitiveMatches = roots.filter((root) => pathModule.basename(root).toLowerCase() === projectName.toLowerCase());
    if (caseInsensitiveMatches.length === 1) {
      return {
        rootPath: caseInsensitiveMatches[0],
        rootName: pathModule.basename(caseInsensitiveMatches[0]),
        strategy: 'projectName-ci'
      };
    }
    if (caseInsensitiveMatches.length > 1) {
      throw new Error(`Workspace root is ambiguous for projectName: ${projectName}`);
    }

    throw new Error(`Workspace root not found for projectName: ${projectName}`);
  }

  const activeRootPath = findContainingProjectPath(activeFilePath, roots, { pathModule });
  if (activeRootPath) {
    return {
      rootPath: activeRootPath,
      rootName: pathModule.basename(activeRootPath),
      strategy: 'activeFilePath'
    };
  }

  if (roots.length === 1) {
    return {
      rootPath: roots[0],
      rootName: pathModule.basename(roots[0]),
      strategy: 'singleRoot'
    };
  }

  throw new Error('Workspace root is ambiguous: provide projectName or projectPath');
}

export async function openWorkspaceFile(filePath) {
  return atom.workspace.open(filePath);
}
