/**
 * AxisRenderer — draws an x-axis below the tree canvas.
 *
 * Three modes (set automatically via setTreeParams):
 *   1. divergence — labels show raw branch-length distance from root
 *   2. height     — labels show "height before present" (rootHeight → 0 left→right)
 *   3. date       — labels show calendar year / date derived from a date annotation
 *
 * Usage:
 *   const ar = new AxisRenderer(canvasEl);
 *   ar.setTreeParams({ maxX, isTimedTree, rootHeight });
 *   ar.setDateAnchor('date', nodeMap);   // optional — switches to date mode
 *   // Called every frame by renderer._onViewChange:
 *   ar.update(scaleX, offsetX, paddingLeft, labelRightPad, bgColor, fontSize, devicePixelRatio);
 */
export class AxisRenderer {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');
    this._visible = false;

    // Tree geometry
    this._maxX       = 1;
    this._timed      = false; // true if height annotation present on all nodes
    this._rootHeight = 0;     // height at root (in years for time trees)
    this._fontSize   = 9;

    // Date mode
    this._dateMode      = false;
    this._rootDecYear   = null; // decimal year at root

    // Last view state (to avoid redundant redraws)
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
    this._dateMode   = false;
    this._rootDecYear = null;
    this._lastHash   = '';
  }

  /**
   * Switch to absolute-date axis using the given annotation key.
   * We scan nodeMap for the first tip that has both that annotation and 'height',
   * then compute the decimal-year of the root.
   *
   * @param {string|null} annotKey  – null clears date mode (falls back to height mode)
   * @param {Map}         nodeMap   – renderer's nodeMap (id → node with .annotations)
   */
  setDateAnchor(annotKey, nodeMap) {
    if (!annotKey || !this._timed) {
      this._dateMode    = false;
      this._rootDecYear = null;
      this._lastHash    = '';
      return;
    }

    // Find first tip with both the annotation and height
    let anchorDecYear = null;
    let anchorHeight  = null;
    for (const node of nodeMap.values()) {
      if (!node.isTip) continue;
      const raw  = node.annotations?.[annotKey];
      const h    = parseFloat(node.annotations?.height);
      if (raw == null || isNaN(h)) continue;
      const dec = AxisRenderer._parseDateToDecYear(String(raw));
      if (dec != null) { anchorDecYear = dec; anchorHeight = h; break; }
    }

    if (anchorDecYear == null) {
      this._dateMode    = false;
      this._rootDecYear = null;
    } else {
      // worldX(node) = rootHeight - nodeHeight  (rectangular layout)
      // date(worldX) = anchorDecYear + (worldX - anchorWorldX)
      //              = anchorDecYear + (worldX - (rootHeight - anchorHeight))
      // rootDecYear  = anchorDecYear - (rootHeight - anchorHeight)
      this._rootDecYear = anchorDecYear - (this._rootHeight - anchorHeight);
      this._dateMode    = true;
    }
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

    const hash = `${scaleX.toFixed(4)}|${offsetX.toFixed(2)}|${paddingLeft}|${labelRightPad}|${bgColor}|${fontSize}|${W}|${H}|${this._timed}|${this._dateMode}|${this._rootHeight}|${this._rootDecYear}`;
    if (hash === this._lastHash) return;
    this._lastHash = hash;

    this._scaleX       = scaleX;
    this._offsetX      = offsetX;
    this._paddingLeft  = paddingLeft;
    this._labelRightPad = labelRightPad;
    this._bgColor      = bgColor;
    this._fontSize     = Math.max(7, fontSize - 1);
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
    this._fontSize = Math.max(7, px - 1);
    this._lastHash = '';
  }

  // ── Drawing ──────────────────────────────────────────────────────────────

  _draw() {
    const ctx   = this._ctx;
    const W     = this._W;
    const H     = this._H;
    const bg    = this._bgColor;
    const fs    = this._fontSize;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Top divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0.5);
    ctx.lineTo(W, 0.5);
    ctx.stroke();

    if (!this._scaleX || this._maxX === 0) return;

    const plotLeft  = this._offsetX;                           // screenX of worldX=0
    const plotRight = this._offsetX + this._maxX * this._scaleX; // screenX of worldX=maxX

    if (plotRight <= plotLeft) return;

    // Compute the value domain for the full world-x range
    const { leftVal, rightVal } = this._valueDomain();

    // Generate nice ticks
    const targetTicks = Math.max(2, Math.round((plotRight - plotLeft) / 90));
    const ticks = this._dateMode
      ? AxisRenderer._niceCalendarTicks(leftVal, rightVal, targetTicks)
      : AxisRenderer._niceTicks(leftVal, rightVal, targetTicks);

    if (ticks.length === 0) return;

    // Axis baseline
    const Y_LINE  = 7;
    const Y_TICK  = Y_LINE + 5;
    const Y_LABEL = Y_TICK + fs + 2;

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, Y_LINE);
    ctx.lineTo(plotRight, Y_LINE);
    ctx.stroke();

    const textColor = this._lightenHex(bg);
    ctx.fillStyle   = textColor;
    ctx.font        = `${fs}px monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';

    for (const val of ticks) {
      const worldX = this._valToWorldX(val);
      const sx     = this._offsetX + worldX * this._scaleX;
      if (sx < plotLeft - 1 || sx > plotRight + 1) continue;

      // Tick mark
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(sx, Y_LINE);
      ctx.lineTo(sx, Y_TICK);
      ctx.stroke();

      // Label
      const label = this._dateMode
        ? AxisRenderer._formatDecYear(val, ticks)
        : AxisRenderer._formatValue(val);

      // Clip label to plotLeft..plotRight
      const tw = ctx.measureText(label).width;
      const lx = Math.max(plotLeft + tw / 2 + 2, Math.min(plotRight - tw / 2 - 2, sx));

      ctx.fillStyle = textColor;
      ctx.fillText(label, lx, Y_TICK + 1);
    }
  }

  /** Returns {leftVal, rightVal} = the axis values at worldX=0 and worldX=maxX */
  _valueDomain() {
    if (this._dateMode) {
      const leftVal  = this._rootDecYear;
      const rightVal = this._rootDecYear + this._maxX;
      return { leftVal, rightVal };
    }
    if (this._timed) {
      // Height axis: rootHeight at worldX=0, decreasing to 0 at worldX=maxX
      return { leftVal: this._rootHeight, rightVal: 0 };
    }
    // Divergence
    return { leftVal: 0, rightVal: this._maxX };
  }

  /** Convert axis value back to worldX */
  _valToWorldX(val) {
    if (this._dateMode) {
      return val - this._rootDecYear;
    }
    if (this._timed) {
      // height = rootHeight - worldX  →  worldX = rootHeight - height
      return this._rootHeight - val;
    }
    return val;
  }

  /** Derive a readable foreground colour from the background hex */
  _lightenHex(hex) {
    // Just use a fixed light off-white to match the rest of the UI
    return 'rgba(242,241,230,0.75)';
  }

  // ── Static helpers ────────────────────────────────────────────────────────

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
   * Picks an appropriate interval: decade, year, quarter, month.
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
