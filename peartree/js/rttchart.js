// rttchart.js — Root-to-Tip panel controller.
//
// Manages the slide-out RTT panel lifecycle (open/close/pin, resize-handle
// drag) and keeps the RTTRenderer in sync with the tree renderer's state:
//   • point data (built from renderer.nodes + the date annotation)
//   • visual style (tip size/colour/halo, selection colours, bg colour…)
//   • bidirectional selection and hover sync
//
// Called from peartree.js immediately after the TreeRenderer is created.
// ─────────────────────────────────────────────────────────────────────────────

import { RTTRenderer }      from './rttrenderer.js';
import { TreeCalibration }  from './phylograph.js';
import { computeOLS, ciHalfWidth } from '@artic-network/pearcore/regression.js';
import { downloadBlob, htmlEsc as esc } from '@artic-network/pearcore/utils.js';
import { createGraphicsExporter } from '@artic-network/pearcore/graphics-export.js';

/**
 * Create the Root-to-Tip panel controller.
 *
 * @param {Object}   opts
 * @param {HTMLElement} opts.panel          – #rtt-panel
 * @param {HTMLCanvasElement} opts.canvas   – #rtt-canvas  (inside the panel)
 * @param {Function} opts.getRenderer       – () => TreeRenderer instance
 * @param {Function} opts.getCalibration    – () => TreeCalibration instance
 * @param {Function} opts.getDateAnnotKey   – () => string (e.g. "date") or ''
 * @param {Function} opts.getDateFormat     – () => string (e.g. 'yyyy-MM-dd')
 * @param {Function} [opts.getIsTimedTree]  – () => boolean
 * @param {Function} [opts.getShowRootAge]  – () => boolean
 * @param {Function} [opts.getGridLines]    – () => 'both'|'horizontal'|'vertical'|'off'
 * @param {Function} [opts.getAspectRatio]  – () => 'fit'|'1:1'|'4:3'|'3:2'|'16:9'
 * @param {Function} [opts.onCalibrationChange] – () called after calibration is recomputed
 * @param {Function} [opts.onClose]         – () called when closed
 * @param {Function} [opts.onPinChange]     – (pinned:boolean) called on pin toggle
 * @param {Function} [opts.onStatsBoxCornerChange] – (corner:string) called when stats box is dragged to new corner
 */
export function createRTTChart({
  panel,
  canvas,
  getRenderer,
  getCalibration,
  getDateAnnotKey,
  getDateFormat,
  getAxisColor,
  getAxisFontSize,
  getAxisFontFamily,
  getAxisTypeface,
  getAxisLineWidth,
  getTickOptions,
  getStatsBoxBgColor,
  getStatsBoxTextColor,
  getStatsBoxFontSize,
  getIsTimedTree,
  getRegressionColor,
  getRegressionWidth,
  getRegressionStyle,
  getResidBandShow,
  getResidBandStyle,
  getResidBandColor,
  getResidBandWidth,
  getResidBandFillColor,
  getResidBandFillOpacity,
  getShowRootAge,
  getGridLines,
  getAspectRatio,
  onCalibrationChange,
  onClose,
  onPinChange,
  onStatsBoxCornerChange,
}) {
  const rtt = new RTTRenderer(canvas);

  let _open   = false;
  let _pinned = false;

  // ── Header buttons ─────────────────────────────────────────────────────────
  const btnPin      = panel.querySelector('#rtt-btn-pin');
  const btnClose    = panel.querySelector('#rtt-btn-close');
  const btnStats    = panel.querySelector('#rtt-btn-stats');
  const btnDownload = panel.querySelector('#rtt-btn-download');

  btnDownload?.addEventListener('click', () => _downloadCSV());

  btnStats?.addEventListener('click', () => {
    rtt.statsBoxVisible = !rtt.statsBoxVisible;
    rtt._lastStatsRect      = null;
    rtt._lastStatsCloseRect = null;
    rtt._dirty = true;
    btnStats.classList.toggle('active', rtt.statsBoxVisible);
  });
  rtt.onStatsBoxVisibleChange = (visible) => {
    btnStats?.classList.toggle('active', visible);
  };
  rtt.onStatsBoxCornerChange = (corner) => {
    if (onStatsBoxCornerChange) onStatsBoxCornerChange(corner);
  };

  function _syncPinIcon() {
    const icon = btnPin?.querySelector('i');
    if (icon) icon.className = _pinned ? 'bi bi-pin-angle-fill' : 'bi bi-pin-angle';
    if (btnPin) btnPin.title = _pinned ? 'Unpin panel' : 'Pin panel open';
  }

  btnPin.addEventListener('click', () => {
    _pinned = !_pinned;
    panel.classList.toggle('pinned', _pinned);
    btnPin.classList.toggle('active', _pinned);
    _syncPinIcon();
    if (onPinChange) onPinChange(_pinned);
    rtt._resize();
  });

  btnClose.addEventListener('click', () => {
    close();
    if (onClose) onClose();
  });

  // ── CSV download ──────────────────────────────────────────────────────────

  function _downloadCSV() {
    const pts = _buildPoints();
    const cal = getCalibration();
    const fmt = getDateFormat();
    const reg = cal?.regression;

    const header = ['name', 'date', 'date (decimal year)', 'divergence', 'regression', 'residual'];
    const rows = [header];

    for (const pt of pts) {
      const dateVal   = pt.x != null ? String(pt.x) : '';
      const dateStr   = pt.x != null
        ? (cal?.decYearToString(pt.x, 'full', fmt) ?? String(pt.x))
        : '';
      const divStr    = String(pt.y);
      let   regStr    = '';
      let   residStr  = '';
      if (reg && pt.x != null) {
        const predicted = reg.a * pt.x + reg.b;
        regStr   = String(predicted);
        residStr = String(pt.y - predicted);
      }
      rows.push([pt.name, dateStr, dateVal, divStr, regStr, residStr]);
    }

    const csvContent = rows.map(row =>
      row.map(cell => {
        const s = cell ?? '';
        return s.includes(',') || s.includes('"') || s.includes('\n')
          ? '"' + s.replace(/"/g, '""') + '"'
          : s;
      }).join(',')
    ).join('\n');

    downloadBlob(csvContent, 'text/csv', 'root-to-tip.csv');
  }

  // ── Image export (SVG & PNG) — uses generic pearcore graphics exporter ────

  const _imgExporter = createGraphicsExporter({
    overlay:         document.getElementById('rtt-image-overlay'),
    body:            document.getElementById('rtt-image-body'),
    footer:          document.getElementById('rtt-image-footer'),
    closeBtn:        document.getElementById('rtt-image-close'),
    openBtn:         panel.querySelector('#rtt-btn-image'),
    prefix:          'rtti',
    defaultFilename: 'root-to-tip',
    hasContent:      () => rtt._points.length > 0,
    getViewportDims: () => ({
      width:  rtt._canvas.clientWidth,
      height: rtt._canvas.clientHeight,
    }),
    buildSvg: ({ transparent }) => _buildRTTSVG(transparent),
    buildPngCanvas: ({ width, height, transparent }) => {
      const oc   = new OffscreenCanvas(width, height);
      const octx = oc.getContext('2d');
      if (!transparent) {
        octx.fillStyle = rtt.bgColor;
        octx.fillRect(0, 0, width, height);
      }
      octx.drawImage(rtt._canvas, 0, 0, width, height);
      return oc;
    },
  });

  /**
   * Build a vector SVG of the current RTT plot using the renderer's data.
   * Mirrors _render() in RTTRenderer but outputs SVG elements instead of canvas calls.
   * @param {boolean} transparent – omit background rect when true
   * @returns {string|null}
   */
  function _buildRTTSVG(transparent) {
    if (!rtt._points.some(p => p.x != null)) return null;

    const dpr  = rtt._dpr;
    // Fixed padding (CSS px) — same values as _plotRect() margins.
    const mL = 62, mR = 14, mT = 14, mB = 52;

    // Use the actual plot-area size from the live canvas (already aspect-ratio-corrected)
    // but build an SVG canvas that is exactly the plot area + fixed margins, so the
    // output never inherits the arbitrary current panel size.
    const pr   = rtt._plotRect();
    const plotW = pr.w / dpr;   // CSS px
    const plotH = pr.h / dpr;
    const W = Math.round(plotW + mL + mR);
    const H = Math.round(plotH + mT + mB);
    const rect = { x: mL, y: mT, w: plotW, h: plotH };

    const xMin = rtt._xMin, xMax = rtt._xMax;
    const yMin = rtt._yMin, yMax = rtt._yMax;

    const xToS = v => {
      const span = xMax - xMin;
      return span === 0 ? rect.x + rect.w / 2 : rect.x + (v - xMin) / span * rect.w;
    };
    const yToS = v => {
      const span = yMax - yMin;
      return span === 0 ? rect.y + rect.h / 2 : rect.y + rect.h - (v - yMin) / span * rect.h;
    };
    const f   = (n, dp = 3) => n.toFixed(dp);
    const stepDp = step =>
      step >= 1 ? 0 : step >= 0.1 ? 1 : step >= 0.01 ? 2 : step >= 0.001 ? 3 : 4;

    const axisC    = rtt.axisColor;
    const bg       = rtt.bgColor;
    const lw       = rtt.axisLineWidth;
    const fsz      = rtt.axisFontSize;
    const font     = rtt.fontFamily;
    const tipR     = rtt.tipRadius;
    const pts      = rtt._points.filter(p => p.x != null);
    const sel      = rtt._selectedTipIds;

    const parts = [];
    const defs  = [];

    // 1 ── Background
    if (!transparent) parts.push(`<rect width="${W}" height="${H}" fill="${esc(bg)}"/>`);

    // 2 ── Clip path for plot area
    defs.push(`<clipPath id="rp"><rect x="${f(rect.x)}" y="${f(rect.y)}" width="${f(rect.w)}" height="${f(rect.h)}"/></clipPath>`);

    // 3 ── Grid lines
    const gl = rtt.gridLines;
    if (gl !== 'off') {
      const drawH = gl === 'both' || gl === 'horizontal';
      const drawV = gl === 'both' || gl === 'vertical';
      const gridParts = [];
      if (drawH) {
        for (const v of rtt._yTicksInfo().ticks) {
          const py = yToS(v);
          if (py < rect.y - 1 || py > rect.y + rect.h + 1) continue;
          gridParts.push(`<line x1="${f(rect.x)}" y1="${f(py)}" x2="${f(rect.x + rect.w)}" y2="${f(py)}"/>`);
        }
      }
      if (drawV) {
        for (const v of rtt._xTicksInfo(pr).majorTicks) {
          const px = xToS(v);
          if (px < rect.x - 1 || px > rect.x + rect.w + 1) continue;
          gridParts.push(`<line x1="${f(px)}" y1="${f(rect.y)}" x2="${f(px)}" y2="${f(rect.y + rect.h)}"/>`);
        }
      }
      if (gridParts.length > 0)
        parts.push(`<g stroke="rgba(255,255,255,0.055)" stroke-width="${lw}" fill="none">${gridParts.join('')}</g>`);
    }

    // 4 ── Axis border lines (left + bottom)
    parts.push(
      `<g stroke="${esc(axisC)}" stroke-opacity="0.6" stroke-width="${lw}" fill="none">` +
      `<line x1="${f(rect.x)}" y1="${f(rect.y)}" x2="${f(rect.x)}" y2="${f(rect.y + rect.h)}"/>` +
      `<line x1="${f(rect.x)}" y1="${f(rect.y + rect.h)}" x2="${f(rect.x + rect.w)}" y2="${f(rect.y + rect.h)}"/>` +
      `</g>`);

    // 5 ── Y axis ticks + labels
    const { ticks: yTks, step: yStep } = rtt._yTicksInfo();
    const dp  = stepDp(yStep);
    const tc  = 4;   // tick length in CSS px
    const yTickLines = [], yTickLabels = [];
    for (const v of yTks) {
      const py = yToS(v);
      if (py < rect.y - 2 || py > rect.y + rect.h + 2) continue;
      yTickLines.push(`<line x1="${f(rect.x - tc)}" y1="${f(py)}" x2="${f(rect.x)}" y2="${f(py)}"/>`);
      yTickLabels.push(
        `<text x="${f(rect.x - tc - 3)}" y="${f(py)}" text-anchor="end" dominant-baseline="middle">${esc(v.toFixed(dp))}</text>`);
    }
    if (yTickLines.length > 0)
      parts.push(`<g stroke="${esc(axisC)}" stroke-opacity="0.55" stroke-width="${lw}" fill="none">${yTickLines.join('')}</g>`);
    if (yTickLabels.length > 0)
      parts.push(`<g font-family="${esc(font)}" font-size="${fsz}" fill="${esc(axisC)}" fill-opacity="0.90">${yTickLabels.join('')}</g>`);

    // Y axis title (rotated, left of plot)
    const ytCx = f(rect.y + rect.h / 2), ytCy = f(8);
    parts.push(
      `<text transform="rotate(-90) translate(${f(-(rect.y + rect.h / 2))},${f(8)})"` +
      ` text-anchor="middle" dominant-baseline="middle"` +
      ` font-family="${esc(font)}" font-size="${f(fsz * 0.9, 1)}"` +
      ` fill="${esc(axisC)}" fill-opacity="0.90">Root-to-tip divergence</text>`);

    // 6 ── X axis ticks + labels
    const cal  = rtt._calibration;
    const fmt  = rtt._dateFormat;
    const opts = rtt.tickOptions ?? {};
    const ty   = rect.y + rect.h;
    const { majorTicks: xMajor, minorTicks: xMinor, step: xStep, majorInterval } = rtt._xTicksInfo(pr);
    const majorLabelFmt = opts.majorLabelFormat || 'auto';
    const minorLabelFmt = opts.minorLabelFormat || 'off';

    // Minor ticks
    if (xMinor && xMinor.length > 0) {
      const minorLines = [], minorLabels = [];
      const effMinorInterval = (opts.minorInterval === 'auto' || !opts.minorInterval)
        ? TreeCalibration.inferMajorInterval(xMinor)
        : opts.minorInterval;
      for (const v of xMinor) {
        const px = xToS(v);
        if (px < rect.x - 2 || px > rect.x + rect.w + 2) continue;
        minorLines.push(`<line x1="${f(px)}" y1="${f(ty)}" x2="${f(px)}" y2="${f(ty + 3)}"/>`);
        if (minorLabelFmt !== 'off' && cal) {
          const label = cal.decYearToString(v, minorLabelFmt, fmt, effMinorInterval);
          minorLabels.push(`<text x="${f(px)}" y="${f(ty + 5)}" text-anchor="middle" dominant-baseline="hanging">${esc(label)}</text>`);
        }
      }
      if (minorLines.length > 0)
        parts.push(`<g stroke="${esc(axisC)}" stroke-opacity="0.55" stroke-width="${lw}" fill="none">${minorLines.join('')}</g>`);
      if (minorLabels.length > 0)
        parts.push(`<g font-family="${esc(font)}" font-size="${f(fsz * 0.85, 1)}" fill="${esc(axisC)}" fill-opacity="0.50">${minorLabels.join('')}</g>`);
    }

    // Major ticks + labels
    const majLines = [], majLabels = [];
    for (const v of xMajor) {
      const px = xToS(v);
      if (px < rect.x - 2 || px > rect.x + rect.w + 2) continue;
      majLines.push(`<line x1="${f(px)}" y1="${f(ty)}" x2="${f(px)}" y2="${f(ty + 5)}"/>`);
      if (majorLabelFmt !== 'off') {
        const label = cal
          ? cal.decYearToString(v, majorLabelFmt === 'auto' ? 'partial' : majorLabelFmt, fmt, majorInterval)
          : v.toFixed(stepDp(xStep));
        majLabels.push(`<text x="${f(px)}" y="${f(ty + 7)}" text-anchor="middle" dominant-baseline="hanging">${esc(label)}</text>`);
      }
    }
    if (majLines.length > 0)
      parts.push(`<g stroke="${esc(axisC)}" stroke-opacity="0.55" stroke-width="${lw}" fill="none">${majLines.join('')}</g>`);
    if (majLabels.length > 0)
      parts.push(`<g font-family="${esc(font)}" font-size="${fsz}" fill="${esc(axisC)}" fill-opacity="0.90">${majLabels.join('')}</g>`);

    // 7 ── Residual band + regression line (clipped to plot area)
    const reg = rtt._calibration?.regression;
    if (reg) {
      // ── Band (±2σ residual or 95% CI) ──
      const bandMode = rtt.residBandShow === 'on' ? 'residual' : rtt.residBandShow;
      if (bandMode && bandMode !== 'off') {
        const bandLineColor = rtt.residBandColor || rtt.regressionColor || axisC;
        const bandFillColor = rtt.residBandFillColor || bandLineColor;
        const fillOp  = parseFloat(rtt.residBandFillOpacity) || 0;
        const bandDash = rtt.residBandStyle === 'solid' ? '' : rtt.residBandStyle === 'bigdash' ? '12 5' : '6 4';
        const dashAttr = bandDash ? ` stroke-dasharray="${bandDash}"` : '';

        if (bandMode === 'residual' && reg.rmse > 0) {
          // Straight parallel lines at ±2·rmse
          const rmse = reg.rmse;
          const bx1 = xToS(xMin), bx2 = xToS(xMax);
          const byHi1 = yToS(reg.a * xMin + reg.b + 2 * rmse);
          const byHi2 = yToS(reg.a * xMax + reg.b + 2 * rmse);
          const byLo1 = yToS(reg.a * xMin + reg.b - 2 * rmse);
          const byLo2 = yToS(reg.a * xMax + reg.b - 2 * rmse);
          if (fillOp > 0) {
            parts.push(
              `<g clip-path="url(#rp)">` +
              `<polygon points="${f(bx1)},${f(byHi1)} ${f(bx2)},${f(byHi2)} ${f(bx2)},${f(byLo2)} ${f(bx1)},${f(byLo1)}"` +
              ` fill="${esc(bandFillColor)}" fill-opacity="${f(fillOp)}" stroke="none"/>` +
              `</g>`);
          }
          if (rtt.residBandWidth > 0)
            parts.push(
              `<g clip-path="url(#rp)" stroke="${esc(bandLineColor)}" stroke-width="${rtt.residBandWidth}" fill="none"${dashAttr}>` +
              `<line x1="${f(bx1)}" y1="${f(byHi1)}" x2="${f(bx2)}" y2="${f(byHi2)}"/>` +
              `<line x1="${f(bx1)}" y1="${f(byLo1)}" x2="${f(bx2)}" y2="${f(byLo2)}"/>` +
              `</g>`);

        } else if (bandMode === 'ci' && reg.rms != null && reg.ssxx > 0 && reg.n >= 3) {
          // Curved CI envelope — sample along x axis
          const N = 60;
          const dx = (xMax - xMin) / N;
          const upperPts = [], lowerPts = [];
          for (let i = 0; i <= N; i++) {
            const xv  = xMin + i * dx;
            const hw  = ciHalfWidth(xv, reg);
            const mid = reg.a * xv + reg.b;
            upperPts.push(`${f(xToS(xv))},${f(yToS(mid + hw))}`);
            lowerPts.push(`${f(xToS(xv))},${f(yToS(mid - hw))}`);
          }
          if (fillOp > 0) {
            const allPts = upperPts.concat([...lowerPts].reverse()).join(' ');
            parts.push(
              `<g clip-path="url(#rp)">` +
              `<polygon points="${allPts}" fill="${esc(bandFillColor)}" fill-opacity="${f(fillOp)}" stroke="none"/>` +
              `</g>`);
          }
          if (rtt.residBandWidth > 0)
            parts.push(
              `<g clip-path="url(#rp)" stroke="${esc(bandLineColor)}" stroke-width="${rtt.residBandWidth}" fill="none"${dashAttr}>` +
              `<polyline points="${upperPts.join(' ')}"/>` +
              `<polyline points="${lowerPts.join(' ')}"/>` +
              `</g>`);
        }
      }
      // ── Regression line ──
      const rx1 = xToS(xMin), ry1 = yToS(reg.a * xMin + reg.b);
      const rx2 = xToS(xMax), ry2 = yToS(reg.a * xMax + reg.b);
      parts.push(
        `<g clip-path="url(#rp)">` +
        `<line x1="${f(rx1)}" y1="${f(ry1)}" x2="${f(rx2)}" y2="${f(ry2)}"` +
        ` stroke="${esc(axisC)}" stroke-opacity="0.55" stroke-width="1.5"` +
        ` stroke-dasharray="6 4" fill="none"/>` +
        `</g>`);
    }

    // 8 ── Scatter points + selection indicators (clipped)
    const selCircles = [], dotCircles = [];
    for (const p of pts) {
      const px = xToS(p.x), py = yToS(p.y);
      if (sel.has(p.id)) {
        const mr = Math.max(tipR * rtt.selectedTipGrowthFactor, rtt.selectedTipMinSize);
        selCircles.push(
          `<circle cx="${f(px)}" cy="${f(py)}" r="${mr}"` +
          ` stroke="${esc(rtt.selectedTipStrokeColor)}" stroke-width="${rtt.selectedTipStrokeWidth}"` +
          ` fill="${esc(rtt.selectedTipFillColor)}" fill-opacity="${rtt.selectedTipFillOpacity}"` +
          ` stroke-opacity="${rtt.selectedTipStrokeOpacity}"/>`);
      }
      dotCircles.push(`<circle cx="${f(px)}" cy="${f(py)}" r="${tipR}" fill="${esc(p.colour ?? rtt.tipShapeColor)}"/>`);
    }
    if (selCircles.length + dotCircles.length > 0)
      parts.push(`<g clip-path="url(#rp)">${selCircles.join('')}${dotCircles.join('')}</g>`);

    // 9 ── Stats box (positioned over the plot area, not clipped)
    if (reg && rtt.statsBoxVisible) {
      const lines = [
        ['n',            String(reg.n)],
        ['Slope',        `${reg.a.toExponential(3)} /yr`],
      ];
      if (reg.xInt != null) {
        const rootLbl = cal ? cal.decYearToString(reg.xInt, 'full', fmt) : reg.xInt.toFixed(3);
        lines.push(['Root date', rootLbl]);
      }
      lines.push(['R²',           reg.r2.toFixed(4)]);
      lines.push(['Res. mean sq.', reg.rms != null ? reg.rms.toExponential(3) : '—']);
      lines.push(['CV',           reg.cv.toFixed(4)]);

      const boxFsz = rtt.statsBoxFontSize * 0.9;
      const lh     = boxFsz * 1.6;
      const pad    = 7;
      const boxW   = Math.round(148 * (rtt.statsBoxFontSize / 11));
      const boxH   = lines.length * lh + pad;
      const margin = 6;
      const br     = 4;
      const c      = rtt.statsBoxCorner;
      const bx = (c === 'tl' || c === 'bl') ? rect.x + margin : rect.x + rect.w - boxW - margin;
      const by = (c === 'tl' || c === 'tr') ? rect.y + margin : rect.y + rect.h - boxH - margin;

      const statsRows = lines.map((row, i) => {
        const ty2 = by + pad * 0.45 + i * lh + boxFsz * 0.55;
        return (
          `<text x="${f(bx + pad * 0.7)}" y="${f(ty2)}" dominant-baseline="middle" fill-opacity="0.5">${esc(row[0])}</text>` +
          `<text x="${f(bx + boxW - pad * 0.7)}" y="${f(ty2)}" text-anchor="end" dominant-baseline="middle" fill="rgba(242,241,230,0.90)">${esc(row[1])}</text>`
        );
      });

      parts.push(
        `<rect x="${f(bx)}" y="${f(by)}" width="${f(boxW)}" height="${f(boxH)}" rx="${br}" ry="${br}"` +
        ` fill="rgba(8,28,34,0.90)" fill-opacity="0.82" stroke="${esc(axisC)}" stroke-opacity="0.22"/>` +
        `<g font-family="${esc(font)}" font-size="${f(boxFsz, 1)}" fill="${esc(axisC)}">${statsRows.join('')}</g>`);
    }

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
      `<defs>${defs.join('')}</defs>`,
      parts.join(''),
      `</svg>`,
    ].join('\n');
  }

  // ── Resize-handle drag ─────────────────────────────────────────────────────
  const handle = panel.querySelector('#rtt-resize-handle');

  // Ghost line element — created once, appended to body.
  const ghost = document.createElement('div');
  ghost.id = 'rtt-resize-ghost';
  document.body.appendChild(ghost);

  let _drg = false, _drgX0 = 0, _drgW0 = 0;

  if (handle) {
    handle.addEventListener('mousedown', e => {
      _drg   = true;
      _drgX0 = e.clientX;
      _drgW0 = panel.offsetWidth;
      // Show ghost at the handle's current position.
      ghost.style.left    = `${e.clientX}px`;
      ghost.style.display = 'block';
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });
  }

  window.addEventListener('mousemove', e => {
    if (!_drg) return;
    const delta = _drgX0 - e.clientX;
    const newW  = Math.max(200, Math.min(900, _drgW0 + delta));
    // Position the ghost at what will become the panel's left edge.
    const panelRight = panel.getBoundingClientRect().right;
    ghost.style.left = `${panelRight - newW}px`;
  });

  window.addEventListener('mouseup', e => {
    if (!_drg) return;
    _drg = false;
    ghost.style.display = 'none';
    document.body.style.cursor = '';
    // Commit the resize now that the drag is done.
    const delta = _drgX0 - e.clientX;
    const newW  = Math.max(200, Math.min(900, _drgW0 + delta));
    // Suppress the CSS flex-basis transition so the layout snaps to the final
    // width immediately. Without this, canvas.clientWidth returns the old
    // (still-animating) size and the bitmap ends up CSS-stretched.
    panel.style.transition = 'none';
    panel.style.width = `${newW}px`;
    document.documentElement.style.setProperty('--rtt-panel-w', `${newW}px`);
    // Force a synchronous layout reflow so canvas.clientWidth reflects newW.
    void panel.offsetWidth;
    rtt._resize();
    getRenderer()?._resize?.();
    // Re-enable the transition on the next frame so future open/close animations work.
    requestAnimationFrame(() => { panel.style.transition = ''; });
  });

  // ── Bidirectional selection sync ───────────────────────────────────────────

  /** RTT selection → tree renderer */
  rtt.onSelectionChange = ids => {
    const tr = getRenderer();
    if (!tr) return;
    tr._selectedTipIds = new Set(ids);
    tr._updateMRCA?.();
    tr._notifyStats?.();
    if (tr._onNodeSelectChange) tr._onNodeSelectChange(ids.size > 0);
    tr._dirty = true;
  };

  /** RTT hover → tree renderer */
  rtt.onHoverChange = id => {
    const tr = getRenderer();
    if (!tr) return;
    tr._hoveredNodeId = id;
    tr._dirty = true;
  };

  // ── Data builders ──────────────────────────────────────────────────────────

  function _buildPoints() {
    const tr  = getRenderer();
    const cal = getCalibration();
    const key = getDateAnnotKey();
    if (!tr || !tr.nodes) return [];

    const colourKey = tr._tipColourBy;

    function _tipPoint(tip) {
      // tip can be a regular layout node or a collapsedTipNames entry {id,name,annotations,x}
      let x = null;
      if (key) {
        const raw = tr._statValue(tip, key);
        if (raw != null) x = TreeCalibration.parseDateToDecYear(String(raw));
      }
      let colour = null;
      if (colourKey) {
        const val = tr._statValue(tip, colourKey);
        if (colourKey === 'user_colour') {
          colour = val ?? null;
        } else {
          colour = tr._tipColourForValue(val) ?? null;
        }
      }
      return { id: tip.id, x, y: tip.x, name: tip.name ?? tip.id, colour };
    }

    const pts = [];
    for (const node of tr.nodes) {
      if (!node.isTip) continue;
      if (node.isCollapsed) {
        // Collapsed clades: include each individual tip as its own RTT point.
        if (node.collapsedTipNames) {
          for (const tip of node.collapsedTipNames) pts.push(_tipPoint(tip));
        }
        continue;
      }
      pts.push(_tipPoint(node));
    }
    return pts;
  }

  function _syncStyle() {
    const tr = getRenderer();
    if (!tr) return;
    Object.assign(rtt, {
      // Tip shape
      tipRadius:             tr.tipRadius,
      tipShapeColor:         tr.tipShapeColor,
      tipHaloSize:           tr.tipHaloSize,
      tipShapeBgColor:       tr.tipShapeBgColor,
      // Canvas background & text
      bgColor:               tr.bgColor,
      fontSize:              tr.fontSize,
      // Selection indicators
      selectedTipStrokeColor:   tr.selectedTipStrokeColor,
      selectedTipFillColor:     tr.selectedTipFillColor,
      selectedTipGrowthFactor:  tr.selectedTipGrowthFactor,
      selectedTipMinSize:       tr.selectedTipMinSize,
      selectedTipStrokeWidth:   tr.selectedTipStrokeWidth,
      selectedTipStrokeOpacity: tr.selectedTipStrokeOpacity,
      selectedTipFillOpacity:   tr.selectedTipFillOpacity,
      // Hover indicators
      tipHoverStrokeColor:      tr.tipHoverStrokeColor,
      tipHoverFillColor:        tr.tipHoverFillColor,
      tipHoverGrowthFactor:     tr.tipHoverGrowthFactor,
      tipHoverMinSize:          tr.tipHoverMinSize,
      tipHoverStrokeWidth:      tr.tipHoverStrokeWidth,
      tipHoverStrokeOpacity:    tr.tipHoverStrokeOpacity,
      tipHoverFillOpacity:      tr.tipHoverFillOpacity,
      // Axis style (from the Axis section in the palette panel)
      axisColor:    getAxisColor?.()    ?? rtt.axisColor,
      axisFontSize: getAxisFontSize?.() ?? rtt.axisFontSize,
      fontFamily:   getAxisFontFamily?.() ?? rtt.fontFamily,
      axisLineWidth: getAxisLineWidth?.() ?? rtt.axisLineWidth,
      // Stats box colours (from the RTT advanced palette section)
      statsBoxBgColor:   getStatsBoxBgColor?.()   ?? rtt.statsBoxBgColor,
      statsBoxTextColor:  getStatsBoxTextColor?.()  ?? rtt.statsBoxTextColor,
      statsBoxFontSize:   getStatsBoxFontSize?.()   ?? rtt.statsBoxFontSize,
      // Regression line style
      regressionColor: getRegressionColor?.() ?? rtt.regressionColor,
      regressionWidth: getRegressionWidth?.() ?? rtt.regressionWidth,
      regressionStyle: getRegressionStyle?.() ?? rtt.regressionStyle,
      residBandShow:        getResidBandShow?.()        ?? rtt.residBandShow,
      residBandStyle:       getResidBandStyle?.()       ?? rtt.residBandStyle,
      residBandColor:       getResidBandColor?.()       ?? rtt.residBandColor,
      residBandWidth:       getResidBandWidth?.()       ?? rtt.residBandWidth,
      residBandFillColor:   getResidBandFillColor?.()   ?? rtt.residBandFillColor,
      residBandFillOpacity: getResidBandFillOpacity?.() ?? rtt.residBandFillOpacity,
    });
    if (getAxisTypeface) {
      const { key, style } = getAxisTypeface();
      rtt.setTypeface(key, style);
    }
    rtt.showRootAge   = getShowRootAge?.()  ?? false;
    rtt.gridLines     = getGridLines?.()    ?? 'both';
    rtt.aspectRatio   = getAspectRatio?.()  ?? 'fit';
  }

  function _recomputeCalibration() {
    const tr  = getRenderer();
    const cal = getCalibration();
    const key = getDateAnnotKey();
    if (!tr || !tr.nodes || !cal) return;
    const pts = _buildPoints();
    let minTipH = Infinity;
    for (const node of tr.nodes) {
      if (!node.isTip) continue;
      if (node.isCollapsed) {
        if (node.collapsedTipNames) {
          for (const tip of node.collapsedTipNames) {
            const h = tr.maxX - tip.x;
            if (h < minTipH) minTipH = h;
          }
        }
      } else {
        const h = tr.maxX - node.x;
        if (h < minTipH) minTipH = h;
      }
    }
    if (!isFinite(minTipH)) minTipH = 0;
    const reg = computeOLS(pts);
    if (getIsTimedTree?.()) {
      cal.setAnchor(key, tr.nodeMap, tr.maxX);
      cal.setRegression(reg);
    } else {
      cal.applyRegression(reg, tr.maxX, minTipH);
    }
    onCalibrationChange?.();
  }

  function _pushToRenderer() {
    if (!_open) return;
    const tr  = getRenderer();
    const cal = getCalibration();
    if (!tr) return;
    _syncStyle();
    if (getTickOptions) rtt.tickOptions = getTickOptions();
    rtt.setCalibration(cal?.isActive ? cal : null, getDateFormat());
    rtt.setPoints(_buildPoints());
    rtt._selectedTipIds = new Set(tr._selectedTipIds);
    rtt._hoveredTipId   = tr._hoveredNodeId;
    rtt._dirty = true;
  }

  function _update() {
    _recomputeCalibration();
    _pushToRenderer();
  }

  // ── Open / Close ───────────────────────────────────────────────────────────

  function open() {
    _open = true;
    panel.classList.add('open');
    if (_pinned) {
      panel.classList.add('pinned');
      btnPin.classList.add('active');
      _syncPinIcon();
      if (onPinChange) onPinChange(true);
    }
    // Resize + populate on the next frame (panel may not have laid out yet)
    requestAnimationFrame(() => {
      rtt._resize();
      _update();
    });
  }

  function close() {
    _open = false;
    panel.classList.remove('open');
    // Preserve _pinned so reopening the panel restores the pinned layout.
    if (_pinned) {
      panel.classList.remove('pinned');
      btnPin.classList.remove('active');
      _syncPinIcon();
      if (onPinChange) onPinChange(false);
    }
  }

  // ── Public interface ───────────────────────────────────────────────────────
  return {
    open,
    close,
    isOpen:   () => _open,
    isPinned: () => _pinned,

    /** Programmatically set the pin state (e.g. to restore from saved settings). */
    setPin(pinned) {
      _pinned = !!pinned;
      btnPin.classList.toggle('active', _pinned);
      _syncPinIcon();
      // Only update the DOM layout if the panel is currently open.
      if (_open) {
        panel.classList.toggle('pinned', _pinned);
        if (onPinChange) onPinChange(_pinned);
        rtt._resize();
      }
    },

    /**
     * Close the panel on tree load — hides it visually but preserves the pin
     * preference so re-opening restores the pinned layout.
     */
    closeForLoad() {
      if (!_open) return;
      _open = false;
      panel.classList.remove('open');
      // Remove pinned layout from the DOM without clearing the _pinned flag,
      // so the next open() call will restore the pinned state.
      if (_pinned) {
        panel.classList.remove('pinned');
        if (onPinChange) onPinChange(false);
      }
    },

    /** Get/set the stats box corner ('tl'|'tr'|'bl'|'br'). */
    getStatsBoxCorner: () => rtt.statsBoxCorner,
    setStatsBoxCorner(corner) {
      if (corner) { rtt.statsBoxCorner = corner; rtt._dirty = true; }
    },

    /** Resize the canvas (call during window resize or panel-pin transitions). */
    resize() { rtt._resize(); },

    /** Call when the visible tip set or tree layout changes. */
    notifyLayoutChange() { _update(); },

    /** Call when the tree renderer's style changes (theme, colours, etc.). */
    notifyStyleChange() {
      if (!_open) return;
      _syncStyle();
      const cal = getCalibration();
      rtt.setCalibration(cal?.isActive ? cal : null, getDateFormat());
      // Re-build points so colours (from colour-by scale) update too.
      rtt.setPoints(_buildPoints());
      rtt._dirty = true;
    },

    /** Call when the tree's selection changes externally (e.g. canvas click). */
    notifySelectionChange() {
      if (!_open) return;
      const tr = getRenderer();
      if (tr) rtt.setSelectedIds(tr._selectedTipIds);
    },

    /** Call when the tree's hover changes externally (tree canvas mousemove). */
    notifyHoverChange(id) {
      if (_open) rtt.setHoveredId(id);
    },

    /** Call when calibration or the date annotation key changes. */
    notifyCalibrationChange() { _update(); },

    /** Recompute OLS calibration and fire onCalibrationChange; also updates renderer if open. */
    recomputeCalibration() { _update(); },

    /** Override the image-save action for the current platform (e.g. Tauri native dialog). */
    setImageSaveHandler: _imgExporter.setSaveHandler,
  };
}
