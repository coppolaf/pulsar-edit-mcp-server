'use babel';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterSeconds(value) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0) {
    return numeric;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return null;
  }

  const deltaMs = retryAt - Date.now();
  return deltaMs > 0 ? deltaMs / 1000 : 0;
}

async function readErrorPayload(response) {
  const fallbackStatusText = response.statusText || 'Unknown error';

  try {
    const rawText = await response.text();
    if (!rawText) {
      return { message: fallbackStatusText, details: null };
    }

    try {
      const parsed = JSON.parse(rawText);
      const message = parsed?.error?.message || parsed?.message || fallbackStatusText;
      return {
        message,
        details: parsed
      };
    } catch {
      return {
        message: rawText.trim() || fallbackStatusText,
        details: rawText
      };
    }
  } catch {
    return { message: fallbackStatusText, details: null };
  }
}

function buildHttpError(response, payload) {
  const status = response.status;
  const statusLabel = response.statusText ? ` ${response.statusText}` : '';
  const message = payload?.message || response.statusText || 'Unknown error';
  const error = new Error(`HTTP ${status}${statusLabel}: ${message}`);

  error.name = 'HttpError';
  error.status = status;
  error.statusText = response.statusText || '';
  error.details = payload?.details ?? null;
  error.isRetryable = status === 408 || status === 429 || status >= 500;
  return error;
}

export function createModelClient({
  fetchImpl,
  getConfig,
  sleepImpl = sleep,
  maxRetries = 2,
  retryBaseDelayMs = 750
}) {
  const modelsCache = new Map();

  async function fetchJson(url, init = {}) {
    let attempt = 0;

    while (true) {
      const response = await fetchImpl(url, init);
      if (response.ok) {
        return response.json();
      }

      const payload = await readErrorPayload(response);
      const error = buildHttpError(response, payload);
      const shouldRetry = error.isRetryable && attempt < maxRetries;

      if (!shouldRetry) {
        throw error;
      }

      const retryAfterSeconds = parseRetryAfterSeconds(response.headers?.get?.('retry-after'));
      const delayMs = retryAfterSeconds !== null
        ? Math.max(0, Math.ceil(retryAfterSeconds * 1000))
        : retryBaseDelayMs * (attempt + 1);

      attempt += 1;
      await sleepImpl(delayMs);
    }
  }

  return {
    async fetchModels() {
      const { apiEndpointPrefix, apiKey } = getConfig();
      const cacheKey = `${apiEndpointPrefix}::${apiKey}`;

      if (modelsCache.has(cacheKey)) {
        console.log('RETURNING CACHED MODEL LIST');
        return modelsCache.get(cacheKey);
      }

      console.log('FETCHING MODEL LIST');
      const data = await fetchJson(`${apiEndpointPrefix}/v1/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
      const models = data.data?.map((model) => model.id) ?? [];
      modelsCache.set(cacheKey, models);
      console.log('Available models:', models);
      return models;
    },

    async createChatCompletion({ model, messages, tools, maxTokens = 1000 }) {
      const { apiEndpointPrefix, apiKey } = getConfig();
      const data = await fetchJson(`${apiEndpointPrefix}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: 'auto',
          max_tokens: maxTokens
        })
      });
      console.log(`RECEIVED: ${JSON.stringify(data)}`);
      return data;
    },

    clearModelCache() {
      modelsCache.clear();
    }
  };
}
