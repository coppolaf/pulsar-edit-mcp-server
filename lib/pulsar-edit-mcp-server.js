'use babel';

import path from 'path';
import { CompositeDisposable } from 'atom';
import PulsarMcpView from './pulsar-edit-mcp-server-view';
import ChatPanel from './chat-panel';
import StatusBarController from './ui/status-bar';
import { createMcpHttpRuntime } from './mcp/server-runtime.js';
import { startMcpClient, stopMcpClient } from './mcp/client-runtime.js';
import { getEditorDiffStyleSheetText } from './ui/editor-diff-styles.js';

const { version } = require(path.join(__dirname, '..', 'package.json'));
const CHAT_URI = 'atom://pulsar-edit-mcp-server/chat';

function getMcpServerPort() {
  return atom.config.get('pulsar-edit-mcp-server.mcpServerPort');
}

export default {
  pulsarMcpView: null,
  modalPanel: null,
  subscriptions: null,
  listening: false,
  mcpRuntime: null,
  mcpClient: null,
  chatPanel: null,
  statusBar: null,

  async activate(state) {
    this.installEditorStyles();

    this.pulsarMcpView = new PulsarMcpView(state.pulsarMcpViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.pulsarMcpView.getElement(),
      visible: false
    });

    this.statusBar = new StatusBarController(() => this.listenToggle());
    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.commands.add('atom-workspace', {
        'pulsar-edit-mcp-server:listen': () => this.listenToggle()
      })
    );

    this.subscriptions.add(
      atom.workspace.addOpener((uri) => {
        if (uri === CHAT_URI) {
          this.chatPanel = new ChatPanel();
          if (this.mcpClient) {
            this.chatPanel.setMcpClient(this.mcpClient);
          }
          return this.chatPanel;
        }
      })
    );

    await atom.workspace.open(CHAT_URI);
    this.statusBar.update(this.listening);
  },

  async deactivate() {
    await this.stopListening();

    this.modalPanel?.destroy();
    this.modalPanel = null;

    this.pulsarMcpView?.destroy();
    this.pulsarMcpView = null;

    this.statusBar?.destroy();
    this.statusBar = null;

    this.subscriptions?.dispose();
    this.subscriptions = null;
  },

  serialize() {
    return {
      pulsarMcpViewState: this.pulsarMcpView?.serialize?.()
    };
  },

  consumeStatusBar(statusBarService) {
    this.statusBar?.attach(statusBarService);
    this.statusBar?.update(this.listening);
  },

  async listenToggle() {
    console.log('PulsarMcp was toggled');

    if (this.listening) {
      await this.stopListening();
      return;
    }

    const port = getMcpServerPort();
    this.mcpRuntime = createMcpHttpRuntime({ version, port });
    this.mcpRuntime.start();
    this.mcpClient = await startMcpClient({
      version,
      port,
      chatPanel: this.chatPanel
    });

    this.listening = true;
    this.statusBar?.update(this.listening);
  },

  async stopListening() {
    await stopMcpClient(this.mcpClient, this.chatPanel);
    this.mcpClient = null;

    if (this.mcpRuntime) {
      const stopped = await this.mcpRuntime.stop();
      if (stopped) {
        console.log('Server stopped listening.');
      }
      this.mcpRuntime = null;
    }

    this.listening = false;
    this.statusBar?.update(this.listening);
  },

  installEditorStyles() {
    /*
      Maybe someday add/remove should be different colors
        Add: rgba(80, 200, 120, 0.25);
        Remove: rgba(240, 80, 80, 0.25);
    */
    atom.styles.addStyleSheet(getEditorDiffStyleSheetText(), { context: 'atom-text-editor' });
  }
};
