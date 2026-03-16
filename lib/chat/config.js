'use babel';

const DEFAULT_API_ENDPOINT_PREFIX = 'https://api.openai.com';
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful coding assistant with access to the user\'s Pulsar editor IDE.';

export function getChatConfig() {
  return {
    apiEndpointPrefix: atom.config.get('pulsar-edit-mcp-server.apiEndpointPrefix') || DEFAULT_API_ENDPOINT_PREFIX,
    apiKey: atom.config.get('pulsar-edit-mcp-server.apiKey') || ''
  };
}

export function getDefaultSystemPrompt() {
  return DEFAULT_SYSTEM_PROMPT;
}
