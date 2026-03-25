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

function createPathModule() {
  return {
    sep: '/',
    join(...parts) {
      return parts.join('/').replace(/\/+/g, '/');
    },
    resolve(...parts) {
      return parts.join('/').replace(/\/+/g, '/').replace('//', '/');
    },
    relative(from, to) {
      const normalize = (value) => value.replace(/\/+/g, '/').replace(/\/$/, '');
      from = normalize(from);
      to = normalize(to);
      if (from === to) {
        return '';
      }
      if (to.startsWith(`${from}/`)) {
        return to.slice(from.length + 1);
      }
      return `../${to}`;
    },
    isAbsolute(value) {
      return value.startsWith('/');
    },
    basename(value) {
      return value.split('/').filter(Boolean).pop() || '';
    },
    normalize(value) {
      return value.replace(/\/+/g, '/');
    }
  };
}

const pathModule = createPathModule();

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
    pathModule
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
    pathModule
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
    pathModule
  });

  const result = await service.listProjectFiles();
  assert.deepEqual(result.files, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0].directory, '/workspace/src');
});

test('project-file-service scopes traversal to the requested project root in a multi-root workspace', async () => {
  const tree = new Map([
    ['/workspace/alpha', [createDirent('alpha.txt', 'file')]],
    ['/workspace/beta', [createDirent('README.md', 'file')]]
  ]);

  const service = createProjectFileService({
    getRoots() {
      return ['/workspace/alpha', '/workspace/beta'];
    },
    async readdir(dir) {
      return tree.get(dir) || [];
    },
    pathModule
  });

  const result = await service.listProjectFiles({ projectName: 'beta' });
  assert.deepEqual(result.files, ['/workspace/beta/README.md']);
  assert.equal(result.resolvedRoot.rootPath, '/workspace/beta');
  assert.equal(result.roots.length, 1);
});

test('project-file-service exposes workspace roots with active root metadata', () => {
  const service = createProjectFileService({
    getRoots() {
      return ['/workspace/alpha', '/workspace/beta'];
    },
    getActiveFilePath() {
      return '/workspace/beta/README.md';
    },
    pathModule
  });

  const result = service.listWorkspaceRoots();
  assert.deepEqual(result, [
    { name: 'alpha', path: '/workspace/alpha', isActive: false },
    { name: 'beta', path: '/workspace/beta', isActive: true }
  ]);
});

test('project-file-service resolves basename opens within the requested project root', async () => {
  const tree = new Map([
    ['/workspace/alpha', [createDirent('README.md', 'file')]],
    ['/workspace/beta', [createDirent('README.md', 'file')]]
  ]);

  const service = createProjectFileService({
    getRoots() {
      return ['/workspace/alpha', '/workspace/beta'];
    },
    async readdir(dir) {
      return tree.get(dir) || [];
    },
    async stat(filePath) {
      if (filePath === '/workspace/alpha/README.md' || filePath === '/workspace/beta/README.md') {
        return { isFile() { return true; } };
      }
      throw new Error('ENOENT');
    },
    pathModule
  });

  const result = await service.resolveFileForOpen({ filePath: 'README.md', projectName: 'beta' });
  assert.equal(result.resolvedPath, '/workspace/beta/README.md');
  assert.equal(result.resolutionStrategy, 'basename-exact');
});

test('project-file-service rejects ambiguous basename opens across workspace roots', async () => {
  const service = createProjectFileService({
    getRoots() {
      return ['/workspace/alpha', '/workspace/beta'];
    },
    async stat(filePath) {
      if (filePath === '/workspace/alpha/README.md' || filePath === '/workspace/beta/README.md') {
        return { isFile() { return true; } };
      }
      throw new Error('ENOENT');
    },
    pathModule
  });

  await assert.rejects(
    service.resolveFileForOpen({ filePath: 'README.md' }),
    /ambiguous/
  );
});
