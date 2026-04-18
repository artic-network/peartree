// ─────────────────────────────────────────────────────────────────────────────
// NEXUS / Newick parser  (adapted from src/tree.js – no npm deps required)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse a Newick string into a lightweight nested node object.
 * Returns the root node { name, length, label, annotations, children }
 */
export function parseNewick(newickString, tipNameMap = null) {
  const tokens = newickString.split(/\s*('[^']*'|"[^"]*"|;|\(|\)|,|:|=|\[&|\]|\{|\})\s*/);
  let level = 0;
  let currentNode = null;
  let nodeStack = [];
  let labelNext = false;
  let lengthNext = false;
  let inAnnotation = false;
  let annotationKeyNext = true;
  let annotationKey = null;
  let isAnnotationARange = false;

  let idCounter = 0;
  function newId() { return `n${idCounter++}`; }

  for (const token of tokens.filter(t => t.length > 0)) {
    if (inAnnotation) {
      if (token === "=")          { annotationKeyNext = false; }
      else if (token === ",")     { if (!isAnnotationARange) annotationKeyNext = true; }
      else if (token === "{")     { isAnnotationARange = true; currentNode.annotations[annotationKey] = []; }
      else if (token === "}")     { isAnnotationARange = false; }
      else if (token === "]")     { inAnnotation = false; annotationKeyNext = true; }
      else {
        let t = token;
        if (t.startsWith('"') || t.startsWith("'")) t = t.slice(1);
        if (t.endsWith('"')   || t.endsWith("'"))   t = t.slice(0, -1);
        if (annotationKeyNext) {
          annotationKey = t.replace('.', '_');
        } else {
          if (isAnnotationARange) {
            // Treat '?' and empty string as null (missing data).
            if (t === '?' || t === '') {
              currentNode.annotations[annotationKey].push(null);
            } else {
              const arrNum = Number(t);
              currentNode.annotations[annotationKey].push(!isNaN(arrNum) ? arrNum : t);
            }
          } else {
            // Treat '?' and empty string as null (missing data).
            if (t === '?' || t === '') {
              currentNode.annotations[annotationKey] = null;
            } else {
              const num = Number(t);
              currentNode.annotations[annotationKey] = !isNaN(num) ? num : t;
            }
          }
        }
      }
    } else if (token === "(") {
      const node = { id: newId(), level, parent: currentNode, children: [], annotations: {} };
      level++;
      if (currentNode) nodeStack.push(currentNode);
      currentNode = node;
    } else if (token === ",") {
      labelNext = false;
      const parent = nodeStack.pop();
      parent.children.push(currentNode);
      currentNode = parent;
    } else if (token === ")") {
      labelNext = false;
      const parent = nodeStack.pop();
      parent.children.push(currentNode);
      level--;
      currentNode = parent;
      labelNext = true;
    } else if (token === ":") {
      labelNext = false;
      lengthNext = true;
    } else if (token === ";") {
      if (level > 0) throw new Error("Unbalanced brackets in Newick string");
      break;
    } else if (token === "[&") {
      inAnnotation = true;
    } else {
      if (lengthNext) {
        currentNode.length = parseFloat(token);
        lengthNext = false;
      } else if (labelNext) {
        currentNode.label = token;
        if (!token.startsWith("#")) {
          // Store raw value under a temporary key; the caller will rename it
          // once the user has chosen an annotation name.
          currentNode.annotations["_node_label"] = token;
        } else {
          currentNode.id = token.slice(1);
        }
        labelNext = false;
      } else {
        // external node
        if (!currentNode.children) currentNode.children = [];
        let name = tipNameMap ? (tipNameMap.get(token) || token) : token;
        name = name.replace(/^['"]|['"]$/g, '').trim().replace(/'/g, '');
        const externalNode = {
          id: newId(),
          name,
          parent: currentNode,
          annotations: {}
        };
        if (currentNode) nodeStack.push(currentNode);
        currentNode = externalNode;
      }
    }
  }

  if (level > 0) throw new Error("Unbalanced brackets in Newick string");

  // ── Post-process: parse pipe-delimited tip names for date annotations ────
  const DATE_RE   = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;
  const CURRENT_YEAR = new Date().getFullYear();
  function annotateDates(root) {
    // Iterative DFS to avoid stack overflow on large/deep trees.
    const stack = [root];
    while (stack.length) {
      const node = stack.pop();
      const isTip = !node.children || node.children.length === 0;
      if (isTip && node.name && node.name.includes('|')) {
        const parts = node.name.split('|');
        const last  = parts[parts.length - 1].trim();
        if (!('date' in node.annotations)) {
          if (DATE_RE.test(last)) {
            node.annotations['date'] = last;
          } else {
            const asInt = Number(last);
            if (Number.isInteger(asInt) && asInt > 0 && asInt <= CURRENT_YEAR) {
              node.annotations['date'] = String(asInt);
            }
          }
        }
      }
      if (node.children) {
        for (let j = node.children.length - 1; j >= 0; j--) stack.push(node.children[j]);
      }
    }
  }
  if (currentNode) annotateDates(currentNode);

  return currentNode;
}

/**
 * Parse a NEXUS string, return array of root-node objects.
 */
export function parseNexus(nexus) {
  const trees = [];
  // split on block delimiters
  const nexusTokens = nexus.split(
    /\s*(?:^|(?<=\s))begin(?=\s)|(?<=\s)end(?=\s*;)\s*;/gi
  );
  // Fallback simpler split for environments where lookbehind isn't supported:
  const rawText = nexus;

  // Robust block extraction using a simple state machine
  const lines = rawText.split('\n');
  let inTreesBlock = false;
  const tipNameMap = new Map();
  let inTranslate = false;
  let peartreeSettings = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    if (lower === 'begin trees;' || lower.startsWith('begin trees;')) {
      inTreesBlock = true; inTranslate = false; continue;
    }
    if (inTreesBlock) {
      if (lower === 'end;' || lower === 'end') { inTreesBlock = false; continue; }

      // Detect embedded PearTree settings comment: [peartree={...}]
      const ptMatch = line.match(/^\[peartree=(\{.*\})\]$/i);
      if (ptMatch) {
        try { peartreeSettings = JSON.parse(ptMatch[1]); } catch { /* ignore malformed */ }
        continue;
      }

      if (lower === 'translate') { inTranslate = true; continue; }
      if (inTranslate) {
        if (line === ';') { inTranslate = false; continue; }
        // lines like: 1 TaxonName,
        const clean = line.replace(/,$/, '').replace(/;$/, '');
        const parts = clean.split(/\s+/);
        if (parts.length >= 2) tipNameMap.set(parts[0], parts.slice(1).join(' '));
        if (line.endsWith(';')) inTranslate = false;
      } else {
        // line like: tree TREE1 = [&R] (...)
        const idx = line.indexOf('(');
        if (idx !== -1) {
          const newickStr = line.slice(idx);
          const root = parseNewick(
            newickStr,
            tipNameMap.size > 0 ? tipNameMap : null
          );
          trees.push({ root, tipNameMap, peartreeSettings });
        }
      }
    }
  }

  // If we found peartree settings but the tree line came before the comment,
  // back-fill any entries that didn't yet have it.
  if (peartreeSettings) {
    for (const t of trees) {
      if (!t.peartreeSettings) t.peartreeSettings = peartreeSettings;
    }
  }

  return trees;
}

// ── Newick / NEXUS serialiser ─────────────────────────────────────────────────

/** Escape a Newick/NEXUS taxon name with single quotes when needed. */
function newickEsc(name) {
  if (!name) return '';
  if (/[(),;:\[\]\s]/.test(name)) return `'${name.replace(/'/g, "''")}'`;
  return name;
}

/** Format a branch length compactly (no scientific notation for typical values). */
function fmtLen(n) {
  if (n == null || isNaN(n)) return null;
  if (n === 0) return '0';
  return parseFloat(n.toPrecision(12)).toString();
}

/** Build a BEAST/FigTree-style [&key=val,...] annotation block. */
function fmtAnnot(annotations, annotKeys) {
  if (!annotations || annotKeys.length === 0) return '';
  const parts = [];
  for (const key of annotKeys) {
    const val = annotations[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      const elems = val.map(v => typeof v === 'string' ? `"${v.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"` : v);
      parts.push(`${key}={${elems.join(',')}}`);
    } else if (typeof val === 'string') {
      parts.push(`${key}="${val.replace(/\\/g,'\\\\').replace(/"/g,'\\"')}"`);
    } else {
      parts.push(`${key}=${val}`);
    }
  }
  return parts.length > 0 ? `[&${parts.join(',')}]` : '';
}

/**
 * Return the branch length from child index `ci` toward parent direction `pi`.
 * Handles the special case where root-adjacent nodes store total edge length.
 */
function branchLen(ci, pi, g) {
  if (pi < 0) return null;
  const { nodeA, nodeB, lenA, lenB } = g.root;
  if (ci === nodeA && pi === nodeB) return lenA;
  if (ci === nodeB && pi === nodeA) return lenB;
  return g.nodes[ci].lengths[0];
}

/**
 * Recursively serialize the subtree rooted at `nodeIdx` (coming from direction
 * `parentIdx`, which is excluded from children) into a Newick string fragment.
 */
function newickNode(nodeIdx, parentIdx, g, annotKeys, nodeLabelKey) {
  const node      = g.nodes[nodeIdx];
  const annotStr  = fmtAnnot(node.annotations, annotKeys);
  const safeName  = newickEsc(node.name || node.label || '');
  const childIdxs = node.adjacents.filter(i => i !== parentIdx);
  if (childIdxs.length === 0) {
    return `${safeName}${annotStr}`;
  }
  const parts = childIdxs.map(ci => {
    const cStr   = newickNode(ci, nodeIdx, g, annotKeys, nodeLabelKey);
    const len    = branchLen(ci, nodeIdx, g);
    const lenStr = len != null ? `:${fmtLen(len)}` : '';
    return `${cStr}${lenStr}`;
  });
  let nodeLabel = node.name ? newickEsc(node.name) : '';
  if (nodeLabelKey) {
    const val = node.annotations?.[nodeLabelKey];
    if (val != null && val !== '') nodeLabel = String(parseFloat(Number(val).toPrecision(6)));
  }
  return `(${parts.join(',')})${nodeLabel}${annotStr}`;
}

/**
 * Serialize the PhyloGraph `g` (or a subtree rooted at `subtreeRootId`) to
 * a Newick string ended with ';'.
 */
export function graphToNewick(g, subtreeRootId, annotKeys, nodeLabelKey = null) {
  const { nodeA, nodeB, lenA } = g.root;
  let body;
  if (subtreeRootId) {
    const idx = g.origIdToIdx.get(subtreeRootId);
    if (idx === undefined) return null;
    const node = g.nodes[idx];
    const parentIdx = node.adjacents.length > 0 ? node.adjacents[0] : -1;
    body = newickNode(idx, parentIdx, g, annotKeys, nodeLabelKey);
  } else if (lenA === 0) {
    // nodeA is the actual root (trifurcating or annotated)
    body = newickNode(nodeA, -1, g, annotKeys, nodeLabelKey);
  } else {
    // Virtual root between nodeA and nodeB
    const aStr = newickNode(nodeA, nodeB, g, annotKeys, nodeLabelKey);
    const bStr = newickNode(nodeB, nodeA, g, annotKeys, nodeLabelKey);
    const aLen = lenA != null        ? `:${fmtLen(lenA)}`        : '';
    const bLen = g.root.lenB != null ? `:${fmtLen(g.root.lenB)}` : '';
    body = `(${aStr}${aLen},${bStr}${bLen})`;
  }
  return body + ';';
}

/**
 * Parse a CSV or TSV string into { headers, rows[] }.
 * Auto-detects delimiter by comparing tab vs comma count in the first line.
 */
export function parseDelimited(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine  = lines[0];
  const tabCount   = (firstLine.match(/\t/g)  || []).length;
  const commaCount = (firstLine.match(/,/g)   || []).length;
  const delimiter  = tabCount >= commaCount ? '\t' : ',';

  function parseLine(line) {
    if (delimiter === '\t') return line.split('\t').map(v => v.trim());
    const result = []; let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        result.push(cur.trim()); cur = '';
      } else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.every(v => !v)) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = vals[j] ?? ''; });
    rows.push(obj);
  }
  return { headers, rows };
}
