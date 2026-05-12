// graphicsexport.js — PNG and SVG export logic for the composite tree view.
// Extracted from peartree.js to keep the app controller focused.
// ─────────────────────────────────────────────────────────────────────────────

import { AxisRenderer } from './axisrenderer.js';
import { isNumericType, TreeCalibration } from './phylograph.js';
import { getSequentialPalette,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR, buildCategoricalColourMap } from '@artic-network/pearcore/palettes.js';
import { htmlEsc as esc } from '@artic-network/pearcore/utils.js';

/** @private SVG text-content escaper (no quot needed here). */
function svgTextEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * @private Build a pseudo-canvas 2D path recorder that emits SVG path data.
 * Mirrors the subset of canvas API used by the clade-outline path helpers.
 * @param {function} fmt  Number-formatting function (e.g. n => n.toFixed(2))
 */
function makeSvgPath(fmt) {
  const parts = [];
  let cx = 0, cy = 0;
  return {
    moveTo(x, y)  { parts.push(`M${fmt(x)},${fmt(y)}`); cx = x; cy = y; },
    lineTo(x, y)  { parts.push(`L${fmt(x)},${fmt(y)}`); cx = x; cy = y; },
    arcTo(x1, y1, x2, y2, r) {
      const dx0 = x1 - cx, dy0 = y1 - cy;
      const d0  = Math.hypot(dx0, dy0);
      const dx1 = x2 - x1, dy1 = y2 - y1;
      const d1  = Math.hypot(dx1, dy1);
      if (!d0 || !d1 || r <= 0) { parts.push(`L${fmt(x1)},${fmt(y1)}`); cx = x1; cy = y1; return; }
      const ux0 = dx0/d0, uy0 = dy0/d0, ux1 = dx1/d1, uy1 = dy1/d1;
      const t   = Math.min(r, d0, d1);
      const tx0 = x1 - ux0*t, ty0 = y1 - uy0*t;
      const tx1 = x1 + ux1*t, ty1 = y1 + uy1*t;
      const sweep = (ux0*uy1 - uy0*ux1) > 0 ? 1 : 0;
      parts.push(`L${fmt(tx0)},${fmt(ty0)} A${r},${r} 0 0 ${sweep} ${fmt(tx1)},${fmt(ty1)}`);
      cx = tx1; cy = ty1;
    },
    closePath() { parts.push('Z'); },
    get d() { return parts.join(' '); },
  };
}

/**
 * Return CSS-pixel dimensions of the full composite viewport.
 *
 * @param {Object} ctx
 * @param {HTMLCanvasElement} ctx.canvas
 * @param {HTMLCanvasElement} ctx.axisCanvas
 * @param {HTMLCanvasElement} ctx.legendRightCanvas
 */
export function viewportDims({ canvas, axisCanvas, legendRightCanvas }) {
  const lrVisible = legendRightCanvas.style.display !== 'none';
  const axVisible = axisCanvas.style.display        !== 'none';
  const lrW = lrVisible ? legendRightCanvas.clientWidth : 0;
  const ttW = canvas.clientWidth;
  const ttH = canvas.clientHeight;
  const axH = axVisible ? axisCanvas.clientHeight : 0;
  return { totalW: ttW + lrW, totalH: ttH + axH,
           llW: 0, lrW, ttW, ttH, axH, llVisible: false, lrVisible, axVisible };
}

/**
 * Composite all visible canvases onto an OffscreenCanvas at the given pixel size.
 *
 * @param {Object} ctx  – { renderer, canvas, axisCanvas, legendRightCanvas, axisRenderer }
 * @param {number} targetW
 * @param {number} targetH
 * @param {boolean} [fullTree=false]
 * @param {boolean} [transparent=false]
 * @returns {OffscreenCanvas}
 */
export function compositeViewPng(ctx, targetW, targetH, fullTree = false, transparent = false) {
  const { renderer, canvas, axisCanvas, legendRightCanvas } = ctx;
  const { totalW, lrW, ttW, ttH, axH, lrVisible, axVisible } = viewportDims(ctx);
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

  if (fullTree) {
    // Re-render tree panel at current scaleY with full unclipped height.
    const treeW = Math.round(ttW * sx);
    const treeH = Math.round(ttH_eff * sy);
    const toc = new OffscreenCanvas(treeW, treeH);
    renderer.renderFull(toc, treeW, treeH, transparent);
    oCtx.drawImage(toc, 0, 0);
  } else if (transparent) {
    // Re-render current viewport at screen dimensions without background,
    // then let drawImage scale it to the export target (same as the normal
    // path does with the live canvas, but without the pre-painted background).
    const toc = new OffscreenCanvas(Math.round(ttW), Math.round(ttH_eff));
    renderer.renderViewToOffscreen(toc, true);
    oCtx.drawImage(toc,
      0, 0,
      Math.round(ttW * sx), Math.round(ttH_eff * sy));
  } else {
    oCtx.drawImage(canvas,
      0, 0,
      Math.round(ttW * sx), Math.round(ttH_eff * sy));
  }
  if (axVisible) {
    oCtx.drawImage(axisCanvas,
      0, Math.round(ttH_eff * sy),
      Math.round(ttW * sx), Math.round(axH * sy));
  }
  if (lrVisible) {
    if (transparent) {
      renderer._skipBg = true;
      renderer._drawLegend();
      renderer._skipBg = false;
    }
    oCtx.drawImage(legendRightCanvas,
      Math.round(ttW * sx), 0,
      Math.round(lrW * sx), Math.round(ttH_eff * sy));
    if (transparent) {
      renderer._drawLegend();
    }
  }
  return oc;
}

/**
 * Build a fully-vector composite SVG: tree with optional legend (right) and axis below.
 *
 * No raster embeds — axis ticks and legend entries are SVG elements.
 *
 * @param {Object} ctx  – { renderer, canvas, axisCanvas, legendRightCanvas, axisRenderer }
 * @param {boolean} [fullTree=false]
 * @param {boolean} [transparent=false]
 * @returns {string|null}
 */
export function buildGraphicSVG(ctx, fullTree = false, transparent = false) {
  const { renderer, legendRenderer, axisRenderer,
          legend2RightCanvas } = ctx;
  const nm = renderer.nodeMap;
  if (!nm || !nm.size) return null;

  const { totalW: baseW, llW, lrW, ttW, ttH, axH, llVisible, lrVisible, axVisible } = viewportDims(ctx);
  // ── Second-legend beside column ──────────────────────────────────────
  const lr2Key    = legendRenderer?._annotation2 ?? null;
  const lr2Pos    = legendRenderer?._position2;   // 'right' (beside own canvas) | 'below'
  const lr2Beside = !!lr2Key && lr2Pos !== 'below';

  let lr2W = 0;
  if (lr2Beside && legend2RightCanvas?.style.display !== 'none')
    lr2W = legend2RightCanvas?.clientWidth ?? 0;
  const totalW = baseW + lr2W;

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
  // Clip for the main tree area (excludes legend panel)
  defs.push(`<clipPath id="tc"><rect x="${llW}" y="0" width="${ttW}" height="${ttH_eff}"/></clipPath>`);

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
    const lx = llW + ttW;  // legend is always on the right
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
      legendParts.push(`<line x1="${lx}" y1="${h1}" x2="${lx + lrW}" y2="${h1}" stroke="${esc(lr.textColor ?? '#ffffff')}44" stroke-width="1"/>`);
      _appendLegendBlock(legendParts, lr2Key, lx, h2, h1, 'lgrd2');
    }
  }
  // Second legend — 'beside' mode: drawn in its own outermost-right panel.
  if (lr2Beside && lr2Key && legendSchema) {
    const lx2 = llW + ttW + lrW;
    _appendLegendBlock(legendParts, lr2Key, lx2, ttH, 0, 'lgrd2');
  }

  // ── Clade highlights (vector, drawn before branches) ─────────────────
  const cladeHighlightParts = [];
  if (renderer._cladeHighlights?.size && renderer.nodes && nm) {
    const chPad     = renderer.cladeHighlightPadding;
    const chR       = renderer.cladeHighlightRadius;
    const leftMode  = renderer.cladeHighlightLeftEdge;
    const rightMode = renderer.cladeHighlightRightEdge;
    const fillOp    = renderer.cladeHighlightFillOpacity;
    const strokeOp  = renderer.cladeHighlightStrokeOpacity;
    const strokeW   = renderer.cladeHighlightStrokeWidth;
    const chTipR    = Math.max(renderer.tipRadius ?? 3.5, 0);
    const chOutR    = chTipR + (renderer.tipHaloSize ?? 1);
    const chLblSp   = renderer.tipLabelSpacing ?? 3;
    const chShpW    = renderer._totalLabelShapeWidth?.() ?? 0;

    const _chRightX = (tipXmax) => {
      const tipSX = toSX(tipXmax);
      switch (rightMode) {
        case 'hardTips':   return tipSX + chOutR + chPad;
        case 'hardAlign':  return (renderer.tipLabelAlign && renderer.tipLabelAlign !== 'off')
          ? toSX(renderer.maxX) + chOutR + chLblSp + chShpW + chPad
          : tipSX + chOutR + chLblSp + chShpW + chPad;
        default:           return tipSX + chOutR + chLblSp + chShpW + chPad;  // hardLabels
      }
    };

    // SVG equivalents of the three canvas outline-path helpers.
    function _chTopPath(p, rootNode) {
      const topChild = n => n.isTip || !n.children?.length ? null
        : n.children.map(id => nm.get(id)).filter(Boolean).reduce((b, c) => c.y < b.y ? c : b);
      p.moveTo(toSX(rootNode.x) - chPad, toSY(rootNode.y));
      let cur = rootNode, prevSY_ = toSY(rootNode.y);
      while (true) {
        const child = topChild(cur);
        if (!child) break;
        const cx_ = toSX(cur.x)   - chPad;
        const cy_ = toSY(child.y) - chPad;
        const nx_ = toSX(child.x) - chPad;
        const vd  = prevSY_ - cy_, hd = nx_ - cx_;
        const cr  = chR > 0 ? Math.min(chR, vd > 0 ? vd*0.45 : chR, hd > 0 ? hd*0.45 : chR) : 0;
        if (cr > 0) { p.lineTo(cx_, cy_ + cr); p.arcTo(cx_, cy_, nx_, cy_, cr); }
        else        { p.lineTo(cx_, cy_); }
        p.lineTo(nx_, cy_);
        prevSY_ = cy_; cur = child;
      }
    }

    function _chBotPath(p, rootNode) {
      const botChild = n => n.isTip || !n.children?.length ? null
        : n.children.map(id => nm.get(id)).filter(Boolean).reduce((b, c) => c.y > b.y ? c : b);
      const spine = []; let cur = rootNode;
      while (cur) { spine.push(cur); cur = botChild(cur); }
      spine.reverse();
      for (let i = 0; i < spine.length - 1; i++) {
        const child  = spine[i], parent = spine[i + 1];
        const isLast = i === spine.length - 2;
        const cornX  = toSX(parent.x) - chPad;
        const cornY  = toSY(child.y)  + chPad;
        const nextY_ = toSY(parent.y) + (isLast ? 0 : chPad);
        const hd = toSX(child.x) - toSX(parent.x), vd = cornY - nextY_;
        const cr = chR > 0 ? Math.min(chR, hd > 0 ? hd*0.45 : chR, vd > 0 ? vd*0.45 : chR) : 0;
        if (cr > 0) { p.lineTo(cornX + cr, cornY); p.arcTo(cornX, cornY, cornX, nextY_, cr); }
        else        { p.lineTo(cornX, cornY); }
        p.lineTo(cornX, nextY_);
      }
    }

    function _chRightPath(p, tipNodes, startY_, endY_) {
      const sxArr = tipNodes.map(t => toSX(t.x) + chPad);
      for (let i = 0; i < tipNodes.length; i++) {
        const sx       = sxArr[i];
        const prevSX_  = i > 0 ? sxArr[i - 1] : null;
        const nextSX_  = i < tipNodes.length - 1 ? sxArr[i + 1] : null;
        const prevMidY = i === 0 ? startY_ : (toSY(tipNodes[i-1].y) + toSY(tipNodes[i].y)) / 2;
        const nextMidY = i < tipNodes.length - 1 ? (toSY(tipNodes[i].y) + toSY(tipNodes[i+1].y)) / 2 : endY_;
        const vd = nextMidY - prevMidY;
        const topConvex = prevSX_ === null || sx >= prevSX_;
        const cr_top = chR > 0 && topConvex
          ? Math.min(chR, vd > 0 ? vd*0.45 : chR, prevSX_ !== null ? Math.abs(sx - prevSX_)*0.45 : chR) : 0;
        if (cr_top > 0) { p.lineTo(sx - cr_top, prevMidY); p.arcTo(sx, prevMidY, sx, prevMidY + cr_top, cr_top); }
        else            { p.lineTo(sx, prevMidY); }
        const botConvex = nextSX_ === null || nextSX_ < sx;
        const cr_bot = chR > 0 && botConvex
          ? Math.min(chR, vd > 0 ? vd*0.45 : chR, nextSX_ !== null ? (sx - nextSX_)*0.45 : chR) : 0;
        if (cr_bot > 0) { p.lineTo(sx, nextMidY - cr_bot); p.arcTo(sx, nextMidY, sx - cr_bot, nextMidY, cr_bot); }
        else            { p.lineTo(sx, nextMidY); }
      }
    }

    function _chRoundedRect(p, x, y, w, h, r) {
      const br = Math.min(r, w/2, h/2);
      if (br <= 0) { p.moveTo(x, y); p.lineTo(x+w, y); p.lineTo(x+w, y+h); p.lineTo(x, y+h); p.closePath(); return; }
      p.moveTo(x + br, y);
      p.lineTo(x + w - br, y); p.arcTo(x+w, y,   x+w, y+br,   br);
      p.lineTo(x + w, y + h - br); p.arcTo(x+w, y+h, x+w-br, y+h, br);
      p.lineTo(x + br, y + h); p.arcTo(x, y+h, x, y+h-br, br);
      p.lineTo(x, y + br); p.arcTo(x, y, x+br, y, br);
      p.closePath();
    }

    for (const [nodeId, hlData] of renderer._cladeHighlights) {
      const rootN = nm.get(nodeId);
      if (!rootN) continue;
      const allTipIds = renderer._getDescendantTipIds(nodeId);
      if (rootN.isTip && !allTipIds.includes(nodeId)) allTipIds.push(nodeId);
      if (!allTipIds.length) continue;

      const colour   = hlData.colour ?? renderer.cladeHighlightColour;
      const tipNodes = allTipIds.map(id => nm.get(id)).filter(Boolean);
      tipNodes.sort((a, b) => a.y - b.y);
      const minTipY  = tipNodes[0].y;
      const maxTipY  = tipNodes[tipNodes.length - 1].y;
      const maxTipX  = Math.max(...tipNodes.map(n => n.x));
      const topPadY_ = toSY(minTipY) - chPad;
      const botPadY_ = toSY(maxTipY) + chPad;

      const p = makeSvgPath(f);
      if (leftMode === 'outline' && tipNodes.length > 1) {
        _chTopPath(p, rootN);
        const rightX_ = _chRightX(maxTipX);
        if (rightMode === 'outlineTips') {
          _chRightPath(p, tipNodes, topPadY_, botPadY_);
        } else {
          const cr = chR;
          p.lineTo(rightX_ - cr, topPadY_);
          p.arcTo(rightX_, topPadY_, rightX_, topPadY_ + cr, cr);
          p.lineTo(rightX_, botPadY_ - cr);
          p.arcTo(rightX_, botPadY_, rightX_ - cr, botPadY_, cr);
        }
        _chBotPath(p, rootN);
        p.closePath();
      } else {
        const leftX_ = toSX(rootN.x) - chPad;
        const cr = Math.min(chR, (botPadY_ - topPadY_) / 2);
        if (rightMode === 'outlineTips' && tipNodes.length > 1) {
          p.moveTo(leftX_ + cr, topPadY_);
          _chRightPath(p, tipNodes, topPadY_, botPadY_);
          p.lineTo(leftX_ + cr, botPadY_);
          p.arcTo(leftX_, botPadY_, leftX_, botPadY_ - cr, cr);
          p.lineTo(leftX_, topPadY_ + cr);
          p.arcTo(leftX_, topPadY_, leftX_ + cr, topPadY_, cr);
          p.closePath();
        } else {
          _chRoundedRect(p, leftX_, topPadY_, _chRightX(maxTipX) - leftX_, botPadY_ - topPadY_, cr);
        }
      }

      const d = p.d;
      if (fillOp > 0)
        cladeHighlightParts.push(`<path d="${esc(d)}" fill="${esc(colour)}" fill-opacity="${fillOp}" stroke="none"/>`);
      if (strokeW > 0 && strokeOp > 0)
        cladeHighlightParts.push(`<path d="${esc(d)}" fill="none" stroke="${esc(colour)}" stroke-width="${strokeW}" stroke-opacity="${strokeOp}"/>`);
    }
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
      if (renderer.nodeBarsLine !== 'off') {
        const useMedian = renderer.nodeBarsLine === 'median';
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
      if (renderer.nodeBarsRange && rangeKey) {
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
    ? toSX(renderer.maxX) + outlineR
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
  const _svgShSpacing = _svgShape !== 'off' ? (renderer._tipLabelShapeSpacing ?? 3) : 0;
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
  // _svgShOff: offset past shape 1; the text gap is controlled by renderer.tipLabelSpacing.
  const _svgShOff = _svgShML + _svgShSz + (_svgActiveExtras.length > 0 ? _svgShSpacing : 0);
  // Total width of all active extra shapes with inter-shape gaps.
  let _svgExtraTotalOff = 0;
  for (let _i = 0; _i < _svgActiveExtras.length; _i++) {
    const _idx = _svgActiveExtras[_i];
    _svgExtraTotalOff += _svgExtraShSzs[_idx]
      + (_i < _svgActiveExtras.length - 1 ? _svgShSpacing : 0);
  }
  const _svgLblSp = renderer.tipLabelSpacing ?? 3;
  const _svgTxOff = _svgShOff + _svgExtraTotalOff + _svgLblSp;  // total x offset from baseX to text

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
      if (node.isTip && tr > 0 && !node.isCollapsed) {
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
      if (node.isTip && !node.isCollapsed) {
        const labelText = renderer._tipLabelText ? renderer._tipLabelText(node) : node.name;
        const baseX  = alignLabelX ?? (nx + outlineR);
        // Connector line (dashed / dots / solid aligned modes only — only when labels are shown).
        if (labelText && alignLabelX !== null && _align !== 'aligned') {
          const tipEdgeX = nx + outlineR;
          const lineEndX = alignLabelX + (_svgShOff > 0 ? _svgShML : 0);
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
            _xOff += _sSz + (_i < _svgActiveExtras.length - 1 ? _svgShSpacing : 0);
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

  // ── Branch labels ────────────────────────────────────────────────────
  if (renderer.branchLabelAnnotation && renderer.nodes && renderer.nodeMap) {
    const blfs    = renderer.branchLabelFontSize ?? Math.round(fs * 0.85);
    const blc     = renderer.branchLabelColor ?? lc;
    const spacing = renderer.branchLabelSpacing ?? 4;
    const above   = renderer.branchLabelPosition !== 'below';
    const baseline  = above ? 'auto'    : 'hanging';
    const anchor    = 'middle';
    for (const node of renderer.nodes) {
      if (!node.parentId) continue;
      const parent = renderer.nodeMap.get(node.parentId);
      if (!parent) continue;
      const branchLabel = renderer._branchLabelText ? renderer._branchLabelText(node) : null;
      if (!branchLabel) continue;
      const nx = toSX(node.x);
      const ny = toSY(node.y);
      if (!fullTree && (ny < -MARGIN || ny > ttH_eff + MARGIN)) continue;
      const mx  = (toSX(parent.x) + nx) / 2;
      const ty  = above ? ny - spacing : ny + spacing;
      labelParts.push(`<text x="${f(mx)}" y="${f(ty)}" dominant-baseline="${baseline}" text-anchor="${anchor}" font-family="monospace" font-size="${blfs}px" fill="${esc(blc)}">${svgTextEsc(branchLabel)}</text>`);
    }
  }

  // ── Collapsed clade triangles and labels ──────────────────────────────
  const collapsedCladeParts = [];
  if (renderer.nodes) {
    const ccOpacity  = renderer._collapsedCladeOpacity ?? 0.25;
    const ccLblSp    = renderer.tipLabelSpacing ?? 3;
    const ccFontSize = renderer._collapsedCladeFontSize ?? fs;
    for (const node of renderer.nodes) {
      if (!node.isCollapsed) continue;
      const halfN  = node.collapsedTipCount / 2;
      const apexSX = toSX(node.x);
      const apexSY = toSY(node.y);
      const baseSX = toSX(node.collapsedMaxX);
      const tSY    = toSY(node.y - halfN);
      const bSY    = toSY(node.y + halfN);
      if (!fullTree && (bSY < -MARGIN || tSY > ttH_eff + MARGIN)) continue;

      const colour = node.collapsedColour ?? renderer.tipShapeColor;
      const pts    = `${f(apexSX)},${f(apexSY)} ${f(baseSX)},${f(tSY)} ${f(baseSX)},${f(bSY)}`;
      const ccStrokeW = renderer._collapsedCladeStrokeWidth ?? 1;
      const ccStrokeOp = renderer._collapsedCladeStrokeOpacity ?? 1;
      collapsedCladeParts.push(`<polygon points="${pts}" fill="${esc(colour)}" fill-opacity="${ccOpacity}" stroke="${esc(colour)}" stroke-width="${ccStrokeW}" stroke-opacity="${ccStrokeOp}"/>`);

      // Labels — skip if triangle is too small to show text.
      const pixH = node.collapsedTipCount * sy;
      if (pixH < ccFontSize) continue;
      const _nodeName = node.annotations?.['Name'];
      const _hasName  = _nodeName?.trim();
      const bX = alignLabelX ?? (baseSX + ccLblSp);
      const labelTX = bX + _svgTxOff;

      if (!_hasName && node.collapsedTipNames && Math.round(node.collapsedTipCount) >= node.collapsedRealTips) {
        // Full-height: render individual tip names.
        const N      = node.collapsedRealTips;
        const topWY  = node.y - (N - 1) / 2;
        for (let i = 0; i < node.collapsedTipNames.length; i++) {
          const tip = node.collapsedTipNames[i];
          if (!tip.name) continue;
          const tipWY = topWY + i;
          const tipSY = toSY(tipWY);
          if (!fullTree && (tipSY < -MARGIN || tipSY > ttH_eff + MARGIN)) continue;
          // Connector line (same dash style as regular tips)
          if (alignLabelX !== null && _align !== 'aligned') {
            const lineEndX = alignLabelX + (_svgShOff > 0 ? _svgShML : 0) - 2;
            if (lineEndX - baseSX >= 8) {
              let dashAttr = '';
              if (_align === 'dashed') dashAttr = ` stroke-dasharray="3 4"`;
              else if (_align === 'dots')   dashAttr = ` stroke-dasharray="1 4"`;
              connectorParts.push(`<line x1="${f(baseSX)}" y1="${f(tipSY)}" x2="${f(lineEndX)}" y2="${f(tipSY)}" stroke="${esc(renderer.dimLabelColor)}" stroke-width="0.35"${dashAttr}/>`);
            }
          }
          labelParts.push(`<text x="${f(labelTX)}" y="${f(tipSY)}" dominant-baseline="central" font-family="monospace" font-size="${fs}px" fill="${esc(lc)}">${svgTextEsc(tip.name)}</text>`);
        }
      } else {
        // Name or count label.
        const label  = _hasName ? _nodeName.trim() : `${node.collapsedRealTips} tips`;
        const labelY = Math.max(node.y - halfN, Math.min(node.y + halfN, node.y));
        const labelSY = toSY(labelY);
        // Connector line for the single clade label.
        if (alignLabelX !== null && _align !== 'aligned') {
          const lineEndX = alignLabelX + (_svgShOff > 0 ? _svgShML : 0) - ccLblSp;
          if (lineEndX - baseSX >= 8) {
            let dashAttr = '';
            if (_align === 'dashed') dashAttr = ` stroke-dasharray="3 4"`;
            else if (_align === 'dots')   dashAttr = ` stroke-dasharray="1 4"`;
            connectorParts.push(`<line x1="${f(baseSX)}" y1="${f(labelSY)}" x2="${f(lineEndX)}" y2="${f(labelSY)}" stroke="${esc(renderer.dimLabelColor)}" stroke-width="0.35"${dashAttr}/>`);
          }
        }
        labelParts.push(`<text x="${f(labelTX)}" y="${f(labelSY)}" dominant-baseline="central" font-family="monospace" font-size="${ccFontSize}px" fill="${esc(lc)}">${svgTextEsc(label)}</text>`);
      }
    }
  }

  // ── Axis (vector) ────────────────────────────────────────────────────
  const axisParts = [];
  if (axVisible && axisRenderer._visible && axisRenderer._scaleX && axisRenderer._maxX !== 0) {
    const ar        = axisRenderer;
    const plotLeft  = ar._offsetX;
    const plotRight = ar._offsetX + ar._maxX * ar._scaleX;
    const AX        = llW;   // SVG x-offset for the axis canvas origin
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
        const ms = new Set(majorTicks.map(t => t.toFixed(8)));
        let all;
        if (minI === 'auto') {
          const derivedInt = TreeCalibration.derivedMinorInterval(majorTicks);
          all = derivedInt
            ? TreeCalibration.calendarTicksForInterval(minVal, maxVal, derivedInt)
            : [];
        } else {
          all = TreeCalibration.calendarTicksForInterval(minVal, maxVal, minI);
        }
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
    // Infer effective minor interval from tick spacing when 'auto'.
    const effMinorInterval = (ar._dateMode && ar._minorInterval === 'auto')
      ? TreeCalibration.inferMajorInterval(minorTicks)
      : ar._minorInterval;

    for (const val of minorTicks) {
      const sx = ar._valToScreenX(val) + AX;
      if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
      axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MINOR_H)}" stroke="${MINOR_C}" stroke-width="1"/>`);
      if (showMinorLabel) {
        const label = ar._calibration.decYearToString(val, minorLabelFmt, ar._dateFormat, effMinorInterval);
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
    const effMajorInterval = (ar._dateMode && ar._majorInterval === 'auto')
      ? TreeCalibration.inferMajorInterval(majorTicks)
      : ar._majorInterval;

    for (const val of majorTicks) {
      const sx = ar._valToScreenX(val) + AX;
      if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
      axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MAJOR_H)}" stroke="${TICK_C}" stroke-width="1"/>`);
      if (showMajorLabel) {
        let label;
        if (ar._dateMode) {
          const effMajorFmt = majorLabelFmt === 'auto' ? 'partial' : majorLabelFmt;
          label = ar._calibration.decYearToString(val, effMajorFmt, ar._dateFormat, effMajorInterval);
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
    ${cladeHighlightParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${nodeBarParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)" stroke="${esc(bc)}" stroke-width="${bw}" fill="none" stroke-linecap="round">
    ${branchParts.join('\n    ')}
  </g>
  <g clip-path="url(#tc)">
    ${collapsedCladeParts.join('\n    ')}
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
