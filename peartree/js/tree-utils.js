// ─────────────────────────────────────────────────────────────────────────────
// Layout  – rectangular: x = divergence from root, y = equal spacing for tips
// ─────────────────────────────────────────────────────────────────────────────

// (computeLayout — the legacy nested-root version — was removed; use
//  computeLayoutFromGraph() instead.)


// ─────────────────────────────────────────────────────────────────────────────
// Visual-root helpers used by computeLayoutFromGraph
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Count visible (non-hidden) tips reachable from `nodeIdx` going away from
 * `fromIdx`. Hidden nodes (their whole subtree) are not entered.
 */
function _countVisibleTips(gnodes, hiddenNodeIds, nodeIdx, fromIdx) {
  let count = 0;
  const stack = [{ ni: nodeIdx, fi: fromIdx }];
  while (stack.length) {
    const { ni, fi } = stack.pop();
    const gnode = gnodes[ni];
    if (hiddenNodeIds.has(gnode.origId)) continue;
    const children = gnode.adjacents.filter(a => a !== fi);
    if (children.length === 0) count++;
    else for (const c of children) stack.push({ ni: c, fi: ni });
  }
  return count;
}

/**
 * Walk down from `startIdx` (coming from `fromIdx`) following the single
 * visible child until we reach a node with ≠ 1 visible child (i.e. a
 * bifurcation, a leaf, or a dead-end).  Returns the effective root as
 * `{ nodeIdx, fromIdx }`.
 */
function _findEffectiveRoot(gnodes, hiddenNodeIds, startIdx, fromIdx) {
  let curIdx  = startIdx;
  let curFrom = fromIdx;
  while (true) {
    const gnode = gnodes[curIdx];
    const visChildren = gnode.adjacents.filter(adjIdx => {
      if (adjIdx === curFrom) return false;
      const childOrigId = gnodes[adjIdx].origId;
      if (hiddenNodeIds.has(childOrigId)) return false;
      return _countVisibleTips(gnodes, hiddenNodeIds, adjIdx, curIdx) > 0;
    });
    if (visChildren.length !== 1) return { nodeIdx: curIdx, fromIdx: curFrom };
    curFrom = curIdx;
    curIdx  = visChildren[0];
  }
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
/**
 * Collect all visible tip info under `startIdx` (coming from `fromIdx`) in
 * tree traversal order (top-to-bottom in the layout).  Each entry is
 * { name, annotations, x } so the renderer can colour by annotation.
 * Descends through nested collapsed clades so every actual leaf is included.
 */
function _subtreeTipNamesOrdered(gnodes, hiddenNodeIds, startIdx, fromIdx, startXFromRoot, clampNeg) {
  const tips = [];
  const stack = [{ ni: startIdx, fi: fromIdx, x: startXFromRoot }];
  while (stack.length) {
    const { ni, fi, x } = stack.pop();
    const gnode = gnodes[ni];
    const fwdChildren = gnode.adjacents
      .map((adjIdx, i) => ({ adjIdx, len: gnode.lengths[i] }))
      .filter(({ adjIdx }) => adjIdx !== fi && !hiddenNodeIds.has(gnodes[adjIdx].origId));
    if (fwdChildren.length === 0) {
      tips.push({ id: gnode.origId, name: gnode.name ?? null, annotations: gnode.annotations ?? {}, x });
    } else {
      // Push in reverse so forward (left-to-right) order is popped first.
      for (let j = fwdChildren.length - 1; j >= 0; j--) {
        const { adjIdx, len } = fwdChildren[j];
        const nextX = x + (clampNeg ? Math.max(0, len) : len);
        stack.push({ ni: adjIdx, fi: ni, x: nextX });
      }
    }
  }
  return tips;
}

/**
 * DFS walk from `startIdx` (coming from `fromIdx`) to find the maximum
 * accumulated x-from-root value among all tips in that subtree.
 * `startXFromRoot` is the x value already accumulated at `startIdx`.
 * Hidden nodes and already-collapsed nodes are not descended into.
 */
function _subtreeMaxX(gnodes, hiddenNodeIds, collapsedCladeIds, startIdx, fromIdx, startXFromRoot, clampNeg) {
  let maxX = startXFromRoot;
  const stack = [{ ni: startIdx, fi: fromIdx, x: startXFromRoot }];
  while (stack.length) {
    const { ni, fi, x } = stack.pop();
    const gnode = gnodes[ni];
    const children = gnode.adjacents
      .map((adjIdx, i) => ({ adjIdx, len: gnode.lengths[i] }))
      .filter(({ adjIdx }) => adjIdx !== fi);
    if (children.length === 0) {
      if (x > maxX) maxX = x;
    } else {
      for (const { adjIdx, len } of children) {
        const childOrigId = gnodes[adjIdx].origId;
        if (hiddenNodeIds.has(childOrigId)) continue;
        const nextX = x + (clampNeg ? Math.max(0, len) : len);
        if (nextX > maxX) maxX = nextX;
        // Don't descend into already-collapsed sub-clades beyond their apex
        if (!collapsedCladeIds.has(childOrigId)) {
          stack.push({ ni: adjIdx, fi: ni, x: nextX });
        }
      }
    }
  }
  return maxX;
}

/**
 * Count true tips under `startIdx` (coming from `fromIdx`), ignoring hidden
 * nodes and treating collapsed-clade nodes as leaves (don't descend further).
 */
function _subtreeTipCount(gnodes, hiddenNodeIds, collapsedCladeIds, startIdx, fromIdx) {
  let count = 0;
  const stack = [{ ni: startIdx, fi: fromIdx }];
  while (stack.length) {
    const { ni, fi } = stack.pop();
    const gnode = gnodes[ni];
    const children = gnode.adjacents.filter(a => a !== fi);
    const visChildren = children.filter(a => !hiddenNodeIds.has(gnodes[a].origId));
    if (visChildren.length === 0) {
      count++;
    } else {
      for (const a of visChildren) {
        if (collapsedCladeIds.has(gnodes[a].origId)) {
          // Collapsed sub-clade counts as its stored tipCount
          count += collapsedCladeIds.get(gnodes[a].origId).tipCount || 1;
        } else {
          stack.push({ ni: a, fi: ni });
        }
      }
    }
  }
  return count;
}

export function computeLayoutFromGraph(graph, subtreeRootId = null, options = {}) {
  const { nodes: gnodes, root } = graph;
  const { nodeA, nodeB, lenA, lenB } = root;
  const hiddenNodeIds = graph.hiddenNodeIds || new Set();
  const collapsedCladeIds = graph.collapsedCladeIds || new Map();
  const clampNeg = !!options.clampNegativeBranches;
  // collapsedCladeHeightN: how many tip-row slots each collapsed clade occupies.
  // null/undefined means use the clade's actual tip count.
  const collapsedHeightN = options.collapsedCladeHeightN != null ? Math.max(1, +options.collapsedCladeHeightN) : null;

  let tipCounter = 0;
  const layoutNodes = [];
  const nodeMap     = new Map();

  /**
   * Iterative DFS from `startNodeIdx`, arriving from `startFromNodeIdx` (-1 = none).
   * Children whose origId is in hiddenNodeIds are skipped entirely.
   * The parent is marked hasHiddenChildren = true instead.
   *
   * Iterative to avoid call-stack overflow on large/deep trees (e.g. 100k-tip
   * caterpillar trees where recursion depth ≈ tip count).
   */
  function traverse(startNodeIdx, startFromNodeIdx, startXFromRoot, startParentLayoutId) {
    // Record where this call's entries start so the post-order y-pass
    // only touches nodes added in this invocation.
    const startLen = layoutNodes.length;

    // Push children in REVERSE order so they are popped (visited) in FORWARD
    // order, preserving the same left-to-right tip numbering as before.
    const stack = [{ nodeIdx: startNodeIdx, fromNodeIdx: startFromNodeIdx,
                     xFromRoot: startXFromRoot, parentLayoutId: startParentLayoutId }];

    while (stack.length) {
      const { nodeIdx, fromNodeIdx, xFromRoot, parentLayoutId, collapsed } = stack.pop();
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
        isCollapsed:       false,
        collapsedTipCount: 0,
        collapsedMaxX:     xFromRoot,
        children:          [],
        parentId:          parentLayoutId,
      };

      layoutNodes.push(entry);
      nodeMap.set(entry.id, entry);

      // If this node was pushed as a collapsed clade root, treat it as a leaf.
      if (collapsed) {
        const info = collapsedCladeIds.get(gnode.origId);
        const realTipCount = info?.tipCount || _subtreeTipCount(gnodes, hiddenNodeIds, collapsedCladeIds, nodeIdx, fromNodeIdx);
        // heightN is the number of row-slots this clade occupies in the layout.
        // Cap at the clade's own real tip count so it never occupies more space
        // than it would when fully expanded.
        const heightN  = collapsedHeightN != null ? Math.min(collapsedHeightN, realTipCount) : realTipCount;
        const maxX     = _subtreeMaxX(gnodes, hiddenNodeIds, collapsedCladeIds, nodeIdx, fromNodeIdx, xFromRoot, clampNeg);
        entry.isCollapsed       = true;
        entry.collapsedTipCount = heightN;   // layout height (row-slots)
        entry.collapsedRealTips = realTipCount; // actual descendant tip count
        entry.collapsedMaxX     = maxX;
        entry.collapsedColour   = info?.colour ?? null;
        // Always store individual tip info so colour scales, RTT chart, and
        // regression include tips from collapsed clades.  The renderer drawing
        // code separately guards on collapsedTipCount >= collapsedRealTips
        // before using this for individual tip labels.
        entry.collapsedTipNames = _subtreeTipNamesOrdered(gnodes, hiddenNodeIds, nodeIdx, fromNodeIdx, xFromRoot, clampNeg);
        entry.isTip             = true;   // acts as leaf for y-assignment
        tipCounter += heightN;
        entry.y = tipCounter - (heightN - 1) / 2;
        continue; // don't push children onto stack
      }

      const allChildren = gnode.adjacents
        .map((adjIdx, i) => ({ adjIdx, len: gnode.lengths[i] }))
        .filter(({ adjIdx }) => adjIdx !== fromNodeIdx);

      entry.isTip = allChildren.length === 0;
      if (entry.isTip) { tipCounter++; entry.y = tipCounter; entry.collapsedMaxX = xFromRoot; }

      // Collect visible children (forward order), pre-populate entry.children,
      // then push to stack in reverse so forward-order pops happen first.
      const toPush = [];
      for (const { adjIdx, len } of allChildren) {
        const childOrigId = gnodes[adjIdx].origId;
        if (hiddenNodeIds.has(childOrigId)) {
          entry.hasHiddenChildren = true;
        } else if (collapsedCladeIds.has(childOrigId)) {
          // Collapsed clade: treat as a leaf in layout but mark it specially.
          entry.children.push(childOrigId);
          toPush.push({ adjIdx, len, collapsed: true });
        } else {
          entry.children.push(childOrigId);
          toPush.push({ adjIdx, len });
        }
      }
      for (let j = toPush.length - 1; j >= 0; j--) {
        const { adjIdx, len, collapsed } = toPush[j];
        stack.push({ nodeIdx: adjIdx, fromNodeIdx: nodeIdx,
                     xFromRoot: xFromRoot + (clampNeg ? Math.max(0, len) : len),
                     parentLayoutId: gnode.origId,
                     collapsed: !!collapsed });
      }
    }

    // Post-order y-assignment for internal nodes added in this DFS call.
    // layoutNodes is pre-order (parent before children), so iterating in
    // reverse guarantees every child is processed before its parent.
    for (let i = layoutNodes.length - 1; i >= startLen; i--) {
      const node = layoutNodes[i];
      if (node.isTip || node.children.length === 0) continue;
      // If children.length === 0, all children were hidden — leave isTip=false
      // so the suppression post-pass can remove this node.
      const childYs = node.children.map(cid => nodeMap.get(cid).y).filter(y => y != null);
      if (childYs.length > 0)
        node.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
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
    // If all visible tips are on only one branch, collapse to the first
    // bifurcating ancestor so the tree renders without a dangling root stub.
    const eff = hiddenNodeIds.size
      ? _findEffectiveRoot(gnodes, hiddenNodeIds, nodeA, -1)
      : { nodeIdx: nodeA, fromIdx: -1 };
    traverse(eff.nodeIdx, eff.fromIdx, 0, null);

  } else {
    // Virtual bifurcating root between nodeA and nodeB.
    const tipsA = hiddenNodeIds.size ? _countVisibleTips(gnodes, hiddenNodeIds, nodeA, nodeB) : 1;
    const tipsB = hiddenNodeIds.size ? _countVisibleTips(gnodes, hiddenNodeIds, nodeB, nodeA) : 1;

    if (tipsA > 0 && tipsB > 0) {
      // Both sides have visible tips — use the normal virtual bifurcating root.
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

    } else {
      // One entire side of the virtual root is hidden.  Walk down the visible
      // side to the first bifurcating ancestor and use that as the visual root.
      const startIdx  = tipsA > 0 ? nodeA : nodeB;
      const startFrom = tipsA > 0 ? nodeB : nodeA;
      const eff = _findEffectiveRoot(gnodes, hiddenNodeIds, startIdx, startFrom);
      traverse(eff.nodeIdx, eff.fromIdx, 0, null);
    }
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

  let finalNodes = layoutNodes.filter(n => !toRemove.has(n.id));

  // ── Root-collapse pass ────────────────────────────────────────────────────
  // The post-pass above never suppresses the root. After hiding, the root may
  // be degree-2 (1 child remaining). Walk down the single-child chain from the
  // root and promote the first bifurcating (or tip) descendant to be the new
  // layout root, removing all intermediate degree-2 ancestors.
  {
    const rootsToRemove = new Set();
    let rootNode = finalNodes.find(n => n.parentId === null);
    while (rootNode && !rootNode.isTip && rootNode.children.length === 1) {
      const childNode = nodeMap.get(rootNode.children[0]);
      if (!childNode) break;
      // Propagate hasHiddenChildren flag down to the new root.
      if (rootNode.hasHiddenChildren) childNode.hasHiddenChildren = true;
      childNode.parentId = null;   // promote to root
      rootsToRemove.add(rootNode.id);
      nodeMap.delete(rootNode.id);
      rootNode = childNode;
    }
    if (rootsToRemove.size) {
      finalNodes = finalNodes.filter(n => !rootsToRemove.has(n.id));
      // Shift all x values so the new root sits at x = 0.
      const newRoot = finalNodes.find(n => n.parentId === null);
      const newRootX = newRoot?.x ?? 0;
      if (newRootX !== 0) {
        for (const n of finalNodes) n.x -= newRootX;
      }
    }
  }

  // Recompute y positions bottom-up now that suppression may have changed children.
  for (let i = finalNodes.length - 1; i >= 0; i--) {
    const node = finalNodes[i];
    if (node.isTip) continue;
    const childYs = node.children.map(cid => nodeMap.get(cid)?.y).filter(y => y != null);
    if (childYs.length > 0)
      node.y = childYs.reduce((a, b) => a + b, 0) / childYs.length;
  }

  const maxX = finalNodes.reduce((m, n) => Math.max(m, n.collapsedMaxX ?? n.x), 0);
  const maxY = tipCounter;

  return { nodes: finalNodes, nodeMap, maxX, maxY };
}


/**
 * DFS on a PhyloGraph: count visible (non-hidden) tips in the subtree rooted at
 * gStartIdx (going away from gFromIdx), treating extraHiddenId as additionally hidden.
 */
export function graphVisibleTipCount(graph, gStartIdx, gFromIdx, extraHiddenId) {
  let count = 0;
  const stack = [{ ni: gStartIdx, fi: gFromIdx }];
  while (stack.length) {
    const { ni, fi } = stack.pop();
    const gnode = graph.nodes[ni];
    if (graph.hiddenNodeIds.has(gnode.origId) || gnode.origId === extraHiddenId) continue;
    const children = gnode.adjacents.filter(a => a !== fi);
    if (children.length === 0) {
      count++;
    } else {
      for (const c of children) stack.push({ ni: c, fi: ni });
    }
  }
  return count;
}

/**
 * DFS on a PhyloGraph: returns true if any node in the subtree of gStartIdx
 * (going away from gFromIdx) is in hiddenNodeIds.
 */
export function graphSubtreeHasHidden(graph, gStartIdx, gFromIdx) {
  const stack = [{ ni: gStartIdx, fi: gFromIdx }];
  while (stack.length) {
    const { ni, fi } = stack.pop();
    for (const adjIdx of graph.nodes[ni].adjacents) {
      if (adjIdx === fi) continue;
      if (graph.hiddenNodeIds.has(graph.nodes[adjIdx].origId)) return true;
      stack.push({ ni: adjIdx, fi: ni });
    }
  }
  return false;
}



