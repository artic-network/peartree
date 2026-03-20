import { TreeCalibration } from './phylograph.js';

/**
 * AxisRenderer — draws an x-axis below the tree canvas.
 *
 * Three modes:
 *   1. divergence — raw branch-length units from root  (auto-selected)
 *   2. height     — "height before present" (auto-selected for time trees)
 *   3. date       — absolute calendar time  (requires setCalibration)
 *
 * Tick / label settings (date mode only, via setTickOptions):
 *   majorInterval    'auto'|'decades'|'years'|'quarters'|'months'|'weeks'|'days'
 *   minorInterval    'off'|'auto'|'decades'|'years'|'quarters'|'months'|'weeks'|'days'
 *   majorLabelFormat 'auto'|'off'|'component'|'yyyy'|'yyyy-MM'|'yyyy-MMM'|'yyyy-mm-dd'|'yyyy-MMM-dd'|'dd MMM yyyy'
 *   minorLabelFormat 'off'|'component'|'yyyy'|'yyyy-MM'|'yyyy-MMM'|'yyyy-mm-dd'|'yyyy-MMM-dd'|'dd MMM yyyy'
 */
export class AxisRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object}            settings  Must include axisColor, fontSize, lineWidth.
   */
  constructor(canvas, settings) {
    this._canvas  = canvas;
    this._ctx     = canvas.getContext('2d');
    this._visible = false;

    // Tree geometry
    this._maxX       = 1;
    this._timed      = false;
    this._rootHeight = 0;
    this._fontSize   = 9;
    this._fontFamily = 'monospace';

    // Date-mode calibration: provided as a TreeCalibration instance via setCalibration().
    // _viewMinTipH tracks the minimum tip height in the current view (updated by setSubtreeParams).
    this._calibration   = null;
    this._viewMinTipH   = 0;

    // Tick / label options (effective only in date mode)
    this._majorInterval    = 'auto';
    this._minorInterval    = 'off';
    this._majorLabelFormat = 'auto';
    this._minorLabelFormat = 'off';
    this._dateFormat       = 'yyyy-MM-dd';

    this._lastHash = '';

    // Direction for non-timed, non-date trees: 'forward' (0→maxX) or 'reverse' (maxX→0)
    this._direction = 'forward';

    // ── Style overrides ───────────────────────────────────────────────────
    this._axisColor          = null;   // hex string; null → use built-in default colours
    this._axisLineWidth      = 1;      // stroke width for ticks and baseline
    this._axisFontSizeManual = false;  // true once setFontSize() has been called
    this._heightFormatter    = null;   // (v:number)=>string from annotation def.fmt, for non-date ticks
    this._paddingTop         = 3;      // gap (px) above the baseline line

    this.setSettings(settings, /*redraw*/ false);
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Apply rendering settings.  Recognised keys: axisColor (string), fontSize (number),
   * lineWidth (number).
   * @param {object}  s
   * @param {boolean} redraw  When false (default) only stores values without repainting.
   */
  setSettings(s, redraw = false) {
    if (s.axisColor  != null) this.setColor(s.axisColor);
    if (s.fontSize   != null) this.setFontSize(s.fontSize);
    if (s.lineWidth  != null) this.setLineWidth(s.lineWidth);
    if (s.paddingTop != null) { this._paddingTop = s.paddingTop; this._lastHash = ''; }
    if (redraw) this._lastHash = '';
  }

  /**
   * Provide a pre-computed formatter for non-date (height / divergence) tick labels.
   * Pass null to revert to the built-in magnitude-based static formatter.
   * @param {((v:number)=>string)|null} fmt
   */
  setHeightFormatter(fmt) {
    this._heightFormatter = fmt || null;
    this._lastHash = '';
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * @param {object} params
   * @param {number}  params.maxX        – world-x span of the tree
   * @param {boolean} params.isTimedTree – true if 'height' annotation exists on all nodes
   * @param {number}  params.rootHeight  – value of height at the root node (0 for divergence trees)
   */
  setTreeParams({ maxX, isTimedTree, rootHeight }) {
    this._maxX       = maxX;
    this._timed      = isTimedTree;
    this._rootHeight = isTimedTree ? (rootHeight || 0) : 0;
    this._calibration   = null;
    this._viewMinTipH   = 0;
    this._lastHash      = '';
  }

  /**
   * Activate date-axis mode using a pre-built TreeCalibration.
   * Pass null to clear date mode and fall back to height / divergence.
   * @param {TreeCalibration|null} cal
   */
  setCalibration(cal) {
    this._calibration = cal?.isActive ? cal : null;
    this._viewMinTipH = cal?.minTipH ?? 0;
    this._lastHash    = '';
  }

  /** True when a valid TreeCalibration is active. Kept as a getter for internal use. */
  get _dateMode() { return this._calibration?.isActive ?? false; }

  /**
   * Update axis params for a subtree view without re-running setTreeParams / setCalibration.
   * Call whenever the renderer navigates into or out of a subtree.
   *
   * @param {number}  maxX       – branch span of the new view (root → most distant tip)
   * @param {number}  rootHeight – computed height at the new view root (maxX_full - root.x)
   * @param {number}  minTipH    – minimum computed height among tips in the new view
   */
  setSubtreeParams({ maxX, rootHeight, minTipH }) {
    this._maxX       = maxX;
    this._rootHeight = rootHeight;
    if (this._calibration?.isActive && minTipH != null) this._viewMinTipH = minTipH;
    this._lastHash   = '';
  }

  setTickOptions({ majorInterval, minorInterval, majorLabelFormat, minorLabelFormat }) {
    this._majorInterval    = majorInterval    || 'auto';
    this._minorInterval    = minorInterval    || 'off';
    this._majorLabelFormat = majorLabelFormat || 'auto';
    this._minorLabelFormat = minorLabelFormat || 'off';
    this._lastHash = '';
  }

  /**
   * Set the full date format string used for 'full' and 'partial' label modes.
   * @param {string} fmt  e.g. 'yyyy-MM-dd', 'yyyy-MMM-dd', 'dd MMM yyyy'
   */
  setDateFormat(fmt) {
    this._dateFormat = fmt || 'yyyy-MM-dd';
    this._lastHash   = '';
  }

  /**
   * Called every animation frame (from renderer._onViewChange).
   * Redraws if view state has changed.
   */
  update(scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, dpr = 1) {
    if (!this._visible) return;
    const W = this._canvas.clientWidth;
    const H = this._canvas.clientHeight;
    if (W === 0 || H === 0) return;

    // DPR-aware sizing
    const wPx = Math.round(W * dpr);
    const hPx = Math.round(H * dpr);
    if (this._canvas.width !== wPx || this._canvas.height !== hPx) {
      this._canvas.width  = wPx;
      this._canvas.height = hPx;
      this._canvas.style.width  = W + 'px';
      this._canvas.style.height = H + 'px';
      this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Only auto-sync font size from tree if the user hasn't explicitly set one
    if (!this._axisFontSizeManual) this._fontSize = Math.max(7, fontSize - 1);

    const hash = `${scaleX.toFixed(4)}|${offsetX.toFixed(2)}|${paddingLeft}|${labelRightPad}|${bgColor}|${this._fontSize}|${this._fontFamily}|${this._axisColor ?? ''}|${this._axisLineWidth}|${W}|${H}|${this._timed}|${this._dateMode}|${this._rootHeight}|${this._calibration?.anchorDecYear ?? ''}|${this._calibration?.anchorH ?? ''}|${this._viewMinTipH}|${this._majorInterval}|${this._minorInterval}|${this._majorLabelFormat}|${this._minorLabelFormat}|${this._dateFormat}|${this._direction}`;
    if (hash === this._lastHash) return;
    this._lastHash = hash;

    this._scaleX       = scaleX;
    this._offsetX      = offsetX;
    this._paddingLeft  = paddingLeft;
    this._labelRightPad = labelRightPad;
    this._bgColor      = bgColor;
    this._W            = W;
    this._H            = H;
    this._draw();
  }

  setVisible(v) {
    this._visible = !!v;
    this._lastHash = '';
    if (!v) {
      const ctx = this._ctx;
      ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }

  setFontSize(px) {
    this._fontSize          = Math.max(6, px);
    this._axisFontSizeManual = true;
    this._lastHash          = '';
  }

  setFontFamily(f) {
    this._fontFamily = f || 'monospace';
    this._lastHash   = '';
  }

  /** Set the base colour used for ticks, baseline and labels (hex, e.g. '#f2f1e6'). */
  setColor(hex) {
    this._axisColor = hex || null;
    this._lastHash  = '';
  }

  /** Set the stroke width for ticks and the baseline (default 1). */
  setLineWidth(w) {
    this._axisLineWidth = Math.max(0.5, w);
    this._lastHash      = '';
  }

  /**
   * Set the axis direction.
   * 'forward' = divergence from root (0 at root, maxX at tips) — always respected.
   * 'reverse' = height above most-divergent tip (maxX at root, 0 at tip).
   * Has no effect when date mode is active.
   */
  setDirection(dir) {
    this._direction = (dir === 'reverse') ? 'reverse' : 'forward';
    this._lastHash  = '';
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this._ctx;
    const W = this._W, H = this._H;
    const fs = this._fontSize;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this._bgColor;
    ctx.fillRect(0, 0, W, H);

    if (!this._scaleX || this._maxX === 0) return;

    // Extend left to paddingLeft so node-bar overhang is covered by the axis line.
    const plotLeft  = Math.min(this._offsetX, this._paddingLeft);
    const plotRight = this._offsetX + this._maxX * this._scaleX;
    if (plotRight <= plotLeft) return;

    const { leftVal, rightVal } = this._valueDomain();
    const minVal = Math.min(leftVal, rightVal);
    const maxVal = Math.max(leftVal, rightVal);
    const targetMajor = Math.max(2, Math.round((plotRight - plotLeft) / 90));

    // ── Build tick arrays ──────────────────────────────────────────────────
    let majorTicks, minorTicks;
    if (this._dateMode) {
      const majorInt = this._majorInterval;
      const minorInt = this._minorInterval;
      majorTicks = (majorInt === 'auto')
        ? TreeCalibration.niceCalendarTicks(minVal, maxVal, targetMajor)
        : TreeCalibration.calendarTicksForInterval(minVal, maxVal, majorInt);
      if (minorInt === 'off') {
        minorTicks = [];
      } else if (minorInt === 'auto') {
        const minorAll = TreeCalibration.niceCalendarTicks(minVal, maxVal, targetMajor * 5);
        const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
        minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
      } else {
        const minorAll = TreeCalibration.calendarTicksForInterval(minVal, maxVal, minorInt);
        const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
        minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
      }
    } else {
      majorTicks = AxisRenderer._niceTicks(leftVal, rightVal, targetMajor);
      // In divergence mode the axis ends exactly at maxX (the most-distant tip).
      // _niceTicks only generates round-number ticks, so if the last tick falls
      // noticeably short of maxX, append maxX explicitly so the axis is labelled
      // all the way to the tip.
      if (this._direction === 'forward' && !this._dateMode && majorTicks.length > 0) {
        const lastTick = majorTicks[majorTicks.length - 1];
        const step = majorTicks.length > 1 ? Math.abs(majorTicks[1] - majorTicks[0]) : 0;
        const gap  = rightVal - lastTick;
        if (step > 0 && gap > step * 0.15) {
          majorTicks.push(rightVal);
        }
      }
      const minorAll = majorTicks.length > 1
        ? AxisRenderer._niceTicks(leftVal, rightVal, targetMajor * 5) : [];
      const majorSet = new Set(majorTicks.map(t => t.toPrecision(10)));
      minorTicks = minorAll.filter(t => !majorSet.has(t.toPrecision(10)));
    }

    // ── Layout constants ──────────────────────────────────────────────────
    const Y_BASE      = this._paddingTop ?? 3;
    const MAJOR_H     = 9;
    const MINOR_H     = 5;
    const axC = this._axisColor;
    const TICK_COLOR  = axC ? AxisRenderer._hexToRgba(axC, 0.55) : 'rgba(255,255,255,0.45)';
    const MINOR_COLOR = axC ? AxisRenderer._hexToRgba(axC, 0.30) : 'rgba(255,255,255,0.25)';
    const TEXT_COLOR  = axC ? AxisRenderer._hexToRgba(axC, 0.90) : 'rgba(242,241,230,0.80)';
    const TEXT_DIM    = axC ? AxisRenderer._hexToRgba(axC, 0.50) : 'rgba(242,241,230,0.45)';
    const lw          = this._axisLineWidth;
    const fsMinor     = Math.max(6, fs - 2);

    // Baseline
    ctx.strokeStyle = TICK_COLOR;
    ctx.lineWidth   = lw;
    ctx.beginPath();
    ctx.moveTo(plotLeft,  Y_BASE + 0.5);
    ctx.lineTo(plotRight, Y_BASE + 0.5);
    ctx.stroke();

    // ── Minor ticks ───────────────────────────────────────────────────────
    const minorLabelFmt  = this._dateMode ? this._minorLabelFormat : 'off';
    const showMinorLabel = minorLabelFmt !== 'off';
    let minorLabelRight  = -Infinity;

    ctx.font         = `${fsMinor}px ${this._fontFamily}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    for (const val of minorTicks) {
      const sx = this._valToScreenX(val);
      if (sx < plotLeft - 1 || sx > plotRight + 1) continue;
      ctx.strokeStyle = MINOR_COLOR;
      ctx.lineWidth   = lw;
      ctx.beginPath();
      ctx.moveTo(sx + 0.5, Y_BASE + 1);
      ctx.lineTo(sx + 0.5, Y_BASE + 1 + MINOR_H);
      ctx.stroke();
      if (showMinorLabel) {
        const label = this._calibration.decYearToString(val, minorLabelFmt, this._dateFormat, this._minorInterval);
        const tw    = ctx.measureText(label).width;
        const lx    = Math.max(plotLeft + tw / 2 + 1, Math.min(plotRight - tw / 2 - 1, sx));
        if (lx - tw / 2 > minorLabelRight + 2) {
          ctx.fillStyle = TEXT_DIM;
          ctx.fillText(label, lx, Y_BASE + 1 + MINOR_H + 2);
          minorLabelRight = lx + tw / 2;
        }
      }
    }

    // ── Major ticks ───────────────────────────────────────────────────────
    const majorLabelFmt  = this._dateMode ? this._majorLabelFormat : 'auto';
    const showMajorLabel = majorLabelFmt !== 'off';
    let majorLabelRight  = -Infinity;
    // Step between ticks drives the required decimal precision for non-date labels.
    const _majorStep = majorTicks.length >= 2
      ? Math.abs(majorTicks[1] - majorTicks[0]) : 0;

    ctx.font         = `${fs}px ${this._fontFamily}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    for (const val of majorTicks) {
      const sx = this._valToScreenX(val);
      if (sx < plotLeft - 1 || sx > plotRight + 1) continue;
      ctx.strokeStyle = TICK_COLOR;
      ctx.lineWidth   = lw;
      ctx.beginPath();
      ctx.moveTo(sx + 0.5, Y_BASE + 1);
      ctx.lineTo(sx + 0.5, Y_BASE + 1 + MAJOR_H);
      ctx.stroke();
      if (showMajorLabel) {
        let label;
        if (this._dateMode) {
          const effMajorFmt = (majorLabelFmt === 'auto') ? 'partial' : majorLabelFmt;
          label = this._calibration.decYearToString(val, effMajorFmt, this._dateFormat, this._majorInterval);
        } else {
          label = AxisRenderer._formatValue(val, _majorStep);
        }
        const tw = ctx.measureText(label).width;
        // Allow labels to extend to the canvas edge (W) rather than being hard-clamped
        // at plotRight, so the terminal tick label on a divergence axis is never clipped.
        const lx = Math.max(plotLeft + tw / 2 + 1, Math.min(W - tw / 2 - 2, sx));
        if (lx - tw / 2 > majorLabelRight + 2) {
          ctx.fillStyle = TEXT_COLOR;
          ctx.fillText(label, lx, Y_BASE + 1 + MAJOR_H + 2);
          majorLabelRight = lx + tw / 2;
        }
      }
    }
  }

  /** Returns {leftVal, rightVal} = the axis values at worldX=0 and worldX=maxX */
  _valueDomain() {
    // Extra height units covered by any node-bar/whisker overhang to the left of the root.
    const extraH = this._scaleX > 0
      ? Math.max(0, this._offsetX - this._paddingLeft) / this._scaleX
      : 0;
    if (this._calibration?.isActive) {
      // Root height in the current view = max(rootHeight, maxX):
      //   - Full tree: _rootHeight is 0 for non-BEAST trees, so _maxX (= layout.maxX) wins.
      //   - Subtree:   _rootHeight = viewRootH > _maxX (= viewRootH − minTipH), so _rootHeight wins.
      const rootH    = Math.max(this._rootHeight, this._maxX);
      const leftVal  = this._calibration.heightToDecYear(rootH + extraH);
      const rightVal = this._calibration.heightToDecYear(this._viewMinTipH);
      return { leftVal, rightVal };
    }
    // Forward: origin at root (0), divergence increases toward tips (maxX). Always respected.
    if (this._direction === 'forward') {
      return { leftVal: 0, rightVal: this._maxX };
    }
    // Reverse: 0 at tips, rootHeight (or maxX) at root — values decrease left to right.
    const span = this._timed ? this._rootHeight : this._maxX;
    return { leftVal: span + extraH, rightVal: 0 };
  }

  _valToWorldX(val) {
    if (this._calibration?.isActive) {
      // worldX = val − decYear(rootH), where rootH = height at worldX = 0.
      // max(rootHeight, maxX) gives the correct root height for both full-tree
      // and subtree views (see _valueDomain comment above).
      const rootH = Math.max(this._rootHeight, this._maxX);
      return val - this._calibration.heightToDecYear(rootH);
    }
    if (this._direction === 'forward')     return val;
    // Reverse: worldX = span − val (span = rootHeight for timed, maxX for non-timed)
    const span = this._timed ? this._rootHeight : this._maxX;
    return span - val;
  }

  _valToScreenX(val) {
    return this._offsetX + this._valToWorldX(val) * this._scaleX;
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /**
   * Convert a hex colour and alpha value to a CSS rgba() string.
   * @param {string} hex   – '#rrggbb'
   * @param {number} alpha – 0–1
   */
  static _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /**
   * Generate nicely-spaced ticks within [min, max].
   * Works for any real-valued axis (divergence or height).
   */
  static _niceTicks(min, max, targetCount = 5) {
    const range = max - min;
    if (range === 0) return [min];
    if (targetCount < 1) targetCount = 1;

    const roughStep = range / targetCount;
    const mag       = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
    const norm      = roughStep / mag;
    let niceStep;
    if (norm < 1.5)      niceStep = 1 * mag;
    else if (norm < 3)   niceStep = 2 * mag;
    else if (norm < 7)   niceStep = 5 * mag;
    else                 niceStep = 10 * mag;

    const [lo, hi] = min < max ? [min, max] : [max, min];
    const start    = Math.ceil(lo / niceStep - 1e-9) * niceStep;
    const ticks    = [];
    for (let t = start; t <= hi + niceStep * 1e-9; t += niceStep) {
      const rounded = parseFloat(t.toPrecision(10));
      ticks.push(rounded);
    }
    // Reverse for height axis (which goes high→low left→right) so labels read correctly
    if (min > max) ticks.reverse();
    return ticks;
  }

  /** Format a plain numeric value (divergence or height).
   * @param {number} v    – the tick value to format
   * @param {number} step – the interval between ticks; drives required decimal precision
   */
  static _formatValue(v, step) {
    if (v === 0 && (!step || step >= 1)) return '0';
    // Decimal places needed = enough to distinguish ticks spaced `step` apart.
    if (step > 0) {
      const dp = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
      return v.toFixed(dp);
    }
    // Fallback when step is unavailable: magnitude-based heuristic.
    const abs = Math.abs(v);
    if (abs >= 100)  return v.toFixed(0);
    if (abs >= 10)   return v.toFixed(1);
    if (abs >= 1)    return v.toFixed(2);
    if (abs >= 0.01) return v.toFixed(3);
    return v.toExponential(2);
  }
}
