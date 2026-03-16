'use babel';

export function createModelClient({ fetchImpl, getConfig }) {
  const modelsCache = new Map();

  async function fetchJson(url, init = {}) {
    const response = await fetchImpl(url, init);
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`);
    }
    return response.json();
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
