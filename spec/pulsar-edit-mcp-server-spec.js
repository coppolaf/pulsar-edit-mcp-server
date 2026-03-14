'use babel';

import PulsarMcp from '../lib/pulsar-edit-mcp-server';

describe('PulsarMcp', () => {
  let workspaceElement;
  let activationPromise;

  beforeEach(() => {
    workspaceElement = atom.views.getView(atom.workspace);
    activationPromise = atom.packages.activatePackage('pulsar-edit-mcp-server');
  });

  describe('when the pulsar-edit-mcp-server:listen event is triggered', () => {
    it('activates the package and opens the chat panel opener', () => {
      atom.commands.dispatch(workspaceElement, 'pulsar-edit-mcp-server:listen');

      waitsForPromise(() => activationPromise);

      runs(() => {
        expect(PulsarMcp.subscriptions).toBeDefined();
        expect(PulsarMcp.pulsarMcpView).toBeDefined();
        expect(PulsarMcp.chatPanel).toBeDefined();
      });
    });
  });
});
