// renderers/CanvasRenderer.js
//
// Base class for all SealionViewer canvas renderers.
//
// Each renderer owns a single <canvas> element and holds a back-reference to
// SealionViewer for reading shared state and emitting selection intents.
// Subclasses override render(vis) to draw their content, and attachEvents()
// to register canvas-specific input listeners.
//
// Scroll coupling (declared per-subclass via static scrollAxes):
//   'master'  — owns the scroll container; drives vis.scrollLeft / vis.scrollTop
//   'follow'  — redraws offset to match the master's scroll position
//   'observe' — reads scroll position for rendering but has no scroll container
//   false     — fixed; scroll position irrelevant to this renderer
//
// Selection capability (declared per-subclass via static selectionAxes):
//   Any subset of: 'rows', 'cols', 'rect'
//   Used to route keyboard navigation to the appropriate renderer.

export class CanvasRenderer {
  static scrollAxes = { h: false, v: false };
  static selectionAxes = [];

  constructor(canvas, viewer) {
    this.canvas = canvas;
    this.viewer = viewer;
    this._ctx = null;
  }

  // Ensure the canvas backing store matches the current CSS size and device pixel ratio.
  // Returns the 2D context with the DPR transform applied.
  // Call at the start of each render() (or from SealionViewer.resizeAll()).
  ensureBacking() {
    if (!this.canvas) return null;
    const pr = (this.viewer && this.viewer.pr) || window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(0.5, rect.width || 0);
    const cssH = Math.max(0.5, rect.height || 0);
    const backingW = Math.max(1, Math.round(cssW * pr));
    const backingH = Math.max(1, Math.round(cssH * pr));
    if (this.canvas.width !== backingW || this.canvas.height !== backingH) {
      this.canvas.width = backingW;
      this.canvas.height = backingH;
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
    }
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(pr, 0, 0, pr, 0, 0);
    this._ctx = ctx;
    return ctx;
  }

  // Override in subclasses to draw canvas content.
  // vis: the visible-region object from SealionViewer.computeVisible()
  render(vis) { // eslint-disable-line no-unused-vars
    throw new Error(`${this.constructor.name}.render() is not implemented`);
  }

  // Override to register canvas-specific input event listeners.
  // Called once by SealionViewer after the canvas is in the DOM.
  // Emit selection changes via: this.viewer.applySelection(intent)
  attachEvents() {}

  // Request a render pass through the viewer (marks viewer dirty).
  invalidate() {
    if (this.viewer && typeof this.viewer.scheduleRender === 'function') {
      this.viewer.scheduleRender();
    }
  }
}
