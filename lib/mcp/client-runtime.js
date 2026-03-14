'use babel';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export async function startMcpClient({ version, port, clientName = 'pulsar-edit-mcp-server-client', chatPanel }) {
  const baseUrl = new URL(`http://localhost:${port}/mcp`);
  const mcpClient = new Client({
    name: clientName,
    version
  });

  const clientTransport = new StreamableHTTPClientTransport(baseUrl);
  await mcpClient.connect(clientTransport);
  console.log('MCP Client Connected');

  if (chatPanel && typeof chatPanel.setMcpClient === 'function') {
    chatPanel.setMcpClient(mcpClient);
  }

  return mcpClient;
}

export async function stopMcpClient(mcpClient, chatPanel) {
  if (chatPanel && typeof chatPanel.setMcpClient === 'function') {
    chatPanel.setMcpClient(null);
  }

  if (!mcpClient) {
    return;
  }

  if (typeof mcpClient.close === 'function') {
    await mcpClient.close();
  }
}
