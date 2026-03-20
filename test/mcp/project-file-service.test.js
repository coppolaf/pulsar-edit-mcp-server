import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectFileService } from '../../lib/mcp/tools/project-file-service.js';

function createDirent(name, type) {
  return {
    name,
    isDirectory() {
      return type === 'dir';
    },
    isFile() {
      return type === 'file';
    },
    isSymbolicLink() {
      return type === 'symlink';
    }
  };
}

test('project-file-service excludes common heavy directories and hidden files by default', async () => {
  const tree = new Map([
    ['/workspace', [
      createDirent('src', 'dir'),
      createDirent('node_modules', 'dir'),
      createDirent('.git', 'dir'),
      createDirent('.env', 'file'),
      createDirent('README.md', 'file')
    ]],
    ['/workspace/src', [
      createDirent('index.js', 'file')
    ]]
  ]);

  const service = createProjectFileService({
    getRoots() {
      return ['/workspace'];
    },
    async readdir(dir) {
      return tree.get(dir) || [];
    },
    pathModule: {
      join(...parts) {
        return parts.join('/').replace(/\/+/g, '/');
      }
    }
  });

  const result = await service.listProjectFiles();
  assert.deepEqual(result.files, [
    '/workspace/README.md',
    '/workspace/src/index.js'
  ]);
  assert.equal(result.truncated, false);
  assert.deepEqual(result.warnings, []);
});

test('project-file-service truncates traversal at maxFiles', async () => {
  const tree = new Map([
    ['/workspace', [
      createDirent('a.js', 'file'),
      createDirent('b.js', 'file'),
      createDirent('c.js', 'file')
    ]]
  ]);

  const service = createProjectFileService({
    getRoots() {
      return ['/workspace'];
    },
    async readdir(dir) {
      return tree.get(dir) || [];
    },
    pathModule: {
      join(...parts) {
        return parts.join('/');
      }
    }
  });

  const result = await service.listProjectFiles({ maxFiles: 2 });
  assert.deepEqual(result.files, ['/workspace/a.js', '/workspace/b.js']);
  assert.equal(result.truncated, true);
});

test('project-file-service collects non-fatal warnings for unreadable directories', async () => {
  const service = createProjectFileService({
    getRoots() {
      return ['/workspace'];
    },
    async readdir(dir) {
      if (dir === '/workspace') {
        return [createDirent('src', 'dir')];
      }
      throw new Error('EACCES');
    },
    pathModule: {
      join(...parts) {
        return parts.join('/');
      }
    }
  });

  const result = await service.listProjectFiles();
  assert.deepEqual(result.files, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].directory, '/workspace/src');
});
