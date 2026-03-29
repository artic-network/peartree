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
