'use babel';

import { createDiffHighlighter } from './mcp/tools/diff-highlighter.js';
import { createDocumentReadService } from './mcp/tools/document-read-service.js';
import { createDocumentWriteService } from './mcp/tools/document-write-service.js';
import { registerReadTools } from './mcp/tools/register-read-tools.js';
import { registerNavigationTools } from './mcp/tools/register-navigation-tools.js';
import { registerWriteTools } from './mcp/tools/register-write-tools.js';

export function mcpRegistration(server) {
  const diffHighlighter = createDiffHighlighter();
  const documentReadService = createDocumentReadService();
  const documentWriteService = createDocumentWriteService({ diffHighlighter });

  registerReadTools(server, { documentReadService });
  registerNavigationTools(server);
  registerWriteTools(server, { diffHighlighter, documentWriteService });

  return {
    dispose() {
      diffHighlighter.dispose();
    }
  };
}
