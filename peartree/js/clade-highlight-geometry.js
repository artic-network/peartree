// Shared clade-highlight path geometry helpers.
// These functions are backend-agnostic: callers provide path API and coordinate mappers.

/**
 * Trace a rounded-rectangle path.
 * `path` supports moveTo/lineTo/arcTo/closePath.
 */
export function traceRoundedRectPath(path, x, y, w, h, r) {
  const br = Math.min(r, w / 2, h / 2);
  if (br <= 0) {
    path.moveTo(x, y);
    path.lineTo(x + w, y);
    path.lineTo(x + w, y + h);
    path.lineTo(x, y + h);
    path.closePath();
    return;
  }
  path.moveTo(x + br, y);
  path.lineTo(x + w - br, y);
  path.arcTo(x + w, y, x + w, y + br, br);
  path.lineTo(x + w, y + h - br);
  path.arcTo(x + w, y + h, x + w - br, y + h, br);
  path.lineTo(x + br, y + h);
  path.arcTo(x, y + h, x, y + h - br, br);
  path.lineTo(x, y + br);
  path.arcTo(x, y, x + br, y, br);
  path.closePath();
}

/**
 * Trace top-left clade outline, descending root -> topmost-tip spine.
 */
export function traceCladeTopPath(path, {
  rootNode,
  pad,
  radius,
  leftPad,
  topPadY = null,
  getTopChild,
  toX,
  toY,
}) {
  path.moveTo(toX(rootNode.x) - leftPad, toY(rootNode.y));

  let cur = rootNode;
  let prevY = toY(rootNode.y);
  while (true) {
    const child = getTopChild(cur);
    if (!child) break;
    const cx = toX(cur.x) - leftPad;
    const cyRaw = toY(child.y) - pad;
    const cy = topPadY !== null ? Math.max(cyRaw, topPadY) : cyRaw;
    const nx = toX(child.x) - leftPad;
    const wasClamped = topPadY !== null && cyRaw < topPadY;
    const vd = prevY - cy;
    const hd = nx - cx;
    const cr = (wasClamped || radius <= 0)
      ? 0
      : Math.min(radius, vd > 0 ? vd * 0.45 : radius, hd > 0 ? hd * 0.45 : radius);
    if (cr > 0) {
      path.lineTo(cx, cy + cr);
      path.arcTo(cx, cy, nx, cy, cr);
    } else {
      path.lineTo(cx, cy);
    }
    path.lineTo(nx, cy);
    prevY = cy;
    cur = child;
  }
}

/**
 * Trace bottom-left clade outline, ascending bottommost-tip -> root spine.
 */
export function traceCladeBottomPath(path, {
  rootNode,
  pad,
  radius,
  leftPad,
  botPadY = null,
  getBottomChild,
  toX,
  toY,
}) {
  const spine = [];
  let cur = rootNode;
  while (cur) {
    spine.push(cur);
    cur = getBottomChild(cur);
  }
  spine.reverse();

  for (let i = 0; i < spine.length - 1; i++) {
    const child = spine[i];
    const parent = spine[i + 1];
    const isLastStep = i === spine.length - 2;
    const cornerX = toX(parent.x) - leftPad;
    const cornerYRaw = toY(child.y) + pad;
    const cornerY = botPadY !== null ? Math.min(cornerYRaw, botPadY) : cornerYRaw;
    const nextYRaw = toY(parent.y) + (isLastStep ? 0 : pad);
    const nextY = (!isLastStep && botPadY !== null) ? Math.min(nextYRaw, botPadY) : nextYRaw;
    const wasClamped = botPadY !== null && cornerYRaw > botPadY;
    const hd = toX(child.x) - toX(parent.x);
    const vd = cornerY - nextY;
    const cr = (wasClamped || radius <= 0)
      ? 0
      : Math.min(radius, hd > 0 ? hd * 0.45 : radius, vd > 0 ? vd * 0.45 : radius);

    if (cr > 0) {
      path.lineTo(cornerX + cr, cornerY);
      path.arcTo(cornerX, cornerY, cornerX, nextY, cr);
    } else {
      path.lineTo(cornerX, cornerY);
    }
    path.lineTo(cornerX, nextY);
  }
}

/**
 * Trace right-side staircase for outlineTips mode.
 */
export function traceCladeRightPath(path, {
  tipNodes,
  startY,
  endY,
  pad,
  radius,
  toX,
  toY,
  getTipX,
  getHalfY,
}) {
  const sxArr = tipNodes.map(t => toX(getTipX(t)) + pad);

  for (let i = 0; i < tipNodes.length; i++) {
    const sx = sxArr[i];
    const prevSX = i > 0 ? sxArr[i - 1] : null;
    const nextSX = i < tipNodes.length - 1 ? sxArr[i + 1] : null;
    const prevMidY = i === 0
      ? startY
      : (toY(tipNodes[i - 1].y + getHalfY(tipNodes[i - 1])) + toY(tipNodes[i].y - getHalfY(tipNodes[i]))) / 2;
    const nextMidY = i < tipNodes.length - 1
      ? (toY(tipNodes[i].y + getHalfY(tipNodes[i])) + toY(tipNodes[i + 1].y - getHalfY(tipNodes[i + 1]))) / 2
      : endY;
    const vd = nextMidY - prevMidY;

    const topConvex = prevSX === null || sx >= prevSX;
    const crTop = (radius > 0 && topConvex)
      ? Math.min(radius, vd > 0 ? vd * 0.45 : radius, prevSX !== null ? Math.abs(sx - prevSX) * 0.45 : radius)
      : 0;
    if (crTop > 0) {
      path.lineTo(sx - crTop, prevMidY);
      path.arcTo(sx, prevMidY, sx, prevMidY + crTop, crTop);
    } else {
      path.lineTo(sx, prevMidY);
    }

    const botConvex = nextSX === null || nextSX < sx;
    const crBot = (radius > 0 && botConvex)
      ? Math.min(radius, vd > 0 ? vd * 0.45 : radius, nextSX !== null ? (sx - nextSX) * 0.45 : radius)
      : 0;
    if (crBot > 0) {
      path.lineTo(sx, nextMidY - crBot);
      path.arcTo(sx, nextMidY, sx - crBot, nextMidY, crBot);
    } else {
      path.lineTo(sx, nextMidY);
    }
  }
}
