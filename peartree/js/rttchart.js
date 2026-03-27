// rttchart.js — Root-to-Tip panel controller.
//
// Manages the slide-out RTT panel lifecycle (open/close/pin, resize-handle
// drag) and keeps the RTTRenderer in sync with the tree renderer's state:
//   • point data (built from renderer.nodes + the date annotation)
//   • visual style (tip size/colour/halo, selection colours, bg colour…)
//   • bidirectional selection and hover sync
//
// Called from peartree.js immediately after the TreeRenderer is created.
// ─────────────────────────────────────────────────────────────────────────────

import { RTTRenderer }      from './rttrenderer.js';
import { TreeCalibration }  from './phylograph.js';

/**
 * Create the Root-to-Tip panel controller.
 *
 * @param {Object}   opts
 * @param {HTMLElement} opts.panel          – #rtt-panel
 * @param {HTMLCanvasElement} opts.canvas   – #rtt-canvas  (inside the panel)
 * @param {Function} opts.getRenderer       – () => TreeRenderer instance
 * @param {Function} opts.getCalibration    – () => TreeCalibration instance
 * @param {Function} opts.getDateAnnotKey   – () => string (e.g. "date") or ''
 * @param {Function} opts.getDateFormat     – () => string (e.g. 'yyyy-MM-dd')
 * @param {Function} [opts.onClose]         – () called when closed
 * @param {Function} [opts.onPinChange]     – (pinned:boolean) called on pin toggle
 */
export function createRTTChart({
  panel,
  canvas,
  getRenderer,
  getCalibration,
  getDateAnnotKey,
  getDateFormat,
  getAxisColor,
  getAxisFontSize,
  getAxisLineWidth,
  getTickOptions,
  onClose,
  onPinChange,
}) {
  const rtt = new RTTRenderer(canvas);

  let _open   = false;
  let _pinned = false;

  // ── Header buttons ─────────────────────────────────────────────────────────
  const btnPin   = panel.querySelector('#rtt-btn-pin');
  const btnClose = panel.querySelector('#rtt-btn-close');

  btnPin.addEventListener('click', () => {
    _pinned = !_pinned;
    panel.classList.toggle('pinned', _pinned);
    btnPin.classList.toggle('active', _pinned);
    if (onPinChange) onPinChange(_pinned);
    rtt._resize();
  });

  btnClose.addEventListener('click', () => {
    close();
    if (onClose) onClose();
  });

  // ── Resize-handle drag ─────────────────────────────────────────────────────
  const handle = panel.querySelector('#rtt-resize-handle');
  let _drg = false, _drgX0 = 0, _drgW0 = 0, _rafId = null;

  if (handle) {
    handle.addEventListener('mousedown', e => {
      _drg  = true;
      _drgX0 = e.clientX;
      _drgW0 = panel.offsetWidth;
      document.body.style.cursor = 'ew-resize';
      e.preventDefault();
    });
  }

  window.addEventListener('mousemove', e => {
    if (!_drg) return;
    const delta = _drgX0 - e.clientX;   // drag left → panel grows
    const newW  = Math.max(200, Math.min(900, _drgW0 + delta));
    panel.style.width = `${newW}px`;
    document.documentElement.style.setProperty('--rtt-panel-w', `${newW}px`);
    if (_rafId === null) {
      _rafId = requestAnimationFrame(() => {
        _rafId = null;
        rtt._resize();
        getRenderer()?._resize?.();
      });
    }
  });

  window.addEventListener('mouseup', () => {
    if (_drg) { _drg = false; document.body.style.cursor = ''; }
  });

  // ── Bidirectional selection sync ───────────────────────────────────────────

  /** RTT selection → tree renderer */
  rtt.onSelectionChange = ids => {
    const tr = getRenderer();
    if (!tr) return;
    tr._selectedTipIds = new Set(ids);
    tr._updateMRCA?.();
    tr._notifyStats?.();
    if (tr._onNodeSelectChange) tr._onNodeSelectChange(ids.size > 0);
    tr._dirty = true;
  };

  /** RTT hover → tree renderer */
  rtt.onHoverChange = id => {
    const tr = getRenderer();
    if (!tr) return;
    tr._hoveredNodeId = id;
    tr._dirty = true;
  };

  // ── Data builders ──────────────────────────────────────────────────────────

  function _buildPoints() {
    const tr  = getRenderer();
    const cal = getCalibration();
    const key = getDateAnnotKey();
    if (!tr || !tr.nodes) return [];

    const pts = [];
    for (const node of tr.nodes) {
      if (!node.isTip) continue;
      if (node.isCollapsed) continue;   // collapsed clades show as triangles, not points

      // X axis: assigned date from the chosen date annotation.
      // Works whether or not the Axis calibration is active — parseDateToDecYear
      // handles ISO strings and decimal-year reals directly.
      let x = null;
      if (key) {
        const raw = tr._statValue(node, key);
        if (raw != null) {
          x = TreeCalibration.parseDateToDecYear(String(raw));
        }
      }

      // Colour: resolve exactly as the tree renderer does.
      // Use _statValue so def.dataKey remapping and built-in synthetic keys are
      // handled correctly, matching the tree's own colour logic.
      const colourKey = tr._tipColourBy;
      let colour = null;
      if (colourKey) {
        const val = tr._statValue(node, colourKey);
        if (colourKey === 'user_colour') {
          // The annotation value IS a CSS colour — skip the identity-scale lookup
          // to avoid misses when a freshly-painted colour isn't yet in def.values.
          colour = val ?? null;
        } else {
          colour = tr._tipColourForValue(val) ?? null;
        }
      }

      pts.push({ id: node.id, x, y: node.x, name: node.name ?? node.id, colour });
    }
    return pts;
  }

  function _syncStyle() {
    const tr = getRenderer();
    if (!tr) return;
    Object.assign(rtt, {
      // Tip shape
      tipRadius:             tr.tipRadius,
      tipShapeColor:         tr.tipShapeColor,
      tipHaloSize:           tr.tipHaloSize,
      tipShapeBgColor:       tr.tipShapeBgColor,
      // Canvas background & text
      bgColor:               tr.bgColor,
      fontSize:              tr.fontSize,
      // Selection indicators
      selectedTipStrokeColor:   tr.selectedTipStrokeColor,
      selectedTipFillColor:     tr.selectedTipFillColor,
      selectedTipGrowthFactor:  tr.selectedTipGrowthFactor,
      selectedTipMinSize:       tr.selectedTipMinSize,
      selectedTipStrokeWidth:   tr.selectedTipStrokeWidth,
      selectedTipStrokeOpacity: tr.selectedTipStrokeOpacity,
      selectedTipFillOpacity:   tr.selectedTipFillOpacity,
      // Hover indicators
      tipHoverStrokeColor:      tr.tipHoverStrokeColor,
      tipHoverFillColor:        tr.tipHoverFillColor,
      tipHoverGrowthFactor:     tr.tipHoverGrowthFactor,
      tipHoverMinSize:          tr.tipHoverMinSize,
      tipHoverStrokeWidth:      tr.tipHoverStrokeWidth,
      tipHoverStrokeOpacity:    tr.tipHoverStrokeOpacity,
      tipHoverFillOpacity:      tr.tipHoverFillOpacity,
      // Axis style (from the Axis section in the palette panel)
      axisColor:    getAxisColor?.()    ?? rtt.axisColor,
      axisFontSize: getAxisFontSize?.() ?? rtt.axisFontSize,
      axisLineWidth: getAxisLineWidth?.() ?? rtt.axisLineWidth,
    });
  }

  function _update() {
    if (!_open) return;
    const tr  = getRenderer();
    const cal = getCalibration();
    if (!tr) return;
    _syncStyle();
    if (getTickOptions) rtt.tickOptions = getTickOptions();
    rtt.setCalibration(cal?.isActive ? cal : null, getDateFormat());
    rtt.setPoints(_buildPoints());
    rtt._selectedTipIds = new Set(tr._selectedTipIds);
    rtt._hoveredTipId   = tr._hoveredNodeId;
    rtt._dirty = true;
  }

  // ── Open / Close ───────────────────────────────────────────────────────────

  function open() {
    _open = true;
    panel.classList.add('open');
    // Resize + populate on the next frame (panel may not have laid out yet)
    requestAnimationFrame(() => {
      rtt._resize();
      _update();
    });
  }

  function close() {
    _open = false;
    panel.classList.remove('open');
    if (_pinned) {
      _pinned = false;
      panel.classList.remove('pinned');
      if (btnPin) btnPin.classList.remove('active');
      if (onPinChange) onPinChange(false);
    }
  }

  // ── Public interface ───────────────────────────────────────────────────────
  return {
    open,
    close,
    isOpen:   () => _open,
    isPinned: () => _pinned,

    /** Resize the canvas (call during window resize or panel-pin transitions). */
    resize() { rtt._resize(); },

    /** Call when the visible tip set or tree layout changes. */
    notifyLayoutChange() { _update(); },

    /** Call when the tree renderer's style changes (theme, colours, etc.). */
    notifyStyleChange() {
      if (!_open) return;
      _syncStyle();
      const cal = getCalibration();
      rtt.setCalibration(cal?.isActive ? cal : null, getDateFormat());
      // Re-build points so colours (from colour-by scale) update too.
      rtt.setPoints(_buildPoints());
      rtt._dirty = true;
    },

    /** Call when the tree's selection changes externally (e.g. canvas click). */
    notifySelectionChange() {
      if (!_open) return;
      const tr = getRenderer();
      if (tr) rtt.setSelectedIds(tr._selectedTipIds);
    },

    /** Call when the tree's hover changes externally (tree canvas mousemove). */
    notifyHoverChange(id) {
      if (_open) rtt.setHoveredId(id);
    },

    /** Call when calibration or the date annotation key changes. */
    notifyCalibrationChange() { _update(); },
  };
}
