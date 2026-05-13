// ─────────────────────────────────────────────────────────────────────────────
// AnnotationLabelRenderer
//
// Renders annotation text labels at a compass-relative offset from an anchor
// point on a Canvas 2D context.
//
// Used by TreeRenderer for two distinct label types:
//   • Node labels  – anchor = node position, positions: E / NW / SW
//   • Branch labels – anchor = branch midpoint, positions: N / S
//
// The full 8-point compass model is implemented so additional positions
// (W, NE, SE) can be enabled without further changes to this class.
//
// Compass → Canvas text anchor
//
//    NW  N  NE
//     \  |  /
//  W──[anchor]──E
//     /  |  \
//    SW  S  SE
//
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canvas text-alignment descriptor for each compass direction.
 *   dx: +1 = text starts to the right of anchor,  -1 = left,  0 = centred
 *   dy: +1 = text starts below the anchor,         -1 = above, 0 = centred
 */
const COMPASS = {
  'E':  { baseline: 'middle', align: 'left',   dx: +1, dy:  0 },
  'W':  { baseline: 'middle', align: 'right',  dx: -1, dy:  0 },
  'N':  { baseline: 'bottom', align: 'center', dx:  0, dy: -1 },
  'S':  { baseline: 'top',    align: 'center', dx:  0, dy: +1 },
  'NE': { baseline: 'bottom', align: 'left',   dx: +1, dy: -1 },
  'NW': { baseline: 'bottom', align: 'right',  dx: -1, dy: -1 },
  'SE': { baseline: 'top',    align: 'left',   dx: +1, dy: +1 },
  'SW': { baseline: 'top',    align: 'right',  dx: -1, dy: +1 },
};

export class AnnotationLabelRenderer {
  constructor() {
    this._position      = 'E';
    this._anchorRadius  = 0;
    this._spacing       = 4;
    this._fontSize      = 12;
    this._color         = '#aaaaaa';
    this._typefaceKey   = null;
    this._typefaceStyle = null;
    this._colorFn       = null;
    this._filterFn      = null;
    this._getLabel      = null;
    this._getAnchor     = null;
    this._fontFn        = null;
  }

  /**
   * Update renderer settings.
   * Call from TreeRenderer.setSettings() and from any setter that changes
   * label-relevant properties (e.g. setNodeLabelColourBy).
   *
   * @param {object}   s
   * @param {string}   s.position
   *   Compass direction: 'E' | 'W' | 'N' | 'S' | 'NE' | 'NW' | 'SE' | 'SW'
   * @param {number}   s.anchorRadius
   *   Radius of the anchor element in px.  Used as the minimum offset from the
   *   anchor centre.  Pass 0 for branch-midpoint anchors which have no radius.
   * @param {number}   s.spacing
   *   Additional gap in px applied beyond anchorRadius.
   * @param {number}   s.fontSize         – label size in px
   * @param {string}   s.color            – default CSS colour
   * @param {string|null} s.typefaceKey   – typeface key (null = follow main typeface)
   * @param {string|null} s.typefaceStyle – font style (null = follow main style)
   * @param {((node:object)=>string|null)|null} s.colorFn
   *   Per-node colour override function.  null enables a simpler single-colour
   *   path (ctx.fillStyle is set once before the loop).
   * @param {((node:object)=>boolean)|null} s.filterFn
   *   Return false to skip a node.
   * @param {(node:object)=>string|null} s.getLabel
   *   Returns the display text for a node, or null/'' to skip.
   * @param {(node:object)=>{x:number,y:number}|null} s.getAnchor
   *   Returns the world-space anchor point {x, y} for a node, or null to skip.
   *   wx() / wy() are applied by draw() to convert to screen coordinates.
   * @param {(size:number, key:string|null, style:string|null)=>string} s.fontFn
   *   Builds a CSS font string — typically a bound reference to TreeRenderer._font().
   */
  update(s) {
    this._position      = s.position      ?? 'E';
    this._anchorRadius  = s.anchorRadius  ?? 0;
    this._spacing       = s.spacing       ?? 4;
    this._fontSize      = s.fontSize      ?? 12;
    this._color         = s.color         ?? '#aaaaaa';
    this._typefaceKey   = s.typefaceKey   ?? null;
    this._typefaceStyle = s.typefaceStyle ?? null;
    this._colorFn       = s.colorFn       ?? null;
    this._filterFn      = s.filterFn      ?? null;
    this._getLabel      = s.getLabel      ?? null;
    this._getAnchor     = s.getAnchor     ?? null;
    this._fontFn        = s.fontFn        ?? null;
  }

  /**
   * Draw labels for all nodes in the supplied array.
   *
   * @param {CanvasRenderingContext2D}  ctx
   * @param {Array}                    nodes   – visible node array (_vInner or _vAll)
   * @param {(x:number)=>number}       wx      – world→screen X transform
   * @param {(y:number)=>number}       wy      – world→screen Y transform
   * @param {number}                   scaleY  – current vertical px/world-unit scale;
   *                                             labels are hidden when scaleY < fontSize * 0.5
   */
  draw(ctx, nodes, wx, wy, scaleY) {
    if (!this._getLabel || !this._getAnchor || !this._fontFn) return;
    if (scaleY < this._fontSize * 0.5) return;

    const dir = COMPASS[this._position] ?? COMPASS['E'];
    const R   = this._anchorRadius;
    const sp  = this._spacing;

    ctx.save();
    ctx.font         = this._fontFn(this._fontSize, this._typefaceKey, this._typefaceStyle);
    ctx.fillStyle    = this._color;
    ctx.textBaseline = dir.baseline;
    ctx.textAlign    = dir.align;

    for (const node of nodes) {
      if (this._filterFn && !this._filterFn(node)) continue;
      const label = this._getLabel(node);
      if (!label) continue;
      const anchor = this._getAnchor(node);
      if (!anchor) continue;
      if (this._colorFn) ctx.fillStyle = this._colorFn(node) ?? this._color;
      const ax = wx(anchor.x);
      const ay = wy(anchor.y);
      const tx = dir.dx === 0 ? ax : (dir.dx > 0 ? ax + R + sp : ax - R - sp);
      const ty = dir.dy === 0 ? ay : (dir.dy > 0 ? ay + sp    : ay - sp);
      ctx.fillText(label, tx, ty);
    }
    ctx.restore();
  }
}
