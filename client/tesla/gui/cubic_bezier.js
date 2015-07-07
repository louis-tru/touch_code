/**
 * 三次贝塞尔曲线
 * @class tesla.gui.CubicBezier
 * @createTime 2013-06-01
 * @author louis.chu <louistru@live.com>
 * @copyright (C) 2011 louis.chu, http://teslasoft.co
 * Come from http://trac.webkit.org/browser/trunk/Source/WebCore/platform/graphics/UnitBezier.h
 * @version 1.0
 */

/*
ease:cubic-bezier(0.25,0.1,0.25,1);
linear:cubic-bezier(0,0,1,1)
ease-in:cubic-bezier(0.42, 0.0, 1.0, 1.0)
ease-out:cubic-bezier(0.0, 0.0, 0.58, 1.0)
ease-in-out:cubic-bezier(0.42, 0.0, 0.58, 1.0)
*/

'use strict';

var math = Math;

var CubicBezier = 

$class('tesla.gui.CubicBezier', {

  //private:
  _ax: 0,
  _bx: 0,
  _cx: 0,
  _ay: 0,
  _by: 0,
  _cy: 0,

  /**
   * Calculate the polynomial coefficients, implicit first and last control points are (0,0) and (1,1).
   * @param {Number} p1x
   * @param {Number} p1y
   * @param {Number} p2x
   * @param {Number} p2y
   * @constructor
   */
  CubicBezier: function(p1x, p1y, p2x, p2y){
    
    this._cx = 3.0 * p1x;
    this._bx = 3.0 * (p2x - p1x) - this._cx;
    this._ax = 1.0 - this._cx -this._bx;
     
    this._cy = 3.0 * p1y;
    this._by = 3.0 * (p2y - p1y) - this._cy;
    this._ay = 1.0 - this._cy - this._by;
  },

  sampleCurveX: function(t) {
    // `ax t^3 + bx t^2 + cx t' expanded using Horner's rule.
    return ((this._ax * t + this._bx) * t + this._cx) * t;
  },
 
  sampleCurveY: function(t) {
    return ((this._ay * t + this._by) * t + this._cy) * t;
  },
 
  sampleCurveDerivativeX: function( t) {
    return (3 * this._ax * t + 2 * this._bx) * t + this._cx;
  },
 
  // Given an x value, find a parametric value it came from.
  solveCurveX: function(x, epsilon) {
    var t0;
    var t1;
    var t2;
    var x2;
    var d2;
    var i;
    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 8; i++) {
      x2 = this.sampleCurveX(t2) - x;
      if (math.abs(x2) < epsilon)
        return t2;
      d2 = this.sampleCurveDerivativeX(t2);
      if (math.abs(d2) < 1e-6)
        break;
      t2 = t2 - x2 / d2;
    }
    // Fall back to the bisection method for reliability.
    t0 = 0;
    t1 = 1;
    t2 = x;
    if (t2 < t0)
      return t0;
    if (t2 > t1)
      return t1;
    while (t0 < t1) {
      x2 = this.sampleCurveX(t2);
      if (math.abs(x2 - x) < epsilon)
        return t2;
      if (x > x2)
        t0 = t2;
      else
        t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    // Failure.
    return t2;
  },
  
  solve: function(x, epsilon) {
    return this.sampleCurveY(this.solveCurveX(x, epsilon));
  }

});

/**
 * @type {tesla.gui.CubicBezier}
 * @status
 */
CubicBezier.EASE        = new CubicBezier(0.25, 0.1, 0.25, 1);

/**
 * @type {tesla.gui.CubicBezier}
 * @status
 */
CubicBezier.LINEAR      = new CubicBezier(0, 0, 1, 1);

/**
 * @type {tesla.gui.CubicBezier}
 * @status
 */
CubicBezier.EASE_IN     = new CubicBezier(0.42, 0, 1, 1);

/**
 * @type {tesla.gui.CubicBezier}
 * @status
 */
CubicBezier.EASE_OUT    = new CubicBezier(0, 0, 0.58, 1);

/**
 * @type {tesla.gui.CubicBezier}
 * @status
 */
CubicBezier.EASE_IN_OUT = new CubicBezier(0.42, 0, 0.58, 1);
