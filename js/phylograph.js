// ─────────────────────────────────────────────────────────────────────────────
// PhyloGraph  – unrooted adjacency-list tree with a stored root position
// ─────────────────────────────────────────────────────────────────────────────
//
// PhyloNode {
//   idx:         number      – integer index in graph.nodes[]
//   origId:      string      – original string id from the Newick/NEXUS parser
//   name:        string|null – tip label
//   label:       string|null – internal support / annotation label
//   annotations: {}
//   adjacents:   number[]    – neighbour indices; adjacents[0] is ALWAYS the parent
//   lengths:     number[]    – branch length to each neighbour (parallel to adjacents)
//                              lengths[0] is the full edge length to the parent.
//                              Exception: for the two nodes either side of the root,
//                              lengths[0] stores the TOTAL edge length (lenA + lenB).
// }
//
// Invariant: adjacents[0] = parent direction for every node.
//   • getChildren(node) = node.adjacents.slice(1)
//   • getParentNodeIdx(node) = node.adjacents[0]
//   • Rerooting = swap the new-parent neighbour to index 0 (swapToFront)
//   • Ordering  = sort adjacents[1..] / lengths[1..] together
// }
//
// PhyloGraph {
//   nodes:       PhyloNode[]
//   root:        { nodeA: number, nodeB: number, lenA: number, lenB: number }
//                Indices into nodes[].
//                lenA = distance from root point to nodeA
//                lenB = distance from root point to nodeB  (lenA + lenB = total edge)
//                lenA === 0 means root coincides with nodeA (trifurcating case).
//   origIdToIdx: Map<string, number>   – parser string id → integer index
// }
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the child node indices of `node` (all neighbours except adjacents[0]).
 *
 * @param   {PhyloNode} node
 * @returns {number[]}
 */
export function getChildren(node) {
  return node.adjacents.slice(1);
}

/**
 * Return the index of `node`'s parent node in graph.nodes[].
 * For the two root-adjacent nodes this is the index of the *other* root node.
 *
 * @param   {PhyloNode} node
 * @returns {number}
 */
export function getParentNodeIdx(node) {
  return node.adjacents[0];
}

/**
 * Swap the neighbour `neighborIdx` to position 0 in `node.adjacents` (and
 * mirror the swap in `node.lengths`).  No-op if already at index 0.
 *
 * @param {PhyloNode} node
 * @param {number}    neighborIdx
 */
function swapToFront(node, neighborIdx) {
  const pos = node.adjacents.indexOf(neighborIdx);
  if (pos <= 0) return;
  [node.adjacents[0], node.adjacents[pos]] = [node.adjacents[pos], node.adjacents[0]];
  [node.lengths[0],   node.lengths[pos]]   = [node.lengths[pos],   node.lengths[0]];
}

/**
 * Convert a nested root node (as produced by parseNewick / parseNexus) into a
 * PhyloGraph.  The original nested structure is not modified.
 *
 * Handling the loaded root:
 *   A standard rooted bifurcating tree has a virtual root with exactly 2 children.
 *   fromNestedRoot drops that virtual node and connects its two children directly
 *   across a single root edge.  Their shared adjacents[0] entry stores the *total*
 *   edge length (lenA + lenB) so rerootOnGraph can recover it intact.
 *   graph.root = { nodeA, nodeB, lenA, lenB } records the exact root position.
 *
 *   If the root has 3+ children (trifurcating), it is kept as a real node.
 *   graph.root = { nodeA: rootIdx, nodeB: firstChildIdx, lenA: 0, lenB } so
 *   computeLayoutFromGraph treats nodeA as the layout root with no virtual node.
 *
 * @param   {object}     nestedRoot  – root node from parseNewick()
 * @returns {PhyloGraph}
 */
/**
 * Reroot a PhyloGraph in-place by updating parentIdx values along the path
 * from the new root position back to the old root edge.  O(depth) time, zero
 * allocation — no new node objects are created.
 *
 * The new root position is described the same way as rerootTree():
 *   childOrigId    – origId (string) of the node on the "child" side of the
 *                    target branch (the node whose parentIdx currently points
 *                    toward the old root)
 *   distFromParent – distance from the parent end of that branch to the new
 *                    root point (used only to compute the rootEdge proportion)
 *
 * After the call:
 *   • graph.root = { nodeA: newAIdx, nodeB: newBIdx, lenA: newLenA, lenB: newLenB }
 *     where newAIdx is the former parent and newBIdx is the childOrigId node.
 *   • Every node on the path from newAIdx up to the old root-adjacent node has
 *     its new parent (toward newB) swapped into adjacents[0].
 *   • All edge lengths are unchanged (stored symmetrically in both nodes).
 */
export function rerootOnGraph(graph, childOrigId, distFromParent) {
  const { nodes, root, origIdToIdx } = graph;

  const newBIdx = origIdToIdx.get(childOrigId);
  if (newBIdx === undefined) return;   // unknown id — no-op

  const newBNode     = nodes[newBIdx];
  const newAIdx      = newBNode.adjacents[0];    // adjacents[0] is always the parent
  const totalEdgeLen = newBNode.lengths[0];

  const newLenA = Math.max(0, Math.min(totalEdgeLen, distFromParent));
  const newLenB = totalEdgeLen - newLenA;

  // Walk from newA upward via adjacents[0] until reaching one of the old
  // root-adjacent nodes (stop condition).  Collect the path.
  const oldRootSet = new Set([root.nodeA, root.nodeB]);
  const path = [newAIdx];
  let cur = newAIdx;
  while (!oldRootSet.has(cur)) {
    cur = nodes[cur].adjacents[0];
    path.push(cur);
  }
  // path = [newAIdx, …, oldRootAdjacentNode]

  // For each path node (from old-root end toward newA), swap the downward
  // neighbour (path[i-1]) into adjacents[0].
  for (let i = path.length - 1; i >= 1; i--) {
    swapToFront(nodes[path[i]], path[i - 1]);
  }

  // newA's new parent is newB — swap it into adjacents[0].
  swapToFront(nodes[newAIdx], newBIdx);
  // newB.adjacents[0] already = newAIdx — unchanged.

  graph.root = { nodeA: newAIdx, nodeB: newBIdx, lenA: newLenA, lenB: newLenB };
}

export function fromNestedRoot(nestedRoot) {
  const nodes       = [];
  const origIdToIdx = new Map();

  const rootChildren  = nestedRoot.children || [];
  const isBifurcating = rootChildren.length === 2;

  // ── Pass 1: allocate one PhyloNode per biological node ──────────────────
  // For a bifurcating virtual root we skip nestedRoot itself.
  function allocNode(node) {
    const idx = nodes.length;
    origIdToIdx.set(node.id, idx);
    nodes.push({
      idx,
      origId:      node.id,
      name:        node.name  || null,
      label:       node.label || null,
      annotations: node.annotations || {},
      adjacents:   [],
      lengths:     [],
    });
    if (node.children) for (const c of node.children) allocNode(c);
  }

  if (isBifurcating) {
    for (const c of rootChildren) allocNode(c);
  } else {
    allocNode(nestedRoot);
  }

  // ── Pass 2: build bidirectional edges ────────────────────────────────────
  // linkEdge always pushes the parent onto the child FIRST, so the parent
  // lands at adjacents[0] naturally (the first push for any fresh child node).
  function linkEdge(nestedChild, nestedParent) {
    const ci  = origIdToIdx.get(nestedChild.id);
    const pi  = origIdToIdx.get(nestedParent.id);
    const len = nestedChild.length || 0;

    nodes[ci].adjacents.push(pi);   // parent → index 0 (first entry)
    nodes[ci].lengths.push(len);

    nodes[pi].adjacents.push(ci);   // child  → index ≥ 1 on parent
    nodes[pi].lengths.push(len);
  }

  function buildEdges(node, parentNode) {
    if (parentNode !== null) linkEdge(node, parentNode);
    if (node.children) for (const c of node.children) buildEdges(c, node);
  }

  let root;

  if (isBifurcating) {
    const [cA, cB] = rootChildren;
    const idxA = origIdToIdx.get(cA.id);
    const idxB = origIdToIdx.get(cB.id);
    const lenA = cA.length || 0;
    const lenB = cB.length || 0;
    const totalLen = lenA + lenB;

    // Cross-connect A↔B: each stores the TOTAL edge span so rerootOnGraph can
    // recover the full undivided distance when rerooting onto this edge.
    // Each is the other's "parent" (adjacents[0]), so insert cross-link first.
    nodes[idxA].adjacents.push(idxB);   // idxB → idxA.adjacents[0]
    nodes[idxA].lengths.push(totalLen);

    nodes[idxB].adjacents.push(idxA);   // idxA → idxB.adjacents[0]
    nodes[idxB].lengths.push(totalLen);

    if (cA.children) for (const c of cA.children) buildEdges(c, cA);
    if (cB.children) for (const c of cB.children) buildEdges(c, cB);

    root = { nodeA: idxA, nodeB: idxB, lenA, lenB };

  } else {
    // Trifurcating: include the root as a real node; build all its edges normally.
    buildEdges(nestedRoot, null);

    const rootIdx       = origIdToIdx.get(nestedRoot.id);
    const firstChild    = rootChildren[0];
    const firstChildIdx = origIdToIdx.get(firstChild.id);

    // rootIdx.adjacents[0] = firstChildIdx naturally (first linkEdge call pushed it).
    // lenA = 0 tells computeLayoutFromGraph to treat nodeA as the real layout root.
    root = { nodeA: rootIdx, nodeB: firstChildIdx, lenA: 0, lenB: firstChild.length || 0 };
  }

  return { nodes, root, origIdToIdx };
}

// ─────────────────────────────────────────────────────────────────────────────
// Ordering  – sort children by subtree tip count
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort children (adjacents[1..]) of every internal node by subtree tip count,
 * mutating the graph in place.  adjacents[0] (the parent direction) is never
 * touched.  O(n log n) in the number of nodes.
 *
 * ascending = true  → smaller clades first (ladder-up / comb toward root)
 * ascending = false → larger  clades first (ladder-down / comb toward tips)
 *
 * @param {PhyloGraph} graph
 * @param {boolean}    ascending
 */
export function reorderGraph(graph, ascending) {
  const { nodes, root: { nodeA, nodeB, lenA } } = graph;

  // Post-order DFS.  Returns tip count of the subtree rooted at nodeIdx.
  // Sorts adjacents[1..] in-place at each internal node visited.
  function sortSubtree(nodeIdx) {
    const n = nodes[nodeIdx];
    if (n.adjacents.length === 1) return 1;  // tip (only parent at [0])

    const pairs = [];
    for (let i = 1; i < n.adjacents.length; i++) {
      const ct = sortSubtree(n.adjacents[i]);
      pairs.push({ adj: n.adjacents[i], len: n.lengths[i], ct });
    }
    pairs.sort((a, b) => ascending ? a.ct - b.ct : b.ct - a.ct);
    pairs.forEach(({ adj, len }, i) => { n.adjacents[i + 1] = adj; n.lengths[i + 1] = len; });
    return pairs.reduce((s, p) => s + p.ct, 0);
  }

  if (lenA === 0) {
    // Trifurcating root: nodeA is the real layout root; ALL its adjacents are
    // children in the rendered tree.  Sort all of them together, then restore
    // adjacents[0] = nodeB to maintain the invariant.
    const n = nodes[nodeA];
    const pairs = n.adjacents.map((adj, i) => ({
      adj, len: n.lengths[i], ct: sortSubtree(adj),
    }));
    pairs.sort((a, b) => ascending ? a.ct - b.ct : b.ct - a.ct);
    pairs.forEach(({ adj, len }, i) => { n.adjacents[i] = adj; n.lengths[i] = len; });
    swapToFront(n, nodeB);  // restore invariant

  } else {
    // Bifurcating root: sort each side of the root edge independently.
    const nA = nodes[nodeA];
    const pairsA = [];
    for (let i = 1; i < nA.adjacents.length; i++)
      pairsA.push({ adj: nA.adjacents[i], len: nA.lengths[i], ct: sortSubtree(nA.adjacents[i]) });
    pairsA.sort((a, b) => ascending ? a.ct - b.ct : b.ct - a.ct);
    pairsA.forEach(({ adj, len }, i) => { nA.adjacents[i + 1] = adj; nA.lengths[i + 1] = len; });

    const nB = nodes[nodeB];
    const pairsB = [];
    for (let i = 1; i < nB.adjacents.length; i++)
      pairsB.push({ adj: nB.adjacents[i], len: nB.lengths[i], ct: sortSubtree(nB.adjacents[i]) });
    pairsB.sort((a, b) => ascending ? a.ct - b.ct : b.ct - a.ct);
    pairsB.forEach(({ adj, len }, i) => { nB.adjacents[i + 1] = adj; nB.lengths[i + 1] = len; });

    // Also sort the two root branches against each other.  computeLayoutFromGraph
    // traverses nodeA first (top of canvas), so swap root.nodeA ↔ nodeB when the
    // ordering demands it.
    const ctA = pairsA.length ? pairsA.reduce((s, p) => s + p.ct, 0) : 1;
    const ctB = pairsB.length ? pairsB.reduce((s, p) => s + p.ct, 0) : 1;
    if (ascending ? ctA > ctB : ctA < ctB) {
      const { lenA: la, lenB: lb } = graph.root;
      graph.root = { nodeA: nodeB, nodeB: nodeA, lenA: lb, lenB: la };
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Midpoint root  – finds the branch bisecting the tree's diameter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find the midpoint of the tree: the point on a branch that lies exactly
 * halfway along the longest tip-to-tip path (the diameter).
 *
 * Uses two BFS passes over the undirected graph — O(n) time.
 *
 * @param  {PhyloGraph} graph
 * @returns {{ childNodeId: string, distFromParent: number }}
 *   `childNodeId` is the origId of the "child" endpoint of the midpoint edge
 *   (the one whose adjacents[0] points toward the old root).
 *   `distFromParent` is the distance from the parent endpoint to the midpoint.
 *   Both values can be passed directly to applyReroot / rerootOnGraph.
 */
export function midpointRootGraph(graph) {
  const { nodes } = graph;

  // BFS over the undirected graph from startIdx.
  function bfs(startIdx) {
    const dist = new Map([[startIdx, 0]]);
    const prev = new Map([[startIdx, -1]]);
    const queue = [startIdx];
    for (let qi = 0; qi < queue.length; qi++) {
      const cur = queue[qi];
      const n   = nodes[cur];
      for (let i = 0; i < n.adjacents.length; i++) {
        const adj = n.adjacents[i];
        if (!dist.has(adj)) {
          dist.set(adj, dist.get(cur) + n.lengths[i]);
          prev.set(adj, cur);
          queue.push(adj);
        }
      }
    }
    return { dist, prev };
  }

  // Tips = nodes with degree 1 (only adjacents[0] = parent).
  const tips = nodes.filter(n => n.adjacents.length === 1);
  if (tips.length < 2) {
    const t = tips[0];
    return { childNodeId: t.origId, distFromParent: t.lengths[0] / 2 };
  }

  // Pass 1: BFS from any tip → find tipA (one end of the diameter).
  const { dist: d0 } = bfs(tips[0].idx);
  const tipA = tips.reduce((b, t) => (d0.get(t.idx) > d0.get(b.idx) ? t : b), tips[0]);

  // Pass 2: BFS from tipA → find tipB (other end) + path back via prev.
  const { dist: dA, prev: prevA } = bfs(tipA.idx);
  const tipB = tips.reduce((b, t) => {
    if (t.idx === tipA.idx) return b;
    return dA.get(t.idx) > dA.get(b.idx) ? t : b;
  }, tips.find(t => t.idx !== tipA.idx));

  const diameter = dA.get(tipB.idx);
  const half     = diameter / 2;

  // Reconstruct path tipA → … → tipB.
  const path = [];
  let cur = tipB.idx;
  while (cur !== -1) { path.push(cur); cur = prevA.get(cur); }
  path.reverse();

  // Walk the path, accumulating branch lengths, until we cross the midpoint.
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i];
    const to   = path[i + 1];
    const fn   = nodes[from];
    const edgeLen = fn.lengths[fn.adjacents.indexOf(to)];

    if (acc + edgeLen >= half) {
      // Midpoint lies on this edge.  Identify which endpoint is the "child"
      // in the current rooted graph (adjacents[0] points toward the old root).
      if (nodes[to].adjacents[0] === from) {
        // 'to' treats 'from' as its parent → 'to' is the child.
        return { childNodeId: nodes[to].origId,   distFromParent: half - acc };
      } else {
        // 'from' treats 'to' as its parent → 'from' is the child.
        return { childNodeId: nodes[from].origId, distFromParent: edgeLen - (half - acc) };
      }
    }
    acc += edgeLen;
  }

  // Fallback (should not be reached for a well-formed tree).
  const last = nodes[path[path.length - 1]];
  return { childNodeId: last.origId, distFromParent: last.lengths[0] / 2 };
}
