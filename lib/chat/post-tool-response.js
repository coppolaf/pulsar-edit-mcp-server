'use babel';

const SHORT_CIRCUIT_TOOL_NAMES = new Set([
  'apply-proposal',
  'get-write-policy'
]);

function extractTextContent(toolResult) {
  const content = Array.isArray(toolResult?.content) ? toolResult.content : [];
  return content
    .map((entry) => {
      if (typeof entry?.text === 'string') {
        return entry.text;
      }

      if (entry == null) {
        return '';
      }

      return JSON.stringify(entry);
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function formatToolResult(toolName, toolResult) {
  const text = extractTextContent(toolResult);

  if (toolName === 'apply-proposal') {
    return text || 'Proposal applicata correttamente.';
  }

  if (toolName === 'get-write-policy') {
    return [
      'Write policy corrente recuperata localmente:',
      '',
      '```json',
      text || '{}',
      '```'
    ].join('\n');
  }

  return text;
}

export function shouldShortCircuitPostTool(toolExecutions) {
  if (!Array.isArray(toolExecutions) || toolExecutions.length === 0) {
    return false;
  }

  return toolExecutions.every(({ name }) => SHORT_CIRCUIT_TOOL_NAMES.has(name));
}

export function buildLocalPostToolResponse(toolExecutions) {
  const sections = toolExecutions
    .map(({ name, result }) => formatToolResult(name, result))
    .filter(Boolean);

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n');
}
