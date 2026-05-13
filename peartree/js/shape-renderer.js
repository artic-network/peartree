// ─────────────────────────────────────────────────────────────────────────────
// CircleShapeRenderer
//
// Renders a set of circle shapes (tip circles or internal-node circles) on a
// Canvas 2D context.
//
// TreeRenderer creates one instance for tips and one for internal nodes; it
// calls drawHalos() on both before drawFills() on both so halo rings stay
// visually behind all filled circles regardless of which type is drawn first.
// ─────────────────────────────────────────────────────────────────────────────

export class CircleShapeRenderer {
  constructor() {
    this._radius         = 0;
    this._color          = '#888888';
    this._bgColor        = 'transparent';
    this._haloSize       = 0;
    this._perNodeColorFn = null;   // (node) → CSS colour string | null
    this._filterFn       = null;   // (node) → boolean
  }

  /**
   * Update style settings.
   * Call from TreeRenderer whenever shape settings or colour-by state changes.
   *
   * @param {object}                             s
   * @param {number}                             s.radius          – circle radius in px (0 = hidden)
   * @param {string}                             s.color           – default CSS fill colour
   * @param {string}                             s.bgColor         – CSS halo stroke colour
   * @param {number}                             s.haloSize        – halo width in px (0 = none)
   * @param {((node:object)=>string|null)|null} [s.perNodeColorFn] – per-node fill colour override;
   *                                                                  null enables the fast batched-fill path
   * @param {((node:object)=>boolean)|null}     [s.filterFn]       – return false to skip a node
   */
  update({ radius, color, bgColor, haloSize, perNodeColorFn = null, filterFn = null }) {
    this._radius         = radius;
    this._color          = color;
    this._bgColor        = bgColor;
    this._haloSize       = haloSize;
    this._perNodeColorFn = perNodeColorFn;
    this._filterFn       = filterFn;
  }

  /**
   * Draw halo rings.
   * Must be called before drawFills() so halos appear visually behind fills.
   *
   * @param {CanvasRenderingContext2D}  ctx
   * @param {Array}                    nodes  – visible node array (e.g. _vTips or _vInner)
   * @param {(x:number)=>number}       wx     – world→screen X transform
   * @param {(y:number)=>number}       wy     – world→screen Y transform
   */
  drawHalos(ctx, nodes, wx, wy) {
    const r    = this._radius;
    const halo = this._haloSize;
    if (r <= 0 || halo <= 0) return;
    ctx.strokeStyle = this._bgColor;
    ctx.lineWidth   = halo * 2;
    ctx.beginPath();
    for (const node of nodes) {
      if (this._filterFn && !this._filterFn(node)) continue;
      ctx.moveTo(wx(node.x) + r, wy(node.y));
      ctx.arc(wx(node.x), wy(node.y), r, 0, Math.PI * 2);
    }
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  /**
   * Draw filled circles.
   *
   * When perNodeColorFn is set, each circle is drawn individually so that a
   * different fill colour can be applied per node.  When null, all circles are
   * batched into a single path and filled at once — significantly faster for
   * large trees where every circle shares the same colour.
   *
   * @param {CanvasRenderingContext2D}  ctx
   * @param {Array}                    nodes
   * @param {(x:number)=>number}       wx
   * @param {(y:number)=>number}       wy
   */
  drawFills(ctx, nodes, wx, wy) {
    const r = this._radius;
    if (r <= 0) return;
    if (this._perNodeColorFn) {
      const defaultColor = this._color;
      for (const node of nodes) {
        if (this._filterFn && !this._filterFn(node)) continue;
        ctx.fillStyle = this._perNodeColorFn(node) ?? defaultColor;
        ctx.beginPath();
        ctx.arc(wx(node.x), wy(node.y), r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = this._color;
      ctx.beginPath();
      for (const node of nodes) {
        if (this._filterFn && !this._filterFn(node)) continue;
        ctx.moveTo(wx(node.x) + r, wy(node.y));
        ctx.arc(wx(node.x), wy(node.y), r, 0, Math.PI * 2);
      }
      ctx.fill();
    }
  }
}
