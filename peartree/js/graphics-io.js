// graphicsexport.js — PNG and SVG export logic for the composite tree view.
// Extracted from peartree.js to keep the app controller focused.
// ─────────────────────────────────────────────────────────────────────────────

import { AxisRenderer } from './axis-renderer.js';
import { Axis } from './axis.js';
import { isNumericType, TreeCalibration } from './phylograph.js';
import {
  traceRoundedRectPath,
  traceCladeTopPath,
  traceCladeBottomPath,
  traceCladeRightPath,
} from './clade-highlight-geometry.js';
import { buildNodeBarPrimitives } from './node-bars-geometry.js';
import { buildBranchPrimitives } from './branch-geometry.js';
import { getSequentialPalette,
         DEFAULT_CATEGORICAL_PALETTE, DEFAULT_SEQUENTIAL_PALETTE,
         MISSING_DATA_COLOUR, buildCategoricalColourMap } from '@artic-network/pearcore/palettes.js';
import { TYPEFACES } from '@artic-network/pearcore/typefaces.js';
import { htmlEsc as esc, overlapsZones } from '@artic-network/pearcore/utils.js';

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

/** @private Resolve SVG font attributes from renderer typeface settings. */
function resolveSvgTypeface(renderer, key = null, style = null) {
  const k = key ?? renderer._typefaceKey ?? null;
  const fallbackFamily = renderer.fontFamily ?? renderer._fontFamily ?? 'monospace';
  if (!k) {
    return {
      family: fallbackFamily,
      weight: 400,
      fontStyle: 'normal',
      face: null,
      styleKey: style ?? 'Regular',
    };
  }
  const s = style ?? (key ? (TYPEFACES[k]?.defaultStyle ?? 'Regular') : (renderer._typefaceStyle ?? 'Regular'));
  const face = TYPEFACES[k];
  if (!face) {
    return {
      family: fallbackFamily || k,
      weight: 400,
      fontStyle: 'normal',
      face: null,
      styleKey: s,
    };
  }
  const desc = face.styles[s] ?? face.styles[face.defaultStyle] ?? { weight: 400, fontStyle: 'normal' };
  return {
    family: face.family,
    weight: desc.weight ?? 400,
    fontStyle: desc.fontStyle ?? 'normal',
    face,
    styleKey: s,
  };
}

/** @private Apply selectedLabelStyle to a resolved typeface, mirroring TreeRenderer._selectedFont. */
function resolveSelectedSvgTypeface(renderer, baseTypeface) {
  const sel = renderer.selectedLabelStyle || 'bold';
  if (sel === 'normal') return baseTypeface;

  const wantBold = sel === 'bold' || sel === 'bold italic';
  const wantItalic = sel === 'italic' || sel === 'bold italic';

  if (!baseTypeface.face) {
    return {
      ...baseTypeface,
      weight: wantBold ? Math.min((baseTypeface.weight ?? 400) + 300, 900) : (baseTypeface.weight ?? 400),
      fontStyle: wantItalic ? 'italic' : 'normal',
    };
  }

  const baseWeight = baseTypeface.face.styles?.[baseTypeface.styleKey]?.weight ?? 400;
  const targetWeight = wantBold ? Math.min(baseWeight + 300, 900) : baseWeight;
  const targetFontStyle = wantItalic ? 'italic' : 'normal';

  let best = null;
  let bestScore = Infinity;
  for (const desc of Object.values(baseTypeface.face.styles ?? {})) {
    const wDiff = Math.abs((desc.weight ?? 400) - targetWeight);
    const fMatch = (desc.fontStyle ?? 'normal') === targetFontStyle ? 0 : 1;
    const score = wDiff + fMatch * 200;
    if (score < bestScore) {
      bestScore = score;
      best = desc;
    }
  }

  return {
    ...baseTypeface,
    weight: best?.weight ?? baseTypeface.weight,
    fontStyle: best?.fontStyle ?? baseTypeface.fontStyle,
  };
}

/** @private Build an SVG <text> element string with consistent escaping. */
function svgTextEl({
  x,
  y,
  text,
  baseline = 'central',
  anchor = null,
  family = 'monospace',
  sizePx = 10,
  style = 'normal',
  weight = 400,
  fill = '#000',
}) {
  const anchorAttr = anchor ? ` text-anchor="${anchor}"` : '';
  return `<text x="${x}" y="${y}" dominant-baseline="${baseline}"${anchorAttr} font-family="${esc(family)}" font-size="${sizePx}px" font-style="${style}" font-weight="${weight}" fill="${esc(fill)}">${svgTextEsc(text)}</text>`;
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
  const scaleY = Number.isFinite(renderer.scaleY) ? renderer.scaleY : 1;
  const maxY = Number.isFinite(renderer.maxY) ? renderer.maxY : 0;
  const topPad = Number.isFinite(renderer.treePaddingTop) ? renderer.treePaddingTop : 0;
  const bottomPad = Number.isFinite(renderer.treePaddingBottom) ? renderer.treePaddingBottom : 0;
  // Full tree: panel height is determined by current scaleY over all tips.
  const ttH_eff    = fullTree
    ? (topPad + bottomPad + Math.max(1, maxY - 1) * scaleY)
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

  const scaleY = Number.isFinite(renderer.scaleY) ? renderer.scaleY : 1;
  const maxY = Number.isFinite(renderer.maxY) ? renderer.maxY : 0;
  const topPad = Number.isFinite(renderer.treePaddingTop) ? renderer.treePaddingTop : 0;
  const bottomPad = Number.isFinite(renderer.treePaddingBottom) ? renderer.treePaddingBottom : 0;

  const sx  = renderer.scaleX,  ox = renderer.offsetX;
  // Full tree: keep current scaleY so zoom level is preserved; shift oy so root sits at top.
  const sy  = scaleY;
  const oy  = fullTree ? topPad + scaleY * 0.5 : renderer.offsetY;
  // Effective tree-panel height and total SVG height.
  const ttH_eff    = fullTree
    ? Math.round(topPad + bottomPad + (maxY + 1) * scaleY)
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

    out.push(svgTextEl({
      x: lx + PAD,
      y: ly,
      text: key,
      baseline: 'hanging',
      family: lfont,
      sizePx: lfs,
      weight: 700,
      fill: '#b58900',
    }));
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
        out.push(svgTextEl({
          x: lx + PAD + SWATCH + 6,
          y: ly + SWATCH / 2,
          text: String(val),
          baseline: 'central',
          family: lfont,
          sizePx: lfs,
          fill: ltc,
        }));
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
        out.push(svgTextEl({
          x: LABEL_X,
          y: f(tickY),
          text: String(label),
          baseline,
          family: lfont,
          sizePx: lfs,
          fill: ltc,
        }));
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
    const leftModeRaw  = renderer.cladeHighlightLeftEdge;
    const rightModeRaw = renderer.cladeHighlightRightEdge;
    const leftMode = leftModeRaw === 'outline' ? 'outlineNodes' : leftModeRaw;
    const rightMode = rightModeRaw === 'hardTips' ? 'atTips'
      : rightModeRaw === 'hardAlign' ? 'atLabels'
      : rightModeRaw === 'hardLabels' ? 'atLabelsRight'
      : rightModeRaw;
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
        case 'atTips':   return tipSX + chOutR + chPad;
        case 'atLabels': return (renderer.tipLabelAlign && renderer.tipLabelAlign !== 'off')
          ? toSX(renderer.maxX) + chOutR + chLblSp + chShpW + chPad
          : tipSX + chOutR + chLblSp + chShpW + chPad;
        case 'atLabelsRight':
          return ttW - (renderer.treePaddingRight ?? 10);
        default:
          return tipSX + chOutR + chLblSp + chShpW + chPad;
      }
    };

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
      if (leftMode === 'outlineNodes' && tipNodes.length > 1) {
        const topChild = (n) => n.isTip || !n.children?.length ? null
          : n.children.map(id => nm.get(id)).filter(Boolean).reduce((b, c) => c.y < b.y ? c : b);
        traceCladeTopPath(p, {
          rootNode: rootN,
          pad: chPad,
          radius: chR,
          leftPad: chPad,
          topPadY: null,
          getTopChild: topChild,
          toX: toSX,
          toY: toSY,
        });
        const rightX_ = _chRightX(maxTipX);
        if (rightMode === 'outlineTips') {
          traceCladeRightPath(p, {
            tipNodes,
            startY: topPadY_,
            endY: botPadY_,
            pad: chPad,
            radius: chR,
            toX: toSX,
            toY: toSY,
            getTipX: t => t.x,
            getHalfY: () => 0,
          });
        } else {
          const cr = chR;
          p.lineTo(rightX_ - cr, topPadY_);
          p.arcTo(rightX_, topPadY_, rightX_, topPadY_ + cr, cr);
          p.lineTo(rightX_, botPadY_ - cr);
          p.arcTo(rightX_, botPadY_, rightX_ - cr, botPadY_, cr);
        }
        const botChild = (n) => n.isTip || !n.children?.length ? null
          : n.children.map(id => nm.get(id)).filter(Boolean).reduce((b, c) => c.y > b.y ? c : b);
        traceCladeBottomPath(p, {
          rootNode: rootN,
          pad: chPad,
          radius: chR,
          leftPad: chPad,
          botPadY: null,
          getBottomChild: botChild,
          toX: toSX,
          toY: toSY,
        });
        p.closePath();
      } else {
        const leftX_ = toSX(rootN.x) - chPad;
        const cr = Math.min(chR, (botPadY_ - topPadY_) / 2);
        if (rightMode === 'outlineTips' && tipNodes.length > 1) {
          p.moveTo(leftX_ + cr, topPadY_);
          traceCladeRightPath(p, {
            tipNodes,
            startY: topPadY_,
            endY: botPadY_,
            pad: chPad,
            radius: chR,
            toX: toSX,
            toY: toSY,
            getTipX: t => t.x,
            getHalfY: () => 0,
          });
          p.lineTo(leftX_ + cr, botPadY_);
          p.arcTo(leftX_, botPadY_, leftX_, botPadY_ - cr, cr);
          p.lineTo(leftX_, topPadY_ + cr);
          p.arcTo(leftX_, topPadY_, leftX_ + cr, topPadY_, cr);
          p.closePath();
        } else {
          traceRoundedRectPath(p, leftX_, topPadY_, _chRightX(maxTipX) - leftX_, botPadY_ - topPadY_, cr);
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
      const configs = (typeof renderer._nodeBarConfigs === 'function')
        ? renderer._nodeBarConfigs(heightDef)
        : [];
      if (!configs.length) {
        // nothing to draw
      } else {
      const medianKey = heightDef.group.median;
      const rangeKey  = heightDef.group.range;
      const maxX      = renderer._rootHeightRef ? renderer._rootHeightRef() : renderer.maxX;

      const layers = buildNodeBarPrimitives({
        nodes: [...nm.values()],
        configs,
        maxX,
        medianKey,
        rangeKey,
        lineMode: renderer.nodeBarsLine,
        includeRange: renderer.nodeBarsRange,
        toX: toSX,
        toY: toSY,
        isVisible: node => {
          const ny = toSY(node.y);
          return ny >= -MARGIN && ny <= ttH_eff + MARGIN;
        },
        passFilter: node => (renderer._passesFilter ? renderer._passesFilter(renderer._nodeBarsFilterId, node) : true),
      });

      for (const layer of layers) {
        const cfg = layer.config;
        const col = cfg.color;
        for (const r of layer.rects) {
          nodeBarParts.push(`<rect x="${f(r.xLeft)}" y="${f(r.cy - r.halfW)}" width="${f(r.xRight - r.xLeft)}" height="${f(r.halfW * 2)}" fill="${esc(col)}" opacity="${f(cfg.fillOpacity)}"/>`);
          nodeBarParts.push(`<rect x="${f(r.xLeft)}" y="${f(r.cy - r.halfW)}" width="${f(r.xRight - r.xLeft)}" height="${f(r.halfW * 2)}" fill="none" stroke="${esc(col)}" stroke-width="1" opacity="${f(cfg.strokeOpacity)}"/>`);
        }
        for (const l of layer.lines) {
          nodeBarParts.push(`<line x1="${f(l.xLine)}" y1="${f(l.cy - l.halfW)}" x2="${f(l.xLine)}" y2="${f(l.cy + l.halfW)}" stroke="${esc(col)}" stroke-width="2" opacity="${f(cfg.strokeOpacity)}"/>`);
        }
        for (const w of layer.whiskers) {
          nodeBarParts.push(`<line x1="${f(w.xHpdL)}" y1="${f(w.cy)}" x2="${f(w.xRangeL)}" y2="${f(w.cy)}" stroke="${esc(col)}" stroke-width="1" opacity="${f(cfg.strokeOpacity)}"/>`);
          nodeBarParts.push(`<line x1="${f(w.xRangeL)}" y1="${f(w.cy - w.capH)}" x2="${f(w.xRangeL)}" y2="${f(w.cy + w.capH)}" stroke="${esc(col)}" stroke-width="1" opacity="${f(cfg.strokeOpacity)}"/>`);
          nodeBarParts.push(`<line x1="${f(w.xHpdR)}" y1="${f(w.cy)}" x2="${f(w.xRangeR)}" y2="${f(w.cy)}" stroke="${esc(col)}" stroke-width="1" opacity="${f(cfg.strokeOpacity)}"/>`);
          nodeBarParts.push(`<line x1="${f(w.xRangeR)}" y1="${f(w.cy - w.capH)}" x2="${f(w.xRangeR)}" y2="${f(w.cy + w.capH)}" stroke="${esc(col)}" stroke-width="1" opacity="${f(cfg.strokeOpacity)}"/>`);
        }
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
  const rootStubLength = rootNode
    ? ((renderer._viewSubtreeRootId === null)
        ? (renderer.rootStemPct ?? 0) / 100 * renderer.maxX * sx
        : renderer.rootStubLength)
    : 0;
  const branchGeom = buildBranchPrimitives({
    horizontalNodes: [...nm.values()].filter(n => {
      const ny = toSY(n.y);
      return ny > -MARGIN && ny < ttH + MARGIN;
    }),
    verticalNodes: [...nm.values()],
    nodeMap: nm,
    toX: toSX,
    toY: toSY,
    elbowRadius: renderer.elbowRadius ?? 0,
    yWorldMin: fullTree ? -Infinity : ((-MARGIN - oy) / sy),
    yWorldMax: fullTree ? Infinity : ((ttH + MARGIN - oy) / sy),
    rootNode,
    rootStubLength,
  });
  for (const h of branchGeom.horizontals) {
    branchParts.push(`<line x1="${f(h.x1)}" y1="${f(h.y1)}" x2="${f(h.x2)}" y2="${f(h.y2)}"/>`);
  }
  if ((renderer.elbowRadius ?? 0) > 0 && branchGeom.elbows.length) {
    const bp = makeSvgPath(f);
    for (const a of branchGeom.elbows) {
      bp.moveTo(a.moveX, a.moveY);
      bp.arcTo(a.x1, a.y1, a.x2, a.y2, a.r);
    }
    branchParts.push(`<path d="${esc(bp.d)}" fill="none"/>`);
  }
  if (branchGeom.rootStub) {
    branchParts.push(`<line x1="${f(branchGeom.rootStub.x1)}" y1="${f(branchGeom.rootStub.y1)}" x2="${f(branchGeom.rootStub.x2)}" y2="${f(branchGeom.rootStub.y2)}"/>`);
  }
  for (const v of branchGeom.verticals) {
    branchParts.push(`<line x1="${f(v.x1)}" y1="${f(v.y1)}" x2="${f(v.x2)}" y2="${f(v.y2)}"/>`);
  }

  // ── Tip-label alignment and shape pre-computation ─────────────────────
  const outlineR     = Math.max(tr + renderer.tipHaloSize, 5);
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
  const _svgShowLabels = sy >= fs * 0.5 || renderer._hypFocusScreenY !== null;
  const _svgPassesFilter = (filterId, node) =>
    (renderer._passesFilter ? renderer._passesFilter(filterId, node) : true);
  const _svgShowLabelAt = (worldY) =>
    (renderer._showLabelAt ? renderer._showLabelAt(worldY) : true);
  const _svgHasSelection = (renderer._selectedTipIds?.size ?? 0) > 0;
  const _svgIsSelectedTip = (node) => !!renderer._selectedTipIds?.has?.(node.id);
  const _svgIsSelectedClade = (node) => renderer._mrcaNodeId === node.id;
  const _svgTipTypeface = resolveSvgTypeface(renderer, renderer._tipLabelTypefaceKey || null, renderer._tipLabelTypefaceStyle || null);
  const _svgNodeLabelTypeface = resolveSvgTypeface(renderer, renderer._nodeLabelTypefaceKey || null, renderer._nodeLabelTypefaceStyle || null);
  const _svgBranchLabelTypeface = resolveSvgTypeface(renderer, renderer._branchLabelTypefaceKey || null, renderer._branchLabelTypefaceStyle || null);
  const _svgCollapsedCladeTypeface = resolveSvgTypeface(renderer, renderer._collapsedCladeTypefaceKey || null, renderer._collapsedCladeTypefaceStyle || null);

  for (const [, node] of nm) {
    const nx = toSX(node.x), ny = toSY(node.y);

    if (ny > -MARGIN && ny < ttH + MARGIN) {
      if (node.isTip && tr > 0 && !node.isCollapsed) {
        if (!_svgPassesFilter(renderer._tipShapesFilterId, node)) continue;
        const fill = (renderer._tipColourBy && renderer._tipColourScale)
          ? (renderer._tipColourForValue(node.annotations?.[renderer._tipColourBy]) ?? renderer.tipShapeColor)
          : renderer.tipShapeColor;
        if (tipHaloSW > 0)
          bgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${esc(tipBgColor)}" stroke="${esc(tipBgColor)}" stroke-width="${tipHaloSW}"/>`);
        fgTipParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${tr}" fill="${esc(fill)}"/>`);
      } else if (!node.isTip && nr > 0) {
        if (!_svgPassesFilter(renderer._nodeShapesFilterId, node)) continue;
        const fill = (renderer._nodeColourBy && renderer._nodeColourScale)
          ? (renderer._nodeColourForValue(node.annotations?.[renderer._nodeColourBy]) ?? renderer.nodeShapeColor)
          : renderer.nodeShapeColor;
        if (nodeHaloSW > 0)
          bgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${esc(nodeBgColor)}" stroke="${esc(nodeBgColor)}" stroke-width="${nodeHaloSW}"/>`);
        fgNodeParts.push(`<circle cx="${f(nx)}" cy="${f(ny)}" r="${nr}" fill="${esc(fill)}"/>`);
      }
      if (node.isTip && !node.isCollapsed) {
        const _tipPassesLabelFilter = _svgPassesFilter(renderer._tipLabelsFilterId, node);
        const _tipLabelVisible = _svgShowLabels && _svgShowLabelAt(node.y);
        const labelText = renderer._tipLabelText ? renderer._tipLabelText(node) : node.name;
        const baseX  = alignLabelX ?? (nx + outlineR);
        // Connector line (dashed / dots / solid aligned modes only — only when labels are shown).
        if (_tipPassesLabelFilter && _tipLabelVisible && labelText && alignLabelX !== null && _align !== 'aligned') {
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
        if (_svgShape !== 'off' && _svgPassesFilter(renderer._tipShapesFilterId, node)) {
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
        if (_tipPassesLabelFilter) {
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
        if (_tipPassesLabelFilter && _tipLabelVisible && labelText) {
          const lx2       = baseX + _svgTxOff;
          let labelFill = lc;
          let labelTypeface = _svgTipTypeface;
          if (_svgHasSelection) {
            if (_svgIsSelectedTip(node)) {
              labelFill = renderer.selectedLabelColor;
              labelTypeface = resolveSelectedSvgTypeface(renderer, _svgTipTypeface);
            } else {
              labelFill = renderer.dimLabelColor;
            }
          } else if (renderer._labelColourBy && renderer._labelColourScale) {
            labelFill = renderer._labelColourForValue(node.annotations?.[renderer._labelColourBy]) ?? lc;
          }
          labelParts.push(svgTextEl({
            x: f(lx2),
            y: f(ny),
            text: labelText,
            baseline: 'central',
            family: labelTypeface.family,
            sizePx: fs,
            style: labelTypeface.fontStyle,
            weight: labelTypeface.weight,
            fill: labelFill,
          }));
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
          labelParts.push(svgTextEl({
            x: f(tx),
            y: f(ty),
            text: nodeLabel,
            baseline,
            anchor,
            family: _svgNodeLabelTypeface.family,
            sizePx: nlfs,
            style: _svgNodeLabelTypeface.fontStyle,
            weight: _svgNodeLabelTypeface.weight,
            fill: nlc,
          }));
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
      labelParts.push(svgTextEl({
        x: f(mx),
        y: f(ty),
        text: branchLabel,
        baseline,
        anchor,
        family: _svgBranchLabelTypeface.family,
        sizePx: blfs,
        style: _svgBranchLabelTypeface.fontStyle,
        weight: _svgBranchLabelTypeface.weight,
        fill: blc,
      }));
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
      const _selClade = _svgIsSelectedClade(node);
      const _dimClade = _svgHasSelection && !_selClade;
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
          let tipFill = lc;
          let tipTypeface = _svgTipTypeface;
          if (_dimClade) {
            tipFill = renderer.dimLabelColor;
          } else if (_selClade) {
            tipFill = renderer.selectedLabelColor;
            tipTypeface = resolveSelectedSvgTypeface(renderer, _svgTipTypeface);
          } else if (renderer._labelColourBy && renderer._labelColourScale) {
            const tipVal = renderer._statValue
              ? renderer._statValue(tip, renderer._labelColourBy)
              : tip.annotations?.[renderer._labelColourBy];
            tipFill = renderer._labelColourForValue(tipVal) ?? lc;
          }
          labelParts.push(svgTextEl({
            x: f(labelTX),
            y: f(tipSY),
            text: tip.name,
            baseline: 'central',
            family: tipTypeface.family,
            sizePx: fs,
            style: tipTypeface.fontStyle,
            weight: tipTypeface.weight,
            fill: tipFill,
          }));
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
        let cladeFill = lc;
        let cladeTypeface = _svgCollapsedCladeTypeface;
        if (_dimClade) {
          cladeFill = renderer.dimLabelColor;
        } else if (_selClade) {
          cladeFill = renderer.selectedLabelColor;
          cladeTypeface = resolveSelectedSvgTypeface(renderer, _svgCollapsedCladeTypeface);
        }
        labelParts.push(svgTextEl({
          x: f(labelTX),
          y: f(labelSY),
          text: label,
          baseline: 'central',
          family: cladeTypeface.family,
          sizePx: ccFontSize,
          style: cladeTypeface.fontStyle,
          weight: cladeTypeface.weight,
          fill: cladeFill,
        }));
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
    const axisCanvasRight = AX + ttW;
    const AY        = ttH_eff;      // SVG y-offset for the axis canvas origin
    const Y_BASE    = ar._spacingTop ?? 3;
    const MAJOR_H   = 9;
    const MINOR_H   = 5;
    const axC       = ar._axisColor;
    const TICK_C    = axC ? AxisRenderer._hexToRgba(axC, 0.55) : 'rgba(255,255,255,0.45)';
    const MINOR_C   = axC ? AxisRenderer._hexToRgba(axC, 0.30) : 'rgba(255,255,255,0.25)';
    const TEXT_C    = axC ? AxisRenderer._hexToRgba(axC, 1.0)  : 'rgba(242,241,230,1.0)';
    const TEXT_DIM  = axC ? AxisRenderer._hexToRgba(axC, 0.50) : 'rgba(242,241,230,0.45)';
    const lw        = ar._axisLineWidth ?? 1;
    const afs       = ar._fontSize;
    const afsMinor  = Math.max(6, afs - 2);
    const axisTypeface = resolveSvgTypeface(ar, ar._typefaceKey || null, ar._typefaceStyle || null);
    // Approximate label width for overlap guard.
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
      majorTicks = Axis.niceTicks(leftVal, rightVal, targetMajor);
      const minorAll = majorTicks.length > 1
        ? Axis.niceTicks(leftVal, rightVal, targetMajor * 5) : [];
      const ms = new Set(majorTicks.map(t => t.toPrecision(10)));
      minorTicks = minorAll.filter(t => !ms.has(t.toPrecision(10)));
    }

    // Baseline
    axisParts.push(`<line x1="${f(plotLeft + AX)}" y1="${f(AY + Y_BASE + 0.5)}" x2="${f(plotRight + AX)}" y2="${f(AY + Y_BASE + 0.5)}" stroke="${TICK_C}" stroke-width="${f(lw)}"/>`);

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
      axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MINOR_H)}" stroke="${MINOR_C}" stroke-width="${f(lw)}"/>`);
      if (showMinorLabel) {
        const label = ar._calibration.decYearToString(val, minorLabelFmt, ar._dateFormat, effMinorInterval);
        const tw    = approxW(label, afsMinor);
        const lx2   = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(plotRight + AX - tw / 2 - 1, sx));
        if (lx2 - tw / 2 > minorLabelRight + 2 && !overlapsZones(lx2 - tw / 2, lx2 + tw / 2, majorLabelZones)) {
          axisParts.push(svgTextEl({
            x: f(lx2),
            y: f(AY + Y_BASE + 1 + MINOR_H + 2),
            text: label,
            baseline: 'hanging',
            anchor: 'middle',
            family: axisTypeface.family,
            sizePx: afsMinor,
            style: axisTypeface.fontStyle,
            weight: axisTypeface.weight,
            fill: TEXT_DIM,
          }));
          minorLabelRight = lx2 + tw / 2;
        }
      }
    }

    const majorLabelFmt  = ar._dateMode ? ar._majorLabelFormat : 'auto';
    const showMajorLabel = majorLabelFmt !== 'off';
    const _majorStep = majorTicks.length >= 2 ? Math.abs(majorTicks[1] - majorTicks[0]) : 0;
    const majorLabelZones = [];
    if (showMinorLabel && showMajorLabel) {
      for (const val of majorTicks) {
        const sx = ar._valToScreenX(val) + AX;
        if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
        const label = ar._dateMode
          ? ar._calibration?.decYearToString(
            val,
            majorLabelFmt === 'auto' ? 'partial' : majorLabelFmt,
            ar._dateFormat,
            (ar._dateMode && ar._majorInterval === 'auto') ? TreeCalibration.inferMajorInterval(majorTicks) : ar._majorInterval,
          )
          : Axis.formatValue(val, _majorStep);
        if (!label) continue;
        const tw = approxW(label, afs);
        const lx = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(axisCanvasRight - tw / 2 - 2, sx));
        majorLabelZones.push([lx - tw / 2 - 4, lx + tw / 2 + 4]);
      }
    }
    let majorLabelRight  = -Infinity;
    const effMajorInterval = (ar._dateMode && ar._majorInterval === 'auto')
      ? TreeCalibration.inferMajorInterval(majorTicks)
      : ar._majorInterval;

    for (const val of majorTicks) {
      const sx = ar._valToScreenX(val) + AX;
      if (sx < plotLeft + AX - 1 || sx > plotRight + AX + 1) continue;
      axisParts.push(`<line x1="${f(sx)}" y1="${f(AY + Y_BASE + 1)}" x2="${f(sx)}" y2="${f(AY + Y_BASE + 1 + MAJOR_H)}" stroke="${TICK_C}" stroke-width="${f(lw)}"/>`);
      if (showMajorLabel) {
        let label;
        if (ar._dateMode) {
          const effMajorFmt = majorLabelFmt === 'auto' ? 'partial' : majorLabelFmt;
          label = ar._calibration.decYearToString(val, effMajorFmt, ar._dateFormat, effMajorInterval);
        } else {
          label = Axis.formatValue(val, _majorStep);
        }
        const tw  = approxW(label, afs);
        const lx2 = Math.max(plotLeft + AX + tw / 2 + 1, Math.min(axisCanvasRight - tw / 2 - 2, sx));
        if (lx2 - tw / 2 > majorLabelRight + 2) {
          axisParts.push(svgTextEl({
            x: f(lx2),
            y: f(AY + Y_BASE + 1 + MAJOR_H + 2),
            text: label,
            baseline: 'hanging',
            anchor: 'middle',
            family: axisTypeface.family,
            sizePx: afs,
            style: axisTypeface.fontStyle,
            weight: axisTypeface.weight,
            fill: TEXT_C,
          }));
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
