// Shared branch geometry primitives for canvas and SVG renderers.

export function buildBranchPrimitives({
  horizontalNodes,
  verticalNodes,
  nodeMap,
  toX,
  toY,
  elbowRadius,
  yWorldMin = -Infinity,
  yWorldMax = Infinity,
  rootNode = null,
  rootStubLength = 0,
}) {
  const horizontals = [];
  const elbows = [];
  const verticals = [];
  let rootStub = null;
  const er = elbowRadius ?? 0;

  for (const node of horizontalNodes || []) {
    if (!node?.parentId) continue;
    const parent = nodeMap.get(node.parentId);
    if (!parent) continue;

    const px = toX(parent.x);
    const nx = toX(node.x);
    const ny = toY(node.y);
    const py = toY(parent.y);
    const dx = nx - px;
    const dir = dx >= 0 ? 1 : -1;
    const cer = Math.min(er, Math.abs(ny - py) * 0.4, Math.abs(dx) * 0.4);

    horizontals.push({ x1: px + dir * cer, y1: ny, x2: nx, y2: ny });

    if (er > 0 && Math.abs(ny - py) >= 0.5) {
      const cerArc = Math.max(0, Math.min(er, Math.abs(ny - py) * 0.4, Math.abs(dx) * 0.4));
      if (cerArc > 0) {
        const fromY = ny + (ny < py ? cerArc : -cerArc);
        elbows.push({
          moveX: px,
          moveY: fromY,
          x1: px,
          y1: ny,
          x2: px + dir * cerArc,
          y2: ny,
          r: cerArc,
        });
      }
    }
  }

  if (rootNode && rootStubLength > 0) {
    const rx = toX(rootNode.x);
    const ry = toY(rootNode.y);
    rootStub = { x1: rx - rootStubLength, y1: ry, x2: rx, y2: ry };
  }

  for (const node of verticalNodes || []) {
    if (!node || node.isTip || !node.children?.length) continue;

    const childNodes = node.children.map(cid => nodeMap.get(cid)).filter(Boolean);
    if (childNodes.length < 2) continue;

    let minY = Infinity;
    let maxY = -Infinity;
    let topChild = null;
    let botChild = null;
    for (const c of childNodes) {
      if (c.y < minY) {
        minY = c.y;
        topChild = c;
      }
      if (c.y > maxY) {
        maxY = c.y;
        botChild = c;
      }
    }

    if (maxY < yWorldMin || minY > yWorldMax) continue;

    const nx = toX(node.x);
    const py = toY(node.y);
    const nyTop = toY(topChild.y);
    const nyBot = toY(botChild.y);

    const cerTop = er > 0 ? Math.min(er, Math.abs(nyTop - py) * 0.4, Math.abs(toX(topChild.x) - nx) * 0.4) : 0;
    const cerBot = er > 0 ? Math.min(er, Math.abs(nyBot - py) * 0.4, Math.abs(toX(botChild.x) - nx) * 0.4) : 0;

    verticals.push({ x1: nx, y1: nyTop + cerTop, x2: nx, y2: nyBot - cerBot });
  }

  return { horizontals, elbows, verticals, rootStub };
}
