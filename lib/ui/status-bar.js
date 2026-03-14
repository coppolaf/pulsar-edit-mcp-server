'use babel';

export default class StatusBarController {
  constructor(onToggle) {
    this.onToggle = onToggle;
    this.statusBarService = null;
    this.tile = null;
    this.element = null;
  }

  attach(statusBarService) {
    this.statusBarService = statusBarService;

    if (this.tile || !statusBarService) {
      return;
    }

    this.element = document.createElement('span');
    this.element.addEventListener('click', () => {
      if (typeof this.onToggle === 'function') {
        this.onToggle();
      }
    });

    this.tile = statusBarService.addLeftTile({
      item: this.element,
      priority: 100
    });
  }

  update(isListening) {
    if (!this.element) {
      return;
    }

    this.element.textContent = `MCP:${isListening ? 'On' : 'Off'}`;
  }

  destroy() {
    this.tile?.destroy();
    this.tile = null;
    this.element = null;
    this.statusBarService = null;
  }
}
