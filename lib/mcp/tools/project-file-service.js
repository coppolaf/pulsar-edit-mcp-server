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

function compareDirentsByName(left, right) {
  return left.name.localeCompare(right.name);
}

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
      roots,
      warnings,
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
