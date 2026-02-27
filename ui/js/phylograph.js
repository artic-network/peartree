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
//   nodes:            PhyloNode[]
//   root:             { nodeA: number, nodeB: number, lenA: number, lenB: number }
//                     Indices into nodes[].
//                     lenA = distance from root point to nodeA
//                     lenB = distance from root point to nodeB  (lenA + lenB = total edge)
//                     lenA === 0 means root coincides with nodeA (trifurcating case).
//   origIdToIdx:      Map<string, number>   – parser string id → integer index
//   annotationSchema: Map<string, AnnotationDef>  – one entry per annotation key
// }
//
// AnnotationDef {
//   name:        string
//   dataType:    'real' | 'integer' | 'proportion' | 'percentage' | 'ordinal' | 'categorical' | 'date' | 'list'
//   min?:        number|string – real/integer: observed min; date: earliest ISO string
//   max?:        number|string – real/integer: observed max; date: latest ISO string
//   values?:     string[]    – categorical / ordinal / date: observed distinct values
//                              (for ordinal and date the array is in meaningful order)
//   elementType?: AnnotationDef  – list: recursive type description of list elements
//   isBranchAnnotation?: boolean  – true when the annotation is stored on the
//                              descendant node but semantically describes the
//                              branch *leading to the parent*.  On rerooting,
//                              such annotations are transferred to whichever
//                              node becomes the new descendant of that branch.
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

  // ── Branch-annotation transfer ──────────────────────────────────────────────────
  // A branch annotation on node N describes the branch N→parent(N).  When
  // rerooting reverses each directed edge in the path, every such annotation
  // must follow its physical branch: move it to the node that was N's old
  // parent (which becomes N's new child on that same branch).
  //
  // Transfer map (pre-gathered to avoid overwrite corruption in a chain):
  //   path[i]  →  path[i+1]    for 0 ≤ i < path.length - 1
  //   path[last]  annotation is DISCARDED — it described the old virtual-root
  //               edge, which has no meaningful direction after rerooting.
  //   otherRootAdj is NOT written — its adjacents[0] still points to path[last]
  //               (unchanged by topology reversal), so its own branch annotation
  //               keeps its original meaning without any transfer.
  //
  // The newB node is NOT in the path, so its annotation is unaffected.
  const schema = graph.annotationSchema;
  if (schema) {
    const branchKeys = [];
    for (const [k, def] of schema) {
      if (def.isBranchAnnotation) branchKeys.push(k);
    }
    if (branchKeys.length > 0) {
      for (const k of branchKeys) {
        // Read all source values BEFORE any write.
        const oldVals = path.map(idx => nodes[idx].annotations[k]);
        const last    = path.length - 1;

        // Pass 1: erase the annotation from every path node.  We must do this
        // before writing so that later nodes in the path start from a clean
        // slate (otherwise a write to path[i+1] in pass 2 would be erased when
        // the delete-pass reaches path[i+1]).
        for (const idx of path) delete nodes[idx].annotations[k];

        // Pass 2: write each path node's old value to the next node in the
        // path (its OLD parent, which is now its new child after edge reversal).
        // We stop at path[last-1] → path[last]; path[last]'s annotation is
        // simply discarded because it described the OLD virtual-root edge,
        // which is no longer meaningful.  otherRootAdj is NOT written — its
        // parent pointer (adjacents[0] = path[last]) is unchanged by rerooting
        // so its own branch annotation retains its original meaning.
        for (let i = 0; i < last; i++) {
          if (oldVals[i] !== undefined) {
            nodes[path[i + 1]].annotations[k] = oldVals[i];
          }
          // If oldVals[i] was undefined we already deleted, so nothing to do.
        }
      }
    }
  }

  // ── Topology reversal ────────────────────────────────────────────────────────────
  // For each path node (from old-root end toward newA), swap the downward
  // neighbour (path[i-1]) into adjacents[0].
  for (let i = path.length - 1; i >= 1; i--) {
    swapToFront(nodes[path[i]], path[i - 1]);
  }

  // newA's new parent is newB — swap it into adjacents[0].
  swapToFront(nodes[newAIdx], newBIdx);
  // newB.adjacents[0] already = newAIdx — unchanged.

  // A rerooted tree places the root point between two real nodes, so the
  // virtual root carries no biological annotations — use empty object so
  // callers can safely use `'key' in graph.root.annotations`.
  graph.root = { nodeA: newAIdx, nodeB: newBIdx, lenA: newLenA, lenB: newLenB, annotations: {} };
}

export function fromNestedRoot(nestedRoot) {
  const nodes       = [];
  const origIdToIdx = new Map();

  const rootChildren    = nestedRoot.children || [];
  const hasRootAnnotations = Object.keys(nestedRoot.annotations || {}).length > 0;
  // Treat a bifurcating root as "virtual" only when it carries no annotations.
  // An annotated root (e.g. BEAST output) is a real biological node and must be
  // included in nodes[] so its annotations are visible and the tree is non-rerooted.
  const isBifurcating = rootChildren.length === 2 && !hasRootAnnotations;

  // ── Pass 1: allocate one PhyloNode per biological node ──────────────────
  // For a bifurcating virtual root we skip nestedRoot itself.
  // Iterative to avoid call-stack overflow on deep/caterpillar trees.
  function allocNode(startNode) {
    const stack = [startNode];
    while (stack.length) {
      const node = stack.pop();
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
      if (node.children) {
        // Push in reverse so children are allocated in forward (original) order.
        for (let j = node.children.length - 1; j >= 0; j--) stack.push(node.children[j]);
      }
    }
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

  // Iterative to avoid call-stack overflow on large/deep (caterpillar) trees.
  function buildEdges(startNode, startParent) {
    const stack = [{ node: startNode, parentNode: startParent }];
    while (stack.length) {
      const { node, parentNode } = stack.pop();
      if (parentNode !== null) linkEdge(node, parentNode);
      if (node.children) {
        // Push in reverse so children are processed in forward (original) order.
        for (let j = node.children.length - 1; j >= 0; j--) {
          stack.push({ node: node.children[j], parentNode: node });
        }
      }
    }
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

    // Save the virtual root's annotations on graph.root — the virtual root
    // node is dropped from nodes[], so this is the only place they are kept.
    const rootAnnotations = nestedRoot.annotations || {};
    root = { nodeA: idxA, nodeB: idxB, lenA, lenB, annotations: rootAnnotations };

  } else {
    // Trifurcating: include the root as a real node; build all its edges normally.
    buildEdges(nestedRoot, null);

    const rootIdx       = origIdToIdx.get(nestedRoot.id);
    const firstChild    = rootChildren[0];
    const firstChildIdx = origIdToIdx.get(firstChild.id);

    // rootIdx.adjacents[0] = firstChildIdx naturally (first linkEdge call pushed it).
    // lenA = 0 tells computeLayoutFromGraph to treat nodeA as the real layout root.
    // Mirror the root node's annotations onto graph.root for uniform access.
    root = { nodeA: rootIdx, nodeB: firstChildIdx, lenA: 0, lenB: firstChild.length || 0,
             annotations: nestedRoot.annotations || {} };
  }

  // A tree is considered explicitly rooted (and therefore not re-rootable) when
  // the root node carries annotations — this is characteristic of trees produced
  // by Bayesian phylogenetic programs (BEAST, MrBayes, etc.) where the root
  // represents a biologically meaningful reconstruction, not an arbitrary outgroup.
  const rooted = Object.keys(root.annotations).length > 0;

  return { nodes, root, origIdToIdx, annotationSchema: buildAnnotationSchema(nodes), rooted, hiddenNodeIds: new Set() };
}

// ─────────────────────────────────────────────────────────────────────────────
// Annotation schema  – auto-detected type definitions for node annotation keys
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Well-known annotation names whose value range is defined by domain convention
 * rather than the observed data.  The renderer uses these fixed bounds for the
 * colour scale so a value of 0.5 always maps to the palette mid-point regardless
 * of whether the actual tree data spans the full range.
 *
 * Keys are matched case-insensitively.  A `null` bound means "use observed".
 * @type {Map<string, {min:number, max:number}>}
 */
export const KNOWN_ANNOTATION_BOUNDS = new Map([
  // Bayesian posterior probability / support
  ['posterior',             { min: 0, max: 1 }],
  ['posterior_probability', { min: 0, max: 1 }],
  ['prob',                  { min: 0, max: 1 }],
  ['probability',           { min: 0, max: 1 }],
  // Bootstrap / general node support expressed as a proportion (0–1)
  // or percentage (0–100) – detected at schema-build time from observed values.
  ['support',               { min: 0, max: 1 }],
  ['bootstrap',             { min: 0, max: 1 }],
  // Explicitly percent-named annotations
  ['percent',               { min: 0, max: 100 }],
  ['percentage',            { min: 0, max: 100 }],
  ['pct',                   { min: 0, max: 100 }],
  ['perc',                  { min: 0, max: 100 }],
  // Common date/time decimal-year annotations do NOT have fixed bounds — omitted.
]);

/**
 * Annotation names that are inherently *branch* annotations: stored on the
 * descendant node in a rooted tree but semantically describe the branch
 * leading to the parent, not a property of the node itself.  These are
 * transferred to the new descendant when a tree is rerooted.
 *
 * Matched case-insensitively.
 * @type {Set<string>}
 */
export const KNOWN_BRANCH_ANNOTATIONS = new Set([
  'bootstrap', 'support',
  'posterior', 'posterior_probability', 'prob', 'probability',
  'label',    // raw non-numeric Newick internal-node labels
]);

/**
 * True for any numeric annotation type: real, integer, proportion, or percentage.
 * Use instead of multiple `=== 'real' || === 'integer'` comparisons.
 * @param {string} dt
 */
export function isNumericType(dt) {
  return dt === 'real' || dt === 'integer' || dt === 'proportion' || dt === 'percentage';
}

// ─────────────────────────────────────────────────────────────────────────────
// Date utilities
// ─────────────────────────────────────────────────────────────────────────────

const DATE_FULL_RE  = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MONTH_RE = /^\d{4}-\d{2}$/;
const DATE_YEAR_RE  = /^\d{4}$/;

function isDateString(v) {
  return typeof v === 'string' &&
    (DATE_FULL_RE.test(v) || DATE_MONTH_RE.test(v) || DATE_YEAR_RE.test(v));
}

/**
 * Convert an ISO date string (yyyy-mm-dd, yyyy-mm, or yyyy) to a decimal year.
 * Used for sequential colour scaling and legend tick positioning.
 * @param  {string} dateStr
 * @returns {number}
 */
export function dateToDecimalYear(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return NaN;
  const parts = String(dateStr).split('-');
  const year  = parseInt(parts[0], 10);
  if (isNaN(year)) return NaN;
  if (parts.length === 1) return year;                          // yyyy → start of year
  const month = parseInt(parts[1], 10);                        // 1–12
  if (parts.length === 2) return year + (month - 1) / 12;     // yyyy-mm → start of month
  const day   = parseInt(parts[2], 10);
  const startOfYear = new Date(year, 0, 1);
  const startOfDay  = new Date(year, month - 1, day);
  const endOfYear   = new Date(year + 1, 0, 1);
  const daysInYear  = (endOfYear - startOfYear) / 86400000;
  const dayOfYear   = (startOfDay - startOfYear) / 86400000;
  return year + dayOfYear / daysInYear;
}

/**
 * Build a number-to-string formatter calibrated to an annotation's observed range.
 * Uses the actual data range (observedMin/observedMax) to set resolution, so that
 * consecutive tick labels are always distinguishable, then picks fixed-point or
 * scientific notation based on magnitude.
 *
 * @param  {object} def   AnnotationDef with { dataType, observedMin, observedMax }
 * @param  {string} [mode='ticks']  'ticks' – precision for axis/legend tick labels (~5 divisions);
 *                                  'value' – higher precision for individual data values (+2 dp)
 * @returns {(v:number) => string}
 */
export function makeAnnotationFormatter(def, mode = 'ticks') {
  if (!def || !isNumericType(def.dataType)) {
    return v => String(v);
  }
  // proportion and percentage share the 'real' continuous formatting path;
  // integer (and percentage-from-integers) uses fast integer rounding.
  if (def.dataType === 'integer') return v => String(Math.round(v));

  const obsMin   = def.observedMin ?? def.min ?? 0;
  const obsMax   = def.observedMax ?? def.max ?? 1;
  const obsRange = Math.abs(obsMax - obsMin);
  const maxAbs   = Math.max(Math.abs(obsMin), Math.abs(obsMax));

  // Step size assuming ~5 ticks; dpTicks = decimal places to distinguish consecutive ticks.
  const step    = obsRange > 0 ? obsRange / 5 : (maxAbs > 0 ? maxAbs / 5 : 1);
  const dpTicks = step > 0 ? Math.max(0, Math.ceil(-Math.log10(step))) : 2;
  // Value mode adds 2 extra decimal places so individual data points are distinguishable.
  const dp      = mode === 'value' ? dpTicks + 2 : dpTicks;

  // Scientific notation when fixed would need >4 tick-level dp, or magnitude is extreme.
  const useExp = dpTicks > 4 || maxAbs >= 1e6 || (maxAbs > 0 && maxAbs < 1e-3);

  if (useExp) return v => v === 0 ? '0' : v.toExponential(mode === 'value' ? 4 : 2);
  return v => v.toFixed(dp);
}

/**
 * Infer an AnnotationDef (without `name`) from a flat array of observed values.
 * Called recursively for list element types.
 *
 * @param  {any[]} values  – all observed non-null values for one annotation key
 * @returns {Omit<AnnotationDef, 'name'>}
 */
function inferAnnotationType(values) {
  // ── List type: at least one value is an array ────────────────────────────
  if (values.some(v => Array.isArray(v))) {
    const elements = values.flatMap(v => Array.isArray(v) ? v : [v]);
    return { dataType: 'list', elementType: inferAnnotationType(elements) };
  }

  // ── Numeric types ────────────────────────────────────────────────────────
  const numericValues = values.filter(v => typeof v === 'number' && !Number.isNaN(v));
  if (numericValues.length === values.length) {
    // Avoid Math.min/max spread — large annotation arrays overflow the argument stack.
    let min = Infinity, max = -Infinity;
    for (const v of numericValues) { if (v < min) min = v; if (v > max) max = v; }
    const allInteger = numericValues.every(v => Number.isInteger(v));
    // observedMin/Max preserve the actual data range; min/max may be overridden later
    // by KNOWN_ANNOTATION_BOUNDS (e.g. posterior always 0–1).
    return { dataType: allInteger ? 'integer' : 'real', min, max, observedMin: min, observedMax: max };
  }

  // ── Date type (yyyy-mm-dd, yyyy-mm, or yyyy) ─────────────────────────────
  // Require at least one value in yyyy-mm or yyyy-mm-dd form to confirm it is
  // a date annotation, not just bare integer years (which are detected above).
  const stringValues = values.map(v => String(v));
  if (stringValues.every(isDateString) &&
      stringValues.some(v => DATE_FULL_RE.test(v) || DATE_MONTH_RE.test(v))) {
    const distinct = [...new Set(stringValues)].sort(); // ISO lex order = chronological
    return { dataType: 'date', values: distinct, min: distinct[0], max: distinct[distinct.length - 1] };
  }

  // ── Categorical (default for string / mixed) ─────────────────────────────
  const distinct = [...new Set(stringValues)].sort();
  return { dataType: 'categorical', values: distinct };
}

/**
 * Build an AnnotationSchema by scanning all nodes in the graph.
 * The schema is a Map<name, AnnotationDef> keyed by annotation name.
 *
 * Data types are inferred automatically:
 *   real        – all values are non-integer numbers
 *   integer     – all values are integers
 *   date        – all values are ISO date strings (yyyy-mm[-dd]); sorted chronologically
 *   categorical – values are strings (or a mix); distinct values listed
 *   ordinal     – not auto-detected; upgrade manually when order is known
 *   list        – values are arrays; elementType is inferred recursively
 *
 * @param  {PhyloNode[]} nodes
 * @returns {Map<string, AnnotationDef>}
 */
export function buildAnnotationSchema(nodes) {
  // Collect all annotation keys across all nodes, tracking tip vs internal node presence.
  const allKeys = new Set();
  for (const node of nodes) {
    for (const k of Object.keys(node.annotations)) allKeys.add(k);
  }

  const schema = new Map();
  for (const name of allKeys) {
    const values = [];
    let onTips  = false;
    let onNodes = false;
    for (const node of nodes) {
      if (Object.prototype.hasOwnProperty.call(node.annotations, name)) {
        const v = node.annotations[name];
        if (v !== null && v !== undefined && v !== '?') {
          values.push(v);
          // Tips have exactly one adjacent (the parent); internal nodes have more.
          if (node.adjacents.length === 1) onTips  = true;
          else                             onNodes = true;
        }
      }
    }
    if (values.length > 0) {
      const def = { name, onTips, onNodes, ...inferAnnotationType(values) };
      // Override min/max with well-known fixed bounds when they exist, so the
      // colour scale always spans the full canonical range (e.g. 0–1 for posterior).
      const knownKey = [...KNOWN_ANNOTATION_BOUNDS.keys()]
        .find(k => k.toLowerCase() === name.toLowerCase());
      if (knownKey && (def.dataType === 'real' || def.dataType === 'integer')) {
        const bounds = KNOWN_ANNOTATION_BOUNDS.get(knownKey);
        // If the canonical range is 0–1 but observed values exceed 1, treat the
        // annotation as a percentage (0–100 scale) instead.  This covers both
        // real-valued fractions (e.g. 0.95) and integer percents (e.g. 95, 100)
        // — the dataType is 'integer' when all values are whole numbers, so
        // both branches are intentionally included in this check.
        const effectiveBounds =
          (bounds.max === 1 && def.observedMax != null && def.observedMax > 1)
            ? { min: 0, max: 100 }
            : bounds;
        def.min = effectiveBounds.min;
        def.max = effectiveBounds.max;
        def.fixedBounds = true;
        // Assign semantic type based on fixed bounds range.
        if (effectiveBounds.min === 0 && effectiveBounds.max === 1) {
          def.dataType = 'proportion';
        } else if (effectiveBounds.min === 0 && effectiveBounds.max === 100) {
          def.dataType = 'percentage';
        }
        // observedMin/observedMax are preserved from inferAnnotationType.
      }
      // Attach formatters and observed range for convenient use by renderers.
      // def.fmt      – tick/legend precision (~5 divisions)
      // def.fmtValue – higher precision for individual data values (e.g. tip labels)
      if (isNumericType(def.dataType)) {
        def.observedRange = (def.observedMax ?? def.max ?? 0) - (def.observedMin ?? def.min ?? 0);
        def.fmt      = makeAnnotationFormatter(def, 'ticks');
        def.fmtValue = makeAnnotationFormatter(def, 'value');
      }
      // Auto-flag well-known branch annotations (user can override in curator).
      const lowerName = name.toLowerCase();
      if ([...KNOWN_BRANCH_ANNOTATIONS].some(k => k.toLowerCase() === lowerName)) {
        def.isBranchAnnotation = true;
      }
      schema.set(name, def);
    }
  }

  // ── BEAST annotation grouping ───────────────────────────────────────────
  // Detect keys like `height_median`, `height_95%_HPD`, `height_range` and
  // link them to their base key (`height`).  The base keeps a `group` map
  // { median, hpd, range, … } → key name.  Each member gets `groupMember`
  // set to the base key name so it can be hidden from colour-by dropdowns.
  // Suffixes listed longest-first so '_95%_HPD' is matched before any shorter
  // hypothetical overlap.
  const BEAST_SUFFIXES = [
    ['_95%_HPD', 'hpd'],
    ['_median',  'median'],
    ['_range',   'range'],
    ['_mean',    'mean'],
    ['_lower',   'lower'],
    ['_upper',   'upper'],
  ];
  for (const [name, def] of schema) {
    for (const [suffix, label] of BEAST_SUFFIXES) {
      if (name.endsWith(suffix)) {
        const base = name.slice(0, -suffix.length);
        if (schema.has(base)) {
          def.groupMember = base;
          const baseDef = schema.get(base);
          baseDef.group = baseDef.group || {};
          baseDef.group[label] = name;
        }
        break; // only the first matching suffix applies
      }
    }
  }

  // ── Synthesize missing base keys from _mean ────────────────────────────
  // If suffixed variants exist (e.g. height_mean, height_median, height_95%_HPD)
  // but no bare base key (height) is present, promote height_mean as the primary
  // entry named 'height', keeping height_mean as a sub-annotation (groupMember).
  // This handles BEAST trees where the raw variable was not logged separately.
  {
    // First pass: collect all orphaned suffixed keys grouped by their base name.
    const orphanedBases = new Map(); // base → Map<label, key>
    for (const name of schema.keys()) {
      for (const [suffix, label] of BEAST_SUFFIXES) {
        if (name.endsWith(suffix)) {
          const base = name.slice(0, -suffix.length);
          if (!schema.has(base)) {
            if (!orphanedBases.has(base)) orphanedBases.set(base, new Map());
            orphanedBases.get(base).set(label, name);
          }
          break;
        }
      }
    }

    // Second pass: for each orphaned base that has a _mean member, synthesise
    // a base entry that is a clone of the _mean def.  Insert it just before
    // the first member in Map iteration order so the UI lists it naturally.
    for (const [base, members] of orphanedBases) {
      if (!members.has('mean')) continue;       // no _mean — nothing to promote
      const meanKey = base + '_mean';
      const meanDef = schema.get(meanKey);
      if (!meanDef) continue;

      // Clone _mean as the synthetic base; give it its own group map.
      const synth = { ...meanDef, name: base, group: {} };

      // Register all members (including _mean itself) under the synthetic base.
      for (const [label, key] of members) {
        synth.group[label] = key;
        schema.get(key).groupMember = base;
      }

      // Rebuild the Map so the synthetic base appears before its first member.
      const firstMemberKey = members.values().next().value;
      const entries = [...schema];
      schema.clear();
      for (const [k, v] of entries) {
        if (k === firstMemberKey) schema.set(base, synth);
        schema.set(k, v);
      }
    }
  }

  return schema;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ordering  – sort children by subtree tip count
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rotate a node: reverse the order of its direct children (adjacents[1..]).
 * If `recursive` is true, also rotate every internal descendant in the subtree.
 * adjacents[0] (the parent direction) is never touched.
 * Mutates the graph in place.  O(k) for a single node, O(n) when recursive.
 *
 * @param {PhyloGraph} graph
 * @param {string}     origId     – origId of the target internal node
 * @param {boolean}    [recursive=false] – if true, rotate all internals in the subtree
 */
export function rotateNodeGraph(graph, origId, recursive = false) {
  const { nodes, origIdToIdx } = graph;
  const startIdx = origIdToIdx.get(origId);
  if (startIdx === undefined) return;

  function reverseChildren(nodeIdx) {
    const n = nodes[nodeIdx];
    const nCh = n.adjacents.length - 1;   // number of children (skip [0] = parent)
    if (nCh < 2) return;                  // tip or single child – nothing to swap
    const adjs = n.adjacents.slice(1).reverse();
    const lens = n.lengths.slice(1).reverse();
    for (let i = 0; i < nCh; i++) {
      n.adjacents[i + 1] = adjs[i];
      n.lengths[i + 1]   = lens[i];
    }
  }

  if (!recursive) {
    reverseChildren(startIdx);
  } else {
    // Iterative DFS downward from startIdx.  adjacents[0] is always the parent
    // direction, so we only descend into adjacents[1..] — avoiding cycles.
    const dfsStack = [startIdx];
    while (dfsStack.length) {
      const nodeIdx = dfsStack.pop();
      reverseChildren(nodeIdx);
      const n = nodes[nodeIdx];
      for (let i = 1; i < n.adjacents.length; i++) dfsStack.push(n.adjacents[i]);
    }
  }
}

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
  const hiddenNodeIds = graph.hiddenNodeIds || new Set();

  // Iterative post-order DFS: collect nodes top-down (pre-order), then process
  // bottom-up to compute visible tip counts and sort children in-place.
  // Avoids call-stack overflow on deep/caterpillar trees.
  // adjacents[0] is always the parent direction; we only descend into adjacents[1..].
  function sortSubtree(rootNodeIdx) {
    const order = [];
    const stk = [rootNodeIdx];
    while (stk.length) {
      const i = stk.pop();
      const n = nodes[i];
      if (hiddenNodeIds.has(n.origId)) continue;  // skip entire hidden subtree
      order.push(i);
      for (let k = n.adjacents.length - 1; k >= 1; k--) stk.push(n.adjacents[k]);
    }

    const tipCounts = new Map();
    for (let i = order.length - 1; i >= 0; i--) {
      const idx = order[i];
      const n = nodes[idx];
      if (n.adjacents.length === 1) {
        tipCounts.set(idx, 1);  // tip
      } else {
        const pairs = [];
        for (let k = 1; k < n.adjacents.length; k++) {
          const ct = tipCounts.get(n.adjacents[k]) ?? 0;
          pairs.push({ adj: n.adjacents[k], len: n.lengths[k], ct });
        }
        pairs.sort((a, b) => ascending ? a.ct - b.ct : b.ct - a.ct);
        pairs.forEach(({ adj, len }, k) => { n.adjacents[k + 1] = adj; n.lengths[k + 1] = len; });
        tipCounts.set(idx, pairs.reduce((s, p) => s + p.ct, 0));
      }
    }
    return tipCounts.get(rootNodeIdx) ?? 0;
  }

  if (lenA === 0) {
    // Real root node: ALL its adjacents are children in the rendered tree.
    // Sort all of them together.  No swapToFront here — adjacents[0] is a
    // child, not a parent, so we must not restore it after sorting.
    // Keep graph.root.nodeB in sync with whatever lands at adjacents[0].
    const n = nodes[nodeA];
    const pairs = n.adjacents.map((adj, i) => ({
      adj, len: n.lengths[i], ct: sortSubtree(adj),
    }));
    pairs.sort((a, b) => ascending ? a.ct - b.ct : b.ct - a.ct);
    pairs.forEach(({ adj, len }, i) => { n.adjacents[i] = adj; n.lengths[i] = len; });
    // Update nodeB so the invariant (nodeB === adjacents[0] of nodeA) is kept.
    graph.root = { ...graph.root, nodeB: n.adjacents[0] };

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
