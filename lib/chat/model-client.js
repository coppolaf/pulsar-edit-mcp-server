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

function buildTimeoutError(timeoutMs) {
  const error = new Error(`Request timed out after ${timeoutMs} ms.`);
  error.name = 'TimeoutError';
  error.isRetryable = true;
  error.retryAfterMs = Math.max(250, Math.min(timeoutMs, 5000));
  return error;
}

function buildNetworkError(originalError) {
  const message = originalError?.message || 'Network request failed.';
  const error = new Error(message);
  error.name = 'NetworkError';
  error.cause = originalError;
  error.isRetryable = true;
  return error;
}

function withTimeout(fetchImpl, url, init, timeoutMs) {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetchImpl(url, init);
  }

  const AbortControllerImpl = globalThis.AbortController;
  if (!AbortControllerImpl) {
    return Promise.race([
      fetchImpl(url, init),
      new Promise((_, reject) => {
        setTimeout(() => reject(buildTimeoutError(timeoutMs)), timeoutMs);
      })
    ]);
  }

  const controller = new AbortControllerImpl();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const requestInit = { ...init, signal: controller.signal };

  return fetchImpl(url, requestInit)
    .catch((error) => {
      if (error?.name === 'AbortError') {
        throw buildTimeoutError(timeoutMs);
      }

      throw buildNetworkError(error);
    })
    .finally(() => clearTimeout(timeoutId));
}

function buildRetryDelayMs(error, attempt, retryBaseDelayMs) {
  const retryAfterMs = Number(error?.retryAfterMs);
  if (Number.isFinite(retryAfterMs) && retryAfterMs >= 0) {
    return retryAfterMs;
  }

  const exponentialDelay = retryBaseDelayMs * (2 ** attempt);
  return Math.max(retryBaseDelayMs, exponentialDelay);
}

export function createModelClient({
  fetchImpl,
  getConfig,
  scheduler = null,
  sleepImpl = sleep
}) {
  const modelsCache = new Map();

  async function executeWithRetry(url, init = {}) {
    const {
      providerTimeoutMs = 0,
      chatMaxRetries = 0,
      chatRetryBaseDelayMs = 750
    } = getConfig();

    let attempt = 0;

    while (true) {
      try {
        const response = await withTimeout(fetchImpl, url, init, providerTimeoutMs);
        if (response.ok) {
          return response.json();
        }

        const payload = await readErrorPayload(response);
        const error = buildHttpError(response, payload);
        const retryAfterSeconds = parseRetryAfterSeconds(response.headers?.get?.('retry-after'));
        if (retryAfterSeconds !== null) {
          error.retryAfterMs = Math.max(0, Math.ceil(retryAfterSeconds * 1000));
        }

        throw error;
      } catch (error) {
        const normalizedError = error?.isRetryable ? error : buildNetworkError(error);
        const shouldRetry = normalizedError.isRetryable && attempt < chatMaxRetries;

        if (!shouldRetry) {
          throw normalizedError;
        }

        const delayMs = buildRetryDelayMs(normalizedError, attempt, chatRetryBaseDelayMs);
        normalizedError.retryAfterMs = delayMs;
        attempt += 1;
        await sleepImpl(delayMs);
      }
    }
  }

  async function fetchJson(url, init = {}) {
    if (!scheduler) {
      return executeWithRetry(url, init);
    }

    return scheduler.enqueue(() => executeWithRetry(url, init));
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
      const data = await executeWithRetry(`${apiEndpointPrefix}/v1/models`, {
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
