'use babel';

import fs from 'fs';
import path from 'path';
import {
  getActiveEditorPath,
  getProjectPaths,
  isPathWithinRoot,
  listWorkspaceRoots as listWorkspaceRootsFromContext,
  normalizeProjectPath,
  resolveWorkspaceRoot
} from './editor-context.js';

const DEFAULT_EXCLUDED_DIRECTORIES = Object.freeze([
  '.git',
  'node_modules',
  '.pulsar',
  '.svn',
  '.hg',
  'dist',
  'build',
  'coverage',
  '.cache'
]);

function compareDirentsByName(left, right) {
  return left.name.localeCompare(right.name);
}

function ensureDistinctPaths(paths) {
  return [...new Set(paths)];
}

export function createProjectFileService({
  getRoots = getProjectPaths,
  getActiveFilePath = getActiveEditorPath,
  readdir = fs.promises.readdir,
  stat = fs.promises.stat,
  pathModule = path,
  defaultMaxDepth = 12,
  defaultMaxFiles = 5000,
  defaultExcludedDirectories = DEFAULT_EXCLUDED_DIRECTORIES
} = {}) {
  function getWorkspaceRoots(args = {}) {
    return listWorkspaceRootsFromContext({
      getRoots,
      activeFilePath: args.activeFilePath !== undefined ? args.activeFilePath : getActiveFilePath(),
      pathModule
    });
  }

  function resolveRootSelection(args = {}) {
    const { projectName, projectPath } = args;
    if (!projectName && !projectPath) {
      return null;
    }

    const resolutionArgs = { projectName, projectPath };
    if (Object.prototype.hasOwnProperty.call(args, 'activeFilePath')) {
      resolutionArgs.activeFilePath = args.activeFilePath;
    }

    return resolveWorkspaceRoot(resolutionArgs, {
      getRoots,
      pathModule
    });
  }

  async function listProjectFiles({
    projectName,
    projectPath,
    activeFilePath,
    maxDepth = defaultMaxDepth,
    maxFiles = defaultMaxFiles,
    includeHidden = false,
    excludedDirectories = defaultExcludedDirectories
  } = {}) {
    const resolvedRoot = resolveRootSelection({ projectName, projectPath, activeFilePath });
    const roots = resolvedRoot ? [resolvedRoot.rootPath] : getRoots();
    const files = [];
    const warnings = [];
    const normalizedExclusions = new Set(excludedDirectories);
    let truncated = false;

    async function walk(dir, depth) {
      if (truncated || depth > maxDepth) {
        return;
      }

      let entries = [];
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (error) {
        warnings.push({
          type: 'readdir-failed',
          directory: dir,
          message: error.message
        });
        return;
      }

      for (const entry of [...entries].sort(compareDirentsByName)) {
        if (truncated) {
          return;
        }

        const entryName = entry.name;
        const isHidden = entryName.startsWith('.');
        const fullPath = pathModule.join(dir, entryName);

        if (entry.isSymbolicLink()) {
          continue;
        }

        if (entry.isDirectory()) {
          if (normalizedExclusions.has(entryName)) {
            continue;
          }
          if (isHidden && !includeHidden && !normalizedExclusions.has(entryName)) {
            continue;
          }
          await walk(fullPath, depth + 1);
          continue;
        }

        if (isHidden && !includeHidden) {
          continue;
        }

        if (!entry.isFile || entry.isFile()) {
          files.push(fullPath);
        }
        if (files.length >= maxFiles) {
          truncated = true;
          return;
        }
      }
    }

    for (const root of [...roots].sort()) {
      await walk(root, 0);
      if (truncated) {
        break;
      }
    }

    return {
      files,
      truncated,
      maxDepth,
      maxFiles,
      roots: [...roots],
      resolvedRoot,
      warnings,
      excludedDirectories: Array.from(normalizedExclusions)
    };
  }

  async function fileExists(filePath) {
    try {
      const details = await stat(filePath);
      return Boolean(details && typeof details.isFile === 'function' ? details.isFile() : true);
    } catch {
      return false;
    }
  }

  async function resolveFileForOpen({
    filePath,
    projectName,
    projectPath,
    activeFilePath,
    includeHidden = true
  }) {
    if (!filePath || typeof filePath !== 'string') {
      throw new Error('filePath is required');
    }

    const resolvedRoot = resolveRootSelection({ projectName, projectPath, activeFilePath });
    const workspaceRoots = resolvedRoot ? [resolvedRoot.rootPath] : getRoots();
    const normalizedInputPath = pathModule.normalize(filePath);
    const isAbsolutePath = pathModule.isAbsolute(normalizedInputPath);

    if (isAbsolutePath) {
      const normalizedAbsolutePath = normalizeProjectPath(normalizedInputPath, { pathModule });
      const isWithinWorkspace = workspaceRoots.some((root) => isPathWithinRoot(normalizedAbsolutePath, root, { pathModule }));
      if (!isWithinWorkspace) {
        throw new Error(`File is outside the selected workspace roots: ${filePath}`);
      }
      if (!(await fileExists(normalizedAbsolutePath))) {
        throw new Error(`File not found: ${filePath}`);
      }
      return {
        requestedPath: filePath,
        resolvedPath: normalizedAbsolutePath,
        resolvedRoot: workspaceRoots.find((root) => isPathWithinRoot(normalizedAbsolutePath, root, { pathModule })) || null,
        resolutionStrategy: 'absolute'
      };
    }

    const hasPathSeparator = normalizedInputPath.includes(pathModule.sep) || normalizedInputPath.includes('/');
    const normalizedRelativePath = normalizedInputPath.split(/[\\/]+/).join(pathModule.sep);

    const directCandidates = [];
    for (const root of workspaceRoots) {
      const candidate = pathModule.resolve(root, normalizedRelativePath);
      if (isPathWithinRoot(candidate, root, { pathModule }) && await fileExists(candidate)) {
        directCandidates.push(candidate);
      }
    }

    const distinctDirectCandidates = ensureDistinctPaths(directCandidates);
    if (distinctDirectCandidates.length === 1) {
      return {
        requestedPath: filePath,
        resolvedPath: distinctDirectCandidates[0],
        resolvedRoot: workspaceRoots.find((root) => isPathWithinRoot(distinctDirectCandidates[0], root, { pathModule })) || null,
        resolutionStrategy: hasPathSeparator ? 'relative' : 'basename-exact'
      };
    }
    if (distinctDirectCandidates.length > 1) {
      throw new Error(`File path is ambiguous across workspace roots: ${filePath}`);
    }

    if (hasPathSeparator) {
      throw new Error(`File not found in selected workspace roots: ${filePath}`);
    }

    const listing = await listProjectFiles({
      projectName,
      projectPath,
      activeFilePath,
      includeHidden
    });
    const basenameMatches = ensureDistinctPaths(
      listing.files.filter((candidatePath) => pathModule.basename(candidatePath) === normalizedInputPath)
    );

    if (basenameMatches.length === 1) {
      return {
        requestedPath: filePath,
        resolvedPath: basenameMatches[0],
        resolvedRoot: listing.roots.find((root) => isPathWithinRoot(basenameMatches[0], root, { pathModule })) || null,
        resolutionStrategy: 'basename-search'
      };
    }
    if (basenameMatches.length > 1) {
      throw new Error(`File name is ambiguous in selected workspace roots: ${filePath}`);
    }

    throw new Error(`File not found in selected workspace roots: ${filePath}`);
  }

  return {
    listProjectFiles,
    listWorkspaceRoots: getWorkspaceRoots,
    resolveFileForOpen,
    getDefaultExcludedDirectories() {
      return [...defaultExcludedDirectories];
    }
  };
}
