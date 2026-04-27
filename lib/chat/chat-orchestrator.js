'use babel';

import { renderChatMessage } from './chat-renderer.js';

function buildToolResultMessage(toolCall, toolResult) {
  return {
    role: 'tool',
    name: toolCall.function.name,
    content: JSON.stringify(toolResult.content),
    tool_call_id: toolCall.id
  };
}

function parseToolArguments(toolCall) {
  return JSON.parse(toolCall.function.arguments || '{}');
}

export function createChatOrchestrator({ conversationState, modelClient, toolCatalog, getConfig = () => ({}) }) {
  async function runAssistantLoop({ mcpClient, uiContext, model }) {
    while (true) {
      const availableTools = await toolCatalog.getTools(mcpClient);
      const {
        chatContextMessageLimit = Infinity,
        chatToolContentCharLimit = Infinity
      } = getConfig();
      const providerMessages = conversationState.getMessagesForProvider({
        maxUserMessages: chatContextMessageLimit,
        toolContentCharLimit: chatToolContentCharLimit
      });
      const data = await modelClient.createChatCompletion({
        model,
        messages: providerMessages,
        tools: availableTools
      });

      const assistantMessage = data.choices?.[0]?.message ?? { role: 'assistant', content: '' };
      conversationState.append(assistantMessage);

      const toolCalls = assistantMessage.tool_calls ?? [];
      if (toolCalls.length === 0) {
        const responseText = assistantMessage.content?.trim?.() || '';
        if (responseText) {
          renderChatMessage({
            ...uiContext,
            sender: 'Assistant',
            markdownText: responseText
          });
        }
        return responseText;
      }

      for (const toolCall of toolCalls) {
        const args = parseToolArguments(toolCall);
        const toolResult = await mcpClient.callTool({
          name: toolCall.function.name,
          arguments: args
        });
        conversationState.append(buildToolResultMessage(toolCall, toolResult));
      }
    }
  }

  return {
    async handleSendMessage({ chatObj, chatDisplay, marked, DOMPurify, message, model, mcpClient }) {
      const uiContext = { chatDisplay, marked, DOMPurify };
      chatObj?.thinkingOnOff?.(true);

      try {
        renderChatMessage({
          ...uiContext,
          sender: 'User',
          markdownText: message
        });
        conversationState.append({ role: 'user', content: message });
        return await runAssistantLoop({ mcpClient, uiContext, model });
      } finally {
        chatObj?.thinkingOnOff?.(false);
      }
    },

    async callLLM({ chatObj, chatDisplay, marked, DOMPurify, model, mcpClient }) {
      const uiContext = { chatDisplay, marked, DOMPurify };
      chatObj?.thinkingOnOff?.(true);

      try {
        return await runAssistantLoop({ mcpClient, uiContext, model });
      } finally {
        chatObj?.thinkingOnOff?.(false);
      }
    }
  };
}
