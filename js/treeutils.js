// ─────────────────────────────────────────────────────────────────────────────
// Layout  – rectangular: x = divergence from root, y = equal spacing for tips
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @deprecated  Internal helper used by computeLayoutFrom below.
 * @private
 */
function computeLayout(root, hiddenNodeIds = new Set()) {
  let tipCounter = 0;
  const nodes = [];
  const nodeMap = new Map();

  function traverse(node, parentDivergence, parentId) {
    const divergence     = parentDivergence + (node.length || 0);
    const allChildren    = node.children || [];
    const visibleChildren = hiddenNodeIds.size
      ? allChildren.filter(c => !hiddenNodeIds.has(c.id))
      : allChildren;
    const isLeaf = allChildren.length === 0;
    const entry = {
      id:                node.id,
      name:              node.name || null,
      label:             node.label || null,
      annotations:       node.annotations || {},
      x:                 divergence,
      y:                 null,
      isTip:             isLeaf,
      hasHiddenChildren: allChildren.length !== visibleChildren.length,
      children:          visibleChildren.map(c => c.id),
      parentId,
    };

    if (isLeaf) { tipCounter++; entry.y = tipCounter; }

    nodes.push(entry);
    nodeMap.set(entry.id, entry);

    for (const child of visibleChildren) {
      traverse(child, divergence, node.id);
    }

    // place internal node at centre of its visible children (post-order)
    if (!isLeaf && visibleChildren.length > 0) {
      const childYs = visibleChildren.map(c => nodeMap.get(c.id)?.y).filter(y => y != null);
      if (childYs.length) entry.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
    }
  }

  traverse(root, 0, null);

  // ── Post-pass: suppress zero-child and single-child non-root internal nodes ─
  if (hiddenNodeIds.size) {
    const toRemove = new Set();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.parentId === null) continue;
      if (node.isTip) continue;
      if (node.children.length === 0) {
        const parentNode = nodeMap.get(node.parentId);
        if (parentNode) {
          parentNode.hasHiddenChildren = true;
          const idx = parentNode.children.indexOf(node.id);
          if (idx !== -1) parentNode.children.splice(idx, 1);
        }
        toRemove.add(node.id);
        nodeMap.delete(node.id);
        continue;
      }
      if (node.children.length !== 1) continue;
      const parentNode = nodeMap.get(node.parentId);
      const childNode  = nodeMap.get(node.children[0]);
      if (!parentNode || !childNode) continue;
      const idx = parentNode.children.indexOf(node.id);
      if (idx !== -1) parentNode.children[idx] = childNode.id;
      childNode.parentId = parentNode.id;
      if (node.hasHiddenChildren) childNode.hasHiddenChildren = true;
      toRemove.add(node.id);
      nodeMap.delete(node.id);
    }
    if (toRemove.size) {
      const finalNodes = nodes.filter(n => !toRemove.has(n.id));
      for (let i = finalNodes.length - 1; i >= 0; i--) {
        const n = finalNodes[i];
        if (n.isTip) continue;
        const ys = n.children.map(cid => nodeMap.get(cid)?.y).filter(y => y != null);
        if (ys.length) n.y = ys.reduce((a, b) => a + b, 0) / ys.length;
      }
      return { nodes: finalNodes, nodeMap, maxX: finalNodes.reduce((m, n) => Math.max(m, n.x), 0), maxY: tipCounter };
    }
  }

  const maxX = nodes.reduce((m, n) => Math.max(m, n.x), 0);
  return { nodes, nodeMap, maxX, maxY: tipCounter };
}

/**
 * Compute the rectangular layout from a PhyloGraph (adjacency-list model).
 *
 * Output format is identical to computeLayout():
 *   { nodes: LayoutNode[], nodeMap: Map<id,LayoutNode>, maxX, maxY }
 *
 * Each LayoutNode:
 *   { id, name, label, annotations, x, y, isTip, children: [id,…], parentId }
 *
 * Bifurcating root:
 *   A virtual root layout node is inserted at x = 0 with id '__graph_root__'.
 *   The two root-adjacent nodes extend rightward at x = totalEdgeLen * proportion
 *   and x = totalEdgeLen * (1 − proportion) respectively.
 *
 * Trifurcating root (rootEdge.proportion === 0, nodeA.parentIdx === -1):
 *   nodeA is the real root; no virtual node is needed.
 */
export function computeLayoutFromGraph(graph, subtreeRootId = null) {
  const { nodes: gnodes, root } = graph;
  const { nodeA, nodeB, lenA, lenB } = root;
  const hiddenNodeIds = graph.hiddenNodeIds || new Set();

  let tipCounter = 0;
  const layoutNodes = [];
  const nodeMap     = new Map();

  /**
   * DFS from `nodeIdx`, arriving from `fromNodeIdx` (-1 = no exclusion).
   * Children whose origId is in hiddenNodeIds are skipped entirely.
   * The parent is marked hasHiddenChildren = true instead.
   */
  function traverse(nodeIdx, fromNodeIdx, xFromRoot, parentLayoutId) {
    const gnode = gnodes[nodeIdx];
    const entry = {
      id:                gnode.origId,
      name:              gnode.name,
      label:             gnode.label,
      annotations:       gnode.annotations,
      x:                 xFromRoot,
      y:                 null,
      isTip:             false,
      hasHiddenChildren: false,
      children:          [],
      parentId:          parentLayoutId,
    };

    layoutNodes.push(entry);
    nodeMap.set(entry.id, entry);

    const allChildren = gnode.adjacents
      .map((adjIdx, i) => ({ adjIdx, len: gnode.lengths[i] }))
      .filter(({ adjIdx }) => adjIdx !== fromNodeIdx);

    entry.isTip = allChildren.length === 0;
    if (entry.isTip) { tipCounter++; entry.y = tipCounter; }

    for (const { adjIdx, len } of allChildren) {
      const childOrigId = gnodes[adjIdx].origId;
      if (hiddenNodeIds.has(childOrigId)) {
        entry.hasHiddenChildren = true; // skip this child entirely
      } else {
        traverse(adjIdx, nodeIdx, xFromRoot + len, gnode.origId);
        entry.children.push(childOrigId);
      }
    }

    if (!entry.isTip) {
      if (entry.children.length > 0) {
        const childYs = entry.children.map(cid => nodeMap.get(cid).y).filter(y => y != null);
        if (childYs.length > 0)
          entry.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
      }
      // If children.length === 0 here, all children were hidden.
      // Leave isTip=false so the suppression post-pass can remove this node
      // and propagate hasHiddenChildren to the parent.
    }
  }

  if (subtreeRootId !== null) {
    // Subtree view: root layout at the given node, parent direction excluded.
    const nodeIdx = graph.origIdToIdx.get(subtreeRootId);
    if (nodeIdx !== undefined) {
      traverse(nodeIdx, gnodes[nodeIdx].adjacents[0], 0, null);
    }
  } else if (lenA === 0) {
    // Real root: nodeA is the layout root.
    traverse(nodeA, -1, 0, null);

  } else {
    // Virtual bifurcating root between nodeA and nodeB.
    const ROOT_LAYOUT_ID = '__graph_root__';
    const gNodeA = gnodes[nodeA];
    const gNodeB = gnodes[nodeB];

    if (!hiddenNodeIds.has(gNodeA.origId)) traverse(nodeA, nodeB, lenA, ROOT_LAYOUT_ID);
    if (!hiddenNodeIds.has(gNodeB.origId)) traverse(nodeB, nodeA, lenB, ROOT_LAYOUT_ID);

    const aEntry = nodeMap.get(gNodeA.origId);
    const bEntry = nodeMap.get(gNodeB.origId);
    const rootChildren = [];
    if (aEntry) rootChildren.push(gNodeA.origId);
    if (bEntry) rootChildren.push(gNodeB.origId);
    const rootY = aEntry && bEntry ? (aEntry.y + bEntry.y) / 2
                : aEntry ? aEntry.y : bEntry ? bEntry.y : 1;

    const rootEntry = {
      id:                ROOT_LAYOUT_ID,
      name:              null,
      label:             null,
      annotations:       root.annotations || {},
      x:                 0,
      y:                 rootY,
      isTip:             rootChildren.length === 0,
      hasHiddenChildren: hiddenNodeIds.has(gNodeA.origId) || hiddenNodeIds.has(gNodeB.origId),
      children:          rootChildren,
      parentId:          null,
    };
    if (rootEntry.isTip) { tipCounter++; rootEntry.y = tipCounter; }
    layoutNodes.unshift(rootEntry);
    nodeMap.set(ROOT_LAYOUT_ID, rootEntry);
  }

  // ── Post-pass: suppress single-child non-root internal nodes ─────────────
  // layoutNodes is pre-order (parents before children); reverse → post-order.
  const toRemove = new Set();
  for (let i = layoutNodes.length - 1; i >= 0; i--) {
    const node = layoutNodes[i];
    if (node.parentId === null) continue; // never suppress root
    if (node.isTip) continue;
    // Suppress internal nodes with no visible children (all hidden or already suppressed).
    if (node.children.length === 0) {
      const parentNode = nodeMap.get(node.parentId);
      if (parentNode) {
        parentNode.hasHiddenChildren = true;
        const idx = parentNode.children.indexOf(node.id);
        if (idx !== -1) parentNode.children.splice(idx, 1);
      }
      toRemove.add(node.id);
      nodeMap.delete(node.id);
      continue;
    }
    if (node.children.length !== 1) continue;
    // Suppress: wire grandparent directly to surviving child.
    const parentNode = nodeMap.get(node.parentId);
    const childNode  = nodeMap.get(node.children[0]);
    if (!parentNode || !childNode) continue;
    const idx = parentNode.children.indexOf(node.id);
    if (idx !== -1) parentNode.children[idx] = childNode.id;
    childNode.parentId = parentNode.id;
    if (node.hasHiddenChildren) childNode.hasHiddenChildren = true;
    toRemove.add(node.id);
    nodeMap.delete(node.id);
  }

  const finalNodes = layoutNodes.filter(n => !toRemove.has(n.id));

  // Recompute y positions bottom-up now that suppression may have changed children.
  for (let i = finalNodes.length - 1; i >= 0; i--) {
    const node = finalNodes[i];
    if (node.isTip) continue;
    const childYs = node.children.map(cid => nodeMap.get(cid)?.y).filter(y => y != null);
    if (childYs.length > 0)
      node.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
  }

  const maxX = finalNodes.reduce((m, n) => Math.max(m, n.x), 0);
  const maxY = tipCounter;

  return { nodes: finalNodes, nodeMap, maxX, maxY };
}

/** @deprecated – no longer used; kept for any external callers. */
export function reorderTree() {}
/** @deprecated – use rotateNodeGraph() from phylograph.js instead. */
export function rotateNodeTree() {}
/** @deprecated – use midpointRootGraph() from phylograph.js instead. */
export function midpointRootTree() {}
/** @deprecated – use rerootOnGraph() from phylograph.js instead. */
export function rerootTree() {}



