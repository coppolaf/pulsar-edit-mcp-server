'use babel';

import hljs from 'highlight.js';

export function renderChatMessage({ chatDisplay, marked, DOMPurify, sender, markdownText }) {
  if (!chatDisplay) {
    console.error('Chat display missing');
    return null;
  }

  const rawHtml = marked.parse(markdownText, { breaks: true });
  const safeHtml = DOMPurify.sanitize(rawHtml);
  const msg = document.createElement('div');
  msg.classList.add('message', sender.toLowerCase());
  msg.innerHTML = safeHtml;
  chatDisplay.appendChild(msg);
  msg.querySelectorAll('pre code').forEach((block) => hljs.highlightElement(block));
  msg.scrollIntoView({ block: 'end' });
  return msg;
}
