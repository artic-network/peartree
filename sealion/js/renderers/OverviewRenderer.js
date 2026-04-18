// renderers/OverviewRenderer.js
//
// Renders the overview (minimap) canvas via a composited layer system.
//
// Layers (in draw order, each independently toggleable):
//   1. GenomeStructureLayer — CDS feature bars
//   2. VariableSitesLayer   — compressed/expanded column bars + diff overlay
//   3. SlidingWindowLayer   — active plot data as a filled area line
//   + Viewport rectangle    — always on top, drawn directly on the live ctx
//
// Architecture mirrors PlotRenderer: an off-screen cache composite is rebuilt
// whenever any layer's cache key changes, then blitted on every render frame.

import { CanvasRenderer }        from './CanvasRenderer.js';
import { GenomeStructureLayer }  from './overview/GenomeStructureLayer.js';
import { CompressedSitesLayer }  from './overview/CompressedSitesLayer.js';
import { VariableSitesLayer }    from './overview/VariableSitesLayer.js';
import { SlidingWindowLayer }    from './overview/SlidingWindowLayer.js';

export class OverviewRenderer extends CanvasRenderer {
  static scrollAxes = { h: 'observe', v: 'observe' };
  static selectionAxes = [];

  constructor(canvas, viewer) {
    super(canvas, viewer);

    // Layer instances (order = draw order)
    this._layers = {
      genomeStructure  : new GenomeStructureLayer(),
      compressedSites  : new CompressedSitesLayer(),
      variableSites    : new VariableSitesLayer(),
      slidingWindow    : new SlidingWindowLayer(),
    };

    // Off-screen cache for composited layer content
    this._cache       = null;
    this._cacheKey    = null;
    this._cacheInvalid = true;
  }

  // ── Public layer API ───────────────────────────────────────────────────────

  /** Enable or disable a named layer and schedule a full redraw. */
  setLayerEnabled(name, enabled) {
    if (!(name in this._layers)) return;
    this._layers[name].enabled = enabled;
    this.invalidateCache();
  }

  /** Returns whether a named layer is currently enabled. */
  isLayerEnabled(name) {
    return name in this._layers ? this._layers[name].enabled : false;
  }

  /** CDS hit regions — built by GenomeStructureLayer during cache render. */
  get _cdsHitRegions() {
    return this._layers.genomeStructure.cdsHitRegions;
  }

  // Invalidate the composite cache (call when alignment, bookmarks, mask, or
  // any layer toggle changes).
  invalidateCache() {
    this._cacheInvalid = true;
    this.invalidate();
  }

  render(vis) {
    const v = this.viewer;
    if (!this.canvas) return;
    const ctx = this.ensureBacking();
    if (!ctx) return;

    const p = this._buildParams();
    if (!p) return;

    // Rebuild composite cache if needed
    const cacheKey = this._buildCacheKey(p);
    const needsRebuild = this._cacheInvalid
      || !this._cache
      || this._cache.width  !== this.canvas.width
      || this._cache.height !== this.canvas.height
      || this._cacheKey !== cacheKey;

    if (needsRebuild) {
      this._rebuildCache(p);
      this._cacheKey    = cacheKey;
      this._cacheInvalid = false;
    }

    const { cssW, cssH } = p;

    // Blit the composite cache
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.drawImage(this._cache, 0, 0, cssW, cssH);

    // Draw bookmarks on top of cache (they change with selection, not data)
    this._drawBookmarks(ctx, p);

    // Draw viewport rectangle (changes every scroll frame — never cached)
    const viewX = Math.round((vis && vis.scrollLeft ? vis.scrollLeft : 0) * p.scale);
    const viewW = Math.max(2, Math.round((vis && vis.viewW ? vis.viewW : cssW) * p.scale));
    ctx.save();
    ctx.strokeStyle = v.OVERVIEW_VIEWPORT;
    ctx.lineWidth   = 2;
    ctx.globalAlpha = 0.6;
    ctx.strokeRect(viewX + 0.5, 2.5, viewW - 1, cssH - 4);
    ctx.restore();
  }

  attachEvents() {
    if (!this.canvas) return;
    const v      = this.viewer;
    const canvas = this.canvas;

    const getRawTotal = () => {
      const co  = v.colOffsets || [];
      const len = co.length > 0 ? co.length - 1 : 0;
      const cw  = v.charWidth || 8;
      const rp  = v.EXPANDED_RIGHT_PAD != null ? v.EXPANDED_RIGHT_PAD : 2;
      return co[len] || (len * (cw + rp));
    };

    const getHit = (mouseX, mouseY) => {
      if (!this._cdsHitRegions) return null;
      for (const r of this._cdsHitRegions) {
        if (mouseX >= r.x && mouseX <= r.x + r.width &&
            mouseY >= r.y && mouseY <= r.y + r.height) return r;
      }
      return null;
    };

    let isDragging = false;

    // Mousedown: start drag + animate-scroll to click position
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      isDragging = true;
      const rect     = canvas.getBoundingClientRect();
      const x        = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const cssW     = rect.width || Math.max(1, canvas.width / (v.pr || 1));
      const scale    = cssW / Math.max(1, getRawTotal());
      const target   = Math.round(x / scale - (v.scroller ? v.scroller.clientWidth / 2 : 0));
      if (typeof v.animateScrollTo === 'function') {
        v.animateScrollTo(Math.max(0, target), v.scroller ? v.scroller.scrollTop : 0, v.scroller, 320);
      } else if (v.scroller) {
        v.scroller.scrollLeft = Math.max(0, target);
      }
      v.scheduleRender();
      e.preventDefault();
    });

    // Window mousemove / mouseup: drag panning
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect   = canvas.getBoundingClientRect();
      const x      = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const cssW   = rect.width || Math.max(1, canvas.width / (v.pr || 1));
      const scale  = cssW / Math.max(1, getRawTotal());
      const target = Math.round(x / scale - (v.scroller ? v.scroller.clientWidth / 2 : 0));
      if (v.scroller) v.scroller.scrollLeft = Math.max(0, target);
      v.scheduleRender();
    });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Canvas mousemove: CDS tooltip
    canvas.addEventListener('mousemove', (e) => {
      if (isDragging) return;
      const rect   = canvas.getBoundingClientRect();
      const hit    = getHit(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) {
        if (typeof v._showCDSTooltip === 'function') v._showCDSTooltip(e.clientX, e.clientY, hit);
        canvas.style.cursor = 'pointer';
      } else {
        if (typeof v._hideCDSTooltip === 'function') v._hideCDSTooltip();
        canvas.style.cursor = 'default';
      }
    });

    // Mouseleave: hide tooltip
    canvas.addEventListener('mouseleave', () => {
      if (typeof v._hideCDSTooltip === 'function') v._hideCDSTooltip();
      canvas.style.cursor = 'default';
    });

    // Dblclick: select columns of clicked CDS
    canvas.addEventListener('dblclick', (e) => {
      const rect = canvas.getBoundingClientRect();
      const hit  = getHit(e.clientX - rect.left, e.clientY - rect.top);
      if (hit && hit.coordinates && typeof v._selectCDSRange === 'function') {
        v._selectCDSRange(hit);
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /** Collect all viewer state needed for rendering into one plain object. */
  _buildParams() {
    const v  = this.viewer;
    const pr = v.pr || window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const cssW = Math.max(1, rect.width  || Math.max(1, this.canvas.width  / pr));
    const cssH = Math.max(1, rect.height || Math.max(1, this.canvas.height / pr));

    const colOffsets       = v.colOffsets || [];
    const maxSeqLen        = colOffsets.length > 0 ? colOffsets.length - 1 : 0;
    const charWidth        = v.charWidth || 8;
    const expandedRightPad = v.EXPANDED_RIGHT_PAD   != null ? v.EXPANDED_RIGHT_PAD   : 2;
    const overviewTopPad   = v.OVERVIEW_TOP_PAD     != null ? v.OVERVIEW_TOP_PAD     : 4;
    const overviewBottomPad= v.OVERVIEW_BOTTOM_PAD  != null ? v.OVERVIEW_BOTTOM_PAD  : 4;
    const maskStr          = v.maskStr || '';
    const maskEnabled      = !!v.maskEnabled;
    const rows             = (v.alignment && v.alignment.length != null) ? v.alignment : [];
    const refModeEnabled   = !!v.refModeEnabled;
    const refStr           = v.refStr || null;
    const siteBookmarks    = v.siteBookmarks;

    let refGenomeCDS = null;
    try {
      const acc = window && window.displayedReferenceAccession;
      if (acc && v.alignment && v.alignment.getReferenceGenome) {
        const rg = v.alignment.getReferenceGenome(acc);
        if (rg && Array.isArray(rg.cds)) refGenomeCDS = rg.cds;
      }
      if (!refGenomeCDS && v._lastRefGenomeCDS) refGenomeCDS = v._lastRefGenomeCDS;
    } catch (_) {}

    const rawTotal   = colOffsets[maxSeqLen] || (maxSeqLen * (charWidth + expandedRightPad));
    const totalWidth = Math.max(1, rawTotal);
    const scale      = cssW / totalWidth;
    const barH       = Math.max(4, cssH - overviewTopPad - overviewBottomPad);
    const barY       = overviewTopPad;

    return {
      viewer: v, pr, cssW, cssH,
      colOffsets, maxSeqLen, charWidth, expandedRightPad,
      maskStr, maskEnabled, rows, refModeEnabled, refStr,
      refGenomeCDS, siteBookmarks,
      totalWidth, scale, barH, barY,
    };
  }

  /** Composite string key from all layer cacheKey() contributions. */
  _buildCacheKey(p) {
    const layerEnabled = Object.entries(this._layers)
      .map(([name, layer]) => `${name}:${layer.enabled ? 1 : 0}`)
      .join('|');
    const layerKeys = Object.values(this._layers)
      .map(l => typeof l.cacheKey === 'function' ? l.cacheKey(p) : '')
      .join('|');
    const { cssW, cssH } = p;
    return `${cssW}x${cssH}|${layerEnabled}|${layerKeys}`;
  }

  /** Composite all enabled layers into the off-screen cache canvas. */
  _rebuildCache(p) {
    const v = p.viewer;

    if (!this._cache) this._cache = document.createElement('canvas');
    this._cache.width  = this.canvas.width;
    this._cache.height = this.canvas.height;

    const cacheCtx = this._cache.getContext('2d');
    cacheCtx.setTransform(p.pr, 0, 0, p.pr, 0, 0);
    cacheCtx.clearRect(0, 0, p.cssW, p.cssH);

    // Background
    cacheCtx.fillStyle = v.OVERVIEW_BG;
    cacheCtx.fillRect(0, 0, p.cssW, p.cssH);

    // Render layers in order: genomeStructure → variableSites → slidingWindow
    for (const layer of Object.values(this._layers)) {
      if (layer.enabled) {
        layer.render(cacheCtx, p);
        cacheCtx.setTransform(p.pr, 0, 0, p.pr, 0, 0); // restore after any layer reset
      }
    }
  }

  /** Draw site bookmarks directly on the live canvas ctx (not cached). */
  _drawBookmarks(ctx, p) {
    const { siteBookmarks, maxSeqLen, colOffsets, charWidth,
            expandedRightPad, scale, cssH } = p;
    const v = p.viewer;
    if (!siteBookmarks || siteBookmarks.size === 0) return;

    ctx.save();
    const bookmarkColors = v.BOOKMARK_COLORS || [];
    for (const [c, bookmarkIdx] of siteBookmarks.entries()) {
      if (c < 0 || c >= maxSeqLen) continue;
      const color = (bookmarkIdx >= 0 && bookmarkIdx < bookmarkColors.length)
        ? bookmarkColors[bookmarkIdx] : null;
      if (!color) continue;
      const left  = colOffsets[c]     != null ? colOffsets[c]     : (c * (charWidth + expandedRightPad));
      const right = colOffsets[c + 1] != null ? colOffsets[c + 1] : (left + charWidth + expandedRightPad);
      const x  = Math.round(left  * scale);
      const x2 = Math.round(right * scale);
      const r  = parseInt(color.slice(1, 3), 16);
      const g  = parseInt(color.slice(3, 5), 16);
      const b  = parseInt(color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},0.5)`;
      ctx.fillRect(x, 0, Math.max(1, x2 - x), cssH);
    }
    ctx.restore();
  }
}
