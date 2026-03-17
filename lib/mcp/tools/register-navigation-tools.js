'use babel';

import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { getProjectPaths, openWorkspaceFile } from './editor-context.js';

export function registerNavigationTools(server) {
  registerGetProjectFilesTool(server);
  registerOpenFileTool(server);
}

function registerGetProjectFilesTool(server) {
  const curTool = 'get-project-files';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Project Files',
      description: 'Return a newline-separated list of all files under the current project roots.',
      inputSchema: {}
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const roots = getProjectPaths();
      const files = [];

      async function walk(dir) {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath);
          } else {
            files.push(fullPath);
          }
        }
      }

      for (const root of roots) {
        await walk(root);
      }

      return {
        content: [{ type: 'text', text: files.join('\n') }]
      };
    }
  );
}

function registerOpenFileTool(server) {
  const curTool = 'open-file';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Open File',
      description: 'Open (or switch to) a tab for the given file path.',
      inputSchema: { filePath: z.string() }
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const { filePath } = args;
      await openWorkspaceFile(filePath);
      return {
        content: [{ type: 'text', text: `Opened file: ${filePath}` }]
      };
    }
  );
}
