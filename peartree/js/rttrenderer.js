// rttrenderer.js — Root-to-Tip divergence scatter-plot canvas renderer.
//
// Draws tips as (date, root-to-tip divergence) scatter points using the same
// visual style as the main tree canvas, plus a least-squares regression line
// and a stats overlay.  Handles its own mouse events for hover, single-click /
// cmd-click selection and drag-rectangle selection, mirroring tree behaviour.
//
// The controller (rttchart.js) owns panel open/close/pin logic and wires this
// renderer to the tree renderer's state.
// ─────────────────────────────────────────────────────────────────────────────

import { TreeCalibration } from './phylograph.js';

// ─── Tick helpers ─────────────────────────────────────────────────────────────

/** Pick a nice step size (decimal years) giving ~5-7 ticks over the range. */
function _niceYearStep(range) {
  const steps = [1/365, 7/365, 1/12, 2/12, 3/12, 6/12, 1, 2, 5, 10, 25, 50, 100,
                 500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
  const raw   = range / 6;
  return steps.find(s => s >= raw) ?? 100000;
}

/** Nice linear step for a value range (Y axis). */
function _niceStep(range) {
  if (range <= 0) return 1e-6;
  const mag  = Math.pow(10, Math.floor(Math.log10(range / 5)));
  const norm = (range / mag) / 5;
  if (norm < 1.5) return mag;
  if (norm < 3.5) return 2 * mag;
  if (norm < 7.5) return 5 * mag;
  return 10 * mag;
}

/** Decimal places needed to show `step` without trailing zeros. */
function _stepDp(step) {
  if (step >= 1)     return 0;
  if (step >= 0.1)   return 1;
  if (step >= 0.01)  return 2;
  if (step >= 0.001) return 3;
  return 4;
}

/**
 * Format a decimal year as label lines for the X axis, given the tick step.
 * Returns an array of 1 or 2 strings (multi-line when step < 1 year).
 */
function _fmtDecYear(dy, step, cal, fmt) {
  if (cal) {
    if (step >= 1) return [String(Math.round(dy))];
    if (step >= 1 / 12) {
      const { year, month } = TreeCalibration.decYearToDate(dy);
      return [TreeCalibration.MONTHS[month - 1], String(year)];
    }
    return [cal.decYearToString(dy, 'full', fmt)];
  }
  return [dy.toFixed(_stepDp(step))];
}

// ─── RTTRenderer ──────────────────────────────────────────────────────────────

export class RTTRenderer {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx    = canvas.getContext('2d');
    this._dpr    = window.devicePixelRatio || 1;

    // ── Plot data ──────────────────────────────────────────────────────────
    /** @type {Array<{id:string, x:number|null, y:number, name:string, colour:string|null}>} */
    this._points    = [];
    this._xMin      = 0;  this._xMax = 1;
    this._yMin      = 0;  this._yMax = 1;
    /** @type {{a:number,b:number,xInt:number|null,r:number,r2:number,cv:number,n:number}|null} */
    // Regression is owned by TreeCalibration and read via this._calibration.regression.
    // No local _regression field needed.

    // ── Tip style — mirrors TreeRenderer public properties ─────────────────
    this.tipRadius             = 4;
    this.tipShapeColor         = 'rgba(180,200,220,0.9)';
    this.tipHaloSize           = 0;
    this.tipShapeBgColor       = 'rgba(2,41,46,0.9)';
    this.bgColor               = '#02292e';
    this.fontSize              = 11;
    this.fontFamily            = 'Inter, system-ui, sans-serif';

    // Axis style — synced from the Axis section settings in the palette panel
    this.axisColor             = '#f2f1e6';
    this.axisFontSize          = 9;
    this.axisLineWidth         = 1;

    // Selected-tip indicator style
    this.selectedTipStrokeColor   = 'rgba(220,200,80,0.9)';
    this.selectedTipFillColor     = 'rgba(220,200,80,0.3)';
    this.selectedTipGrowthFactor  = 1.5;
    this.selectedTipMinSize       = 8;
    this.selectedTipStrokeWidth   = 2;
    this.selectedTipStrokeOpacity = 0.9;
    this.selectedTipFillOpacity   = 0.35;

    // Hover indicator style
    this.tipHoverStrokeColor      = 'rgba(255,255,255,0.9)';
    this.tipHoverFillColor        = 'rgba(255,255,255,0.2)';
    this.tipHoverGrowthFactor     = 1.4;
    this.tipHoverMinSize          = 6;
    this.tipHoverStrokeWidth      = 1.5;
    this.tipHoverStrokeOpacity    = 0.8;
    this.tipHoverFillOpacity      = 0.2;

    // ── Calibration (for X-axis label formatting) ──────────────────────────
    this._calibration = null;
    this._dateFormat  = 'yyyy-MM-dd';

    // Date-axis tick options (synced from Axis panel controls; mirrors AxisRenderer)
    // { majorInterval, minorInterval, majorLabelFormat, minorLabelFormat }
    this.tickOptions  = null;

    // When true the x-axis left edge extends to the regression x-intercept (root age)
    this.showRootAge  = false;

    // Grid line visibility: 'both' | 'horizontal' | 'vertical' | 'off'
    this.gridLines    = 'both';

    // Plot area aspect ratio: 'fit' | '1:1' | '4:3' | '3:2' | '16:9'
    this.aspectRatio  = 'fit';

    // ── Stats box ──────────────────────────────────────────────────────────
    this.statsBoxVisible  = true;
    this.statsBoxCorner   = 'tl';              // 'tl' | 'tr' | 'bl' | 'br'
    this._statsBoxDragActive = false;
    this._statsBoxDragOffset = null;           // {x,y} CSS-px offset: box-TL to mouse
    this._statsBoxDragCss    = null;           // {x,y} CSS-px box-TL position during drag
    this._lastStatsRect      = null;           // last-drawn box rect (physical px)
    this._lastStatsCloseRect = null;           // last-drawn close-button rect (physical px)

    // ── Selection / hover — kept in sync with TreeRenderer ────────────────
    this._selectedTipIds = new Set();
    this._hoveredTipId   = null;

    // ── Drag-select state ──────────────────────────────────────────────────
    this._dragActive  = false;
    this._dragStartPx = null;  // CSS pixels
    this._dragEndPx   = null;
    this._cmdHeld     = false;

    // ── Per-render point positions (hit-testing) ───────────────────────────
    /** @type {Array<{id:string, px:number, py:number}>} physical pixels */
    this._renderedPts = [];

    // ── Callbacks ──────────────────────────────────────────────────────────
    this.onSelectionChange       = null;  // (Set<id>) => void
    this.onHoverChange           = null;  // (id|null) => void
    this.onStatsBoxVisibleChange = null;  // (visible:boolean) => void
    this.onStatsBoxCornerChange  = null;  // (corner:string) => void

    this._dirty = true;
    this._setupEvents();
    this._startLoop();
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Replace the full point dataset and recompute bounds. Regression is now
   *  owned by TreeCalibration — see rttchart.js recomputeCalibration(). */
  setPoints(pts) {
    this._points = pts;
    this._computeBounds();
    this._dirty  = true;
  }

  /** Update the calibration used for X-axis date formatting. */
  setCalibration(cal, fmt) {
    this._calibration = cal ?? null;
    this._dateFormat  = fmt ?? 'yyyy-MM-dd';
    this._dirty = true;
  }

  /** Sync the selected-id set from outside (tree renderer). */
  setSelectedIds(ids) {
    this._selectedTipIds = ids instanceof Set ? ids : new Set(ids);
    this._dirty = true;
  }

  /** Sync the hovered id from outside (tree renderer). */
  setHoveredId(id) {
    const next = id ?? null;
    if (this._hoveredTipId === next) return;
    this._hoveredTipId = next;
    this._dirty = true;
  }

  /** Resize the canvas to its current CSS size, honouring devicePixelRatio. */
  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const w   = this._canvas.clientWidth;
    const h   = this._canvas.clientHeight;
    if (w < 1 || h < 1) return;
    this._canvas.width  = Math.round(w * dpr);
    this._canvas.height = Math.round(h * dpr);
    this._dpr   = dpr;
    this._dirty = true;
  }

  // ─── Coordinate helpers ────────────────────────────────────────────────────

  /** Plot area rectangle in physical (DPR-scaled) pixels. */
  _plotRect() {
    const d  = this._dpr;
    const W  = this._canvas.width;
    const H  = this._canvas.height;
    const mL = Math.round(62 * d);
    const mR = Math.round(14 * d);
    const mT = Math.round(14 * d);
    const mB = Math.round(52 * d);
    const availW = W - mL - mR;
    const availH = H - mT - mB;
    if (!this.aspectRatio || this.aspectRatio === 'fit') {
      return { x: mL, y: mT, w: availW, h: availH };
    }
    const [rw, rh] = this.aspectRatio.split(':').map(Number);
    const ratio = rw / rh;
    let pw, ph;
    if (availW / availH > ratio) {
      ph = availH;
      pw = Math.round(ph * ratio);
    } else {
      pw = availW;
      ph = Math.round(pw / ratio);
    }
    const ox = mL + Math.round((availW - pw) / 2);
    const oy = mT + Math.round((availH - ph) / 2);
    return { x: ox, y: oy, w: pw, h: ph };
  }

  _xToScreen(v, rect) {
    const span = this._xMax - this._xMin;
    return span === 0 ? rect.x + rect.w / 2 : rect.x + (v - this._xMin) / span * rect.w;
  }
  _yToScreen(v, rect) {
    const span = this._yMax - this._yMin;
    return span === 0 ? rect.y + rect.h / 2 : rect.y + rect.h - (v - this._yMin) / span * rect.h;
  }

  // ─── Bounds & regression ──────────────────────────────────────────────────

  _computeBounds() {
    // ── Homochronous: no date x values → histogram of divergence ──────────
    if (this._points.length > 0 && !this._points.some(p => p.x != null)) {
      let dMin = Infinity, dMax = -Infinity;
      for (const p of this._points) {
        if (p.y < dMin) dMin = p.y;
        if (p.y > dMax) dMax = p.y;
      }
      if (!isFinite(dMin)) { dMin = 0; dMax = 1; }
      const pad = Math.max((dMax - dMin) * 0.06, 1e-9);
      this._xMin = Math.max(0, dMin - pad);
      this._xMax = dMax + pad;
      this._yMin = 0;
      this._yMax = this._points.length; // refined in _render after bin compute
      return;
    }
    let xMin = Infinity, xMax = -Infinity, yMax = -Infinity;
    for (const p of this._points) {
      if (p.x != null) {
        if (p.x < xMin) xMin = p.x;
        if (p.x > xMax) xMax = p.x;
      }
      if (p.y > yMax) yMax = p.y;
    }
    if (!isFinite(xMin)) { xMin = 0; xMax = 1; }
    if (!isFinite(yMax)) yMax = 1;
    const dataRange = xMax - xMin;
    const xPad = Math.max(dataRange * 0.06, 1e-9);
    const yPad = Math.max(yMax * 0.08, 1e-12);
    // When showRootAge is on, extend the left edge to the regression x-intercept
    // (the estimated root age) so the full regression line is visible.
    let xLeft = xMin - xPad;
    if (this.showRootAge) {
      const xInt = this._calibration?.regression?.xInt;
      if (xInt != null && isFinite(xInt) && xInt < xMin) {
        const fullRange = xMax - xInt;
        xLeft = xInt - Math.max(fullRange * 0.04, xPad);
      }
    }
    this._xMin = xLeft;
    this._xMax = xMax + xPad;
    this._yMin = 0;
    this._yMax = yMax + yPad;
  }

  // ─── Render loop ──────────────────────────────────────────────────────────

  _startLoop() {
    const tick = () => {
      if (this._dirty) { this._dirty = false; this._render(); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  _render() {
    const ctx = this._ctx;
    const W = this._canvas.width, H = this._canvas.height;
    if (W < 2 || H < 2) return;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.bgColor;
    ctx.fillRect(0, 0, W, H);

    const rect = this._plotRect();
    if (rect.w < 30 || rect.h < 30) return;

    if (this._points.length === 0) { this._drawEmptyState(ctx, W, H); return; }

    // ── Homochronous: no tip dates → divergence histogram ─────────────────
    if (!this._points.some(p => p.x != null)) {
      const bins     = this._computeHistoBins(rect);
      const maxCount = bins.reduce((m, b) => Math.max(m, b.total), 0);
      this._yMax = Math.max(1, maxCount) + Math.max(maxCount * 0.08, 0.5);
      this._yMin = 0;
      this._drawGrid(ctx, rect);
      this._drawHistoBars(ctx, rect, bins);
      this._drawHistoAxes(ctx, rect);
      this._drawHistoStatsBox(ctx, rect);
      return;
    }

    this._drawGrid(ctx, rect);
    this._drawAxes(ctx, rect);
    this._drawRegression(ctx, rect);
    this._drawPoints(ctx, rect);
    this._drawStatsBox(ctx, rect);
    if (this._dragActive && this._dragStartPx && this._dragEndPx) {
      this._drawDragRect(ctx);
    }
  }

  // Convert a CSS hex colour (#rrggbb) to rgba(r,g,b,alpha) for use in canvas.
  // Falls back gracefully to the original string for already-rgba values.
  _colorWithAlpha(color, alpha) {
    if (color && color.startsWith('#') && color.length === 7) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  }

  _drawEmptyState(ctx, W, H) {
    const d = this._dpr;
    ctx.fillStyle    = this._colorWithAlpha(this.axisColor, 0.35);
    ctx.font         = `${Math.round(this.axisFontSize * d)}px ${this.fontFamily}`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Provide a tip date annotation to view', W / 2, H / 2 - 10 * d);
    ctx.fillText('the root-to-tip divergence plot', W / 2, H / 2 + 10 * d);
  }

  // ─── Grid ─────────────────────────────────────────────────────────────────

  _drawGrid(ctx, rect) {
    const gl = this.gridLines;
    if (gl === 'off') return;
    const d = this._dpr;
    const drawH = gl === 'both' || gl === 'horizontal';
    const drawV = gl === 'both' || gl === 'vertical';
    const { ticks: yTks }         = drawH ? this._yTicksInfo()       : { ticks: [] };
    // In histogram mode, X axis uses _niceStep (not _niceYearStep) — match that here
    const isHisto = this._points.length > 0 && !this._points.some(p => p.x != null);
    let xMajTks;
    if (!drawV) {
      xMajTks = [];
    } else if (isHisto) {
      const xStep  = _niceStep(this._xMax - this._xMin);
      const xStart = Math.ceil(this._xMin / xStep - 1e-9) * xStep;
      xMajTks = [];
      for (let v = xStart; v <= this._xMax + xStep * 0.001; v += xStep)
        xMajTks.push(parseFloat(v.toPrecision(10)));
    } else {
      xMajTks = this._xTicksInfo(rect).majorTicks;
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    ctx.lineWidth   = d;
    ctx.beginPath();
    for (const v of yTks) {
      const py = Math.round(this._yToScreen(v, rect));
      if (py < rect.y - 1 || py > rect.y + rect.h + 1) continue;
      ctx.moveTo(rect.x, py);  ctx.lineTo(rect.x + rect.w, py);
    }
    for (const v of xMajTks) {
      const px = Math.round(this._xToScreen(v, rect));
      if (px < rect.x - 1 || px > rect.x + rect.w + 1) continue;
      ctx.moveTo(px, rect.y);  ctx.lineTo(px, rect.y + rect.h);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ─── Axes ─────────────────────────────────────────────────────────────────

  _yTicksInfo() {
    const step  = _niceStep(this._yMax - this._yMin);
    const start = Math.ceil(this._yMin / step) * step;
    const ticks = [];
    for (let v = start; v <= this._yMax + step * 0.001; v += step) ticks.push(v);
    return { ticks, step };
  }

  _xTicksInfo(rect = null) {
    const cal = this._calibration;
    if (cal) {
      // Use the same calendar tick logic as AxisRenderer so tick/label options apply.
      const targetMajor = rect
        ? Math.max(2, Math.round((rect.w / this._dpr) / 80))
        : Math.max(2, Math.round(this._canvas.clientWidth / 80));
      const opts          = this.tickOptions ?? {};
      const majorInterval = opts.majorInterval || 'auto';
      const minorInterval = opts.minorInterval || 'off';
      let majorTicks, minorTicks;
      if (majorInterval === 'auto' && minorInterval === 'auto') {
        // Use the paired helper so major and minor are on a consistent calendar
        // hierarchy (e.g. yearly major → monthly minor).
        const pair = TreeCalibration.autoCalendarTickPair(this._xMin, this._xMax, targetMajor);
        majorTicks = pair.majorTicks;
        minorTicks = pair.minorTicks;
      } else {
        majorTicks = (majorInterval === 'auto')
          ? TreeCalibration.niceCalendarTicks(this._xMin, this._xMax, targetMajor)
          : TreeCalibration.calendarTicksForInterval(this._xMin, this._xMax, majorInterval);
        minorTicks = [];
        if (minorInterval !== 'off') {
          const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
          let allMinor;
          if (minorInterval === 'auto') {
            const derivedInt = TreeCalibration.derivedMinorInterval(majorTicks);
            allMinor = derivedInt
              ? TreeCalibration.calendarTicksForInterval(this._xMin, this._xMax, derivedInt)
              : [];
          } else {
            allMinor = TreeCalibration.calendarTicksForInterval(this._xMin, this._xMax, minorInterval);
          }
          minorTicks = allMinor.filter(t => !majorSet.has(t.toFixed(8)));
        }
      }
      // When the interval was auto-selected, infer the effective calendar interval
      // from the actual tick spacing for correct partial label formatting.
      const effectiveMajorInterval = (majorInterval === 'auto')
        ? TreeCalibration.inferMajorInterval(majorTicks)
        : majorInterval;
      return { majorTicks, minorTicks, step: null, majorInterval: effectiveMajorInterval };
    }
    // Fallback: plain decimal-year / divergence steps
    const step  = _niceYearStep(this._xMax - this._xMin);
    const start = Math.ceil(this._xMin / step) * step;
    const majorTicks = [];
    for (let v = start; v <= this._xMax + step * 0.001; v += step) majorTicks.push(v);
    return { majorTicks, minorTicks: [], step, majorInterval: 'auto' };
  }

  _drawAxes(ctx, rect) {
    const d     = this._dpr;
    const axisC = this._colorWithAlpha(this.axisColor, 0.55);
    const lblC  = this._colorWithAlpha(this.axisColor, 0.90);
    const fsz   = Math.max(6, Math.round(this.axisFontSize * d));
    const font  = `${fsz}px ${this.fontFamily}`;
    const tc    = Math.round(4 * d);           // tick half-length (physical px)

    const { ticks: yTks, step: yStep } = this._yTicksInfo();

    ctx.save();

    // Axis border lines
    ctx.strokeStyle = axisC;
    ctx.lineWidth   = this.axisLineWidth * d;
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);               ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.moveTo(rect.x, rect.y + rect.h);      ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.stroke();

    // ── Y axis ─────────────────────────────────────────────────────────────
    const dp = _stepDp(yStep);
    ctx.font = font;
    ctx.fillStyle    = lblC;
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'right';
    for (const v of yTks) {
      const py = Math.round(this._yToScreen(v, rect));
      if (py < rect.y - 2 || py > rect.y + rect.h + 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = axisC;
      ctx.lineWidth   = this.axisLineWidth * d;
      ctx.moveTo(rect.x - tc, py);  ctx.lineTo(rect.x, py);
      ctx.stroke();
      ctx.fillText(v.toFixed(dp), rect.x - tc - Math.round(3 * d), py);
    }

    // Y axis title (rotated)
    ctx.save();
    ctx.font         = `${Math.max(6, Math.round(this.axisFontSize * 0.9 * d))}px ${this.fontFamily}`;
    ctx.fillStyle    = this._colorWithAlpha(this.axisColor, 0.90);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(Math.round(8 * d), rect.y + rect.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Root-to-tip divergence', 0, 0);
    ctx.restore();

    // ── X axis ─────────────────────────────────────────────────────────────
    const cal  = this._calibration;
    const fmt  = this._dateFormat;
    const opts = this.tickOptions ?? {};
    const ty   = rect.y + rect.h;
    const tcMajor = Math.round(5 * d);
    const tcMinor = Math.round(3 * d);

    const { majorTicks: xMajor, minorTicks: xMinor, step: xStep, majorInterval } =
      this._xTicksInfo(rect);

    const majorLabelFmt  = opts.majorLabelFormat || 'auto';
    const minorLabelFmt  = opts.minorLabelFormat || 'off';
    const showMajorLabel = majorLabelFmt !== 'off';
    const showMinorLabel = minorLabelFmt !== 'off';
    const lblDimC        = this._colorWithAlpha(this.axisColor, 0.50);

    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';

    // Minor ticks (shorter, dimmer)
    if (xMinor.length > 0) {
      ctx.font = `${Math.max(6, Math.round(this.axisFontSize * 0.85 * d))}px ${this.fontFamily}`;
      let lastMinorRight = -Infinity;
      // Infer effective minor interval from tick spacing when 'auto'.
      const effMinorInterval = (opts.minorInterval === 'auto' || !opts.minorInterval)
        ? TreeCalibration.inferMajorInterval(xMinor)
        : opts.minorInterval;
      for (const v of xMinor) {
        const px = Math.round(this._xToScreen(v, rect));
        if (px < rect.x - 2 || px > rect.x + rect.w + 2) continue;
        ctx.beginPath();
        ctx.strokeStyle = this._colorWithAlpha(this.axisColor, 0.55);
        ctx.lineWidth   = this.axisLineWidth * d;
        ctx.moveTo(px, ty);  ctx.lineTo(px, ty + tcMinor);
        ctx.stroke();
        if (showMinorLabel && cal) {
          const label = cal.decYearToString(v, minorLabelFmt, fmt, effMinorInterval);
          const tw    = ctx.measureText(label).width;
          if (px - tw / 2 > lastMinorRight + 2) {
            ctx.fillStyle = lblDimC;
            ctx.fillText(label, px, ty + tcMinor + Math.round(2 * d));
            lastMinorRight = px + tw / 2;
          }
        }
      }
    }

    // Major ticks + labels
    ctx.font = font;
    let lastMajorRight = -Infinity;
    for (const v of xMajor) {
      const px = Math.round(this._xToScreen(v, rect));
      if (px < rect.x - 2 || px > rect.x + rect.w + 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = axisC;
      ctx.lineWidth   = this.axisLineWidth * d;
      ctx.moveTo(px, ty);  ctx.lineTo(px, ty + tcMajor);
      ctx.stroke();
      if (showMajorLabel) {
        let label;
        if (cal) {
          const effFmt = (majorLabelFmt === 'auto') ? 'partial' : majorLabelFmt;
          label = cal.decYearToString(v, effFmt, fmt, majorInterval);
        } else {
          label = _fmtDecYear(v, xStep, null, fmt)[0];
        }
        const tw = ctx.measureText(label).width;
        if (px - tw / 2 > lastMajorRight + 2) {
          ctx.fillStyle = lblC;
          ctx.fillText(label, px, ty + tcMajor + Math.round(2 * d));
          lastMajorRight = px + tw / 2;
        }
      }
    }

    ctx.restore();
  }

  // ─── Regression line ──────────────────────────────────────────────────────

  _drawRegression(ctx, rect) {
    const reg = this._calibration?.regression;
    if (!reg) return;
    const d  = this._dpr;
    const y1 = reg.a * this._xMin + reg.b;
    const y2 = reg.a * this._xMax + reg.b;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.strokeStyle = this._colorWithAlpha(this.axisColor, 0.65);
    ctx.lineWidth   = 1.5 * d;
    ctx.setLineDash([Math.round(6 * d), Math.round(4 * d)]);
    ctx.beginPath();
    ctx.moveTo(this._xToScreen(this._xMin, rect), this._yToScreen(y1, rect));
    ctx.lineTo(this._xToScreen(this._xMax, rect), this._yToScreen(y2, rect));
    ctx.stroke();
    ctx.restore();
  }

  // ─── Scatter points ────────────────────────────────────────────────────────

  _drawPoints(ctx, rect) {
    const d    = this._dpr;
    const pts  = this._points.filter(p => p.x != null);
    const tipR = Math.max(1.5, this.tipRadius * d);
    const sel  = this._selectedTipIds;
    const hov  = this._hoveredTipId;

    this._renderedPts = [];

    ctx.save();
    // Clip to a generous region around the plot area so halos near the edge show
    ctx.beginPath();
    ctx.rect(rect.x - tipR * 4, rect.y - tipR * 4, rect.w + tipR * 8, rect.h + tipR * 8);
    ctx.clip();

    // Pass 1: halos (painted first, behind all circles)
    if (this.tipHaloSize > 0) {
      ctx.lineWidth   = this.tipHaloSize * 2 * d;
      ctx.strokeStyle = this.tipShapeBgColor;
      for (const p of pts) {
        const px = this._xToScreen(p.x, rect);
        const py = this._yToScreen(p.y, rect);
        ctx.beginPath();
        ctx.arc(px, py, tipR, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }

    // Pass 2: fills
    for (const p of pts) {
      const px = this._xToScreen(p.x, rect);
      const py = this._yToScreen(p.y, rect);
      ctx.fillStyle   = p.colour ?? this.tipShapeColor;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(px, py, tipR, 0, 2 * Math.PI);
      ctx.fill();
      this._renderedPts.push({ id: p.id, px, py });
    }

    // Pass 3: selection indicators
    for (const p of pts) {
      if (!sel.has(p.id)) continue;
      const px = this._xToScreen(p.x, rect);
      const py = this._yToScreen(p.y, rect);
      const mr = Math.max(tipR * this.selectedTipGrowthFactor, this.selectedTipMinSize * d);
      ctx.globalAlpha = this.selectedTipStrokeOpacity;
      ctx.strokeStyle = this.selectedTipStrokeColor;
      ctx.lineWidth   = this.selectedTipStrokeWidth * d;
      ctx.beginPath(); ctx.arc(px, py, mr, 0, 2 * Math.PI); ctx.stroke();
      ctx.globalAlpha = this.selectedTipFillOpacity;
      ctx.fillStyle   = this.selectedTipFillColor;
      ctx.beginPath(); ctx.arc(px, py, mr, 0, 2 * Math.PI); ctx.fill();
      // Re-draw the original dot on top of the selection ring
      ctx.globalAlpha = 1;
      ctx.fillStyle   = p.colour ?? this.tipShapeColor;
      ctx.beginPath(); ctx.arc(px, py, tipR, 0, 2 * Math.PI); ctx.fill();
    }

    // Pass 4: hover indicator
    if (hov) {
      const p = pts.find(pt => pt.id === hov);
      if (p) {
        const px = this._xToScreen(p.x, rect);
        const py = this._yToScreen(p.y, rect);
        const hr = Math.max(tipR * this.tipHoverGrowthFactor, this.tipHoverMinSize * d);
        ctx.globalAlpha = this.tipHoverStrokeOpacity;
        ctx.strokeStyle = this.tipHoverStrokeColor;
        ctx.lineWidth   = this.tipHoverStrokeWidth * d;
        ctx.beginPath(); ctx.arc(px, py, hr, 0, 2 * Math.PI); ctx.stroke();
        ctx.globalAlpha = this.tipHoverFillOpacity;
        ctx.fillStyle   = this.tipHoverFillColor;
        ctx.beginPath(); ctx.arc(px, py, hr, 0, 2 * Math.PI); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle   = p.colour ?? this.tipShapeColor;
        ctx.beginPath(); ctx.arc(px, py, tipR, 0, 2 * Math.PI); ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ─── Stats box ────────────────────────────────────────────────────────────

  _drawStatsBox(ctx, rect) {
    const reg = this._calibration?.regression;
    if (!reg || !this.statsBoxVisible) return;
    const d   = this._dpr;
    const cal = this._calibration;
    const fmt = this._dateFormat;
    const fsz = Math.max(9, Math.round(this.fontSize * 0.9 * d));
    const lh  = Math.round(fsz * 1.6);
    const pad = Math.round(7 * d);

    const lines = [
      ['n',         String(reg.n)],
      ['Slope',     `${reg.a.toExponential(3)} /yr`],
    ];
    if (reg.xInt != null) {
      const rootLbl = cal ? cal.decYearToString(reg.xInt, 'full', fmt) : reg.xInt.toFixed(3);
      lines.push(['Root date', rootLbl]);
    }
    lines.push(['R²',   reg.r2.toFixed(4)]);
    lines.push(['Res. mean sq.', reg.rms != null ? reg.rms.toExponential(3) : '—']);
    lines.push(['CV',   reg.cv.toFixed(4)]);

    const boxW   = Math.round(148 * d);
    const boxH   = lines.length * lh + pad;
    const br     = Math.round(4 * d);
    const margin = Math.round(6 * d);

    // Box position: from corner when at rest, from drag coords when dragging
    let bx, by;
    if (this._statsBoxDragActive && this._statsBoxDragCss) {
      bx = Math.round(this._statsBoxDragCss.x * d);
      by = Math.round(this._statsBoxDragCss.y * d);
    } else {
      const c = this.statsBoxCorner;
      bx = (c === 'tl' || c === 'bl') ? rect.x + margin : rect.x + rect.w - boxW - margin;
      by = (c === 'tl' || c === 'tr') ? rect.y + margin : rect.y + rect.h - boxH - margin;
    }

    // Store for hit-testing (physical px)
    this._lastStatsRect = { x: bx, y: by, w: boxW, h: boxH };

    ctx.save();
    // Box background
    ctx.globalAlpha = 0.82;
    ctx.fillStyle   = 'rgba(8,28,34,0.90)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, br);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this._colorWithAlpha(this.axisColor, 0.22);
    ctx.lineWidth   = d;
    ctx.stroke();

    // Text rows
    ctx.font = `${fsz}px ${this.fontFamily}`;
    for (let i = 0; i < lines.length; i++) {
      const ty = by + pad * 0.45 + i * lh + fsz * 0.55;
      ctx.fillStyle    = this._colorWithAlpha(this.axisColor, 0.50);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lines[i][0], bx + pad * 0.7, ty);
      ctx.fillStyle = 'rgba(242,241,230,0.90)';
      ctx.textAlign = 'right';
      ctx.fillText(lines[i][1], bx + boxW - pad * 0.7, ty);
    }

    ctx.restore();
  }

  // ─── Histogram (homochronous mode) ────────────────────────────────────────

  _computeHistoBins(rect) {
    const d     = this._dpr;
    const nBins = Math.max(5, Math.min(40, Math.round(rect.w / d / 20)));
    const range = this._xMax - this._xMin;
    const binW  = range / nBins;
    const bins  = Array.from({ length: nBins }, (_, i) => ({
      x0:      this._xMin + i * binW,
      x1:      this._xMin + (i + 1) * binW,
      total:   0,
      colours: new Map(),
      ids:     [],
    }));
    for (const p of this._points) {
      if (p.y == null || !isFinite(p.y)) continue;
      let bi = Math.floor((p.y - this._xMin) / binW);
      bi = Math.max(0, Math.min(nBins - 1, bi));
      bins[bi].total++;
      bins[bi].ids.push(p.id);
      bins[bi].colours.set(p.colour, (bins[bi].colours.get(p.colour) ?? 0) + 1);
    }
    return bins;
  }

  _drawHistoBars(ctx, rect, bins) {
    const d      = this._dpr;
    const tipC   = this.tipShapeColor;
    const selIds = this._selectedTipIds;
    const hovId  = this._hoveredTipId;
    ctx.save();
    for (const bin of bins) {
      if (bin.total === 0) continue;
      const barL   = Math.round(this._xToScreen(bin.x0, rect)) + 1;
      const barR   = Math.round(this._xToScreen(bin.x1, rect)) - 1;
      const barBot = rect.y + rect.h;
      const barTop = Math.round(this._yToScreen(bin.total, rect));
      const barW   = Math.max(1, barR - barL);
      const barH   = Math.max(1, barBot - barTop);
      const hasSelected = bin.ids.some(id => selIds.has(id));
      const hasHovered  = hovId != null && bin.ids.includes(hovId);
      if (bin.colours.size <= 1) {
        const c = [...bin.colours.keys()][0];
        ctx.globalAlpha = 0.75;
        ctx.fillStyle   = c ?? tipC;
        ctx.fillRect(barL, barTop, barW, barH);
      } else {
        let stackY = barBot;
        for (const [c, count] of bin.colours) {
          const segH = Math.max(1, Math.round(barH * count / bin.total));
          ctx.globalAlpha = 0.75;
          ctx.fillStyle   = c ?? tipC;
          ctx.fillRect(barL, stackY - segH, barW, segH);
          stackY -= segH;
        }
      }
      if (hasHovered) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle   = 'rgba(255,255,255,1)';
        ctx.fillRect(barL, barTop, barW, barH);
      }
      if (hasSelected) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = this.selectedTipStrokeColor;
        ctx.lineWidth   = 1.5 * d;
        ctx.strokeRect(barL + 0.5, barTop + 0.5, barW - 1, barH - 1);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  _drawHistoAxes(ctx, rect) {
    const d     = this._dpr;
    const axisC = this._colorWithAlpha(this.axisColor, 0.55);
    const lblC  = this._colorWithAlpha(this.axisColor, 0.90);
    const fsz   = Math.max(6, Math.round(this.axisFontSize * d));
    const font  = `${fsz}px ${this.fontFamily}`;
    const tc    = Math.round(4 * d);
    // Use _niceStep for divergence X axis (better resolution than _niceYearStep)
    const xRange = this._xMax - this._xMin;
    const xStep  = _niceStep(xRange);
    const xStart = Math.ceil(this._xMin / xStep - 1e-9) * xStep;
    const xTks   = [];
    for (let v = xStart; v <= this._xMax + xStep * 0.001; v += xStep)
      xTks.push(parseFloat(v.toPrecision(10)));
    const xDp = _stepDp(xStep);
    const { ticks: yTks } = this._yTicksInfo();
    ctx.save();
    // Axis border lines
    ctx.strokeStyle = axisC;
    ctx.lineWidth   = this.axisLineWidth * d;
    ctx.beginPath();
    ctx.moveTo(rect.x, rect.y);           ctx.lineTo(rect.x, rect.y + rect.h);
    ctx.moveTo(rect.x, rect.y + rect.h);  ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
    ctx.stroke();
    // Y axis — integer counts
    ctx.font         = font;
    ctx.fillStyle    = lblC;
    ctx.textBaseline = 'middle';
    ctx.textAlign    = 'right';
    for (const v of yTks) {
      const iv = Math.round(v);
      if (Math.abs(v - iv) > 0.01) continue;
      const py = Math.round(this._yToScreen(v, rect));
      if (py < rect.y - 2 || py > rect.y + rect.h + 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = axisC;
      ctx.lineWidth   = this.axisLineWidth * d;
      ctx.moveTo(rect.x - tc, py);  ctx.lineTo(rect.x, py);
      ctx.stroke();
      ctx.fillText(String(iv), rect.x - tc - Math.round(3 * d), py);
    }
    // Y axis title
    ctx.save();
    ctx.font         = `${Math.max(6, Math.round(this.axisFontSize * 0.9 * d))}px ${this.fontFamily}`;
    ctx.fillStyle    = this._colorWithAlpha(this.axisColor, 0.90);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(Math.round(8 * d), rect.y + rect.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Count', 0, 0);
    ctx.restore();
    // X axis — divergence ticks
    const ty = rect.y + rect.h;
    ctx.font         = font;
    ctx.fillStyle    = lblC;
    ctx.textBaseline = 'top';
    ctx.textAlign    = 'center';
    for (const v of xTks) {
      const px = Math.round(this._xToScreen(v, rect));
      if (px < rect.x - 2 || px > rect.x + rect.w + 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = axisC;
      ctx.lineWidth   = this.axisLineWidth * d;
      ctx.moveTo(px, ty);  ctx.lineTo(px, ty + tc);
      ctx.stroke();
      ctx.fillText(v.toFixed(xDp), px, ty + tc + Math.round(2 * d));
    }
    // X axis title
    ctx.font         = `${Math.max(6, Math.round(this.axisFontSize * 0.9 * d))}px ${this.fontFamily}`;
    ctx.fillStyle    = this._colorWithAlpha(this.axisColor, 0.90);
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Root-to-tip divergence',
      rect.x + rect.w / 2,
      ty + tc + fsz + Math.round(6 * d));
    ctx.restore();
  }

  _drawHistoStatsBox(ctx, rect) {
    if (!this.statsBoxVisible) return;
    const n = this._points.length;
    if (n === 0) return;
    const vals = this._points.map(p => p.y).sort((a, b) => a - b);
    const mean   = vals.reduce((s, v) => s + v, 0) / n;
    const median = n % 2 === 0
      ? (vals[n / 2 - 1] + vals[n / 2]) / 2
      : vals[(n - 1) / 2];
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    const fmt = v => parseFloat(v.toPrecision(4)).toString();
    const d   = this._dpr;
    const fsz = Math.max(9, Math.round(this.fontSize * 0.9 * d));
    const lh  = Math.round(fsz * 1.6);
    const pad = Math.round(7 * d);
    const lines = [
      ['n',        String(n)],
      ['Mean',     fmt(mean)],
      ['Median',   fmt(median)],
      ['Variance', parseFloat(variance.toPrecision(4)).toString()],
      ['Std dev',  fmt(sd)],
      ['Min',      fmt(vals[0])],
      ['Max',      fmt(vals[n - 1])],
    ];
    const boxW   = Math.round(148 * d);
    const boxH   = lines.length * lh + pad;
    const br     = Math.round(4 * d);
    const margin = Math.round(6 * d);
    let bx, by;
    if (this._statsBoxDragActive && this._statsBoxDragCss) {
      bx = Math.round(this._statsBoxDragCss.x * d);
      by = Math.round(this._statsBoxDragCss.y * d);
    } else {
      const c = this.statsBoxCorner;
      bx = (c === 'tl' || c === 'bl') ? rect.x + margin : rect.x + rect.w - boxW - margin;
      by = (c === 'tl' || c === 'tr') ? rect.y + margin : rect.y + rect.h - boxH - margin;
    }
    this._lastStatsRect = { x: bx, y: by, w: boxW, h: boxH };
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle   = 'rgba(8,28,34,0.90)';
    ctx.beginPath();
    ctx.roundRect(bx, by, boxW, boxH, br);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = this._colorWithAlpha(this.axisColor, 0.22);
    ctx.lineWidth   = d;
    ctx.stroke();
    ctx.font = `${fsz}px ${this.fontFamily}`;
    for (let i = 0; i < lines.length; i++) {
      const ty = by + pad * 0.45 + i * lh + fsz * 0.55;
      ctx.fillStyle    = this._colorWithAlpha(this.axisColor, 0.50);
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(lines[i][0], bx + pad * 0.7, ty);
      ctx.fillStyle    = 'rgba(242,241,230,0.90)';
      ctx.textAlign    = 'right';
      ctx.fillText(lines[i][1], bx + boxW - pad * 0.7, ty);
    }
    ctx.restore();
  }

  // ─── Drag-select rectangle ────────────────────────────────────────────────

  _drawDragRect(ctx) {
    const s = this._dragStartPx, e = this._dragEndPx;
    if (!s || !e) return;
    const d = this._dpr;
    const x = Math.min(s.x, e.x) * d;
    const y = Math.min(s.y, e.y) * d;
    const w = Math.abs(e.x - s.x) * d;
    const h = Math.abs(e.y - s.y) * d;
    ctx.save();
    ctx.strokeStyle = 'rgba(220,200,80,0.85)';
    ctx.fillStyle   = 'rgba(220,200,80,0.10)';
    ctx.lineWidth   = d;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  // ─── Hit testing ──────────────────────────────────────────────────────────

  _findPointAt(cssX, cssY) {
    const d      = this._dpr;
    const tipR   = Math.max(this.tipRadius * d, 5 * d);
    const thresh = tipR + 3 * d;
    const px     = cssX * d;
    const py     = cssY * d;
    let best = null, bestDist = Infinity;
    for (const p of this._renderedPts) {
      const dx = p.px - px, dy = p.py - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < thresh && dist < bestDist) { best = p; bestDist = dist; }
    }
    return best ? best.id : null;
  }

  // ─── Events ───────────────────────────────────────────────────────────────

  _setupEvents() {
    const canvas = this._canvas;
    let _pendingClick = false;

    // ── Hover (canvas mousemove) ───────────────────────────────────────────
    canvas.addEventListener('mousemove', e => {
      if (this._dragActive || this._statsBoxDragActive) return;
      const bRect = canvas.getBoundingClientRect();
      const cssX  = e.clientX - bRect.left;
      const cssY  = e.clientY - bRect.top;

      // Stats box body takes cursor priority
      if (this.statsBoxVisible) {
        const d = this._dpr;
        if (this._lastStatsRect) {
          const sr = this._lastStatsRect;
          const d2 = this._dpr;
          if (cssX >= sr.x/d2 && cssX <= (sr.x+sr.w)/d2 &&
              cssY >= sr.y/d2 && cssY <= (sr.y+sr.h)/d2) {
            canvas.style.cursor = 'grab';
            if (this._hoveredTipId !== null) {
              this._hoveredTipId = null;
              this._dirty = true;
              if (this.onHoverChange) this.onHoverChange(null);
            }
            return;
          }
        }
      }

      const id = this._findPointAt(cssX, cssY);
      if (id !== this._hoveredTipId) {
        this._hoveredTipId      = id ?? null;
        canvas.style.cursor     = id ? 'pointer' : 'default';
        this._dirty = true;
        if (this.onHoverChange) this.onHoverChange(this._hoveredTipId);
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (this._hoveredTipId !== null) {
        this._hoveredTipId  = null;
        canvas.style.cursor = 'default';
        this._dirty = true;
        if (this.onHoverChange) this.onHoverChange(null);
      }
    });

    // ── Stats box drag + close; drag-select (global move/up, canvas mousedown) ──
    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      const bRect = canvas.getBoundingClientRect();
      const cssX  = e.clientX - bRect.left;
      const cssY  = e.clientY - bRect.top;

      // Stats box interaction takes priority over scatter drag-select
      if (this.statsBoxVisible && this._lastStatsRect) {
        const d = this._dpr;
        // Box body — start drag
        const sr = this._lastStatsRect;
        if (cssX >= sr.x/d && cssX <= (sr.x+sr.w)/d &&
            cssY >= sr.y/d && cssY <= (sr.y+sr.h)/d) {
          this._statsBoxDragActive = true;
          this._statsBoxDragOffset = { x: cssX - sr.x/d, y: cssY - sr.y/d };
          this._statsBoxDragCss    = { x: sr.x/d,        y: sr.y/d };
          canvas.style.cursor      = 'grabbing';
          e.preventDefault();
          return;
        }
      }

      this._cmdHeld     = e.metaKey || e.ctrlKey;
      this._dragActive  = false;
      this._dragStartPx = { x: cssX, y: cssY };
      this._dragEndPx   = { ...this._dragStartPx };
      _pendingClick     = true;
      e.preventDefault();
    });

    window.addEventListener('mousemove', e => {
      if (this._statsBoxDragActive) {
        const bRect = canvas.getBoundingClientRect();
        this._statsBoxDragCss = {
          x: e.clientX - bRect.left - this._statsBoxDragOffset.x,
          y: e.clientY - bRect.top  - this._statsBoxDragOffset.y,
        };
        this._dirty = true;
        return;
      }
      if (!this._dragStartPx) return;
      const bRect = canvas.getBoundingClientRect();
      const cx    = e.clientX - bRect.left;
      const cy    = e.clientY - bRect.top;
      const dx    = cx - this._dragStartPx.x;
      const dy    = cy - this._dragStartPx.y;
      if (!this._dragActive && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        this._dragActive = true;
        _pendingClick    = false;
      }
      if (this._dragActive) {
        this._dragEndPx = { x: cx, y: cy };
        this._dirty = true;
      }
    });

    window.addEventListener('mouseup', e => {
      if (this._statsBoxDragActive) {
        // Snap to the nearest corner of the plot area
        if (this._lastStatsRect && this._statsBoxDragCss) {
          const plotRect = this._plotRect();
          const d        = this._dpr;
          const centerX  = this._statsBoxDragCss.x + this._lastStatsRect.w / (2 * d);
          const centerY  = this._statsBoxDragCss.y + this._lastStatsRect.h / (2 * d);
          const midX     = (plotRect.x + plotRect.w / 2) / d;
          const midY     = (plotRect.y + plotRect.h / 2) / d;
          this.statsBoxCorner = (centerY < midY ? 't' : 'b') + (centerX < midX ? 'l' : 'r');
          if (this.onStatsBoxCornerChange) this.onStatsBoxCornerChange(this.statsBoxCorner);
        }
        this._statsBoxDragActive = false;
        this._statsBoxDragCss    = null;
        this._statsBoxDragOffset = null;
        canvas.style.cursor      = 'default';
        this._dirty = true;
        return;
      }
      if (!this._dragStartPx) return;
      const bRect = canvas.getBoundingClientRect();
      const cx    = e.clientX - bRect.left;
      const cy    = e.clientY - bRect.top;
      if (this._dragActive) {
        this._commitDragSelect(cx, cy);
      } else if (_pendingClick) {
        this._handleClick(cx, cy);
      }
      this._dragActive  = false;
      this._dragStartPx = null;
      this._dragEndPx   = null;
      _pendingClick = false;
      this._dirty = true;
    });
  }

  // ─── Selection helpers ────────────────────────────────────────────────────

  _handleClick(cssX, cssY) {
    const id = this._findPointAt(cssX, cssY);
    let changed = false;
    if (id) {
      if (this._cmdHeld) {
        if (this._selectedTipIds.has(id)) this._selectedTipIds.delete(id);
        else this._selectedTipIds.add(id);
      } else {
        this._selectedTipIds = new Set([id]);
      }
      changed = true;
    } else if (!this._cmdHeld) {
      if (this._selectedTipIds.size > 0) {
        this._selectedTipIds = new Set();
        changed = true;
      }
    }
    this._dirty = true;
    if (changed && this.onSelectionChange) this.onSelectionChange(new Set(this._selectedTipIds));
  }

  _commitDragSelect(endCssX, endCssY) {
    const s  = this._dragStartPx;
    const d  = this._dpr;
    const xA = Math.min(s.x, endCssX) * d;
    const xB = Math.max(s.x, endCssX) * d;
    const yA = Math.min(s.y, endCssY) * d;
    const yB = Math.max(s.y, endCssY) * d;
    const inside = new Set();
    for (const p of this._renderedPts) {
      if (p.px >= xA && p.px <= xB && p.py >= yA && p.py <= yB) inside.add(p.id);
    }
    if (this._cmdHeld) {
      for (const id of inside) {
        if (this._selectedTipIds.has(id)) this._selectedTipIds.delete(id);
        else this._selectedTipIds.add(id);
      }
    } else {
      this._selectedTipIds = inside;
    }
    this._dirty = true;
    if (this.onSelectionChange) this.onSelectionChange(new Set(this._selectedTipIds));
  }
}
