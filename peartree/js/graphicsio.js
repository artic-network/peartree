// graphicsexport.js — PNG and SVG export logic for the composite tree view.
// Extracted from peartree.js to keep the app controller focused.
// ─────────────────────────────────────────────────────────────────────────────

import { AxisRenderer } from './axisrenderer.js';
import { isNumericType, TreeCalibration } from './phylograph.js';
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
  const { renderer, legendRenderer, axisRenderer,
          legend2LeftCanvas, legend2RightCanvas } = ctx;
  const nm = renderer.nodeMap;
  if (!nm || !nm.size) return null;

  const { totalW: baseW, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = viewportDims(ctx);
  // ── Second-legend beside columns ──────────────────────────────────────
  const lr2Key    = legendRenderer?._annotation2 ?? null;
  const lr2Pos    = legendRenderer?._position2;   // 'right' (beside own canvas) | 'below'
  const lr2Beside = !!lr2Key && lr2Pos !== 'below';
  const lr1Pos    = legendRenderer?._position;    // 'left' | 'right' | null

  let ll2W = 0, lr2W = 0;
  if (lr2Beside) {
    if (lr1Pos === 'left'  && legend2LeftCanvas?.style.display  !== 'none')
      ll2W = legend2LeftCanvas?.clientWidth  ?? 0;
    if (lr1Pos === 'right' && legend2RightCanvas?.style.display !== 'none')
      lr2W = legend2RightCanvas?.clientWidth ?? 0;
  }
  const totalW = ll2W + baseW + lr2W;

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

  const toSX = wx => wx * sx + ox + ll2W + llW;
  const toSY = wy => wy * sy + oy;
  const f    = n  => n.toFixed(2);
  // When drawing full tree all nodes are in range; use Infinity to skip y-culling.
  const MARGIN = fullTree ? Infinity : 20;

  // ── defs: clip paths, gradients ──────────────────────────────────────
  const defs = [];
  // Clip for the main tree area (excludes legend panels)
  defs.push(`<clipPath id="tc"><rect x="${ll2W + llW}" y="0" width="${ttW}" height="${ttH_eff}"/></clipPath>`);

  // ── Background panels ─────────────────────────────────────────────────
  const bgParts = [];
  if (!transparent) {
    bgParts.push(`<rect width="${totalW}" height="${totalH_eff}" fill="${esc(bg)}"/>`);
  }

  // ── Legend panels (vector) ────────────────────────────────────────────
  // The legend state lives on the LegendRenderer instance, not on TreeRenderer.
  // For full-tree exports the legend is capped to the *window* height (ttH) so
  // it doesn't stretch to the full tree; it stays at its natural on-screen size.
  const legendParts = [];
  const lr = legendRenderer;  // may be undefined for callers that omit it
  const legendPos    = lr?._position;
  const legendKey    = lr?._annotation;
  const legendSchema = lr?._schema;

  // Helper: appends one legend block's SVG elements into `out`.
  // lx = left edge in SVG coords; legendH = usable height; yOffset = top offset.
  // gradId = unique linearGradient id prefix (must differ across both legends).
  const _appendLegendBlock = (out, key, lx, legendH, yOffset = 0, gradId = 'lgrd') => {
    if (!key || !legendSchema) return;
    const def = legendSchema.get(key);
    if (!def) return;
    const lfs   = lr.fontSize ?? fs;
    const ltc   = lr.textColor ?? '#F7EECA';
    const lfont = lr._fontFamily ?? 'monospace';
    const PAD   = 12;
    let   ly    = yOffset + PAD;
    const maxY  = yOffset + legendH - PAD;

    out.push(`<text x="${lx + PAD}" y="${ly}" dominant-baseline="hanging" font-family="${lfont}" font-size="${lfs}px" font-weight="700" fill="#b58900">${svgTextEsc(key)}</text>`);
    ly += lfs + 10;

    if (def.dataType === 'categorical' || def.dataType === 'ordinal') {
      const paletteName = lr._paletteOverrides?.get(key);
      const colourMap   = buildCategoricalColourMap(def.values || [], paletteName);
      const SWATCH = Math.max(8, lfs);
      const ROW_H  = Math.max(SWATCH + 4, lfs + 4);
      (def.values || []).forEach((val) => {
        if (ly + SWATCH > maxY) return;
        const colour = colourMap.get(val) ?? MISSING_DATA_COLOUR;
        out.push(`<rect x="${lx + PAD}" y="${ly}" width="${SWATCH}" height="${SWATCH}" fill="${esc(colour)}"/>`);
        out.push(`<text x="${lx + PAD + SWATCH + 6}" y="${ly + SWATCH / 2}" dominant-baseline="central" font-family="${lfont}" font-size="${lfs}px" fill="${esc(ltc)}">${svgTextEsc(String(val))}</text>`);
        ly += ROW_H;
      });
    } else if (def.dataType === 'date' || isNumericType(def.dataType)) {
      // Vertical gradient bar (top = max, bottom = min) — matches canvas rendering.
      const BAR_W    = 14;
      const BAR_H    = Math.max(40, maxY - ly);
      const gid      = gradId;
      const seqStops = getSequentialPalette(lr._paletteOverrides?.get(key));
      const ns       = seqStops.length;
      // Vertical gradient: stop 0 = top = max colour (last stop), stop 1 = bottom = min colour.
      const stopMarkup = seqStops.map((c, i) =>
        `<stop offset="${(ns === 1 ? 0 : i / (ns - 1) * 100).toFixed(1)}%" stop-color="${esc(seqStops[ns - 1 - i])}"/>`
      ).join('');
      defs.push(`<linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">${stopMarkup}</linearGradient>`);
      out.push(`<rect x="${lx + PAD}" y="${ly}" width="${BAR_W}" height="${BAR_H}" fill="url(#${gid})"/>`);

      // Tick labels spread evenly from top (max) to bottom (min).
      const LABEL_X  = lx + PAD + BAR_W + 6;
      const tickCount = Math.max(2, Math.min(6, Math.floor(BAR_H / (lfs + 6))));
      const min = def.min ?? 0, max = def.max ?? 1;
      const range = (def.dataType === 'date')
        ? (new Date(max).getFullYear() - new Date(min).getFullYear() || 1)
        : ((max - min) || 1);
      const fmt = def.fmt ?? (v => String(v));
      for (let i = 0; i < tickCount; i++) {
        const t     = i / (tickCount - 1);
        const tickY = ly + t * BAR_H;
        const val   = def.dataType === 'date' ? null : (max - t * range);
        const label = (def.dataType === 'date')
          ? (() => {
              const targetDec = max - t * range;
              let best = (def.values || [])[0] ?? String(max);
              let bestDist = Infinity;
              for (const v of (def.values || [])) {
                const d = Math.abs(new Date(v).getFullYear() - targetDec);
                if (d < bestDist) { bestDist = d; best = v; }
              }
              return best;
            })()
          : fmt(val);
        // Tick mark
        out.push(`<rect x="${lx + PAD + BAR_W}" y="${f(tickY - 0.5)}" width="4" height="1" fill="${esc(ltc)}"/>`);
        const baseline = i === 0 ? 'hanging' : (i === tickCount - 1 ? 'auto' : 'central');
        out.push(`<text x="${LABEL_X}" y="${f(tickY)}" dominant-baseline="${baseline}" font-family="${lfont}" font-size="${lfs}px" fill="${esc(ltc)}">${svgTextEsc(String(label))}</text>`);
      }
    }
  };

  if (legendPos && legendKey && legendSchema) {
    const lx = legendPos === 'left' ? ll2W : ll2W + llW + ttW;
    // Compute h1/h2 when second legend is stacked below legend 1.
    const below = !!lr2Key && lr2Pos === 'below';
    let h1 = ttH, h2 = 0;
    if (below) {
      const pct1 = Math.max(1, lr._heightPct  ?? 100);
      const pct2 = Math.max(1, lr._heightPct2 ?? 50);
      if (pct1 + pct2 < 100) {
        h1 = Math.round(ttH * pct1 / 100);
        h2 = Math.round(ttH * pct2 / 100);
      } else {
        h1 = Math.round(ttH * pct1 / (pct1 + pct2));
        h2 = ttH - h1;
      }
    }
    _appendLegendBlock(legendParts, legendKey, lx, h1, 0, 'lgrd');
    if (below && lr2Key && h2 > 0) {
      // Separator line between stacked legends.
      const panelW = legendPos === 'left' ? llW : lrW;
      legendParts.push(`<line x1="${lx}" y1="${h1}" x2="${lx + panelW}" y2="${h1}" stroke="${esc(lr.textColor ?? '#ffffff')}44" stroke-width="1"/>`);
      _appendLegendBlock(legendParts, lr2Key, lx, h2, h1, 'lgrd2');
    }
  }
  // Second legend — 'beside' mode: drawn in its own outermost-side panel.
  if (lr2Beside && lr2Key && legendSchema) {
    const lx2 = lr1Pos === 'left' ? 0 : ll2W + llW + ttW + lrW;
    _appendLegendBlock(legendParts, lr2Key, lx2, ttH, 0, 'lgrd2');
  }

  // ── Node bars (HPD intervals, drawn behind branches) ──────────────────
  const nodeBarParts = [];
  if (renderer.nodeBarsEnabled) {
    const schema    = renderer._annotationSchema;
    const heightDef = schema?.get('height');
    if (heightDef?.group?.hpd) {
      const hpdKey    = heightDef.group.hpd;
      const medianKey = heightDef.group.median;
      const rangeKey  = heightDef.group.range;
      const maxX      = renderer.maxX;
      const halfW     = renderer.nodeBarsWidth / 2;
      const col       = renderer.nodeBarsColor;

      // Passes 1 + 2: translucent fill box and border outlined box per HPD interval.
      for (const [, node] of nm) {
        if (node.isTip) continue;
        const ny = toSY(node.y);
        if (ny < -MARGIN || ny > ttH_eff + MARGIN) continue;
        const hpd = node.annotations?.[hpdKey];
        if (!Array.isArray(hpd) || hpd.length < 2) continue;
        const xLeft  = toSX(maxX - hpd[1]);
        const xRight = toSX(maxX - hpd[0]);
        if (xRight <= xLeft) continue;
        nodeBarParts.push(`<rect x="${f(xLeft)}" y="${f(ny - halfW)}" width="${f(xRight - xLeft)}" height="${f(halfW * 2)}" fill="${esc(col)}" opacity="0.22"/>`);
        nodeBarParts.push(`<rect x="${f(xLeft)}" y="${f(ny - halfW)}" width="${f(xRight - xLeft)}" height="${f(halfW * 2)}" fill="none" stroke="${esc(col)}" stroke-width="1" opacity="0.55"/>`);
      }

      // Pass 3: mean or median centre line.
      if (renderer.nodeBarsShowMedian !== 'none') {
        const useMedian = renderer.nodeBarsShowMedian === 'median';
        for (const [, node] of nm) {
          if (node.isTip) continue;
          const ny = toSY(node.y);
          if (ny < -MARGIN || ny > ttH_eff + MARGIN) continue;
          const hpd = node.annotations?.[hpdKey];
          if (!Array.isArray(hpd) || hpd.length < 2) continue;
          let xLine;
          if (useMedian) {
            if (!medianKey) continue;
            const medVal = node.annotations?.[medianKey];
            if (medVal == null) continue;
            xLine = toSX(maxX - medVal);
          } else {
            const meanVal = node.annotations?.['height'];
            if (meanVal == null) continue;
            xLine = toSX(maxX - meanVal);
          }
          nodeBarParts.push(`<line x1="${f(xLine)}" y1="${f(ny - halfW)}" x2="${f(xLine)}" y2="${f(ny + halfW)}" stroke="${esc(col)}" stroke-width="2" opacity="0.85"/>`);
        }
      }

      // Pass 4: range whiskers (line to full-range extent + end cap).
      if (renderer.nodeBarsShowRange && rangeKey) {
        const capH = halfW * 0.6;
        for (const [, node] of nm) {
          if (node.isTip) continue;
          const ny = toSY(node.y);
          if (ny < -MARGIN || ny > ttH_eff + MARGIN) continue;
          const hpd   = node.annotations?.[hpdKey];
          const range = node.annotations?.[rangeKey];
          if (!Array.isArray(hpd) || hpd.length < 2) continue;
          if (!Array.isArray(range) || range.length < 2) continue;
          const xHpdL   = toSX(maxX - hpd[1]);
          const xHpdR   = toSX(maxX - hpd[0]);
          const xRangeL = toSX(maxX - range[1]);
          const xRangeR = toSX(maxX - range[0]);
          // Left whisker: horizontal line + end cap
          nodeBarParts.push(`<line x1="${f(xHpdL)}" y1="${f(ny)}" x2="${f(xRangeL)}" y2="${f(ny)}" stroke="${esc(col)}" stroke-width="1" opacity="0.45"/>`);
          nodeBarParts.push(`<line x1="${f(xRangeL)}" y1="${f(ny - capH)}" x2="${f(xRangeL)}" y2="${f(ny + capH)}" stroke="${esc(col)}" stroke-width="1" opacity="0.45"/>`);
          // Right whisker: horizontal line + end cap
          nodeBarParts.push(`<line x1="${f(xHpdR)}" y1="${f(ny)}" x2="${f(xRangeR)}" y2="${f(ny)}" stroke="${esc(col)}" stroke-width="1" opacity="0.45"/>`);
          nodeBarParts.push(`<line x1="${f(xRangeR)}" y1="${f(ny - capH)}" x2="${f(xRangeR)}" y2="${f(ny + capH)}" stroke="${esc(col)}" stroke-width="1" opacity="0.45"/>`);
        }
      }
    }
  }

  // ── Tree branches ─────────────────────────────────────────────────────
  const branchParts = [];
  const bgNodeParts = [];  // background halo circles for node shapes
  const bgTipParts  = [];  // background halo circles for tip shapes
  const fgNodeParts = [];  // foreground fill circles for node shapes
  const fgTipParts  = [];  // foreground fill circles for tip shapes
  const labelParts      = [];
  const connectorParts  = [];   // alignment connector lines
  const shapeParts      = [];   // tip-label shape swatches
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

  // ── Tip-label alignment and shape pre-computation ─────────────────────
  const outlineR     = tr > 0 ? tr + renderer.tipHaloSize : 0;
  const _align       = renderer.tipLabelAlign;
  const alignLabelX  = (_align && _align !== 'off')
    ? toSX(renderer.maxX) + outlineR + 3
    : null;

  // Shape 1 — size computed the same way as _shapeSize() in treerenderer.js.
  // block = absolute px width; square/circle = % of scaleY.
  const _svgShape   = renderer._tipLabelShape;
  const _svgShSz    = _svgShape !== 'off'
    ? (_svgShape === 'block'
        ? Math.max(1, renderer._tipLabelShapeSize)
        : Math.max(2, Math.round(sy * renderer._tipLabelShapeSize / 100)))
    : 0;
  const _svgShML      = _svgShape !== 'off' ? renderer._tipLabelShapeMarginLeft  : 0;
  const _svgShMR      = _svgShape !== 'off' ? renderer._tipLabelShapeMarginRight : 0;
  const _svgShSpacing = _svgShape !== 'off' ? (renderer._tipLabelShapeSpacing ?? renderer._tipLabelShapeMarginRight) : 0;
  // Extra shapes (2–N): each uses shape 1's size/spacing, own colour scale.
  const _svgExtraShapes = _svgShape !== 'off' ? renderer._tipLabelShapesExtra : [];
  // Precompute per-extra-shape pixel sizes (same formula as shape 1).
  const _svgExtraShSzs = _svgExtraShapes.map(s => {
    if (s === 'off') return 0;
    return s === 'block'
      ? Math.max(1, renderer._tipLabelShapeSize)
      : Math.max(2, Math.round(sy * renderer._tipLabelShapeSize / 100));
  });
  // Collect active extra shape indices (break at first 'off').
  const _svgActiveExtras = [];
  for (let _i = 0; _i < _svgExtraShapes.length; _i++) {
    if (_svgExtraShapes[_i] === 'off') break;
    _svgActiveExtras.push(_i);
  }
  // _svgShOff: offset past shape 1; uses spacing if extras follow, else marginRight.
  const _svgShOff = _svgShML + _svgShSz + (_svgActiveExtras.length > 0 ? _svgShSpacing : _svgShMR);
  // Total width of all active extra shapes with inter-shape gaps.
  let _svgExtraTotalOff = 0;
  for (let _i = 0; _i < _svgActiveExtras.length; _i++) {
    const _idx = _svgActiveExtras[_i];
    _svgExtraTotalOff += _svgExtraShSzs[_idx]
      + (_i < _svgActiveExtras.length - 1 ? _svgShSpacing : _svgShMR);
  }
  const _svgTxOff = _svgShOff + _svgExtraTotalOff;  // total x offset from baseX to text

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
        const fill = (renderer._tipColourBy && renderer._tipColourScale)
          ? (renderer._tipColourForValue(node.annotations?.[renderer._tipColourBy]) ?? renderer.tipShapeColor)
          : renderer.tipShapeColor;
        if (tipHaloSW > 0)
          bgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${esc(tipBgColor)}" stroke="${esc(tipBgColor)}" stroke-width="${tipHaloSW}"/>`);
        fgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${esc(fill)}"/>`);
      } else if (!node.isTip && nr > 0) {
        const fill = (renderer._nodeColourBy && renderer._nodeColourScale)
          ? (renderer._nodeColourForValue(node.annotations?.[renderer._nodeColourBy]) ?? renderer.nodeShapeColor)
          : renderer.nodeShapeColor;
        if (nodeHaloSW > 0)
          bgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${esc(nodeBgColor)}" stroke="${esc(nodeBgColor)}" stroke-width="${nodeHaloSW}"/>`);
        fgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${esc(fill)}"/>`);
      }
      if (node.isTip) {
        const labelText = renderer._tipLabelText ? renderer._tipLabelText(node) : node.name;
        const baseX  = alignLabelX ?? (nx + outlineR + 3);
        // Connector line (dashed / dots / solid aligned modes only — only when labels are shown).
        if (labelText && alignLabelX !== null && _align !== 'aligned') {
          const tipEdgeX = nx + outlineR + 2;
          const lineEndX = alignLabelX + (_svgShOff > 0 ? _svgShML : 0) - 2;
          if (lineEndX - tipEdgeX >= 8) {
            let dashAttr = '';
            if (_align === 'dashed') dashAttr = ` stroke-dasharray="3 4"`;
            else if (_align === 'dots') dashAttr = ` stroke-dasharray="1 4"`;
            connectorParts.push(`<line x1="${f(tipEdgeX)}" y1="${f(ny)}" x2="${f(lineEndX)}" y2="${f(ny)}" stroke="${esc(renderer.dimLabelColor)}" stroke-width="0.35"${dashAttr}/>`);
          }
        }
        // Shape 1 — rendered independently of label text visibility (mirrors canvas pass 3-shapes).
        if (_svgShape !== 'off') {
          const shapeX  = baseX + _svgShML;
          const halfSz  = _svgShSz / 2;
          const sFill   = (renderer._tipLabelShapeColourBy && renderer._tipLabelShapeColourScale)
            ? (renderer._tipLabelShapeColourForValue(node.annotations?.[renderer._tipLabelShapeColourBy]) ?? renderer._tipLabelShapeColor)
            : renderer._tipLabelShapeColor;
          if (_svgShape === 'circle') {
            shapeParts.push(`<circle cx="${f(shapeX + halfSz)}" cy="${f(ny)}" r="${f(halfSz)}" fill="${esc(sFill)}"/>`);
          } else if (_svgShape === 'block') {
            const bTop = Math.floor(ny - sy / 2);
            const bH   = Math.ceil(ny + sy / 2) - bTop;
            shapeParts.push(`<rect x="${f(shapeX)}" y="${f(bTop)}" width="${f(_svgShSz)}" height="${f(bH)}" fill="${esc(sFill)}"/>`);
          } else {
            shapeParts.push(`<rect x="${f(shapeX)}" y="${f(ny - halfSz)}" width="${f(_svgShSz)}" height="${f(_svgShSz)}" fill="${esc(sFill)}"/>`);
          }
        }
        // Extra shapes 2..N — rendered independently of label text visibility.
        {
          let _xOff = _svgShOff;
          for (let _i = 0; _i < _svgActiveExtras.length; _i++) {
            const _idx  = _svgActiveExtras[_i];
            const _sType = _svgExtraShapes[_idx];
            const _sSz    = _svgExtraShSzs[_idx];
            const _halfSz = _sSz / 2;
            const _xKey   = renderer._tipLabelShapeExtraColourBys[_idx];
            const _xScl   = renderer._tipLabelShapeExtraColourScales[_idx];
            const _xFill  = (_xKey && _xScl)
              ? (renderer._tipLabelShapeExtraColourForValue(_idx, node.annotations?.[_xKey]) ?? renderer._tipLabelShapeColor)
              : renderer._tipLabelShapeColor;
            const _shapeXX = baseX + _xOff;
            if (_sType === 'circle') {
              shapeParts.push(`<circle cx="${f(_shapeXX + _halfSz)}" cy="${f(ny)}" r="${f(_halfSz)}" fill="${esc(_xFill)}"/>`);
            } else if (_sType === 'block') {
              const bTop = Math.floor(ny - sy / 2);
              const bH   = Math.ceil(ny + sy / 2) - bTop;
              shapeParts.push(`<rect x="${f(_shapeXX)}" y="${f(bTop)}" width="${f(_sSz)}" height="${f(bH)}" fill="${esc(_xFill)}"/>`);
            } else {
              shapeParts.push(`<rect x="${f(_shapeXX)}" y="${f(ny - _halfSz)}" width="${f(_sSz)}" height="${f(_sSz)}" fill="${esc(_xFill)}"/>`);
            }
            _xOff += _sSz + (_i < _svgActiveExtras.length - 1 ? _svgShSpacing : _svgShMR);
          }
        }
        // Label text.
        if (labelText) {
          const lx2       = baseX + _svgTxOff;
          const labelFill = (renderer._labelColourBy && renderer._labelColourScale)
            ? (renderer._labelColourForValue(node.annotations?.[renderer._labelColourBy]) ?? lc)
            : lc;
          labelParts.push(`<text x="${f(lx2)}" y="${f(ny)}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="${esc(labelFill)}">${svgTextEsc(labelText)}</text>`);
        }
      } else if (!node.isTip) {
        const nodeLabel = renderer._nodeLabelText ? renderer._nodeLabelText(node) : null;
        if (nodeLabel) {
          const nlfs    = renderer.nodeLabelFontSize ?? Math.round(fs * 0.85);
          const nlc     = renderer.nodeLabelColor ?? lc;
          const spacing = renderer.nodeLabelSpacing ?? 4;
          const pos     = renderer.nodeLabelPosition ?? 'right';
          let tx, ty, baseline, anchor;
          if (pos === 'right') {
            tx = nx + nr + spacing;  ty = ny;
            baseline = 'central';   anchor = 'start';
          } else if (pos === 'below-left') {
            tx = nx - nr - spacing;  ty = ny + spacing;
            baseline = 'hanging';   anchor = 'end';
          } else { // 'above-left'
            tx = nx - nr - spacing;  ty = ny - spacing;
            baseline = 'auto';      anchor = 'end';
          }
          labelParts.push(`<text x="${f(tx)}" y="${f(ty)}" dominant-baseline="${baseline}" text-anchor="${anchor}" font-family="monospace" font-size="${nlfs}px" fill="${esc(nlc)}">${svgTextEsc(nodeLabel)}</text>`);
        }
      }
    }
  }

  // ── Axis (vector) ────────────────────────────────────────────────────
  const axisParts = [];
  if (axVisible && axisRenderer._visible && axisRenderer._scaleX && axisRenderer._maxX !== 0) {
    const ar        = axisRenderer;
    const plotLeft  = ar._offsetX;
    const plotRight = ar._offsetX + ar._maxX * ar._scaleX;
    const AX        = ll2W + llW;   // SVG x-offset for the axis canvas origin
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
        ? TreeCalibration.niceCalendarTicks(minVal, maxVal, targetMajor)
        : TreeCalibration.calendarTicksForInterval(minVal, maxVal, majI);
      if (minI === 'off') {
        minorTicks = [];
      } else {
        const all = minI === 'auto'
          ? TreeCalibration.niceCalendarTicks(minVal, maxVal, targetMajor * 5)
          : TreeCalibration.calendarTicksForInterval(minVal, maxVal, minI);
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
        const label = ar._calibration.decYearToString(val, minorLabelFmt, ar._dateFormat, ar._minorInterval);
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
          const effMajorFmt = majorLabelFmt === 'auto' ? 'partial' : majorLabelFmt;
          label = ar._calibration.decYearToString(val, effMajorFmt, ar._dateFormat, ar._majorInterval);
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
  <g clip-path="url(#tc)">
    ${nodeBarParts.join('\n    ')}
  </g>
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
    ${connectorParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${shapeParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${labelParts.join('\n    ')}
  </g>
  ${axisParts.join('\n  ')}
</svg>`;
}
