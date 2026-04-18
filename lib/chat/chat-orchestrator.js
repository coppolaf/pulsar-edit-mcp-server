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

export function createChatOrchestrator({
  conversationState,
  modelClient,
  toolCatalog,
  requestScheduler,
  conversationQueue,
  getConfig = () => ({})
}) {
  async function createScheduledCompletion({ model, mcpClient }) {
    const config = getConfig();
    const availableTools = await toolCatalog.getTools(mcpClient);
    const messages = conversationState.getMessages({
      maxMessages: config.chatContextMessageLimit,
      toolContentCharLimit: config.chatToolContentCharLimit
    });

    const execute = () => modelClient.createChatCompletion({
      model,
      messages,
      tools: availableTools
    });

    return requestScheduler ? requestScheduler.enqueue(execute) : execute();
  }

  async function runAssistantLoop({ mcpClient, uiContext, model }) {
    while (true) {
      const data = await createScheduledCompletion({ model, mcpClient });
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

  async function executeConversationTask(task, chatObj) {
    chatObj?.thinkingOnOff?.(true);

    try {
      return await task();
    } finally {
      chatObj?.thinkingOnOff?.(false);
    }
  }

  return {
    async handleSendMessage({ chatObj, chatDisplay, marked, DOMPurify, message, model, mcpClient }) {
      const uiContext = { chatDisplay, marked, DOMPurify };
      const execute = async () => executeConversationTask(async () => {
        renderChatMessage({
          ...uiContext,
          sender: 'User',
          markdownText: message
        });
        conversationState.append({ role: 'user', content: message });
        return runAssistantLoop({ mcpClient, uiContext, model });
      }, chatObj);

      if (!conversationQueue) {
        return execute();
      }

      return conversationQueue.enqueue(execute);
    },

    async callLLM({ chatObj, chatDisplay, marked, DOMPurify, model, mcpClient }) {
      const uiContext = { chatDisplay, marked, DOMPurify };
      const execute = async () => executeConversationTask(
        () => runAssistantLoop({ mcpClient, uiContext, model }),
        chatObj
      );

      if (!conversationQueue) {
        return execute();
      }

      return conversationQueue.enqueue(execute);
    }
  };
}
