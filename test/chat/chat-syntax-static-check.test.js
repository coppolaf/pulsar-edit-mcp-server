import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function stripEsmSyntax(source) {
  return source
    .replace(/^\s*import\s+[^;]+;\s*$/gm, '')
    .replace(/^\s*export\s+default\s+/gm, '')
    .replace(/^\s*export\s+(async\s+function\s+)/gm, '$1')
    .replace(/^\s*export\s+(function\s+)/gm, '$1')
    .replace(/^\s*export\s+(const\s+)/gm, '$1')
    .replace(/^\s*export\s+(let\s+)/gm, '$1')
    .replace(/^\s*export\s+(var\s+)/gm, '$1')
    .replace(/^\s*export\s*\{[^}]+\};?\s*$/gm, '');
}

test('lib/chat modules compile after ESM stripping to catch broken JS strings', () => {
  const chatDir = path.join(__dirname, '..', '..', 'lib', 'chat');
  const files = fs.readdirSync(chatDir)
    .filter((entry) => entry.endsWith('.js'))
    .sort();

  assert.ok(files.length > 0, 'Expected at least one lib/chat module to validate');

  for (const file of files) {
    const filePath = path.join(chatDir, file);
    const source = fs.readFileSync(filePath, 'utf8');
    const stripped = stripEsmSyntax(source);

    assert.doesNotThrow(
      () => new Function(stripped),
      `Expected ${path.relative(process.cwd(), filePath)} to be syntactically valid after ESM stripping`
    );
  }
});
