'use babel';

function normalizeMessage(message = {}) {
  const normalized = { ...message };

  if (!Object.prototype.hasOwnProperty.call(normalized, 'content') || normalized.content == null) {
    normalized.content = '';
  }

  return normalized;
}

function trimString(value, limit) {
  if (typeof value !== 'string') {
    return value;
  }

  const normalizedLimit = Number(limit);
  if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0 || value.length <= normalizedLimit) {
    return value;
  }

  return `${value.slice(0, normalizedLimit)}\n...[truncated ${value.length - normalizedLimit} chars]`;
}

function compactMessage(message, { toolContentCharLimit } = {}) {
  const normalized = normalizeMessage(message);
  if (normalized.role !== 'tool') {
    return normalized;
  }

  return {
    ...normalized,
    content: trimString(normalized.content, toolContentCharLimit)
  };
}

export function createConversationState({ systemPrompt }) {
  let history = [normalizeMessage({ role: 'system', content: systemPrompt })];

  return {
    append(message) {
      const normalized = normalizeMessage(message);
      history.push(normalized);
      return normalized;
    },

    getMessages({ maxMessages = null, toolContentCharLimit = null } = {}) {
      const allMessages = history.map((entry) => ({ ...entry }));

      if (!Number.isFinite(maxMessages) || maxMessages <= 0 || allMessages.length <= maxMessages) {
        return allMessages.map((message) => compactMessage(message, { toolContentCharLimit }));
      }

      const systemMessage = allMessages[0];
      const remainingBudget = Math.max(maxMessages - 1, 0);
      const trimmed = remainingBudget === 0
        ? [systemMessage]
        : [systemMessage, ...allMessages.slice(-remainingBudget)];

      return trimmed.map((message) => compactMessage(message, { toolContentCharLimit }));
    },

    reset() {
      history = [normalizeMessage({ role: 'system', content: systemPrompt })];
      return this.getMessages();
    }
  };
}

export { normalizeMessage };
