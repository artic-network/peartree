// utils.js — Shared micro-utilities for PearTree.
// Keep this file small: only genuinely cross-cutting helpers with no
// domain-specific dependencies belong here.

/** HTML-escape a value for safe insertion into DOM/HTML strings. */
export function htmlEsc(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Trigger a browser download from an in-memory string or Blob.
 *
 * @param {string|Blob} contentOrBlob  Content to download, or an existing Blob.
 * @param {string}      mimeType       MIME type (ignored when contentOrBlob is already a Blob).
 * @param {string}      filename       Suggested download file name.
 */
export function downloadBlob(contentOrBlob, mimeType, filename) {
  const blob = contentOrBlob instanceof Blob
    ? contentOrBlob
    : new Blob([contentOrBlob], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Returns true if the interval [x1, x2] overlaps any exclusion zone [zl, zr].
 * Used by axis renderers to suppress minor tick labels that would overlap major tick labels.
 *
 * @param {number}             x1    Left edge of candidate label bounding box.
 * @param {number}             x2    Right edge of candidate label bounding box.
 * @param {Array<[number,number]>} zones  Array of [left, right] exclusion zones.
 * @returns {boolean}
 */
export function overlapsZones(x1, x2, zones) {
  for (const [zl, zr] of zones) {
    if (x1 < zr && x2 > zl) return true;
  }
  return false;
}

/**
 * Convert a Blob to a base-64 encoded string.
 * Used by Tauri export paths that require base-64 payload instead of a URL download.
 *
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Wire a drag-and-drop target so that dropping a file calls `onDrop(file)`.
 * Adds the `drag-over` CSS class while a file is being dragged over the element.
 *
 * @param {HTMLElement} el       – drop target
 * @param {Function}    onDrop   – called with the first dropped File (or null)
 * @param {Object}     [opts]
 * @param {boolean}    [opts.checkContains=false] – use relatedTarget containment check on dragleave
 */
export function wireDropZone(el, onDrop, { checkContains = false } = {}) {
  el.addEventListener('dragover', e => {
    e.preventDefault();
    el.classList.add('drag-over');
  });
  el.addEventListener('dragleave', e => {
    if (checkContains && el.contains(e.relatedTarget)) return;
    el.classList.remove('drag-over');
  });
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('drag-over');
    onDrop(e.dataTransfer.files[0] ?? null);
  });
}
