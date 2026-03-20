'use babel';

import { z } from 'zod';
import { openWorkspaceFile } from './editor-context.js';
import { createProjectFileService } from './project-file-service.js';

export function registerNavigationTools(server, { projectFileService = createProjectFileService() } = {}) {
  registerGetProjectFilesTool(server, projectFileService);
  registerOpenFileTool(server);
}

function registerGetProjectFilesTool(server, projectFileService) {
  const curTool = 'get-project-files';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Project Files',
      description: [
        'Return a newline-separated list of files under the current project roots.',
        'Performs a bounded traversal with default directory exclusions for safer workspace scans.',
        'Use includeHidden=true only when hidden files are explicitly needed.'
      ].join(' '),
      inputSchema: {
        maxDepth: z.number().int().positive().optional(),
        maxFiles: z.number().int().positive().optional(),
        includeHidden: z.boolean().optional(),
        excludedDirectories: z.array(z.string()).optional()
      }
    },
    async (args = {}) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const result = await projectFileService.listProjectFiles(args);
      const summary = result.truncated
        ? `Traversal truncated at ${result.maxFiles} files.`
        : `Traversal completed with ${result.files.length} files.`;

      return {
        content: [
          { type: 'text', text: result.files.join('\n') },
          { type: 'text', text: summary }
        ]
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
