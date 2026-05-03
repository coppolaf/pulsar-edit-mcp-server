import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPreferredModelSelection,
  selectPreferredModelId
} from '../../lib/chat/model-selection.js';

test('model selection prefers gpt-4o over non-chat models and later chat models', () => {
  const models = ['text-embedding-ada-002', 'gpt-4o-mini', 'gpt-4o'];
  assert.equal(selectPreferredModelId(models), 'gpt-4o');
});

test('model selection falls back to gpt-4o-mini when gpt-4o is unavailable', () => {
  const models = ['text-embedding-ada-002', 'gpt-4o-mini'];
  assert.equal(selectPreferredModelId(models), 'gpt-4o-mini');
});

test('model selection skips realtime, audio and embedding models when choosing a generic gpt model', () => {
  const models = [
    'text-embedding-ada-002',
    'gpt-4o-realtime-preview',
    'gpt-4o-audio-preview',
    'gpt-4.1'
  ];

  assert.equal(selectPreferredModelId(models), 'gpt-4.1');
});

test('model selection leaves the select unchanged when no safe chat model is available', () => {
  const select = { value: 'existing' };
  const selected = applyPreferredModelSelection(select, ['text-embedding-ada-002', 'tts-1']);

  assert.equal(selected, '');
  assert.equal(select.value, 'existing');
});
