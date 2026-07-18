// Shared node-bar geometry helpers for canvas and export renderers.

/**
 * Compute drawable node-bar primitives for a set of nodes.
 * Output is geometry-only; styling is supplied by caller from each config.
 */
function _clipCurvePoints(points, clipLo, clipHi) {
  if (!Array.isArray(points) || points.length < 2) return [];
  if (!Number.isFinite(clipLo) || !Number.isFinite(clipHi)) return [];
  if (clipHi < clipLo) [clipLo, clipHi] = [clipHi, clipLo];
  const out = [];
  const add = (pt) => {
    if (!pt) return;
    const last = out[out.length - 1];
    if (!last || last.x !== pt.x || last.y !== pt.y) out.push(pt);
  };
  const lerp = (a, b, x) => {
    const span = b.x - a.x;
    if (!Number.isFinite(span) || span === 0) return { x, y: a.y };
    const t = (x - a.x) / span;
    return { x, y: a.y + (b.y - a.y) * t };
  };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (b.x < clipLo || a.x > clipHi) continue;
    const aInside = a.x >= clipLo && a.x <= clipHi;
    const bInside = b.x >= clipLo && b.x <= clipHi;
    if (!out.length) {
      if (aInside) add({ x: a.x, y: a.y });
      else if (a.x < clipLo && b.x >= clipLo) add(lerp(a, b, clipLo));
    } else if (aInside && out[out.length - 1].x !== a.x) {
      add({ x: a.x, y: a.y });
    }
    if (a.x < clipLo && b.x > clipHi) {
      add(lerp(a, b, clipLo));
      add(lerp(a, b, clipHi));
      break;
    }
    if (a.x < clipLo && b.x >= clipLo && !bInside) {
      add(lerp(a, b, clipLo));
    }
    if (bInside) {
      add({ x: b.x, y: b.y });
    }
    if (a.x <= clipHi && b.x > clipHi) {
      add(lerp(a, b, clipHi));
      break;
    }
  }
  return out;
}

export function buildNodeBarPrimitives({
  nodes,
  configs,
  maxX,
  medianKey,
  rangeKey,
  lineMode,
  includeRange,
  toX,
  toY,
  isVisible = null,
  passFilter = null,
}) {
  const result = [];
  if (!Array.isArray(nodes) || !Array.isArray(configs) || !configs.length) return result;

  for (const cfg of configs) {
    const halfW = cfg.width / 2;
    const capH = halfW * 0.6;
    const layer = {
      config: cfg,
      rects: [],
      lines: [],
      whiskers: [],
      curves: [],
      halfW,
      capH,
    };

    for (const node of nodes) {
      if (!node || node.isTip) continue;
      if (typeof passFilter === 'function' && !passFilter(node)) continue;
      if (typeof isVisible === 'function' && !isVisible(node)) continue;

      const cy = toY(node.y);
      const raw = node.annotations?.[cfg.hpdKey];
      if (!Array.isArray(raw) || raw.length < 2) continue;

      const isCurve = Array.isArray(raw[0]);
      let xLeft;
      let xRight;
      if (isCurve) {
        const ptsRaw = raw
          .filter(pt => Array.isArray(pt) && pt.length >= 2)
          .map(([x, y]) => ({ x: +x, y: +y }))
          .filter(pt => Number.isFinite(pt.x) && Number.isFinite(pt.y))
          .sort((a, b) => a.x - b.x);
        if (ptsRaw.length < 2) continue;
        let pts = ptsRaw;
        const clipRaw = cfg.clipTo ? node.annotations?.[cfg.clipTo] : null;
        if (Array.isArray(clipRaw) && clipRaw.length >= 2) {
          const clipLo = +clipRaw[0];
          const clipHi = +clipRaw[1];
          if (Number.isFinite(clipLo) && Number.isFinite(clipHi)) {
            pts = _clipCurvePoints(ptsRaw, clipLo, clipHi);
            if (pts.length < 2) continue;
          }
        }
        let maxDensity = 0;
        for (const pt of pts) {
          if (pt.y > maxDensity) maxDensity = pt.y;
        }
        if (!(maxDensity > 0)) continue;
        const outline = [];
        let minX = Infinity;
        let maxXAnn = -Infinity;
        for (const pt of pts) {
          if (pt.x < minX) minX = pt.x;
          if (pt.x > maxXAnn) maxXAnn = pt.x;
          outline.push({ x: toX(maxX - pt.x), y: cy - (pt.y / maxDensity) * halfW });
        }
        for (let i = pts.length - 1; i >= 0; i--) {
          const pt = pts[i];
          outline.push({ x: toX(maxX - pt.x), y: cy + (pt.y / maxDensity) * halfW });
        }
        xLeft = toX(maxX - maxXAnn);
        xRight = toX(maxX - minX);
        layer.curves.push({ points: outline, xLeft, xRight, cy, halfW });
      } else {
        xLeft = toX(maxX - raw[1]);
        xRight = toX(maxX - raw[0]);
        if (xRight <= xLeft) continue;
        layer.rects.push({ xLeft, xRight, cy, halfW });
      }

      if (lineMode && lineMode !== 'off') {
        const useMedian = lineMode === 'median';
        let xLine;
        if (useMedian) {
          if (!medianKey) {
            xLine = null;
          } else {
            const medVal = node.annotations?.[medianKey];
            xLine = medVal == null ? null : toX(maxX - medVal);
          }
        } else {
          const meanVal = node.annotations?.height;
          xLine = meanVal == null ? null : toX(maxX - meanVal);
        }
        if (xLine != null) {
          layer.lines.push({ xLine, cy, halfW });
        }
      }

      if (includeRange && rangeKey) {
        const range = node.annotations?.[rangeKey];
        if (Array.isArray(range) && range.length >= 2) {
          const xHpdL = xLeft;
          const xHpdR = xRight;
          const xRangeL = toX(maxX - range[1]);
          const xRangeR = toX(maxX - range[0]);
          layer.whiskers.push({ xHpdL, xHpdR, xRangeL, xRangeR, cy, capH });
        }
      }
    }

    result.push(layer);
  }

  return result;
}
