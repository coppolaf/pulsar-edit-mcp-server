'use babel';

function normalizeMessage(message = {}) {
  const normalized = { ...message };

  if (!Object.prototype.hasOwnProperty.call(normalized, 'content') || normalized.content == null) {
    normalized.content = '';
  }

  return normalized;
}

function truncateText(value, maxChars) {
  if (!Number.isFinite(maxChars) || maxChars <= 0) {
    return value;
  }

  if (typeof value !== 'string' || value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}\n...[truncated tool content]`;
}

function truncateToolMessage(message, toolContentCharLimit) {
  if (message.role !== 'tool') {
    return message;
  }

  return {
    ...message,
    content: truncateText(message.content, toolContentCharLimit)
  };
}

function findStartIndexForRecentUserTurns(history, maxUserMessages) {
  if (!Number.isFinite(maxUserMessages) || maxUserMessages <= 0) {
    return 1;
  }

  const userIndexes = [];
  for (let index = 1; index < history.length; index += 1) {
    if (history[index].role === 'user') {
      userIndexes.push(index);
    }
  }

  if (userIndexes.length <= maxUserMessages) {
    return 1;
  }

  return userIndexes[userIndexes.length - maxUserMessages];
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

    getMessagesForProvider({ maxUserMessages = Infinity, toolContentCharLimit = Infinity } = {}) {
      const normalizedHistory = this.getMessages();
      const startIndex = findStartIndexForRecentUserTurns(normalizedHistory, maxUserMessages);
      const tail = normalizedHistory
        .slice(startIndex)
        .map((message) => truncateToolMessage(message, toolContentCharLimit));

      return [normalizedHistory[0], ...tail];
    },

    reset() {
      history = [normalizeMessage({ role: 'system', content: systemPrompt })];
      return this.getMessages();
    }
  };
}

export { normalizeMessage };
