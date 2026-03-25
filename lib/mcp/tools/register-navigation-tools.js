'use babel';

import { z } from 'zod';
import { openWorkspaceFile } from './editor-context.js';
import { createProjectFileService } from './project-file-service.js';

export function registerNavigationTools(server, { projectFileService = createProjectFileService() } = {}) {
  registerGetWorkspaceRootsTool(server, projectFileService);
  registerGetProjectFilesTool(server, projectFileService);
  registerOpenFileTool(server, projectFileService);
}

function buildWorkspaceSelectorSchema() {
  return {
    projectName: z.string().optional(),
    projectPath: z.string().optional()
  };
}

function registerGetWorkspaceRootsTool(server, projectFileService) {
  const curTool = 'get-workspace-roots';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Workspace Roots',
      description: [
        'Return the currently attached workspace roots in Pulsar.',
        'Use this to scope multi-root workspaces before calling get-project-files or open-file.',
        'The active root flag follows the current active editor when available.'
      ].join(' '),
      inputSchema: {}
    },
    async () => {
      const roots = projectFileService.listWorkspaceRoots();
      const lines = roots.map((root) => `${root.isActive ? '*' : '-'} ${root.name}: ${root.path}`);

      return {
        content: [
          { type: 'text', text: lines.join('\n') },
          { type: 'text', text: `Workspace roots: ${roots.length}` }
        ]
      };
    }
  );
}

function registerGetProjectFilesTool(server, projectFileService) {
  const curTool = 'get-project-files';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Get Project Files',
      description: [
        'Return a newline-separated list of files under the current project roots or a selected project root.',
        'In a multi-root workspace, prefer passing projectName or projectPath after checking get-workspace-roots.',
        'Performs a bounded traversal with default directory exclusions for safer workspace scans.',
        'Use includeHidden=true only when hidden files are explicitly needed.'
      ].join(' '),
      inputSchema: {
        ...buildWorkspaceSelectorSchema(),
        maxDepth: z.number().int().positive().optional(),
        maxFiles: z.number().int().positive().optional(),
        includeHidden: z.boolean().optional(),
        excludedDirectories: z.array(z.string()).optional()
      }
    },
    async (args = {}) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const result = await projectFileService.listProjectFiles(args);
      const warningSummary = result.warnings.length > 0 ? ` Warnings: ${result.warnings.length}.` : '';
      const rootSummary = result.resolvedRoot
        ? ` Scoped root: ${result.resolvedRoot.rootName} (${result.resolvedRoot.rootPath}) using ${result.resolvedRoot.strategy}.`
        : ` Roots scanned: ${result.roots.length}.`;
      const summary = result.truncated
        ? `Traversal truncated at ${result.maxFiles} files.${warningSummary}${rootSummary}`
        : `Traversal completed with ${result.files.length} files.${warningSummary}${rootSummary}`;

      return {
        content: [
          { type: 'text', text: result.files.join('\n') },
          { type: 'text', text: summary }
        ]
      };
    }
  );
}

function registerOpenFileTool(server, projectFileService) {
  const curTool = 'open-file';
  console.log('Registering Tool: ' + curTool);

  server.registerTool(
    curTool,
    {
      title: 'Open File',
      description: [
        'Open (or switch to) a tab for the given file path.',
        'In a multi-root workspace, prefer passing projectName or projectPath and use a path returned by get-project-files.',
        'The tool validates the resolved target and fails if the file cannot be mapped to the selected workspace root.'
      ].join(' '),
      inputSchema: {
        filePath: z.string(),
        ...buildWorkspaceSelectorSchema()
      }
    },
    async (args) => {
      console.log('CMD: ' + curTool + ', ARGS: ' + JSON.stringify(args));
      const resolved = await projectFileService.resolveFileForOpen(args);
      await openWorkspaceFile(resolved.resolvedPath);
      return {
        content: [{
          type: 'text',
          text: `Opened file: ${resolved.resolvedPath} (requested: ${resolved.requestedPath}; strategy: ${resolved.resolutionStrategy})`
        }]
      };
    }
  );
}
