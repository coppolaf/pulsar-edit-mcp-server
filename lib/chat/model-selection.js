'use babel';

const PREFERRED_CHAT_MODELS = [
  'gpt-4o',
  'gpt-4o-mini'
];

function isExcludedNonChatModel(id) {
  return /embedding|realtime|audio|whisper|tts/i.test(String(id || ''));
}

function isLikelyChatModel(id) {
  const value = String(id || '');
  return /^gpt-/.test(value) && !isExcludedNonChatModel(value);
}

export function selectPreferredModelId(models = []) {
  if (!Array.isArray(models) || models.length === 0) {
    return '';
  }

  for (const preferredModel of PREFERRED_CHAT_MODELS) {
    if (models.includes(preferredModel)) {
      return preferredModel;
    }
  }

  return models.find((id) => isLikelyChatModel(id)) || '';
}

export function applyPreferredModelSelection(modelSelect, models = []) {
  if (!modelSelect) {
    return '';
  }

  const preferredModel = selectPreferredModelId(models);
  if (preferredModel) {
    modelSelect.value = preferredModel;
  }

  return preferredModel;
}
