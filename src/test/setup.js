import '@testing-library/jest-dom/vitest';

// jsdom não implementa o diálogo modal nativo usado na interface.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
}
