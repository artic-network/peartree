import { TreeCalibration } from './phylograph.js';

/**
 * Axis — generic domain/transform/tick engine for canvas axes.
 *
 * This class is intentionally renderer-agnostic:
 * it performs value-domain, range, coordinate-transform, and tick calculations
 * but does not draw to canvas.
 *
 * v1 is focused on parity with tree-axis behavior. It is designed so RTT axes
 * can adopt it with minimal API changes.
 */
export class Axis {
  constructor({ orientation = 'x', type = 'continuous', timeTransform = 'calibrated' } = {}) {
    this.orientation = orientation;
    this.type = type;
    this._timeTransform = (timeTransform === 'linear') ? 'linear' : 'calibrated';

    // Tree/data context
    this._maxValue = 1;
    this._timed = false;
    this._rootValue = 0;
    this._viewMinValue = 0;
    this._calibration = null;
    this._direction = 'forward';

    // Explicit range overrides in axis-value space
    this._rangeLeft = null;
    this._rangeRight = null;

    // Screen transform context
    this._scale = 1;
    this._offset = 0;
    this._paddingLeft = 0;

    // Tick options for time mode
    this._majorInterval = 'auto';
    this._minorInterval = 'off';
  }

  setType(type) {
    this.type = type || 'continuous';
  }

  setTimeTransform(mode) {
    this._timeTransform = (mode === 'linear') ? 'linear' : 'calibrated';
  }

  setGeometry({ maxValue, timed, rootValue, viewMinValue }) {
    if (maxValue != null) this._maxValue = maxValue;
    if (timed != null) this._timed = !!timed;
    if (rootValue != null) this._rootValue = rootValue;
    if (viewMinValue != null) this._viewMinValue = viewMinValue;
  }

  setCalibration(calibration) {
    this._calibration = calibration?.isActive ? calibration : null;
  }

  setDirection(direction) {
    this._direction = (direction === 'reverse') ? 'reverse' : 'forward';
  }

  setRange(leftVal, rightVal) {
    this._rangeLeft = (leftVal != null && isFinite(leftVal)) ? leftVal : null;
    this._rangeRight = (rightVal != null && isFinite(rightVal)) ? rightVal : null;
  }

  setTransform({ scale, offset, paddingLeft }) {
    if (scale != null) this._scale = scale;
    if (offset != null) this._offset = offset;
    if (paddingLeft != null) this._paddingLeft = paddingLeft;
  }

  setTickOptions({ majorInterval, minorInterval }) {
    this._majorInterval = majorInterval || 'auto';
    this._minorInterval = minorInterval || 'off';
  }

  get isTimeAxis() {
    return this.type === 'time';
  }

  getValueDomain() {
    // Do not derive domain span from screen transform. That coupling can explode
    // ranges when scale is small and causes unstable forward/reverse/time axes.
    const extra = 0;

    let leftVal;
    let rightVal;

    if (this.isTimeAxis && this._timeTransform === 'calibrated' && this._calibration?.isActive) {
      const rootV = Math.max(this._rootValue, this._maxValue);
      leftVal = this._calibration.heightToDecYear(rootV + extra);
      rightVal = this._calibration.heightToDecYear(this._viewMinValue);
    } else if (this._direction === 'forward') {
      leftVal = 0;
      rightVal = this._maxValue;
    } else {
      const span = this._maxValue;
      leftVal = span + extra;
      rightVal = 0;
    }

    if (this._rangeLeft != null) leftVal = this._rangeLeft;
    if (this._rangeRight != null) rightVal = this._rangeRight;

    return { leftVal, rightVal };
  }

  valueToWorldX(val) {
    if (this.isTimeAxis && this._timeTransform === 'calibrated' && this._calibration?.isActive) {
      const rootV = Math.max(this._rootValue, this._maxValue);
      return (val - this._calibration.heightToDecYear(rootV)) * this._calibration.rate;
    }
    if (this._direction === 'forward') return val;
    const span = this._maxValue;
    return span - val;
  }

  valueToCanvas(val) {
    return this._offset + this.valueToWorldX(val) * this._scale;
  }

  getWorldExtent() {
    if (this._maxValue == null) return null;
    const { leftVal, rightVal } = this.getValueDomain();
    return {
      worldLeft: this.valueToWorldX(leftVal),
      worldRight: this.valueToWorldX(rightVal),
    };
  }

  /**
   * Return the multiplicative X-scale factor needed so an axis-selected range
   * fits a tree-defined world range. Returns 1 when no extension is needed.
   *
   * @param {number} treeWorldLeft
   * @param {number} treeWorldRight
   */
  getScaleFactorForTreeRange(treeWorldLeft, treeWorldRight) {
    if (!isFinite(treeWorldLeft) || !isFinite(treeWorldRight)) return 1;

    const axisExtent = this.getWorldExtent();
    if (!axisExtent) return 1;

    const treeMin = Math.min(treeWorldLeft, treeWorldRight);
    const treeMax = Math.max(treeWorldLeft, treeWorldRight);
    const axisMin = Math.min(axisExtent.worldLeft, axisExtent.worldRight);
    const axisMax = Math.max(axisExtent.worldLeft, axisExtent.worldRight);

    const treeSpan = treeMax - treeMin;
    const unionMin = Math.min(treeMin, axisMin);
    const unionMax = Math.max(treeMax, axisMax);
    const unionSpan = unionMax - unionMin;

    if (!(treeSpan > 0) || !(unionSpan > 0)) return 1;
    return Math.min(1, treeSpan / unionSpan);
  }

  /**
   * Build major/minor tick arrays for the current value domain.
   * Returns ticks in display order for the configured direction.
   */
  getTicks(targetMajor = 5) {
    const { leftVal, rightVal } = this.getValueDomain();
    const minVal = Math.min(leftVal, rightVal);
    const maxVal = Math.max(leftVal, rightVal);

    let majorTicks;
    let minorTicks;

    if (this.isTimeAxis) {
      const majorInt = this._majorInterval;
      const minorInt = this._minorInterval;

      if (majorInt === 'auto' && minorInt === 'auto') {
        const pair = TreeCalibration.autoCalendarTickPair(minVal, maxVal, targetMajor);
        majorTicks = pair.majorTicks;
        minorTicks = pair.minorTicks;
      } else {
        majorTicks = (majorInt === 'auto')
          ? TreeCalibration.niceCalendarTicks(minVal, maxVal, targetMajor)
          : TreeCalibration.calendarTicksForInterval(minVal, maxVal, majorInt);

        if (minorInt === 'off') {
          minorTicks = [];
        } else if (minorInt === 'auto') {
          const derivedInt = TreeCalibration.derivedMinorInterval(majorTicks);
          const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
          if (derivedInt) {
            const minorAll = TreeCalibration.calendarTicksForInterval(minVal, maxVal, derivedInt);
            minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
          } else {
            minorTicks = [];
          }
        } else {
          const minorAll = TreeCalibration.calendarTicksForInterval(minVal, maxVal, minorInt);
          const majorSet = new Set(majorTicks.map(t => t.toFixed(8)));
          minorTicks = minorAll.filter(t => !majorSet.has(t.toFixed(8)));
        }
      }
    } else {
      majorTicks = Axis.niceTicks(minVal, maxVal, targetMajor);
      const minorAll = majorTicks.length > 1
        ? Axis.niceTicks(minVal, maxVal, targetMajor * 5)
        : [];
      const majorSet = new Set(majorTicks.map(t => t.toPrecision(10)));
      minorTicks = minorAll.filter(t => !majorSet.has(t.toPrecision(10)));

      if (this._direction === 'reverse') {
        majorTicks.reverse();
        minorTicks.reverse();
      }
    }

    return { majorTicks, minorTicks, leftVal, rightVal, minVal, maxVal };
  }

  static niceTicks(min, max, targetCount = 5) {
    const range = max - min;
    if (range === 0) return [min];
    if (targetCount < 1) targetCount = 1;

    const roughStep = range / targetCount;
    const mag = Math.pow(10, Math.floor(Math.log10(Math.abs(roughStep))));
    const norm = roughStep / mag;
    let niceStep;
    if (norm < 1.5) niceStep = 1 * mag;
    else if (norm < 3) niceStep = 2 * mag;
    else if (norm < 7) niceStep = 5 * mag;
    else niceStep = 10 * mag;

    const [lo, hi] = min < max ? [min, max] : [max, min];
    const start = Math.ceil(lo / niceStep - 1e-9) * niceStep;
    const ticks = [];

    for (let t = start; t <= hi + niceStep * 1e-9; t += niceStep) {
      ticks.push(parseFloat(t.toPrecision(10)));
    }

    if (min > max) ticks.reverse();
    return ticks;
  }

  static formatValue(v, step) {
    if (v === 0 && (!step || step >= 1)) return '0';
    if (step > 0) {
      const dp = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
      return v.toFixed(dp);
    }
    const abs = Math.abs(v);
    if (abs >= 100) return v.toFixed(0);
    if (abs >= 10) return v.toFixed(1);
    if (abs >= 1) return v.toFixed(2);
    if (abs >= 0.01) return v.toFixed(3);
    return v.toExponential(2);
  }

  static decimalPlacesForStep(step) {
    if (step >= 1) return 0;
    if (step >= 0.1) return 1;
    if (step >= 0.01) return 2;
    if (step >= 0.001) return 3;
    return 4;
  }

  static niceStepForRange(range, targetCount = 5) {
    if (range <= 0) return 1e-6;
    const mag = Math.pow(10, Math.floor(Math.log10(range / targetCount)));
    const norm = (range / mag) / targetCount;
    if (norm < 1.5) return mag;
    if (norm < 3.5) return 2 * mag;
    if (norm < 7.5) return 5 * mag;
    return 10 * mag;
  }

  static niceYearStepForRange(range) {
    const steps = [1 / 365, 7 / 365, 1 / 12, 2 / 12, 3 / 12, 6 / 12, 1, 2, 5, 10, 25, 50, 100,
      500, 1000, 2000, 5000, 10000, 25000, 50000, 100000];
    const raw = range / 6;
    return steps.find(s => s >= raw) ?? 100000;
  }
}
