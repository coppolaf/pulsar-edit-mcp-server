'use babel';

import fs from 'fs';
import path from 'path';
import { getProjectPaths } from './editor-context.js';

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

export function createProjectFileService({
  getRoots = getProjectPaths,
  readdir = fs.promises.readdir,
  pathModule = path,
  defaultMaxDepth = 12,
  defaultMaxFiles = 5000,
  defaultExcludedDirectories = DEFAULT_EXCLUDED_DIRECTORIES
} = {}) {
  async function listProjectFiles({
    maxDepth = defaultMaxDepth,
    maxFiles = defaultMaxFiles,
    includeHidden = false,
    excludedDirectories = defaultExcludedDirectories
  } = {}) {
    const roots = getRoots();
    const files = [];
    const normalizedExclusions = new Set(excludedDirectories);
    let truncated = false;

    async function walk(dir, depth) {
      if (truncated || depth > maxDepth) {
        return;
      }

      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
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

        files.push(fullPath);
        if (files.length >= maxFiles) {
          truncated = true;
          return;
        }
      }
    }

    for (const root of roots) {
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
      roots,
      excludedDirectories: Array.from(normalizedExclusions)
    };
  }

  return {
    listProjectFiles,
    getDefaultExcludedDirectories() {
      return [...defaultExcludedDirectories];
    }
  };
}
