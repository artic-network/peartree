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
 *
 * @deprecated  Use computeLayoutFromGraph() for new code.
 *              This function is kept for applyOrder / subtree-navigation paths
 *              that still use the nested-root format (Phases 4–6 will migrate them).
 */
export function computeLayout(root, hiddenNodeIds = new Set()) {
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
 * Like computeLayout but treats `rawNode` as the root even if it has a
 * non-zero branch length (so the root always sits at x = 0 in layout space).
 *
 * @deprecated  Used by applyOrder / subtree navigation (nested-root format).
 */
export function computeLayoutFrom(rawNode, hiddenNodeIds = new Set()) {
  const savedLen = rawNode.length;
  rawNode.length = 0;
  const result = computeLayout(rawNode, hiddenNodeIds);
  rawNode.length = savedLen;
  return result;
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
export function computeLayoutFromGraph(graph) {
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

  const gNodeA = gnodes[nodeA];
  const gNodeB = gnodes[nodeB];

  if (lenA === 0) {
    // Real root: nodeA is the layout root.
    traverse(nodeA, -1, 0, null);

  } else {
    // Virtual bifurcating root between nodeA and nodeB.
    const ROOT_LAYOUT_ID = '__graph_root__';

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
export function reorderTree(node, ascending, hiddenNodeIds = new Set()) {
  if (!node.children || node.children.length === 0) {
    node._tipCount = hiddenNodeIds.has(node.id) ? 0 : 1;
    return node._tipCount;
  }
  let total = 0;
  for (const child of node.children) {
    total += reorderTree(child, ascending, hiddenNodeIds);
  }
  node._tipCount = hiddenNodeIds.has(node.id) ? 0 : total;
  node.children.sort((a, b) =>
    ascending ? a._tipCount - b._tipCount : b._tipCount - a._tipCount
  );
  return node._tipCount;
}

/**
 * Rotate a node in the nested tree: reverse the order of its direct children.
 * If `recursive` is true, also rotate every internal descendant in the subtree.
 * Mutates the tree in place.
 *
 * @param {object}  treeRoot  – root of the nested tree
 * @param {string}  nodeId    – id of the target internal node
 * @param {boolean} [recursive=false]
 */
export function rotateNodeTree(treeRoot, nodeId, recursive = false) {
  function rotateAll(n) {
    if (!n.children || n.children.length === 0) return;
    n.children.reverse();
    for (const child of n.children) rotateAll(child);
  }

  function walk(n) {
    if (!n.children || n.children.length === 0) return;
    if (n.id === nodeId) {
      if (recursive) rotateAll(n);
      else           n.children.reverse();
      return;  // found – stop walking
    }
    for (const child of n.children) walk(child);
  }
  walk(treeRoot);
}

// ─────────────────────────────────────────────────────────────────────────────
// Midpoint rooting  – finds the branch bisecting the tree's diameter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the midpoint of the tree: the point on a branch that lies exactly
 * halfway along the longest tip-to-tip path (the diameter).
 *
 * @param {object} root  - raw root of the current tree
 * @returns {{ childNodeId: string, distFromParent: number }}
 *   Parameters suitable for passing directly to rerootTree().
 */
export function midpointRootTree(root) {
  // Build lookup structures over the whole tree.
  const rawNodeMap   = new Map();  // id → raw node
  const parentMap    = new Map();  // id → parent raw node
  const distFromRoot = new Map();  // id → cumulative branch-length from root

  (function index(node, parent, d) {
    rawNodeMap.set(node.id, node);
    if (parent) parentMap.set(node.id, parent);
    const nd = d + (node.length || 0);
    distFromRoot.set(node.id, nd);
    if (node.children) for (const c of node.children) index(c, node, nd);
  })(root, null, 0);

  const tips = [...rawNodeMap.values()].filter(n => !n.children || n.children.length === 0);
  if (tips.length < 2) return { childNodeId: tips[0].id, distFromParent: (tips[0].length || 0) / 2 };

  // Ancestors chain: walk from id up to root, returning array of ids.
  function ancestors(id) {
    const chain = [];
    let cur = id;
    while (cur !== undefined && cur !== null) {
      chain.push(cur);
      const p = parentMap.get(cur);
      cur = p ? p.id : null;
    }
    return chain;
  }

  // LCA of two nodes.
  function lca(idA, idB) {
    const setA = new Set(ancestors(idA));
    let cur = idB;
    while (cur !== undefined && cur !== null) {
      if (setA.has(cur)) return cur;
      const p = parentMap.get(cur);
      cur = p ? p.id : null;
    }
    return root.id;
  }

  // Tree-path length between two tips.
  function pathLen(idA, idB) {
    const l = lca(idA, idB);
    return distFromRoot.get(idA) + distFromRoot.get(idB) - 2 * (distFromRoot.get(l) || 0);
  }

  // Step 1 – tip farthest from root (one end of diameter).
  let tipA = tips.reduce((b, t) => (distFromRoot.get(t.id) > distFromRoot.get(b.id) ? t : b), tips[0]);

  // Step 2 – tip farthest from tipA (other end of diameter).
  let tipB = tips.reduce((b, t) => {
    if (t.id === tipA.id) return b;
    return pathLen(tipA.id, t.id) > pathLen(tipA.id, b.id) ? t : b;
  }, tips.find(t => t.id !== tipA.id));

  const diameter = pathLen(tipA.id, tipB.id);
  const half     = diameter / 2;
  const lcaId    = lca(tipA.id, tipB.id);

  // Path from tipA up to LCA (as array of ids, child-first).
  const pathAtoLCA = [];
  let cur = tipA.id;
  while (cur !== lcaId) {
    pathAtoLCA.push(cur);
    cur = parentMap.get(cur).id;
  }
  pathAtoLCA.push(lcaId);

  // Distance from tipA to LCA.
  const distAtoLCA = distFromRoot.get(tipA.id) - (distFromRoot.get(lcaId) || 0);

  if (half <= distAtoLCA) {
    // Midpoint lies on the tipA → LCA portion of the path.
    let acc = 0;
    for (let i = 0; i < pathAtoLCA.length - 1; i++) {
      const childId  = pathAtoLCA[i];
      const branchLen = rawNodeMap.get(childId).length || 0;
      if (acc + branchLen >= half) {
        return { childNodeId: childId, distFromParent: half - acc };
      }
      acc += branchLen;
    }
  } else {
    // Midpoint lies on the LCA → tipB portion of the path.
    const remaining = half - distAtoLCA;

    // Path from tipB up to LCA (child-first), then reversed to walk down.
    const pathBtoLCA = [];
    let cur2 = tipB.id;
    while (cur2 !== lcaId) {
      pathBtoLCA.push(cur2);
      cur2 = parentMap.get(cur2).id;
    }
    // Walk from LCA toward tipB: last element of pathBtoLCA is child-of-LCA.
    let acc = 0;
    for (let i = pathBtoLCA.length - 1; i >= 0; i--) {
      const childId   = pathBtoLCA[i];
      const branchLen = rawNodeMap.get(childId).length || 0;
      if (acc + branchLen >= remaining) {
        return { childNodeId: childId, distFromParent: remaining - acc };
      }
      acc += branchLen;
    }
  }

  // Fallback (should not be reached).
  return { childNodeId: tipA.id, distFromParent: (rawNodeMap.get(tipA.id).length || 0) / 2 };
}


let _rerootCounter = 0;

/**
 * Reroot the tree by placing a virtual new root at a point on the branch
 * whose CHILD endpoint has id `childNodeId`.
 *
 * @param {object} oldRoot        - raw root of the current tree
 * @param {string} childNodeId    - id of the child node that defines the branch
 * @param {number} distFromParent - branch-length distance from the parent end
 *                                  to the new root point (must be ≥ 0 and
 *                                  ≤ the branch's full length)
 * @returns {object} newRoot      - the new root raw node
 */
export function rerootTree(oldRoot, childNodeId, distFromParent) {
  // Build id→node and id→parent maps for the whole tree.
  const rawNodeMap = new Map();
  const parentMap  = new Map(); // childId → parent raw node
  (function index(node, parent) {
    rawNodeMap.set(node.id, node);
    if (parent) parentMap.set(node.id, parent);
    if (node.children) for (const c of node.children) index(c, node);
  })(oldRoot, null);

  const childNode  = rawNodeMap.get(childNodeId);
  const parentNode = parentMap.get(childNodeId);
  if (!childNode || !parentNode) return oldRoot; // already the root edge – no-op

  const originalLen = childNode.length || 0;
  const distToChild = Math.max(0, originalLen - distFromParent);
  distFromParent    = Math.max(0, Math.min(originalLen, distFromParent));

  // Create the new root node.
  const newRoot = {
    id:          `__reroot_${++_rerootCounter}__`,
    name:        null,
    label:       null,
    length:      0,
    annotations: {},
    children:    [childNode],
  };
  childNode.length = distToChild;

  // Walk from parentNode up to oldRoot, reversing each edge in turn.
  let prev    = newRoot;
  let prevLen = distFromParent;
  let cur     = parentNode;

  while (cur) {
    const par       = parentMap.get(cur.id) || null;
    const downChild = (prev === newRoot) ? childNode : prev;

    // Detach the downward child from cur's children list.
    cur.children = cur.children.filter(c => c.id !== downChild.id);

    // Save cur's original branch length, then overwrite it with the reversed
    // length (distance from cur to the new root via the reversed path).
    const savedLen = cur.length || 0;
    cur.length     = prevLen;

    // Attach cur as a child of prev (either newRoot or the previous node).
    prev.children.push(cur);

    prevLen = savedLen;
    prev    = cur;
    cur     = par;
  }

  return newRoot;
}
