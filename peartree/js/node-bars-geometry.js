// Shared node-bar geometry helpers for canvas and export renderers.

/**
 * Compute drawable node-bar primitives for a set of nodes.
 * Output is geometry-only; styling is supplied by caller from each config.
 */
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
      halfW,
      capH,
    };

    for (const node of nodes) {
      if (!node || node.isTip) continue;
      if (typeof passFilter === 'function' && !passFilter(node)) continue;
      if (typeof isVisible === 'function' && !isVisible(node)) continue;

      const hpd = node.annotations?.[cfg.hpdKey];
      if (!Array.isArray(hpd) || hpd.length < 2) continue;

      const cy = toY(node.y);
      const xLeft = toX(maxX - hpd[1]);
      const xRight = toX(maxX - hpd[0]);
      if (xRight <= xLeft) continue;

      layer.rects.push({ xLeft, xRight, cy, halfW });

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
