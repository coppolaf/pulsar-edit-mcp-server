'use babel';

import { createDiffHighlighter } from './mcp/tools/diff-highlighter.js';
import { registerReadTools } from './mcp/tools/register-read-tools.js';
import { registerNavigationTools } from './mcp/tools/register-navigation-tools.js';
import { registerWriteTools } from './mcp/tools/register-write-tools.js';

export function mcpRegistration(server) {
  const diffHighlighter = createDiffHighlighter();

  registerReadTools(server);
  registerNavigationTools(server);
  registerWriteTools(server, { diffHighlighter });

  return {
    dispose() {
      diffHighlighter.dispose();
    }
  };
}
