// graphicsexport.js — PNG and SVG export logic for the composite tree view.
// Extracted from peartree.js to keep the app controller focused.
// ─────────────────────────────────────────────────────────────────────────────

import { AxisRenderer } from './axisrenderer.js';
import { isNumericType } from './phylograph.js';
import { getSequentialPalette,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR, buildCategoricalColourMap } from './palettes.js';

/** @private HTML/SVG attribute–safe string escaper. */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** @private SVG text-content escaper (no quot needed here). */
function svgTextEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Return CSS-pixel dimensions of the full composite viewport.
 *
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {HTMLCanvasElement} ctx.axisCanvas
 * @param {HTMLCanvasElement} ctx.legendLeftCanvas
 * @param {HTMLCanvasElement} ctx.legendRightCanvas
 */
export function viewportDims({ canvas, axisCanvas, legendLeftCanvas, legendRightCanvas }) {
  const llVisible = legendLeftCanvas.style.display !== 'none';
  const lrVisible = legendRightCanvas.style.display !== 'none';
  const axVisible = axisCanvas.style.display        !== 'none';
  const llW = llVisible ? legendLeftCanvas.clientWidth  : 0;
  const lrW = lrVisible ? legendRightCanvas.clientWidth : 0;
  const ttW = canvas.clientWidth;
  const ttH = canvas.clientHeight;
  const axH = axVisible ? axisCanvas.clientHeight : 0;
  return { totalW: llW + ttW + lrW, totalH: ttH + axH,
           llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible };
}

/**
 * Composite all visible canvases onto an OffscreenCanvas at the given pixel size.
 *
 * @param {Object} ctx  – { renderer, canvas, axisCanvas, legendLeftCanvas, legendRightCanvas, axisRenderer }
 * @param {number} targetW
 * @param {number} targetH
 * @param {boolean} [fullTree=false]
 * @param {boolean} [transparent=false]
 * @returns {OffscreenCanvas}
 */
export function compositeViewPng(ctx, targetW, targetH, fullTree = false, transparent = false) {
  const { renderer, canvas, axisCanvas, legendLeftCanvas, legendRightCanvas } = ctx;
  const { totalW, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = viewportDims(ctx);
  // Full tree: panel height is determined by current scaleY over all tips.
  const ttH_eff    = fullTree
    ? (renderer.paddingTop + renderer.paddingBottom + (renderer.maxY + 1) * renderer.scaleY)
    : ttH;
  const totalH_eff = ttH_eff + (axVisible ? axH : 0);
  const sx = targetW / totalW;
  const sy = targetH / totalH_eff;
  const oc  = new OffscreenCanvas(targetW, targetH);
  const oCtx = oc.getContext('2d');

  if (!transparent) {
    oCtx.fillStyle = renderer.bgColor;
    oCtx.fillRect(0, 0, targetW, targetH);
  }

  if (llVisible) {
    if (transparent) {
      // Re-render legend without background fill.
      renderer._skipBg = true;
      renderer._drawLegend();
      renderer._skipBg = false;
    }
    oCtx.drawImage(legendLeftCanvas, 0, 0,
      Math.round(llW * sx), Math.round(ttH_eff * sy));
    if (transparent) {
      // Restore legend with background for the live view.
      renderer._drawLegend();
    }
  }
  if (fullTree) {
    // Re-render tree panel at current scaleY with full unclipped height.
    const treeW = Math.round(ttW * sx);
    const treeH = Math.round(ttH_eff * sy);
    const toc = new OffscreenCanvas(treeW, treeH);
    renderer.renderFull(toc, treeW, treeH, transparent);
    oCtx.drawImage(toc, Math.round(llW * sx), 0);
  } else if (transparent) {
    // Re-render current viewport at screen dimensions without background,
    // then let drawImage scale it to the export target (same as the normal
    // path does with the live canvas, but without the pre-painted background).
    const toc = new OffscreenCanvas(Math.round(ttW), Math.round(ttH_eff));
    renderer.renderViewToOffscreen(toc, true);
    oCtx.drawImage(toc,
      Math.round(llW * sx), 0,
      Math.round(ttW * sx), Math.round(ttH_eff * sy));
  } else {
    oCtx.drawImage(canvas,
      Math.round(llW * sx), 0,
      Math.round(ttW * sx), Math.round(ttH_eff * sy));
  }
  if (axVisible) {
    oCtx.drawImage(axisCanvas,
      Math.round(llW * sx), Math.round(ttH_eff * sy),
      Math.round(ttW * sx), Math.round(axH * sy));
  }
  if (lrVisible) {
    if (transparent) {
      renderer._skipBg = true;
      renderer._drawLegend();
      renderer._skipBg = false;
    }
    oCtx.drawImage(legendRightCanvas,
      Math.round((llW + ttW) * sx), 0,
      Math.round(lrW * sx), Math.round(ttH_eff * sy));
    if (transparent) {
      renderer._drawLegend();
    }
  }
  return oc;
}

/**
 * Build a fully-vector composite SVG: three panels arranged as on screen —
 *   legend (left) | tree | legend (right)   [with axis below the tree panel]
 *
 * No raster embeds — axis ticks and legend entries are SVG elements.
 *
 * @param {Object} ctx  – { renderer, canvas, axisCanvas, legendLeftCanvas, legendRightCanvas, axisRenderer }
 * @param {boolean} [fullTree=false]
 * @param {boolean} [transparent=false]
 * @returns {string|null}
 */
export function buildGraphicSVG(ctx, fullTree = false, transparent = false) {
  const { renderer, axisRenderer } = ctx;
  const nm = renderer.nodeMap;
  if (!nm || !nm.size) return null;

  const { totalW, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = viewportDims(ctx);
  const sx  = renderer.scaleX,  ox = renderer.offsetX;
  // Full tree: keep current scaleY so zoom level is preserved; shift oy so root sits at top.
  const sy  = renderer.scaleY;
  const oy  = fullTree ? renderer.paddingTop + renderer.scaleY * 0.5 : renderer.offsetY;
  // Effective tree-panel height and total SVG height.
  const ttH_eff    = fullTree
    ? Math.round(renderer.paddingTop + renderer.paddingBottom + (renderer.maxY + 1) * renderer.scaleY)
    : ttH;
  const totalH_eff = ttH_eff + (axVisible ? axH : 0);
  const bg  = renderer.bgColor;
  const bc  = renderer.branchColor;
  const bw  = Math.max(0.5, renderer.branchWidth);
  const lc  = renderer.labelColor;
  const fs  = renderer.fontSize;
  const tr  = renderer.tipRadius;
  const nr  = renderer.nodeRadius;

  const toSX = wx => wx * sx + ox + llW;
  const toSY = wy => wy * sy + oy;
  const f    = n  => n.toFixed(2);
  // When drawing full tree all nodes are in range; use Infinity to skip y-culling.
  const MARGIN = fullTree ? Infinity : 20;

  // ── defs: clip paths, gradients ──────────────────────────────────────
  const defs = [];
  // Clip for the main tree area (excludes legend panels)
  defs.push(`<clipPath id="tc"><rect x="${llW}" y="0" width="${ttW}" height="${ttH_eff}"/></clipPath>`);

  // ── Background panels ─────────────────────────────────────────────────
  const bgParts = [];
  if (!transparent) {
    bgParts.push(`<rect width="${totalW}" height="${totalH_eff}" fill="${esc(bg)}"/>`);
  }

  // ── Legend panels (vector) ────────────────────────────────────────────
  const legendParts = [];
  const legendPos = renderer._legendPosition;
  const legendKey = renderer._legendAnnotation;
  if (legendPos && legendKey && renderer._annotationSchema) {
    const def = renderer._annotationSchema.get(legendKey);
    if (def) {
      const lx = legendPos === 'left' ? 0 : llW + ttW;
      const lw = legendPos === 'left' ? llW : lrW;
      const PAD = 12;
      let   ly  = PAD;

      // Title
      legendParts.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" font-weight="700" fill="#b58900">${svgTextEsc(legendKey)}</text>`);
      ly += fs + 10;

      if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
        const paletteName = renderer._annotationPaletteOverrides?.get(legendKey);
        const colourMap  = buildCategoricalColourMap(def.values || [], paletteName);
        const SWATCH  = 12;
        const ROW_H   = Math.max(SWATCH + 4, fs + 4);
        (def.values || []).forEach((val) => {
          if (ly + SWATCH > ttH_eff - PAD) return;
          const colour = colourMap.get(val) ?? MISSING_DATA_COLOUR;
          legendParts.push(`<rect x="${lx + PAD}" y="${ly}" width="${SWATCH}" height="${SWATCH}" fill="${esc(colour)}"/>`);
          legendParts.push(`<text x="${lx + PAD + SWATCH + 6}" y="${ly + SWATCH / 2}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${svgTextEsc(String(val))}</text>`);
          ly += ROW_H;
        });
      } else if (isNumericType(def.dataType)) {
        const BAR_W   = lw - PAD * 2;
        const BAR_H   = 14;
        const gid     = 'lgrd';
        const seqStops = getSequentialPalette(renderer._annotationPaletteOverrides?.get(legendKey));
        const ns = seqStops.length;
        const stopMarkup = seqStops.map((c, i) =>
          `<stop offset="${(ns === 1 ? 0 : i / (ns - 1) * 100).toFixed(1)}%" stop-color="${esc(c)}"/>`
        ).join('');
        defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="0">${stopMarkup}</linearGradient>`);
        legendParts.push(`<rect x="${lx + PAD}" y="${ly}" width="${BAR_W}" height="${BAR_H}" fill="url(#${gid})"/>`);
        ly += BAR_H + 4;
        const min = def.min ?? 0, max = def.max ?? 1;
        legendParts.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${svgTextEsc(String(min))}</text>`);
        legendParts.push(`<text x="${lx + PAD + BAR_W}" y="${ly}" text-anchor="end" dominant-baseline="hanging" font-family="monospace" font-size="${fs}px" fill="#F7EECA">${svgTextEsc(String(max))}</text>`);
      }
    }
  }

  // ── Tree branches ─────────────────────────────────────────────────────
  const branchParts = [];
  const bgNodeParts = [];  // background halo circles for node shapes
  const bgTipParts  = [];  // background halo circles for tip shapes
  const fgNodeParts = [];  // foreground fill circles for node shapes
  const fgTipParts  = [];  // foreground fill circles for tip shapes
  const labelParts  = [];
  // Stroke width for the bg halo: uses renderer.tipHaloSize directly
  const tipHaloSW  = renderer.tipHaloSize * 2;
  const nodeHaloSW = renderer.nodeHaloSize * 2;
  const tipBgColor  = renderer.tipShapeBgColor || bg;
  const nodeBgColor = renderer.nodeShapeBgColor || bg;

  const rootNode = [...nm.values()].find(n => n.parentId === null);
  if (rootNode) {
    const rx = toSX(rootNode.x), ry = toSY(rootNode.y);
    const stub = renderer.rootStubLength ?? 20;
    branchParts.push(`<line x1="${f(rx - stub)}" y1="${f(ry)}" x2="${f(rx)}" y2="${f(ry)}"/>`);
  }

  for (const [, node] of nm) {
    const nx = toSX(node.x), ny = toSY(node.y);

    if (node.parentId !== null) {
      const parent = nm.get(node.parentId);
      if (parent && ny > -MARGIN && ny < ttH + MARGIN) {
        branchParts.push(`<line x1="${f(toSX(parent.x))}" y1="${f(ny)}" x2="${f(nx)}" y2="${f(ny)}"/>`);
      }
    }

    if (!node.isTip && node.children.length >= 2) {
      const childYs = node.children.map(cid => { const c = nm.get(cid); return c ? toSY(c.y) : null; }).filter(y => y !== null);
      if (childYs.length >= 2) {
        const minY = Math.min(...childYs), maxY = Math.max(...childYs);
        if (maxY > -MARGIN && minY < ttH + MARGIN)
          branchParts.push(`<line x1="${f(nx)}" y1="${f(minY)}" x2="${f(nx)}" y2="${f(maxY)}"/>`);
      }
    }

    if (ny > -MARGIN && ny < ttH + MARGIN) {
      if (node.isTip && tr > 0) {
        const _tipVal = node.annotations?.[renderer._tipColourBy];
        const fill = renderer._tipColourBy
          ? (renderer._tipColourForValue(_tipVal) ?? MISSING_DATA_COLOUR)
          : renderer.tipShapeColor;
        if (tipHaloSW > 0)
          bgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${esc(tipBgColor)}" stroke="${esc(tipBgColor)}" stroke-width="${tipHaloSW}"/>`);
        fgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${esc(fill)}"/>`);
      } else if (!node.isTip && nr > 0) {
        const _nodeVal = node.annotations?.[renderer._nodeColourBy];
        const fill = renderer._nodeColourBy
          ? (renderer._nodeColourForValue(_nodeVal) ?? MISSING_DATA_COLOUR)
          : renderer.nodeShapeColor;
        if (nodeHaloSW > 0)
          bgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${esc(nodeBgColor)}" stroke="${esc(nodeBgColor)}" stroke-width="${nodeHaloSW}"/>`);
        fgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${esc(fill)}"/>`);
      }
      if (node.isTip && node.name) {
        const lx2 = nx + (tr > 0 ? tr + 4 : 4);
        const labelFill = (renderer._labelColourBy && renderer._labelColourScale)
          ? (renderer._labelColourForValue(node.annotations?.[renderer._labelColourBy]) ?? lc)
          : lc;
        labelParts.push(`<text x="${f(lx2)}" y="${f(ny)}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="${esc(labelFill)}">${svgTextEsc(node.name)}</text>`);
      } else if (!node.isTip && node.label) {
        labelParts.push(`<text x="${f(nx + 3)}" y="${f(ny - 3)}" font-family="monospace" font-size="${Math.round(fs * 0.85)}px" fill="${esc(lc)}" opacity="0.7">${svgTextEsc(node.label)}</text>`);
      }
    }
  }

  // ── Axis (vector) ────────────────────────────────────────────────────
  const axisParts = [];
  if (axVisible && axisRenderer._visible && axisRenderer._scaleX && axisRenderer._maxX !== 0) {
    const ar        = axisRenderer;
    const plotLeft  = ar._offsetX;
    const plotRight = ar._offsetX + ar._maxX * ar._scaleX;
    const AX        = llW;          // SVG x-offset for the axis canvas origin
    const AY        = ttH_eff;      // SVG y-offset for the axis canvas origin
    const Y_BASE    = 3;
    const MAJOR_H   = 9;
    const MINOR_H   = 5;
    const TICK_C    = 'rgba(255,255,255,0.45)';
    const MINOR_C   = 'rgba(255,255,255,0.25)';
    const TEXT_C    = 'rgba(242,241,230,0.80)';
    const TEXT_DIM  = 'rgba(242,241,230,0.45)';
    const afs       = ar._fontSize;
    const afsMinor  = Math.max(6, afs - 2);
    // Approximate monospace character width for overlap guard
    const approxW   = (label, fsize) => label.length * fsize * 0.57;

    const { leftVal, rightVal } = ar._valueDomain();
    const minVal = Math.min(leftVal, rightVal);
    const maxVal = Math.max(leftVal, rightVal);
    const targetMajor = Math.max(2, Math.round((plotRight - plotLeft) / 90));

    let majorTicks, minorTicks;
    if (ar._dateMode) {
      const majI = ar._majorInterval, minI = ar._minorInterval;
      majorTicks = majI === 'auto'
        ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor)
        : AxisRenderer._calendarTicksForInterval(minVal, maxVal, majI);
      if (minI === 'off') {
        minorTicks = [];
      } else {
        const all = minI === 'auto'
          ? AxisRenderer._niceCalendarTicks(minVal, maxVal, targetMajor * 5)
          : AxisRenderer._calendarTicksForInterval(minVal, maxVal, minI);
        const ms = new Set(majorTicks.map(t => t.toFixed(8)));
        minorTicks = all.filter(t => !ms.has(t.toFixed(8)));
      }
    } else {
      majorTicks = AxisRenderer._niceTicks(leftVal, rightVal, targetMajor);
      const minorAll = majorTicks.length > 1
        ? AxisRenderer._niceTicks(leftVal, rightVal, targetMajor * 5) : [];
      const ms = new Set(majorTicks.map(t => t.toPrecision(10)));
      minorTicks = minorAll.filter(t => !ms.has(t.toPrecision(10)));
    }

    // Baseline
    axisParts.push(`<line x1="${f(plotLeft + AX)}" y1="${f(AY + Y_BASE + 0.5)}" x2="${f(plotRight + AX)}" y2="${f(AY + Y_BASE + 0.5)}" stroke="${TICK_C}" stroke-width="1"/>`);

    const minorLabelFmt  = ar._dateMode ? ar._minorLabelFormat : 'off';
    const showMinorLabel = minorLabelFmt !== 'off';
    let minorLabelRight  = -Infinity;

    for (const val of minorTicks) {
      const sx = ar._valToScreenX(val) + AX;
      if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
      axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MINOR_H)}" stroke="${MINOR_C}" stroke-width="1"/>`);
      if (showMinorLabel) {
        const label = ar._formatDateVal(val, minorLabelFmt, ar._minorInterval);
        const tw    = approxW(label, afsMinor);
        const lx2   = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
        if (lx2 - tw / 2 > minorLabelRight + 2) {
          axisParts.push(`<text x="${f(lx2)}" y="${f(AY + Y_BASE + 1 + MINOR_H + 2)}" dominant-baseline="hanging" text-anchor="middle" font-family="monospace" font-size="${afsMinor}px" fill="${TEXT_DIM}">${svgTextEsc(label)}</text>`);
          minorLabelRight = lx2 + tw / 2;
        }
      }
    }

    const majorLabelFmt  = ar._dateMode ? ar._majorLabelFormat : 'auto';
    const showMajorLabel = majorLabelFmt !== 'off';
    let majorLabelRight  = -Infinity;

    for (const val of majorTicks) {
      const sx = ar._valToScreenX(val) + AX;
      if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
      axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MAJOR_H)}" stroke="${TICK_C}" stroke-width="1"/>`);
      if (showMajorLabel) {
        let label;
        if (ar._dateMode) {
          label = majorLabelFmt === 'auto'
            ? AxisRenderer._formatDecYear(val, majorTicks)
            : ar._formatDateVal(val, majorLabelFmt, ar._majorInterval);
        } else {
          label = AxisRenderer._formatValue(val);
        }
        const tw  = approxW(label, afs);
        const lx2 = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
        if (lx2 - tw / 2 > majorLabelRight + 2) {
          axisParts.push(`<text x="${f(lx2)}" y="${f(AY + Y_BASE + 1 + MAJOR_H + 2)}" dominant-baseline="hanging" text-anchor="middle" font-family="monospace" font-size="${afs}px" fill="${TEXT_C}">${svgTextEsc(label)}</text>`);
          majorLabelRight = lx2 + tw / 2;
        }
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${totalW}" height="${totalH_eff}" viewBox="0 0 ${totalW} ${totalH_eff}">
  <defs>
    ${defs.join('\n    ')}
  </defs>
  ${bgParts.join('\n  ')}
  ${legendParts.join('\n  ')}
  <g clip-path="url(#tc)" stroke="${esc(bc)}" stroke-width="${bw}" fill="none" stroke-linecap="round">
    ${branchParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${bgNodeParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${bgTipParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${fgNodeParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${fgTipParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${labelParts.join('\n    ')}
  </g>
  ${axisParts.join('\n  ')}
</svg>`;
}
