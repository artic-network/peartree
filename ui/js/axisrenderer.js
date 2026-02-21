/**
 * AxisRenderer — draws an x-axis below the tree canvas.
 *
 * Three modes:
 *   1. divergence — raw branch-length units from root  (auto-selected)
 *   2. height     — "height before present" (auto-selected for time trees)
 *   3. date       — absolute calendar time  (requires setDateAnchor)
 *
 * Tick / label settings (date mode only, via setTickOptions):
 *   majorInterval    'auto'|'decades'|'years'|'quarters'|'months'|'weeks'|'days'
 *   minorInterval    'off'|'auto'|'decades'|'years'|'quarters'|'months'|'weeks'|'days'
 *   majorLabelFormat 'auto'|'off'|'component'|'yyyy'|'yyyy-MM'|'yyyy-MMM'|'yyyy-mm-dd'|'yyyy-MMM-dd'|'dd MMM yyyy'
 *   minorLabelFormat 'off'|'component'|'yyyy'|'yyyy-MM'|'yyyy-MMM'|'yyyy-mm-dd'|'yyyy-MMM-dd'|'dd MMM yyyy'
 */
export class AxisRenderer {
  constructor(canvas) {
    this._canvas  = canvas;
    this._ctx     = canvas.getContext('2d');
    this._visible = false;

    // Tree geometry
    this._maxX       = 1;
    this._timed      = false;
    this._rootHeight = 0;
    this._fontSize   = 9;

    // Date mode — anchor stores one tip's (date, height) pair so any node's date
    // can be derived as: nodeDate = _anchorDecYear + (_anchorH - nodeH)
    // Heights are computed from the layout as (maxX - node.x), not from annotations.
    this._dateMode      = false;
    this._anchorDecYear = null;  // decimal year of the anchor tip
    this._anchorH       = null;  // computed height of the anchor tip (maxX - tip.x)
    this._minTipH       = 0;     // minimum computed height among tips in current view

    // Tick / label options (effective only in date mode)
    this._majorInterval    = 'auto';
    this._minorInterval    = 'off';
    this._majorLabelFormat = 'auto';
    this._minorLabelFormat = 'off';

    this._lastHash = '';

    // ── Style overrides ───────────────────────────────────────────────────
    this._axisColor          = null;   // hex string; null → use built-in default colours
    this._axisLineWidth      = 1;      // stroke width for ticks and baseline
    this._axisFontSizeManual = false;  // true once setFontSize() has been called
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
    this._dateMode      = false;
    this._anchorDecYear = null;
    this._anchorH       = null;
    this._minTipH       = 0;
    this._lastHash      = '';
  }

  /**
   * Switch to absolute-date axis using the given annotation key.
   * We scan nodeMap for the first tip that has both that annotation and 'height',
   * then compute the decimal-year of the root.
   *
   * @param {string|null} annotKey  – null clears date mode (falls back to height mode)
   * @param {Map}         nodeMap   – renderer's nodeMap (id → layout node with .x)
   * @param {number}      maxX      – full-tree branch span; used to compute height = maxX - node.x
   */
  setDateAnchor(annotKey, nodeMap, maxX) {
    if (!annotKey || !this._timed) {
      this._dateMode      = false;
      this._anchorDecYear = null;
      this._anchorH       = null;
      this._minTipH       = 0;
      this._lastHash      = '';
      return;
    }

    // Scan ALL tips to:
    //   a) find the anchor (first tip that carries the date annotation)
    //   b) find the minimum computed height across all tips
    // Heights are computed as (maxX - node.x) — no dependence on height annotations.
    let anchorDecYear = null;
    let anchorH       = null;
    let minTipH       = Infinity;

    for (const node of nodeMap.values()) {
      if (!node.isTip) continue;
      const h = maxX - node.x;
      if (isNaN(h)) continue;
      if (h < minTipH) minTipH = h;
      if (anchorDecYear == null) {
        const raw = node.annotations?.[annotKey];
        if (raw == null) continue;
        const dec = AxisRenderer._parseDateToDecYear(String(raw));
        if (dec != null) { anchorDecYear = dec; anchorH = h; }
      }
    }

    if (anchorDecYear == null) {
      this._dateMode      = false;
      this._anchorDecYear = null;
      this._anchorH       = null;
      this._minTipH       = 0;
    } else {
      // date(nodeH) = anchorDecYear + (anchorH - nodeH)
      // root at nodeH = _rootHeight, most-recent tips at nodeH = minTipH
      this._anchorDecYear = anchorDecYear;
      this._anchorH       = anchorH;
      this._minTipH       = isFinite(minTipH) ? minTipH : 0;
      this._dateMode      = true;
    }
    this._lastHash = '';
  }

  /**
   * Update axis params for a subtree view without re-running setTreeParams / setDateAnchor.
   * Call whenever the renderer navigates into or out of a subtree.
   *
   * @param {number}  maxX       – branch span of the new view (root → most distant tip)
   * @param {number}  rootHeight – computed height at the new view root (maxX_full - root.x)
   * @param {number}  minTipH    – minimum computed height among tips in the new view
   */
  setSubtreeParams({ maxX, rootHeight, minTipH }) {
    this._maxX       = maxX;
    this._rootHeight = rootHeight;
    if (this._dateMode && minTipH != null) this._minTipH = minTipH;
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

    const hash = `${scaleX.toFixed(4)}|${offsetX.toFixed(2)}|${paddingLeft}|${labelRightPad}|${bgColor}|${this._fontSize}|${this._axisColor ?? ''}|${this._axisLineWidth}|${W}|${H}|${this._timed}|${this._dateMode}|${this._rootHeight}|${this._anchorDecYear}|${this._anchorH}|${this._minTipH}|${this._majorInterval}|${this._minorInterval}|${this._majorLabelFormat}|${this._minorLabelFormat}`;
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

  // ── Drawing ──────────────────────────────────────────────────────────────

  _draw() {
    const ctx = this._ctx;
    const W = this._W, H = this._H;
    const fs = this._fontSize;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this._bgColor;
    ctx.fillRect(0, 0, W, H);

    if (!this._scaleX || this._maxX === 0) return;

    const plotLeft  = this._offsetX;
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
        ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor)
        : AxisRenderer._calendarTicksForInterval(minVal, maxVal, majorInt);
      if (minorInt === 'off') {
        minorTicks = [];
      } else if (minorInt === 'auto') {
        const minorAll = AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor * 5);
        const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
        minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
      } else {
        const minorAll = AxisRenderer._calendarTicksForInterval(minVal, maxVal, minorInt);
        const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
        minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
      }
    } else {
      majorTicks = AxisRenderer._niceTicks(leftVal, rightVal, targetMajor);
      const minorAll = majorTicks.length > 1
        ? AxisRenderer._niceTicks(leftVal, rightVal, targetMajor * 5) : [];
      const majorSet = new Set(majorTicks.map(t => t.toPrecision(10)));
      minorTicks = minorAll.filter(t => !majorSet.has(t.toPrecision(10)));
    }

    // ── Layout constants ──────────────────────────────────────────────────
    const Y_BASE      = 3;
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

    ctx.font         = `${fsMinor}px monospace`;
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
        const label = this._formatDateVal(val, minorLabelFmt, this._minorInterval);
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

    ctx.font         = `${fs}px monospace`;
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
          label = (majorLabelFmt === 'auto')
            ? AxisRenderer._formatDecYear(val, majorTicks)
            : this._formatDateVal(val, majorLabelFmt, this._majorInterval);
        } else {
          label = AxisRenderer._formatValue(val);
        }
        const tw = ctx.measureText(label).width;
        const lx = Math.max(plotLeft + tw / 2 + 1, Math.min(plotRight - tw / 2 - 1, sx));
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
    if (this._dateMode) {
      // date(nodeH) = _anchorDecYear + (_anchorH - nodeH)
      // root at nodeH=_rootHeight, most-recent tips at nodeH=_minTipH
      const leftVal  = this._anchorDecYear + this._anchorH - this._rootHeight;
      const rightVal = this._anchorDecYear + this._anchorH - this._minTipH;
      return { leftVal, rightVal };
    }
    if (this._timed) {
      // Height axis: rootHeight at worldX=0, decreasing to 0 at worldX=maxX
      return { leftVal: this._rootHeight, rightVal: 0 };
    }
    // Divergence
    return { leftVal: 0, rightVal: this._maxX };
  }

  _valToWorldX(val) {
    if (this._dateMode) {
      // rootDecYear = anchorDecYear + anchorH - rootHeight
      return val - (this._anchorDecYear + this._anchorH - this._rootHeight);
    }
    if (this._timed)    return this._rootHeight - val;
    return val;
  }

  _valToScreenX(val) {
    return this._offsetX + this._valToWorldX(val) * this._scaleX;
  }

  static _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /** Format a decimal year using a specific named format or 'component' (interval-specific label). */
  _formatDateVal(decYear, format, interval) {
    const { year, month, day } = AxisRenderer._decYearToDate(decYear);
    if (format === 'component') {
      switch (interval) {
        case 'decades':  return String(year);
        case 'years':    return String(year);
        case 'quarters': return `Q${Math.ceil(month / 3)}`;
        case 'months':   return AxisRenderer._MONTHS[month - 1];
        case 'weeks':
        case 'days':     return String(day);
        default:         return AxisRenderer._formatDecYear(decYear, []);
      }
    }
    const mm  = String(month).padStart(2, '0');
    const dd  = String(day).padStart(2, '0');
    const mmm = AxisRenderer._MONTHS[month - 1];
    switch (format) {
      case 'yyyy':        return String(year);
      case 'yyyy-MM':     return `${year}-${mm}`;
      case 'yyyy-MMM':    return `${year}-${mmm}`;
      case 'yyyy-mm-dd':  return `${year}-${mm}-${dd}`;
      case 'yyyy-MMM-dd': return `${year}-${mmm}-${dd}`;
      case 'dd MMM yyyy': return `${dd} ${mmm} ${year}`;
      default:            return AxisRenderer._formatDecYear(decYear, []);
    }
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

  /**
   * Generate calendar ticks within decimal-year range [minDY, maxDY].
   * Auto-picks appropriate interval (decade → year → quarter → month → …).
   */
  static _niceCalendarTicks(minDY, maxDY, targetCount = 5) {
    const range = maxDY - minDY;
    if (range === 0) return [minDY];

    // Candidate intervals in decimal years
    const candidates = [
      100, 50, 25, 10, 5, 2, 1,
      1/2, 1/3, 1/4, 1/6, 1/12, 1/24,
    ];
    const roughStep = range / targetCount;
    let step = candidates[0];
    for (const c of candidates) {
      if (c <= roughStep * 1.5) { step = c; break; }
    }

    // Snap start to a multiple of step in decimal years (using Jan 1 multiples)
    const ticks = [];
    if (step >= 1) {
      // Snap to year boundaries
      const startYear = Math.ceil(minDY / step - 1e-9) * step;
      for (let y = startYear; y <= maxDY + step * 1e-9; y += step) {
        ticks.push(parseFloat(y.toPrecision(10)));
      }
    } else {
      // Sub-year: snap to month/quarter boundaries
      const monthsPerStep = Math.round(step * 12);
      const startDate     = AxisRenderer._decYearToDate(minDY);
      let   m             = startDate.month;
      let   yr            = startDate.year;
      // Advance to next tick boundary
      const rem = m % monthsPerStep;
      if (rem !== 0) m += monthsPerStep - rem;
      while (m > 12) { m -= 12; yr++; }
      for (let i = 0; i < 60; i++) {  // safety cap
        const dy = AxisRenderer._dateToDecYear(yr, m, 1);
        if (dy > maxDY + step * 1e-6) break;
        ticks.push(dy);
        m += monthsPerStep;
        while (m > 12) { m -= 12; yr++; }
      }
    }
    return ticks;
  }

  /**
   * Generate ticks for a fixed named calendar interval within [minDY, maxDY].
   */
  static _calendarTicksForInterval(minDY, maxDY, interval) {
    const ticks = [];
    const sd = AxisRenderer._decYearToDate(minDY);

    if (interval === 'decades') {
      const start = Math.ceil(minDY / 10 - 1e-9) * 10;
      for (let y = start; y <= maxDY + 1e-6; y += 10)
        ticks.push(AxisRenderer._dateToDecYear(y, 1, 1));

    } else if (interval === 'years') {
      let yr = sd.year;
      if (AxisRenderer._dateToDecYear(yr, 1, 1) < minDY - 1e-9) yr++;
      for (; AxisRenderer._dateToDecYear(yr, 1, 1) <= maxDY + 1e-6; yr++)
        ticks.push(AxisRenderer._dateToDecYear(yr, 1, 1));

    } else if (interval === 'quarters') {
      let yr = sd.year, m = sd.month;
      // snap to next quarter start (1, 4, 7, 10)
      m = Math.ceil(m / 3) * 3 - 2;
      if (m < 1) m = 1;
      if (AxisRenderer._dateToDecYear(yr, m, 1) < minDY - 1e-9) {
        m += 3; while (m > 12) { m -= 12; yr++; }
      }
      for (let i = 0; i < 500; i++) {
        const dy = AxisRenderer._dateToDecYear(yr, m, 1);
        if (dy > maxDY + 1e-6) break;
        ticks.push(dy);
        m += 3; while (m > 12) { m -= 12; yr++; }
      }

    } else if (interval === 'months') {
      let yr = sd.year, m = sd.month;
      if (AxisRenderer._dateToDecYear(yr, m, 1) < minDY - 1e-9) {
        m++; if (m > 12) { m = 1; yr++; }
      }
      for (let i = 0; i < 5000; i++) {
        const dy = AxisRenderer._dateToDecYear(yr, m, 1);
        if (dy > maxDY + 1e-6) break;
        ticks.push(dy);
        m++; if (m > 12) { m = 1; yr++; }
      }

    } else if (interval === 'weeks') {
      // Anchor to Jan 1 of start year; step by 7 calendar days
      const anchor = AxisRenderer._dateToDecYear(sd.year, 1, 1);
      const WEEK_DY = 7 / 365.25;
      const n = Math.ceil((minDY - anchor) / WEEK_DY - 1e-9);
      let { year, month, day } = AxisRenderer._decYearToDate(anchor + n * WEEK_DY);
      for (let i = 0; i < 5000; i++) {
        const dy = AxisRenderer._dateToDecYear(year, month, day);
        if (dy > maxDY + 1e-4) break;
        if (dy >= minDY - 1e-9) ticks.push(dy);
        day += 7;
        const lp = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const dim = [0,31,lp?29:28,31,30,31,30,31,31,30,31,30,31];
        while (day > dim[month]) { day -= dim[month]; month++; if (month > 12) { month = 1; year++; } }
      }

    } else if (interval === 'days') {
      let { year, month, day } = AxisRenderer._decYearToDate(minDY);
      if (AxisRenderer._dateToDecYear(year, month, day) < minDY - 1e-9) {
        day++;
        const lp = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const dim = [0,31,lp?29:28,31,30,31,30,31,31,30,31,30,31];
        if (day > dim[month]) { day = 1; month++; if (month > 12) { month = 1; year++; } }
      }
      for (let i = 0; i < 100000; i++) {
        const dy = AxisRenderer._dateToDecYear(year, month, day);
        if (dy > maxDY + 1e-6) break;
        ticks.push(dy);
        day++;
        const lp = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
        const dim = [0,31,lp?29:28,31,30,31,30,31,31,30,31,30,31];
        if (day > dim[month]) { day = 1; month++; if (month > 12) { month = 1; year++; } }
      }
    }
    return ticks;
  }

  /**
   * Format a decimal year for display.
   * The ticks array is inspected to decide what precision is needed.
   */
  static _formatDecYear(dy, ticks) {
    if (ticks.length < 2) return String(Math.round(dy));
    const step = Math.abs(ticks[1] - ticks[0]);
    if (step >= 1 - 1e-6) {
      // Annual or coarser: show year only
      return String(Math.round(dy));
    }
    // Sub-annual: figure out the month
    const { year, month, day } = AxisRenderer._decYearToDate(dy);
    const mm = String(month).padStart(2, '0');
    if (step >= 1 / 12 - 1e-6) {
      // Monthly or quarterly
      return `${year}-${mm}`;
    }
    // Finer: show full date
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  /** Format a plain numeric value (divergence or height). */
  static _formatValue(v) {
    if (v === 0) return '0';
    const abs = Math.abs(v);
    if (abs >= 100)  return v.toFixed(0);
    if (abs >= 10)   return v.toFixed(1);
    if (abs >= 1)    return v.toFixed(2);
    if (abs >= 0.01) return v.toFixed(3);
    return v.toExponential(2);
  }

  /**
   * Parse a date string into a decimal year.
   * Supports: "2014", "2014-06", "2014-06-15", "2014.45"
   * Returns null if not parseable.
   */
  static _parseDateToDecYear(str) {
    if (!str) return null;
    str = str.trim();

    // Decimal year "2014.45"
    const decMatch = str.match(/^(\d{4})\.(\d+)$/);
    if (decMatch) {
      return parseFloat(str);
    }

    // Full date "YYYY-MM-DD"
    const fullMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (fullMatch) {
      const yr = parseInt(fullMatch[1]);
      const mo = parseInt(fullMatch[2]);
      const dy = parseInt(fullMatch[3]);
      return AxisRenderer._dateToDecYear(yr, mo, dy);
    }

    // Year-month "YYYY-MM"
    const ymMatch = str.match(/^(\d{4})-(\d{2})$/);
    if (ymMatch) {
      const yr = parseInt(ymMatch[1]);
      const mo = parseInt(ymMatch[2]);
      // Mid-month: 15th
      return AxisRenderer._dateToDecYear(yr, mo, 15);
    }

    // Year only "YYYY"
    const yMatch = str.match(/^(\d{4})$/);
    if (yMatch) {
      const yr = parseInt(yMatch[1]);
      // Mid-year: July 2
      return AxisRenderer._dateToDecYear(yr, 7, 2);
    }

    return null;
  }

  /**
   * Convert a calendar date to a decimal year.
   * e.g. 2014-01-01 → 2014.0, 2014-07-02 → ~2014.5
   */
  static _dateToDecYear(year, month, day) {
    const isLeap   = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const days     = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear  = day;
    for (let m = 1; m < month; m++) dayOfYear += days[m];
    const totalDays = isLeap ? 366 : 365;
    return year + (dayOfYear - 1) / totalDays;
  }

  /**
   * Convert a decimal year to { year, month, day }.
   */
  static _decYearToDate(dy) {
    const year     = Math.floor(dy);
    const frac     = dy - year;
    const isLeap   = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const totalDays = isLeap ? 366 : 365;
    let   dayOfYear = Math.round(frac * totalDays) + 1;
    if (dayOfYear < 1) dayOfYear = 1;
    if (dayOfYear > totalDays) dayOfYear = totalDays;
    const days = [0, 31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let month = 1;
    while (month < 12 && dayOfYear > days[month]) {
      dayOfYear -= days[month];
      month++;
    }
    return { year, month, day: dayOfYear };
  }
}
