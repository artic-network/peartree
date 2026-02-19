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
