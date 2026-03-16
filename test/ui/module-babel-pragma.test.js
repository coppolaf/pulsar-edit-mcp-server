import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const LIB_DIR = path.resolve('lib');

function collectJavaScriptFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJavaScriptFiles(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
  return files;
}

test('all lib modules using ESM syntax declare the Babel pragma expected by Pulsar', () => {
  const files = collectJavaScriptFiles(LIB_DIR);
  const offenders = [];

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const usesEsmSyntax = /^\s*import\s/m.test(source) || /^\s*export\s/m.test(source);
    if (!usesEsmSyntax) {
      continue;
    }

    if (!source.startsWith("'use babel';") && !source.startsWith('"use babel";')) {
      offenders.push(path.relative(process.cwd(), file));
    }
  }

  assert.deepEqual(offenders, []);
});
