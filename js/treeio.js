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
            const arrNum = t !== '' ? Number(t) : NaN;
            currentNode.annotations[annotationKey].push(!isNaN(arrNum) ? arrNum : t);
          } else {
            const num = t !== '' ? Number(t) : NaN;
            currentNode.annotations[annotationKey] = !isNaN(num) ? num : t;
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
          const v = parseFloat(token);
          currentNode.annotations["label"] = isNaN(v) ? token : v;
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
  // If any tip name contains '|', treat it as a field delimiter.  If the last
  // field looks like a date (yyyy / yyyy-mm / yyyy-mm-dd) and the node does
  // not already have a 'date' annotation, add one.
  const DATE_RE = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;
  function annotateDates(node) {
    const isTip = !node.children || node.children.length === 0;
    if (isTip && node.name && node.name.includes('|')) {
      const parts = node.name.split('|');
      const last  = parts[parts.length - 1].trim();
      if (DATE_RE.test(last) && !('date' in node.annotations)) {
        node.annotations['date'] = last;
      }
    }
    if (node.children) for (const c of node.children) annotateDates(c);
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
