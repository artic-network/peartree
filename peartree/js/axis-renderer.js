import { TreeCalibration } from './phylograph.js';
import { overlapsZones }   from '@artic-network/pearcore/utils.js';
import { buildFont, TYPEFACES } from '@artic-network/pearcore/typefaces.js';

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
    this._fontFamily    = 'monospace';
    this._typefaceKey   = null;
    this._typefaceStyle = null;

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

    const hash = `${scaleX.toFixed(4)}|${offsetX.toFixed(2)}|${paddingLeft}|${labelRightPad}|${bgColor}|${this._fontSize}|${this._fontFamily}|${this._typefaceKey ?? ''}|${this._typefaceStyle ?? ''}|${this._axisColor ?? ''}|${this._axisLineWidth}|${W}|${H}|${this._timed}|${this._dateMode}|${this._rootHeight}|${this._calibration?.anchorDecYear ?? ''}|${this._calibration?.anchorH ?? ''}|${this._calibration?.rate ?? ''}|${this._viewMinTipH}|${this._majorInterval}|${this._minorInterval}|${this._majorLabelFormat}|${this._minorLabelFormat}|${this._dateFormat}|${this._direction}`;
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
    this._fontFamily    = f || 'monospace';
    this._typefaceKey   = null;
    this._typefaceStyle = null;
    this._lastHash      = '';
  }

  /**
   * Set typeface by key + style (uses buildFont for correct weight).
   * @param {string} key    – TYPEFACES key (e.g. 'Helvetica Neue')
   * @param {string} style  – Style name (e.g. 'Thin', 'Regular')
   */
  setTypeface(key, style) {
    this._typefaceKey   = key   || null;
    this._typefaceStyle = style || null;
    this._fontFamily    = TYPEFACES[key]?.family ?? key ?? 'monospace';
    this._lastHash      = '';
  }

  /** Build a CSS font string for canvas ctx.font. */
  _font(sizePx) {
    if (this._typefaceKey) return buildFont(this._typefaceKey, this._typefaceStyle, sizePx);
    return `${sizePx}px ${this._fontFamily}`;
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

    // For forward (divergence) axis the root is at offsetX — the baseline must
    // start exactly there so it aligns with the 0.0 tick.  For reverse and time
    // axes, extend left to paddingLeft to cover any node-bar/whisker overhang.
    const plotLeft  = (this._direction === 'forward' && !this._dateMode)
      ? this._offsetX
      : Math.min(this._offsetX, this._paddingLeft);
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
      if (majorInt === 'auto' && minorInt === 'auto') {
        // Use the paired helper so major and minor are on a consistent calendar
        // hierarchy (e.g. yearly major → monthly minor, not independently-picked
        // steps that may not subdivide each other cleanly).
        const pair = TreeCalibration.autoCalendarTickPair(minVal, maxVal, targetMajor);
        majorTicks = pair.majorTicks;
        minorTicks = pair.minorTicks;
      } else {
        majorTicks = (majorInt === 'auto')
          ? TreeCalibration.niceCalendarTicks(minVal, maxVal, targetMajor)
          : TreeCalibration.calendarTicksForInterval(minVal, maxVal, majorInt);
        if (minorInt === 'off') {
          minorTicks = [];
        } else if (minorInt === 'auto') {
          const derivedInt = TreeCalibration.derivedMinorInterval(majorTicks);
          const majorSet   = new Set(majorTicks.map(t => t.toFixed(8)));
          if (derivedInt) {
            const minorAll = TreeCalibration.calendarTicksForInterval(minVal, maxVal, derivedInt);
            minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
          } else {
            minorTicks = [];
          }
        } else {
          const minorAll = TreeCalibration.calendarTicksForInterval(minVal, maxVal, minorInt);
          const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
          minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
        }
      }
    } else {
      // Always compute ticks in ascending order (minVal → maxVal) so that both
      // forward and reverse directions produce an identical set of tick values.
      majorTicks = AxisRenderer._niceTicks(minVal, maxVal, targetMajor);
      const minorAll = majorTicks.length > 1
        ? AxisRenderer._niceTicks(minVal, maxVal, targetMajor * 5) : [];
      const majorSet = new Set(majorTicks.map(t => t.toPrecision(10)));
      minorTicks = minorAll.filter(t => !majorSet.has(t.toPrecision(10)));
      // For the reverse-direction axis, flip both arrays so tick order matches
      // the visual direction (high→low left→right).
      if (this._direction === 'reverse') {
        majorTicks.reverse();
        minorTicks.reverse();
      }
    }

    // ── Layout constants ──────────────────────────────────────────────────
    const Y_BASE      = this._paddingTop ?? 3;
    const MAJOR_H     = 9;
    const MINOR_H     = 5;
    const axC = this._axisColor;
    const TICK_COLOR  = axC ? AxisRenderer._hexToRgba(axC, 0.55) : 'rgba(255,255,255,0.45)';
    const MINOR_COLOR = axC ? AxisRenderer._hexToRgba(axC, 0.30) : 'rgba(255,255,255,0.25)';
    const TEXT_COLOR  = axC ? AxisRenderer._hexToRgba(axC, 1.0)  : 'rgba(242,241,230,1.0)';
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

    // ── Major-label vars (hoisted so minor rendering can avoid overlapping them) ─
    const majorLabelFmt  = this._dateMode ? this._majorLabelFormat : 'auto';
    const showMajorLabel = majorLabelFmt !== 'off';
    const _majorStep = majorTicks.length >= 2
      ? Math.abs(majorTicks[1] - majorTicks[0]) : 0;
    // When the interval was auto-selected, infer the effective calendar interval
    // from the actual tick spacing so that labels use the correct partial format
    // (e.g. yearly ticks → 'yyyy', monthly ticks → 'yyyy-MM').
    const effMajorInterval = (this._dateMode && this._majorInterval === 'auto')
      ? TreeCalibration.inferMajorInterval(majorTicks)
      : this._majorInterval;

    // ── Minor ticks ───────────────────────────────────────────────────────
    const minorLabelFmt  = this._dateMode ? this._minorLabelFormat : 'off';
    const showMinorLabel = minorLabelFmt !== 'off';
    let minorLabelRight  = -Infinity;
    // When auto-selected, infer the effective minor interval from tick spacing
    // so that 'component' labels show the right unit (e.g. month name, not year).
    const effMinorInterval = (this._dateMode && this._minorInterval === 'auto')
      ? TreeCalibration.inferMajorInterval(minorTicks)
      : this._minorInterval;

    // Pre-compute major-label bounding boxes so minor labels can be suppressed
    // when they would overlap a major label.
    const majorLabelZones = [];
    if (showMinorLabel && showMajorLabel) {
      ctx.font = this._font(fs);
      for (const val of majorTicks) {
        const sx = this._valToScreenX(val);
        if (sx < plotLeft - 1 || sx > plotRight + 1) continue;
        const label = this._dateMode
          ? this._calibration?.decYearToString(val, majorLabelFmt === 'auto' ? 'partial' : majorLabelFmt, this._dateFormat, effMajorInterval)
          : AxisRenderer._formatValue(val, _majorStep);
        if (!label) continue;
        const tw = ctx.measureText(label).width;
        const lx = Math.max(plotLeft + tw / 2 + 1, Math.min(W - tw / 2 - 2, sx));
        majorLabelZones.push([lx - tw / 2 - 4, lx + tw / 2 + 4]);
      }
    }

    ctx.font         = this._font(fsMinor);
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
        const label = this._calibration.decYearToString(val, minorLabelFmt, this._dateFormat, effMinorInterval);
        const tw    = ctx.measureText(label).width;
        const lx    = Math.max(plotLeft + tw / 2 + 1, Math.min(plotRight - tw / 2 - 1, sx));
        if (lx - tw / 2 > minorLabelRight + 2 && !overlapsZones(lx - tw / 2, lx + tw / 2, majorLabelZones)) {
          ctx.fillStyle = TEXT_DIM;
          ctx.fillText(label, lx, Y_BASE + 1 + MINOR_H + 2);
          minorLabelRight = lx + tw / 2;
        }
      }
    }

    // ── Major ticks ───────────────────────────────────────────────────────
    let majorLabelRight  = -Infinity;

    ctx.font         = this._font(fs);
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
          label = this._calibration.decYearToString(val, effMajorFmt, this._dateFormat, effMajorInterval);
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
      // For timed trees (rate = 1): worldX = val − decYear(rootH)  (year offset = tree units)
      // For divergence trees (rate ≠ 1): multiply by rate to convert year-offset → substitution
      // units that match the tree canvas coordinate space.
      const rootH = Math.max(this._rootHeight, this._maxX);
      return (val - this._calibration.heightToDecYear(rootH)) * this._calibration.rate;
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
