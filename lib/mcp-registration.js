'use babel';
import fs from "fs";
import path from "path";
import { z } from "zod";
import { applyPatch, diffLines } from "diff";
import { CompositeDisposable, Disposable } from "atom";

const packageDisposables = new CompositeDisposable();
const activeHighlightSets = [];

// ---------------------------------------------------------------------------
// Helper: escape a plain string for use inside a RegExp
// ---------------------------------------------------------------------------
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// Helper: walk a directory tree, skipping common noise dirs
// ---------------------------------------------------------------------------
async function walkDir(dir, files = []) {
  let entries;
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".hg", ".svn", "dist", "build"].includes(entry.name)) continue;
      await walkDir(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Helper: compile a glob pattern to a RegExp (supports ** and *)
// ---------------------------------------------------------------------------
function globToRegex(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "__DS__")
    .replace(/\*/g, "[^/\\\\]*")
    .replace(/__DS__/g, ".*");
  return new RegExp("^" + escaped + "$", "i");
}

export function mcpRegistration(server) {

  {
    const curTool = "replace-text";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Replace Text",
        description: [
          "Search the active editor for `query` and replace it with `replacement`.",
          "`all` controls whether every match is replaced or only the first (`false` by default).",
          "Returns matchCount so you can verify the replacement worked.",
          "Workflow hint: Call `get-filename` and `get-document` first to confirm document and for freshest text."
        ].join(" "),
        inputSchema: {
          query:         z.string(),
          replacement:   z.string(),
          regex:         z.boolean().optional(),
          caseSensitive: z.boolean().optional(),
          all:           z.boolean().optional()
        }
      },
      async ({
        query,
        replacement,
        regex          = false,
        caseSensitive  = false,
        all            = false
      }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { query, replacement, regex, caseSensitive, all });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");
        const buffer = editor.getBuffer();

        const source = regex ? query : escapeRegex(query);
        const flags = (all ? "g" : "") + (caseSensitive ? "" : "i");
        const pattern = new RegExp(source, flags);

        const originalText = buffer.getText();
        let matchCount = 0;

        const newText = originalText.replace(pattern, () => {
          matchCount += 1;
          return replacement;
        });

        if (matchCount === 0) {
          return {
            content: [{ type: "text", text: "No matches - nothing replaced." }],
            matchCount: 0
          };
        }

        buffer.setTextViaDiff(newText);
        decorateEditedLines(editor, originalText, newText);

        return {
          content: [{ type: "text", text: `Replaced ${matchCount} occurrence${matchCount === 1 ? "" : "s"}.` }],
          matchCount
        };
      }
    );
  }

  {
    const curTool = "get-context-around";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Get Context Around",
        description: [
          "Return up-to `radiusLines` lines before and after the *N-th* match of",
          "`query` in the active editor. Useful for content-aware edits.",
          "Workflow hint: Call `get-document` first for freshest text.",
          "Use larger `radiusLines` for code blocks for better context understanding."
        ].join(" "),
        inputSchema: {
          query:         z.string(),
          regex:         z.boolean().optional(),
          caseSensitive: z.boolean().optional(),
          radiusLines:   z.number().optional(),
          occurrence:    z.number().optional()
        }
      },
      async ({
        query,
        regex          = false,
        caseSensitive  = false,
        radiusLines    = 5,
        occurrence     = 1
      }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { query, regex, caseSensitive, radiusLines, occurrence });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer     = editor.getBuffer();
        const totalLines = buffer.getLineCount();
        const source     = regex ? query : escapeRegex(query);
        const pattern    = new RegExp(source, caseSensitive ? "" : "i");

        const ranges = buffer.findAllSync(pattern);
        if (ranges.length === 0) throw new Error("No matches for query.");
        if (occurrence < 1 || occurrence > ranges.length)
          throw new Error(`occurrence (${occurrence}) is out of range (1-${ranges.length}).`);

        const range        = ranges[occurrence - 1];
        const startRow     = range.start.row;
        const endRow       = range.end.row;
        const contextStart = Math.max(0, startRow - radiusLines);
        const contextEnd   = Math.min(totalLines - 1, endRow + radiusLines);

        const lines = buffer.getTextInRange([
          [contextStart, 0],
          [contextEnd, buffer.lineLengthForRow(contextEnd)]
        ]).split(/\r?\n/);

        const before = lines.slice(0, startRow - contextStart);
        const match  = lines.slice(startRow - contextStart, endRow - contextStart + 1);
        const after  = lines.slice(endRow - contextStart + 1);

        return {
          content: [{ type: "text", text: JSON.stringify({ before, match, after, matchStartLine: startRow + 1, matchEndLine: endRow + 1 }, null, 2) }]
        };
      }
    );
  }

  {
    const curTool = "find-text";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Find Text",
        description: [
          "Search the active editor for a substring or regular expression and",
          "return the positions of each occurrence.",
          "Returns truncation flag if results exceed maxMatches so you know if search was capped."
        ].join(" "),
        inputSchema: {
          query:         z.string(),
          regex:         z.boolean().optional(),
          caseSensitive: z.boolean().optional(),
          maxMatches:    z.number().optional()
        }
      },
      async ({
        query,
        regex         = false,
        caseSensitive = false,
        maxMatches    = 200
      }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { query, regex, caseSensitive, maxMatches });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer  = editor.getBuffer();
        const source  = regex ? query : escapeRegex(query);
        const pattern = new RegExp(source, caseSensitive ? "" : "i");
        const ranges  = buffer.findAllSync(pattern, { limit: maxMatches + 1 }) || [];

        if (ranges.length === 0) {
          return {
            content: [{ type: "text", text: "No matches." }],
            matches: [], totalMatches: 0, truncated: false
          };
        }

        const truncated    = ranges.length > maxMatches;
        const actualRanges = ranges.slice(0, maxMatches);
        const results      = actualRanges.map(r => ({
          startLine: r.start.row + 1, startCol: r.start.column + 1,
          endLine:   r.end.row   + 1, endCol:   r.end.column   + 1
        }));

        return {
          content: [{ type: "text", text: JSON.stringify({ matches: results, totalMatches: actualRanges.length, truncated, message: truncated ? `Results capped at ${maxMatches}. Refine your query or increase maxMatches.` : "All matches found." }, null, 2) }],
          matches: results, totalMatches: actualRanges.length, truncated
        };
      }
    );
  }

  {
    const curTool = "replace-document";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Replace Document",
        description: [
          "Replace the entire contents of the editor with rewritten text.",
          "Useful for large edits. Returns lineCount and sample of first 10 lines to verify replacement worked.",
          "Workflow hint: ALWAYS call `get-filename` and `get-document` first for most up to date context."
        ].join(" "),
        inputSchema: { text: z.string() }
      },
      async ({ text }) => {
        console.log(`CMD: ${curTool}, ARGS: { text: /*${text.length} chars*/ }`);

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer       = editor.getBuffer();
        const originalText = buffer.getText();
        buffer.setText(text);
        decorateEditedLines(editor, originalText, text);

        const lines       = text.split(/\r?\n/);
        const sampleLines = lines.slice(0, 10).map((t, i) => `${i + 1}: ${t}`);
        const checksum    = text.substring(0, 500).split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0);

        return {
          content: [{ type: "text", text: `Document replaced. ${lines.length} lines. Sample:\n${sampleLines.join("\n")}` }],
          lineCount: lines.length, checksum, sampleLines
        };
      }
    );
  }

  {
    const curTool = "insert-line";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Insert Line",
        description: "DEPRECATED: use insert-text-at-line instead. Insert a single line of text before the specified 1-based line number. WARNING: line numbers shift after every insert - always call get-document again before the next line-based edit.",
        inputSchema: { lineNumber: z.number(), text: z.string() }
      },
      async ({ lineNumber, text }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { lineNumber, text: text.substring(0, 50) });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer    = editor.getBuffer();
        const lineCount = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount + 1)
          throw new Error(`lineNumber ${lineNumber} is out of range (1-${lineCount + 1}).`);

        const row = lineNumber - 1;
        buffer.insert([row, 0], text + "\n");
        decorateLine(editor, row, "added");

        const newLineCount = buffer.getLineCount();
        return {
          content: [{ type: "text", text: `Inserted line at ${lineNumber}. New line count: ${newLineCount}. Remember: line numbers have shifted!` }],
          newLineCount
        };
      }
    );
  }

  {
    const curTool = "insert-text-at-line";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Insert Text At Line",
        description: "Insert one or more lines of text before the specified 1-based line number. Use for both single-line and multi-line inserts. WARNING: line numbers shift after every insert - always call get-document again before the next line-based edit. Returns newLineCount so you can verify the shift.",
        inputSchema: { lineNumber: z.number(), text: z.string() }
      },
      async ({ lineNumber, text }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { lineNumber, text: text.substring(0, 50) });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer    = editor.getBuffer();
        const lineCount = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount + 1)
          throw new Error(`lineNumber ${lineNumber} is out of range (1-${lineCount + 1}). Cannot insert beyond end of file.`);

        const row             = lineNumber - 1;
        const textWithNewline = text.endsWith("\n") ? text : text + "\n";
        buffer.insert([row, 0], textWithNewline);
        decorateLine(editor, row, "added");

        const newLineCount = buffer.getLineCount();
        return {
          content: [{ type: "text", text: `Inserted text at line ${lineNumber}. New line count: ${newLineCount}. Remember: line numbers have shifted!` }],
          newLineCount
        };
      }
    );
  }

  {
    const curTool = "delete-line";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Delete Line",
        description: "DEPRECATED: use delete-line-range instead. Delete the specified line number (1-based). WARNING: line numbers shift after every delete - always call get-document again before the next line-based edit.",
        inputSchema: { lineNumber: z.number() }
      },
      async ({ lineNumber }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { lineNumber });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer    = editor.getBuffer();
        const lineCount = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount)
          throw new Error(`lineNumber ${lineNumber} is out of range (1-${lineCount}).`);

        const row = lineNumber - 1;
        buffer.deleteRows(row, row);
        decorateLine(editor, row, "removed");

        const newLineCount = buffer.getLineCount();
        return {
          content: [{ type: "text", text: `Deleted line ${lineNumber}. New line count: ${newLineCount}. Remember: line numbers have shifted!` }],
          newLineCount
        };
      }
    );
  }

  {
    const curTool = "delete-line-range";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Delete Line Range",
        description: "Delete all lines from startLine to endLine (inclusive). WARNING: line numbers shift after every delete - always call get-document again before the next line-based edit. Returns newLineCount so you can verify the shift.",
        inputSchema: { startLine: z.number(), endLine: z.number() }
      },
      async ({ startLine, endLine }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { startLine, endLine });

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer    = editor.getBuffer();
        const lineCount = buffer.getLineCount();
        if (startLine < 1 || endLine < 1) throw new Error("Line numbers must be 1-based.");
        if (startLine > endLine) throw new Error(`startLine (${startLine}) must be <= endLine (${endLine}).`);
        if (endLine > lineCount) throw new Error(`endLine ${endLine} exceeds line count ${lineCount}.`);

        const startRow    = startLine - 1;
        const endRow      = endLine   - 1;
        buffer.deleteRows(startRow, endRow);
        decorateLine(editor, startRow, "removed");

        const newLineCount  = buffer.getLineCount();
        const deletedCount  = endLine - startLine + 1;
        return {
          content: [{ type: "text", text: `Deleted ${deletedCount} line(s) (${startLine}-${endLine}). New line count: ${newLineCount}. Remember: line numbers have shifted!` }],
          newLineCount, deletedCount
        };
      }
    );
  }

  {
    const curTool = "get-selection";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Get Selection",
        description: "Return the text and line/column range currently selected in the active editor. Returns startLine, endLine, startCol, endCol (all 1-based) alongside the selected text.",
        inputSchema: {}
      },
      async (args) => {
        console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify(args)}`);

        const editor       = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const selectedText = editor.getSelectedText();
        const range        = editor.getSelectedBufferRange();

        return {
          content: [{ type: "text", text: JSON.stringify({ selectedText, startLine: range.start.row + 1, endLine: range.end.row + 1, startCol: range.start.column + 1, endCol: range.end.column + 1 }, null, 2) }]
        };
      }
    );
  }

  {
    const curTool = "get-document";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Get Document",
        description: "Return an array of lines with their 1-based line numbers. IMPORTANT: Always call get-document again after any insert, delete, or replace operation before making further line-based edits - line numbers shift with every change.",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const lines = editor.getBuffer().getText().split(/\r?\n/).map((text, i) => ({ n: i + 1, text }));

        return { content: [{ type: "text", text: JSON.stringify(lines, null, 2) }] };
      }
    );
  }

  {
    const curTool = "get-line-count";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Get Line Count",
        description: "Return the total number of lines in the active editor.",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");
        return { content: [{ type: "text", text: String(editor.getBuffer().getLineCount()) }] };
      }
    );
  }

  {
    const curTool = "get-filename";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Get Filename",
        description: "Return the filename of the active editor (or [untitled] if none).",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const editor   = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");
        const fullPath = editor.getPath();
        return { content: [{ type: "text", text: fullPath ? path.basename(fullPath) : "[untitled]" }] };
      }
    );
  }

  {
    const curTool = "get-full-path";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Get Full File Path",
        description: "Return the full absolute path of the active editor.",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");
        return { content: [{ type: "text", text: editor.getPath() || "[untitled]" }] };
      }
    );
  }

  {
    const curTool = "get-project-files";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Get Project Files",
        description: "Return a newline-separated list of all files under the current project roots.",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const roots = atom.project.getPaths();
        let files = [];
        for (const root of roots) files = files.concat(await walkDir(root));
        return { content: [{ type: "text", text: files.join("\n") }] };
      }
    );
  }

  {
    const curTool = "open-file";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Open File",
        description: "Open (or switch to) a tab for the given file path. Returns file info including line count and language.",
        inputSchema: { filePath: z.string() }
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const { filePath } = args;
        const editor       = await atom.workspace.open(filePath);
        const lineCount    = editor.getBuffer().getLineCount();
        const language     = editor.getGrammar() ? editor.getGrammar().name : "Unknown";
        return {
          content: [{ type: "text", text: `Opened file: ${filePath}\nLines: ${lineCount}, Language: ${language}` }],
          file: filePath, lineCount, language, isActive: true
        };
      }
    );
  }

  {
    const curTool = "goto-line";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Go To Line",
        description: "Jump the cursor to a specific line number (and optionally column) in the active editor. Returns the line content and surrounding context so you can verify you jumped to the right place.",
        inputSchema: { lineNumber: z.number(), column: z.number().optional() }
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const { lineNumber, column = 0 } = args;

        const editor    = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer    = editor.getBuffer();
        const lineCount = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount)
          throw new Error(`Line ${lineNumber} is out of range (1-${lineCount}).`);

        const row          = lineNumber - 1;
        editor.setCursorBufferPosition([row, column], { autoscroll: true });

        const contextStart = Math.max(0, row - 2);
        const contextEnd   = Math.min(lineCount - 1, row + 2);
        const lines        = buffer.getLines().slice(contextStart, contextEnd + 1).map((text, i) => `${contextStart + i + 1}: ${text}`);

        return {
          content: [{ type: "text", text: `Jumped to line ${lineNumber}, column ${column}.\nContext:\n${lines.join("\n")}` }],
          line: lineNumber, column, lineContent: buffer.lineForRow(row), context: lines
        };
      }
    );
  }

  {
    const curTool = "list-open-files";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "List Open Files",
        description: "Return a list of all files currently open in editor tabs. Useful for understanding what files are in the workspace context.",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const openFiles = atom.workspace.getTextEditors().map(editor => ({
          filePath: editor.getPath() || "[untitled]",
          modified: editor.isModified() ? "*" : ""
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ openFileCount: openFiles.length, files: openFiles }, null, 2) }],
          openFiles, count: openFiles.length
        };
      }
    );
  }

  {
    const curTool = "get-active-editor-info";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Get Active Editor Info",
        description: "Quick status check on the active editor without loading the full document. Returns filename, line count, language, cursor position, and modification status.",
        inputSchema: {}
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));

        const editor    = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const filePath  = editor.getPath() || "[untitled]";
        const fileName  = filePath ? path.basename(filePath) : "[untitled]";
        const lineCount = editor.getBuffer().getLineCount();
        const cursorPos = editor.getCursorBufferPosition();
        const language  = editor.getGrammar() ? editor.getGrammar().name : "Unknown";
        const modified  = editor.isModified();

        const info = { filename: fileName, filePath, lineCount, cursorLine: cursorPos.row + 1, cursorCol: cursorPos.column, language, modified };
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }], ...info };
      }
    );
  }

  {
    const curTool = "get-surrounding-context";
    console.log("Registering Tool: " + curTool);
    server.registerTool(curTool,
      {
        title: "Get Surrounding Context",
        description: "Efficiently load just a small section of the file around a specific line, without loading the entire document. Useful for huge files (1MB+) where get-document is slow. Returns lines +/-radiusLines around the target.",
        inputSchema: { lineNumber: z.number(), radiusLines: z.number().optional() }
      },
      async (args) => {
        console.log("CMD: " + curTool + ", ARGS: " + JSON.stringify(args));
        const { lineNumber, radiusLines = 5 } = args;

        const editor    = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer    = editor.getBuffer();
        const lineCount = buffer.getLineCount();
        if (lineNumber < 1 || lineNumber > lineCount)
          throw new Error(`Line ${lineNumber} is out of range (1-${lineCount}).`);

        const row          = lineNumber - 1;
        const contextStart = Math.max(0, row - radiusLines);
        const contextEnd   = Math.min(lineCount - 1, row + radiusLines);
        const lines        = buffer.getLines().slice(contextStart, contextEnd + 1).map((text, i) => ({ n: contextStart + i + 1, text }));

        return {
          content: [{ type: "text", text: JSON.stringify({ targetLine: lineNumber, contextStart: contextStart + 1, contextEnd: contextEnd + 1, lines }, null, 2) }],
          lines, targetLine: lineNumber, contextStart: contextStart + 1, contextEnd: contextEnd + 1
        };
      }
    );
  }

  {
    const curTool = "undo";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Undo",
        description: "Undo the last change in the active editor.",
        inputSchema: {}
      },
      async (args) => {
        console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify(args)}`);

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer = editor.getBuffer();
        const before = buffer.getText();
        editor.undo();
        const changed = before !== buffer.getText();

        return { content: [{ type: "text", text: changed ? "Undo completed." : "Nothing to undo." }] };
      }
    );
  }

  {
    const curTool = "redo";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Redo",
        description: "Redo the last undone change in the active editor.",
        inputSchema: {}
      },
      async (args) => {
        console.log(`CMD: ${curTool}, ARGS: ${JSON.stringify(args)}`);

        const editor = atom.workspace.getActiveTextEditor();
        if (!editor) throw new Error("No active editor");

        const buffer = editor.getBuffer();
        const before = buffer.getText();
        editor.redo();
        const changed = before !== buffer.getText();

        return { content: [{ type: "text", text: changed ? "Redo completed." : "Nothing to redo." }] };
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Cross-file tools (read, search, replace across all project files)
  // ---------------------------------------------------------------------------

  {
    const curTool = "read-file";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Read File",
        description: [
          "Read any project file by path and return its contents with 1-based line numbers.",
          "Unlike get-document, this does NOT require the file to be open or active in the editor.",
          "Use get-project-files to discover available paths."
        ].join(" "),
        inputSchema: { filePath: z.string() }
      },
      async ({ filePath }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { filePath });

        let text;
        try {
          text = await fs.promises.readFile(filePath, "utf8");
        } catch (err) {
          throw new Error(`Cannot read file: ${filePath} - ${err.message}`);
        }

        const lines = text.split(/\r?\n/).map((t, i) => ({ n: i + 1, text: t }));
        return {
          content: [{ type: "text", text: JSON.stringify(lines, null, 2) }],
          lineCount: lines.length,
          filePath
        };
      }
    );
  }

  {
    const curTool = "search-across-files";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Search Across Files",
        description: [
          "Search for a string or regex across all project files (or a glob-filtered subset).",
          "Returns each match with its file path, line number, column, and the full line text.",
          "Use the glob parameter to restrict to e.g. '**/*.js' or '**/*.c'.",
          "Results are capped at maxMatches (default 200) to avoid flooding context."
        ].join(" "),
        inputSchema: {
          query:         z.string(),
          regex:         z.boolean().optional(),
          caseSensitive: z.boolean().optional(),
          glob:          z.string().optional(),
          maxMatches:    z.number().optional()
        }
      },
      async ({
        query,
        regex         = false,
        caseSensitive = false,
        glob          = "",
        maxMatches    = 200
      }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { query, regex, caseSensitive, glob, maxMatches });

        const roots = atom.project.getPaths();
        if (!roots.length) throw new Error("No project root open.");

        const flags   = caseSensitive ? "g" : "gi";
        const source  = regex ? query : escapeRegex(query);
        let pattern;
        try {
          pattern = new RegExp(source, flags);
        } catch (e) {
          throw new Error(`Invalid regex: ${e.message}`);
        }

        let allFiles = [];
        for (const root of roots) allFiles = allFiles.concat(await walkDir(root));

        if (glob) {
          const globRe = globToRegex(glob);
          allFiles = allFiles.filter(f => globRe.test(f.replace(/\\/g, "/")));
        }

        const matches = [];
        let truncated = false;

        outer:
        for (const filePath of allFiles) {
          let text;
          try { text = await fs.promises.readFile(filePath, "utf8"); } catch { continue; }

          const lines = text.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            pattern.lastIndex = 0;
            let m;
            while ((m = pattern.exec(lines[i])) !== null) {
              matches.push({ filePath, line: i + 1, col: m.index + 1, match: m[0], text: lines[i] });
              if (matches.length >= maxMatches) { truncated = true; break outer; }
              if (!pattern.global) break;
            }
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ totalMatches: matches.length, truncated, matches }, null, 2) }],
          totalMatches: matches.length,
          truncated
        };
      }
    );
  }

  {
    const curTool = "replace-across-files";
    console.log("Registering Tool: " + curTool);
    server.registerTool(
      curTool,
      {
        title: "Replace Across Files",
        description: [
          "Find and replace a string or regex across all project files (or a glob-filtered subset).",
          "Set dryRun:true to preview which files and how many matches would be affected without writing.",
          "Use glob to restrict to e.g. '**/*.js' or '**/*.c'.",
          "Files open in editor tabs are updated live (undo history preserved); closed files are written to disk."
        ].join(" "),
        inputSchema: {
          query:         z.string(),
          replacement:   z.string(),
          regex:         z.boolean().optional(),
          caseSensitive: z.boolean().optional(),
          glob:          z.string().optional(),
          dryRun:        z.boolean().optional()
        }
      },
      async ({
        query,
        replacement,
        regex         = false,
        caseSensitive = false,
        glob          = "",
        dryRun        = false
      }) => {
        console.log(`CMD: ${curTool}, ARGS:`, { query, replacement, regex, caseSensitive, glob, dryRun });

        const roots = atom.project.getPaths();
        if (!roots.length) throw new Error("No project root open.");

        const flags  = caseSensitive ? "g" : "gi";
        const source = regex ? query : escapeRegex(query);
        let pattern;
        try {
          pattern = new RegExp(source, flags);
        } catch (e) {
          throw new Error(`Invalid regex: ${e.message}`);
        }

        let allFiles = [];
        for (const root of roots) allFiles = allFiles.concat(await walkDir(root));

        if (glob) {
          const globRe = globToRegex(glob);
          allFiles = allFiles.filter(f => globRe.test(f.replace(/\\/g, "/")));
        }

        const results         = [];
        let totalReplacements = 0;

        for (const filePath of allFiles) {
          let original;
          try { original = await fs.promises.readFile(filePath, "utf8"); } catch { continue; }

          let count = 0;
          const updated = original.replace(new RegExp(source, flags), (m) => { count++; return replacement; });
          if (count === 0) continue;

          totalReplacements += count;
          results.push({ filePath, replacements: count });

          if (!dryRun) {
            // If the file is open in an editor tab, update the live buffer so undo works
            const openEditor = atom.workspace.getTextEditors().find(e => e.getPath() === filePath);
            if (openEditor) {
              openEditor.getBuffer().setTextViaDiff(updated);
            } else {
              await fs.promises.writeFile(filePath, updated, "utf8");
            }
          }
        }

        const summary = dryRun
          ? `DRY RUN - ${totalReplacements} replacement(s) across ${results.length} file(s). No files written.`
          : `Replaced ${totalReplacements} occurrence(s) across ${results.length} file(s).`;

        return {
          content: [{ type: "text", text: JSON.stringify({ summary, totalReplacements, filesAffected: results.length, dryRun, files: results }, null, 2) }],
          totalReplacements,
          filesAffected: results.length,
          dryRun
        };
      }
    );
  }

} // end mcpRegistration

// ---------------------------------------------------------------------------
// Decoration helpers
// ---------------------------------------------------------------------------

function decorateEditedLines(editor, original, updated, { ttl = 8000 } = {}) {
  const disp = new CompositeDisposable();
  activeHighlightSets.push(disp);
  packageDisposables.add(disp);
  const hunks = diffLines(original, updated);
  let newRow = 0;
  hunks.forEach(h => {
    const lineCount = h.count ?? h.value.split(/\r?\n/).length - 1;
    if (h.added || h.removed) {
      const startRow = newRow;
      const endRow   = newRow + (h.added ? lineCount - 1 : 0);
      if (h.added) {
        addDecoration(editor, disp, startRow, endRow, "mcp-diff-added");
      } else if (h.removed) {
        addDecoration(editor, disp, startRow, startRow, "mcp-diff-removed");
      }
    }
    if (!h.removed) newRow += lineCount;
  });

  disp.add(editor.getBuffer().onDidChange(() => disp.dispose()));
  if (ttl > 0) {
    const timer = setTimeout(() => disp.dispose(), ttl);
    disp.add(new Disposable(() => clearTimeout(timer)));
  }
  disp.add(new Disposable(() => {
    const idx = activeHighlightSets.indexOf(disp);
    if (idx !== -1) activeHighlightSets.splice(idx, 1);
  }));

  return disp;
}

function decorateLine(editor, row, kind = "added", opts = {}) {
  editor.setCursorBufferPosition([row, 0], { autoscroll: true });
  const disp  = new CompositeDisposable();
  const klass = kind === "removed" ? "mcp-diff-removed" : "mcp-diff-added";
  addDecoration(editor, disp, row, row, klass);
  const { ttl = 8000 } = opts;
  if (ttl > 0) {
    const timer = setTimeout(() => disp.dispose(), ttl);
    disp.add(new Disposable(() => clearTimeout(timer)));
  }
  return disp;
}

function addDecoration(editor, disp, fromRow, toRow, klass) {
  const marker = editor.getBuffer().markRange(
    [[fromRow, 0], [toRow, Infinity]],
    { invalidate: "never" }
  );
  disp.add(new Disposable(() => marker.destroy()));

  const decoLine = editor.decorateMarker(marker, { type: "line", class: klass });
  const decoGut  = editor.decorateMarker(marker, { type: "gutter", gutterName: "line-number", class: `${klass}-gutter` });

  disp.add(new Disposable(() => decoLine.destroy()));
  disp.add(new Disposable(() => decoGut.destroy()));
}
