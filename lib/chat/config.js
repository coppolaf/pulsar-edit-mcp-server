'use babel';

const DEFAULT_API_ENDPOINT_PREFIX = 'https://api.openai.com';
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful coding assistant with access to the user's Pulsar editor IDE.';
const DEFAULT_PROVIDER_TIMEOUT_MS = 30000;
const DEFAULT_CHAT_MAX_RETRIES = 2;
const DEFAULT_CHAT_RETRY_BASE_DELAY_MS = 750;
const DEFAULT_CHAT_REQUEST_MIN_GAP_MS = 600;
const DEFAULT_CHAT_CONTEXT_MESSAGE_LIMIT = 12;
const DEFAULT_CHAT_TOOL_CONTENT_CHAR_LIMIT = 2000;

function getNumberConfig(key, fallback) {
  const value = Number(atom.config.get(key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function getChatConfig() {
  return {
    apiEndpointPrefix: atom.config.get('pulsar-edit-mcp-server.apiEndpointPrefix') || DEFAULT_API_ENDPOINT_PREFIX,
    apiKey: atom.config.get('pulsar-edit-mcp-server.apiKey') || '',
    providerTimeoutMs: getNumberConfig('pulsar-edit-mcp-server.providerTimeoutMs', DEFAULT_PROVIDER_TIMEOUT_MS),
    chatMaxRetries: getNumberConfig('pulsar-edit-mcp-server.chatMaxRetries', DEFAULT_CHAT_MAX_RETRIES),
    chatRetryBaseDelayMs: getNumberConfig('pulsar-edit-mcp-server.chatRetryBaseDelayMs', DEFAULT_CHAT_RETRY_BASE_DELAY_MS),
    chatRequestMinGapMs: getNumberConfig('pulsar-edit-mcp-server.chatRequestMinGapMs', DEFAULT_CHAT_REQUEST_MIN_GAP_MS),
    chatContextMessageLimit: getNumberConfig('pulsar-edit-mcp-server.chatContextMessageLimit', DEFAULT_CHAT_CONTEXT_MESSAGE_LIMIT),
    chatToolContentCharLimit: getNumberConfig('pulsar-edit-mcp-server.chatToolContentCharLimit', DEFAULT_CHAT_TOOL_CONTENT_CHAR_LIMIT)
  };
}

export function getDefaultSystemPrompt() {
  return DEFAULT_SYSTEM_PROMPT;
}
