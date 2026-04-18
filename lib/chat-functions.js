'use babel';

import { getChatConfig, getDefaultSystemPrompt } from './chat/config.js';
import { createConversationState } from './chat/conversation-state.js';
import { createToolCatalog } from './chat/tool-catalog.js';
import { createModelClient } from './chat/model-client.js';
import { createChatOrchestrator } from './chat/chat-orchestrator.js';
import { renderChatMessage } from './chat/chat-renderer.js';
import { createRequestScheduler } from './chat/request-scheduler.js';

const conversationState = createConversationState({
  systemPrompt: getDefaultSystemPrompt()
});
const toolCatalog = createToolCatalog();
const modelClient = createModelClient({
  fetchImpl: (...args) => fetch(...args),
  getConfig: getChatConfig
});
const providerRequestScheduler = createRequestScheduler({
  getMinGapMs: () => getChatConfig().chatRequestMinGapMs
});
const conversationQueue = createRequestScheduler();
const orchestrator = createChatOrchestrator({
  conversationState,
  modelClient,
  toolCatalog,
  requestScheduler: providerRequestScheduler,
  conversationQueue,
  getConfig: getChatConfig
});

function updateChatHistory(sender, markdownText, renderContext = {}) {
  const { chatDisplay, marked, DOMPurify } = renderContext;
  return renderChatMessage({
    chatDisplay,
    marked,
    DOMPurify,
    sender,
    markdownText
  });
}

async function callLLM(mcpClient, options = {}) {
  const {
    chatObj = null,
    chatDisplay = null,
    marked = null,
    DOMPurify = null,
    model = 'gpt-4o'
  } = options;

  return orchestrator.callLLM({
    chatObj,
    chatDisplay,
    marked,
    DOMPurify,
    model,
    mcpClient
  });
}

function fetchModels() {
  return modelClient.fetchModels();
}

function handleSendMessage(inChatObj, inChatDisplay, inMarked, inDOMPurify, message, inModel, mcpClient) {
  console.log('Message from UI:', message);
  return orchestrator.handleSendMessage({
    chatObj: inChatObj,
    chatDisplay: inChatDisplay,
    marked: inMarked,
    DOMPurify: inDOMPurify,
    message,
    model: inModel,
    mcpClient
  });
}

function clearContextHistory() {
  conversationQueue.reset();
  providerRequestScheduler.reset();
  return conversationState.reset();
}

export {
  updateChatHistory,
  callLLM,
  fetchModels,
  handleSendMessage,
  clearContextHistory
};
