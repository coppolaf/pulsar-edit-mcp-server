'use babel';

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { mcpRegistration } from '../mcp-registration.js';

function createUUID() {
  const s = [];
  const hexDigits = '0123456789abcdef';
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = '4';
  s[19] = hexDigits.substr((parseInt(s[19], 16) & 0x3) | 0x8, 1);
  s[8] = s[13] = s[18] = s[23] = '-';

  return s.join('');
}

export function createMcpHttpRuntime({ version, port, serverName = 'pulsar-edit-mcp-server-server' }) {
  const app = express();
  const transports = {};
  let serverInstance = null;

  app.use(express.json());

  app.post('/mcp', async (req, res) => {
    const sessionId = typeof req.headers['mcp-session-id'] === 'string'
      ? req.headers['mcp-session-id']
      : undefined;

    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => createUUID(),
        onsessioninitialized: (initializedSessionId) => {
          transports[initializedSessionId] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
        }
      };

      const mcpServer = new McpServer({
        name: serverName,
        version
      });

      mcpRegistration(mcpServer);
      await mcpServer.connect(transport);
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided'
        },
        id: null
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (req, res) => {
    const sessionId = typeof req.headers['mcp-session-id'] === 'string'
      ? req.headers['mcp-session-id']
      : undefined;

    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    await transports[sessionId].handleRequest(req, res);
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  return {
    start() {
      if (serverInstance) {
        return serverInstance;
      }

      serverInstance = app.listen(port);
      return serverInstance;
    },

    stop() {
      return new Promise((resolve) => {
        if (!serverInstance) {
          resolve(false);
          return;
        }

        const currentInstance = serverInstance;
        serverInstance = null;

        currentInstance.close(() => {
          Object.keys(transports).forEach((sessionId) => delete transports[sessionId]);
          resolve(true);
        });
      });
    },

    isRunning() {
      return serverInstance != null;
    }
  };
}
