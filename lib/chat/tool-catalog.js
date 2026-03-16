'use babel';

function toOpenAiTool(tool) {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description ?? '',
      parameters: tool.inputSchema
    }
  };
}

export function createToolCatalog() {
  const cache = new WeakMap();

  return {
    async getTools(mcpClient) {
      if (!mcpClient) {
        return [];
      }

      if (cache.has(mcpClient)) {
        console.log('Found available tools');
        return cache.get(mcpClient);
      }

      console.log('Fetching available tools');
      const { tools = [] } = await mcpClient.listTools();
      const openAiTools = tools.map(toOpenAiTool);
      cache.set(mcpClient, openAiTools);
      return openAiTools;
    },

    clear(mcpClient) {
      if (mcpClient) {
        cache.delete(mcpClient);
      }
    }
  };
}
