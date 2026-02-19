// ─────────────────────────────────────────────────────────────────────────────
// Layout  – rectangular: x = divergence from root, y = equal spacing for tips
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Walks the tree once, computing:
 *   node.divergence  – sum of branch lengths from root
 *   node.y           – vertical position (tips evenly spaced 1 apart)
 * Returns { nodes: [], maxDivergence, tipCount }
 *
 * Each entry in `nodes`:
 *   { id, name, label, x, y, isTip, children: [id,…], parentId }
 */
export function computeLayout(root) {
  let tipCounter = 0;
  const nodes = [];
  const nodeMap = new Map();

  function traverse(node, parentDivergence, parentId) {
    const divergence = parentDivergence + (node.length || 0);
    const entry = {
      id: node.id,
      name: node.name || null,
      label: node.label || null,
      annotations: node.annotations || {},
      x: divergence,
      y: null,
      isTip: !node.children || node.children.length === 0,
      children: node.children ? node.children.map(c => c.id) : [],
      parentId,
    };

    if (entry.isTip) {
      tipCounter++;
      entry.y = tipCounter;
    }

    nodes.push(entry);
    nodeMap.set(entry.id, entry);

    if (node.children) {
      for (const child of node.children) {
        traverse(child, divergence, node.id);
      }
    }

    // place internal node at centre of its children (post-order)
    if (!entry.isTip) {
      const childYs = node.children.map(c => nodeMap.get(c.id).y).filter(y => y !== null);
      entry.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
    }

    return entry.y;
  }

  traverse(root, 0, null);

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x), 0);
  const maxY = tipCounter;

  return { nodes, nodeMap, maxX, maxY };
}

/**
 * Like computeLayout but treats `rawNode` as the root even if it has a
 * non-zero branch length (so the root always sits at x = 0 in layout space).
 */
export function computeLayoutFrom(rawNode) {
  const savedLen = rawNode.length;
  rawNode.length = 0;
  const result = computeLayout(rawNode);
  rawNode.length = savedLen;
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Branch ordering  – sorts children at every internal node by clade tip count
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Post-order traversal: counts tips in each clade, then sorts children so that
 * the clade with fewer tips comes first (ascending=true) or last (ascending=false).
 * Ascending  → smaller clades on top  ("ladder up"   / comb toward root)
 * Descending → larger  clades on top  ("ladder down" / comb toward tips)
 * Works directly on the raw parsed node objects (mutates children arrays).
 * Returns the tip count of the subtree rooted at `node`.
 */
export function reorderTree(node, ascending) {
  if (!node.children || node.children.length === 0) {
    node._tipCount = 1;
    return 1;
  }
  let total = 0;
  for (const child of node.children) {
    total += reorderTree(child, ascending);
  }
  node._tipCount = total;
  node.children.sort((a, b) =>
    ascending ? a._tipCount - b._tipCount : b._tipCount - a._tipCount
  );
  return total;
}
