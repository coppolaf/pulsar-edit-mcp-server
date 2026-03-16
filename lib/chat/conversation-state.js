'use babel';

function normalizeMessage(message = {}) {
  const normalized = { ...message };

  if (!Object.prototype.hasOwnProperty.call(normalized, 'content') || normalized.content == null) {
    normalized.content = '';
  }

  return normalized;
}

export function createConversationState({ systemPrompt }) {
  let history = [normalizeMessage({ role: 'system', content: systemPrompt })];

  return {
    append(message) {
      const normalized = normalizeMessage(message);
      history.push(normalized);
      return normalized;
    },

    getMessages() {
      return history.map((entry) => ({ ...entry }));
    },

    reset() {
      history = [normalizeMessage({ role: 'system', content: systemPrompt })];
      return this.getMessages();
    }
  };
}

export { normalizeMessage };
