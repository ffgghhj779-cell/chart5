/**
 * useChartRenderer.js
 * Core rendering engine: multi-layer Canvas 2D with RAF-batched dirty rendering.
 * Implemented as a plain-JS class (ChartRenderer) wrapped in a React hook.
 */
import { useEffect, useRef, useMemo } from 'react';
import { LAYOUT } from '../constants/layout.js';
import { COLORS } from '../constants/colors.js';
import { scaleCanvases, priceTag, rrect } from '../utils/canvas.js';
import { fmtPrice, fmtVol, fmtAxisDate, fmtFullDate } from '../utils/format.js';
import {
  xForIndex, yForPrice, priceAtY, candleWidth,
  visiblePriceRange, buildVRVP,
} from '../utils/chartMath.js';

// ─────────────────────────────────────────────────────────────────────────────
// ChartRenderer class — owns all canvas state and rendering logic
// ─────────────────────────────────────────────────────────────────────────────
class ChartRenderer {
  constructor() {
    this.ctxs        = {};      // { bg, grid, main, vol, prof, ov }
    this.W           = 0;
    this.H           = 0;
    this.candles     = [];
    this.viewStart   = 0;
    this.viewEnd     = 0;
    this.mouseX      = -1;
    this.mouseY      = -1;
    this.lastWsPrice = 0;
    this.currentIv   = '1d';
    this.showPOC     = true;
    this.showLiq     = true;
    this.showVA      = true;

    this.dirty       = new Set();
    this.rafId       = 0;

    // Drag state
    this.dragX0      = null;
    this.dragView0   = null;

    // Touch state
    this.touchX0     = null;
    this.touchDist0  = null;
    this.touchView0  = null;

    // Callbacks set by the hook
    this.onHoverCandle = null;
    this.onViewChange  = null;

    // Bind RAF callback once
    this._renderFrame = this._renderFrame.bind(this);
  }

  // ── Initialise / resize ────────────────────────────────────────
  init(canvasMap) {
    // canvasMap: { bg, grid, main, vol, prof, ov } → HTMLCanvasElement
    this._canvasMap = canvasMap;
  }

  resize(W, H) {
    this.W = W;
    this.H = H;
    if (!this._canvasMap) return;
    this.ctxs = scaleCanvases(this._canvasMap, W, H);
    this.markDirty('bg', 'grid', 'main', 'vol', 'prof', 'ov');
  }

  // ── External data sync ─────────────────────────────────────────
  updateData({ candles, lastWsPrice, currentIv, showPOC, showLiq, showVA }) {
    const prevLen    = this.candles.length;
    this.candles     = candles;
    this.lastWsPrice = lastWsPrice;
    this.currentIv   = currentIv;
    this.showPOC     = showPOC;
    this.showLiq     = showLiq;
    this.showVA      = showVA;

    // Clamp view to new data bounds
    if (this.viewEnd === 0 || this.viewEnd > candles.length) {
      this.viewEnd = candles.length;
    }
    if (prevLen !== candles.length) {
      this.viewEnd = candles.length;
    }

    this.markDirty('main', 'vol', 'prof', 'ov');
  }

  // ── Dirty scheduling ───────────────────────────────────────────
  markDirty(...ids) {
    ids.forEach(id => this.dirty.add(id));
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this._renderFrame);
    }
  }

  _renderFrame() {
    this.rafId = 0;
    const todo = this.dirty;
    this.dirty = new Set();
    if (todo.has('bg'))   this._drawBG();
    if (todo.has('grid')) this._drawGrid();
    if (todo.has('main')) this._drawCandles();
    if (todo.has('vol'))  this._drawVolume();
    if (todo.has('prof')) this._drawProfile();
    if (todo.has('ov'))   this._drawOverlay();
  }

  // ── Layout helpers ─────────────────────────────────────────────
  get _profW() { return this.W < 600 ? Math.max(65, this.W * 0.22) : LAYOUT.PROFILE_W; }
  get _priceAx() { return this.W < 600 ? 55 : LAYOUT.PRICE_AXIS; }
  get _mH() { return this.H * (1 - LAYOUT.VOL_RATIO) - LAYOUT.TIME_AXIS; }
  get _vH() { return this.H * LAYOUT.VOL_RATIO; }
  get _mW() { return this.W - this._profW - this._priceAx; }
  get _pX() { return this._mW + this._priceAx; }

  _xFor(i)          { return xForIndex(i, this.viewStart, this.viewEnd, LAYOUT.LEFT_PAD, this._mW); }
  _yFor(p, lo, hi)  { return yForPrice(p, this._mH, lo, hi); }
  _priceAt(y,lo,hi) { return priceAtY(y, this._mH, lo, hi); }
  _cw()             { return candleWidth(this.viewStart, this.viewEnd, this._mW); }
  _range()          { return visiblePriceRange(this.candles, this.viewStart, this.viewEnd); }

  // ── LAYER: Background ──────────────────────────────────────────
  _drawBG() {
    const { bg: ctx } = this.ctxs;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.W, this.H);
    const g = ctx.createLinearGradient(0, 0, this.W * 0.55, this.H);
    g.addColorStop(0,   COLORS.bg0);
    g.addColorStop(0.5, COLORS.bg1);
    g.addColorStop(1,   COLORS.bg2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);
    // Subtle right-panel tint
    const pg = ctx.createLinearGradient(this._pX, 0, this.W, 0);
    pg.addColorStop(0, 'rgba(255,255,200,0)');
    pg.addColorStop(1, 'rgba(255,255,185,0.38)');
    ctx.fillStyle = pg;
    ctx.fillRect(this._pX - 1, 0, this._profW + 2, this._mH + LAYOUT.TIME_AXIS);
  }

  // ── LAYER: Grid + Axes ─────────────────────────────────────────
  _drawGrid() {
    const { grid: ctx } = this.ctxs;
    if (!ctx || !this.candles.length) return;
    const mH = this._mH, mW = this._mW;
    ctx.clearRect(0, 0, this.W, this.H);
    const { lo, hi } = this._range();

    // Horizontal grid lines
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth   = 1;
    for (let g = 0; g <= 8; g++) {
      const y = mH * g / 8;
      ctx.beginPath();
      ctx.moveTo(LAYOUT.LEFT_PAD, y);
      ctx.lineTo(mW, y);
      ctx.stroke();
    }

    // Price axis labels
    ctx.font      = '10px Inter,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.axisTxt;
    for (let g = 1; g < 8; g++) {
      const y = mH * g / 8;
      const p = this._priceAt(y, lo, hi);
      ctx.fillText(fmtPrice(p), mW + this._priceAx - 5, y + 4);
      ctx.strokeStyle = COLORS.gridStrong;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(mW, y);
      ctx.lineTo(mW + 4, y);
      ctx.stroke();
    }

    // Time axis labels + vertical grid lines
    const minPxBetween = 65;
    let lastX = -999;
    let lastMonthKey = '';
    ctx.font      = '9px Inter,sans-serif';
    ctx.textAlign = 'center';
    for (let i = this.viewStart; i < this.viewEnd; i++) {
      if (i < 0 || i >= this.candles.length) continue;
      const x = this._xFor(i);
      if (x - lastX < minPxBetween) continue;
      const c  = this.candles[i];
      const d  = new Date(c.t);
      const iv = this.currentIv;
      let label;
      if (iv === '1d' || iv === '1w') {
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (key !== lastMonthKey) {
          label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          lastMonthKey = key;
        } else {
          label = String(d.getDate());
        }
      } else {
        label = fmtAxisDate(c.t, iv);
      }
      // Vertical grid line
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mH);
      ctx.stroke();
      // Tick
      ctx.strokeStyle = COLORS.gridStrong;
      ctx.beginPath();
      ctx.moveTo(x, mH);
      ctx.lineTo(x, mH + 4);
      ctx.stroke();
      // Label
      ctx.fillStyle = COLORS.axisTxt;
      ctx.fillText(label, x, mH + LAYOUT.TIME_AXIS - 5);
      lastX = x;
    }

    // Separator lines
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, mH);
    ctx.lineTo(mW, mH);
    ctx.stroke();
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(this._pX, 0);
    ctx.lineTo(this._pX, mH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── LAYER: Candlesticks ────────────────────────────────────────
  _drawCandles() {
    const { main: ctx } = this.ctxs;
    if (!ctx || !this.candles.length) return;
    const mH = this._mH, cw = this._cw();
    const { lo, hi } = this._range();
    ctx.clearRect(0, 0, this.W, this.H);
    const s = Math.max(0, this.viewStart);
    const e = Math.min(this.candles.length, this.viewEnd);
    for (let i = s; i < e; i++) {
      const c   = this.candles[i];
      const x   = this._xFor(i);
      const col = c.c >= c.o ? COLORS.bull : COLORS.bear;
      const yO  = this._yFor(c.o, lo, hi);
      const yC  = this._yFor(c.c, lo, hi);
      const yH  = this._yFor(c.h, lo, hi);
      const yL  = this._yFor(c.l, lo, hi);
      // Wick
      ctx.strokeStyle = col;
      ctx.lineWidth   = Math.max(0.8, cw * 0.10);
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();
      // Body
      ctx.fillStyle = col;
      ctx.fillRect(x - cw / 2, Math.min(yO, yC), cw, Math.max(1.5, Math.abs(yC - yO)));
      // Live candle glow on the last candle
      if (i === this.candles.length - 1) {
        ctx.save();
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 0.28;
        ctx.strokeRect(x - cw / 2 - 1, Math.min(yO, yC) - 1, cw + 2, Math.max(1.5, Math.abs(yC - yO)) + 2);
        ctx.restore();
      }
    }
  }

  // ── LAYER: Volume bars ─────────────────────────────────────────
  _drawVolume() {
    const { vol: ctx } = this.ctxs;
    if (!ctx || !this.candles.length) return;
    const mH = this._mH, vH = this._vH, cw = this._cw();
    const volTop = mH + LAYOUT.TIME_AXIS;
    const s = Math.max(0, this.viewStart);
    const e = Math.min(this.candles.length, this.viewEnd);
    ctx.clearRect(0, 0, this.W, this.H);
    const slice  = this.candles.slice(s, e);
    const maxVol = Math.max(...slice.map(c => c.v));
    if (maxVol <= 0) return;
    ctx.globalAlpha = 0.82;
    for (let i = s; i < e; i++) {
      const c  = this.candles[i];
      const x  = this._xFor(i);
      const bh = (c.v / maxVol) * (vH - 6);
      ctx.fillStyle = c.c >= c.o ? COLORS.bullVol : COLORS.bearVol;
      ctx.fillRect(x - cw / 2, volTop + vH - 6 - bh, cw, bh);
    }
    ctx.globalAlpha = 1;
    // Panel top line
    ctx.strokeStyle = 'rgba(0,0,0,0.07)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, volTop);
    ctx.lineTo(this._mW, volTop);
    ctx.stroke();
  }

  // ── LAYER: Volume Profile + Liquidity Lines ────────────────────
  _drawProfile() {
    const { prof: ctx } = this.ctxs;
    if (!ctx || !this.candles.length) return;
    const mH = this._mH, mW = this._mW;
    ctx.clearRect(0, 0, this.W, this.H);
    const { lo, hi } = this._range();
    const prof = buildVRVP(this.candles, this.viewStart, this.viewEnd);
    if (!prof) return;

    const {
      bins, bSz, lo: pL, hi: pH,
      pocBin, pocPrice, maxVal,
      vaHiBin, vaLoBin, vahPrice, valPrice,
      upperThr, lowerThr,
    } = prof;

    const profMaxW = this._profW - 18;

    // Helper: screen Y for a profile bin centre
    const binY = (b) => this._yFor(pL + (b + 0.5) * bSz, lo, hi);
    const binScreenH = Math.abs(binY(1) - binY(0));

    // ── Value Area background fill ────────────────────────────────
    if (this.showVA) {
      const vahY = this._yFor(vahPrice, lo, hi);
      const valY = this._yFor(valPrice, lo, hi);
      // Full chart width
      ctx.fillStyle = 'rgba(41,98,255,0.04)';
      ctx.fillRect(LAYOUT.LEFT_PAD, vahY, mW - LAYOUT.LEFT_PAD, valY - vahY);
      // Profile panel
      ctx.fillStyle = 'rgba(41,98,255,0.06)';
      ctx.fillRect(this._pX, vahY, this._profW, valY - vahY);
    }

    // ── Profile bars ──────────────────────────────────────────────
    if (this.showLiq) {
      for (let b = 0; b < LAYOUT.BINS; b++) {
        if (bins[b] === 0) continue;
        const bw   = (bins[b] / maxVal) * profMaxW;
        const by   = binY(b);
        const bh   = Math.max(1.6, binScreenH - 0.5);
        const norm = bins[b] / maxVal;
        const price = pL + (b + 0.5) * bSz;
        const inVA  = b >= vaLoBin && b <= vaHiBin;
        let rgb, alpha;
        if (b === pocBin) {
          rgb = COLORS.poc; alpha = 0.90;
        } else if (price >= upperThr) {
          rgb   = COLORS.upper;
          alpha = inVA ? 0.40 + norm * 0.50 : 0.18 + norm * 0.38;
        } else if (price <= lowerThr) {
          rgb   = COLORS.lower;
          alpha = inVA ? 0.44 + norm * 0.46 : 0.18 + norm * 0.40;
        } else {
          rgb = [150, 145, 80]; alpha = 0.04 + norm * 0.10;
        }
        ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        ctx.fillRect(this._pX + 1, by - bh / 2, bw, bh);
      }
    }

    // ── Horizontal liquidity lines across the main chart ──────────
    const drawLiqLine = (price, color, dashed, lw) => {
      if (price < lo || price > hi) return;
      const y = this._yFor(price, lo, hi);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth   = lw;
      ctx.setLineDash(dashed ? [7, 5] : []);
      ctx.beginPath();
      ctx.moveTo(LAYOUT.LEFT_PAD, y);
      ctx.lineTo(mW, y);
      ctx.stroke();
      ctx.restore();
    };

    if (this.showPOC) {
      drawLiqLine(pocPrice, COLORS.pocLine, false, 1.8);
    }
    if (this.showVA) {
      drawLiqLine(vahPrice, COLORS.vahLine, true, 1.0);
      drawLiqLine(valPrice, COLORS.valLine, true, 1.0);
    }
    if (this.showLiq) {
      for (let b = 0; b < LAYOUT.BINS; b++) {
        if (b === pocBin) continue;
        const norm  = bins[b] / maxVal;
        if (norm < 0.22) continue;
        const price = pL + (b + 0.5) * bSz;
        const isUp  = price >= upperThr;
        const isLo  = price <= lowerThr;
        if (!isUp && !isLo) continue;
        const col = isUp
          ? `rgba(91,155,213,${0.18 + norm * 0.42})`
          : `rgba(38,166,154,${0.18 + norm * 0.42})`;
        drawLiqLine(price, col, true, 0.6);
      }
    }

    // ── VA boundary dashes inside profile panel ───────────────────
    if (this.showVA) {
      ctx.setLineDash([4, 3]);
      const vahY = this._yFor(vahPrice, lo, hi);
      const valY = this._yFor(valPrice, lo, hi);
      ctx.strokeStyle = 'rgba(255,152,0,0.55)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(this._pX, vahY);
      ctx.lineTo(this._pX + this._profW - 6, vahY);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(38,166,154,0.55)';
      ctx.beginPath();
      ctx.moveTo(this._pX, valY);
      ctx.lineTo(this._pX + this._profW - 6, valY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ── POC triangle marker ────────────────────────────────────────
    if (this.showPOC) {
      const pocY = this._yFor(pocPrice, lo, hi);
      const [r, g, b] = COLORS.poc;
      ctx.fillStyle = `rgba(${r},${g},${b},0.92)`;
      ctx.beginPath();
      ctx.moveTo(this._pX - 8, pocY - 5);
      ctx.lineTo(this._pX - 8, pocY + 5);
      ctx.lineTo(this._pX - 1, pocY);
      ctx.closePath();
      ctx.fill();
    }

    // ── Price tags on right axis ───────────────────────────────────
    const axX = mW + 2;
    if (this.showPOC && pocPrice >= lo && pocPrice <= hi) {
      priceTag(ctx, axX, this._yFor(pocPrice, lo, hi), pocPrice,
        `rgba(${COLORS.poc[0]},${COLORS.poc[1]},${COLORS.poc[2]},0.90)`);
    }
    if (this.showVA) {
      if (vahPrice >= lo && vahPrice <= hi)
        priceTag(ctx, axX, this._yFor(vahPrice, lo, hi), vahPrice, 'rgba(255,152,0,0.65)');
      if (valPrice >= lo && valPrice <= hi)
        priceTag(ctx, axX, this._yFor(valPrice, lo, hi), valPrice, 'rgba(38,166,154,0.72)');
    }

    // ── Labels inside profile panel ───────────────────────────────
    ctx.font      = 'bold 8.5px Inter,sans-serif';
    ctx.textAlign = 'left';
    if (this.showPOC) {
      const bw = (bins[pocBin] / maxVal) * profMaxW;
      ctx.fillStyle = 'rgba(255,152,0,0.88)';
      ctx.fillText('POC  ' + fmtPrice(pocPrice), this._pX + bw + 4, binY(pocBin) + 3.5);
    }
    if (this.showVA) {
      ctx.fillStyle = 'rgba(255,152,0,0.75)';
      ctx.fillText('VAH ' + fmtPrice(vahPrice), this._pX + 3, this._yFor(vahPrice, lo, hi) - 3);
      ctx.fillStyle = 'rgba(38,166,154,0.80)';
      ctx.fillText('VAL ' + fmtPrice(valPrice), this._pX + 3, this._yFor(valPrice, lo, hi) + 10);
    }

    // ── Notify parent with updated profile values ──────────────────
    if (this.onViewChange) {
      const s = Math.max(0, this.viewStart);
      const e = Math.min(this.candles.length, this.viewEnd);
      this.onViewChange({
        viewStart: s,
        viewEnd:   e,
        pocPrice,
        vahPrice,
        valPrice,
        visibleCount: e - s,
        dateFrom: this.candles[s]?.t,
        dateTo:   this.candles[e - 1]?.t,
      });
    }
  }

  // ── LAYER: Overlay (crosshair, live price line, dots) ──────────
  _drawOverlay() {
    const { ov: ctx } = this.ctxs;
    if (!ctx) return;
    const mH = this._mH, mW = this._mW;
    ctx.clearRect(0, 0, this.W, this.H);
    const { lo, hi } = this._range();

    // Live price dashed horizontal line
    if (this.lastWsPrice > 0 && this.lastWsPrice >= lo && this.lastWsPrice <= hi) {
      const ly = this._yFor(this.lastWsPrice, lo, hi);
      ctx.save();
      ctx.strokeStyle = 'rgba(41,98,255,0.45)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(LAYOUT.LEFT_PAD, ly);
      ctx.lineTo(mW, ly);
      ctx.stroke();
      ctx.restore();
      priceTag(ctx, mW + 2, ly, this.lastWsPrice, 'rgba(41,98,255,0.88)');
    }

    if (this.mouseX < 0 || this.mouseX > mW || this.mouseY < 0 || this.mouseY > mH) return;

    // Crosshair
    ctx.save();
    ctx.strokeStyle = COLORS.crosshair;
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.moveTo(LAYOUT.LEFT_PAD, this.mouseY);
    ctx.lineTo(mW, this.mouseY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.mouseX, 0);
    ctx.lineTo(this.mouseX, mH);
    ctx.stroke();
    ctx.restore();

    // Price tag at crosshair
    priceTag(ctx, mW + 2, this.mouseY, this._priceAt(this.mouseY, lo, hi), 'rgba(41,98,255,0.82)');

    // Time label on bottom axis at crosshair
    const n  = this.viewEnd - this.viewStart;
    const ci = Math.round((this.mouseX - LAYOUT.LEFT_PAD) / (mW / n)) + this.viewStart;
    if (ci >= 0 && ci < this.candles.length) {
      const label = fmtAxisDate(this.candles[ci].t, this.currentIv);
      ctx.font      = 'bold 9px Inter,sans-serif';
      const tw2 = ctx.measureText(label).width + 12;
      rrect(ctx, this.mouseX - tw2 / 2, mH + 2, tw2, 16, 3);
      ctx.fillStyle = 'rgba(41,98,255,0.75)';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText(label, this.mouseX, mH + 13);
    }

    // Dot on close price of hovered candle
    if (ci >= this.viewStart && ci < this.viewEnd && ci < this.candles.length) {
      const c  = this.candles[ci];
      const cx = this._xFor(ci);
      const cy = this._yFor(c.c, lo, hi);
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = c.c >= c.o ? COLORS.bull : COLORS.bear;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      // Notify parent
      if (this.onHoverCandle) this.onHoverCandle(c);
    }
  }

  // ── Event handlers (called by React synthetic events) ─────────

  onMouseMove(clientX, clientY, rect) {
    this.mouseX = clientX - rect.left;
    this.mouseY = clientY - rect.top;

    // Resolve hovered candle for tooltip
    const n  = this.viewEnd - this.viewStart;
    const ci = Math.round((this.mouseX - LAYOUT.LEFT_PAD) / (this._mW / n)) + this.viewStart;
    const mH = this._mH;
    if (ci >= 0 && ci < this.candles.length && this.mouseY <= mH) {
      if (this.onHoverCandle) this.onHoverCandle(this.candles[ci]);
    } else {
      if (this.onHoverCandle) this.onHoverCandle(null);
    }
    this.markDirty('ov');
  }

  onMouseLeave() {
    this.mouseX = -1;
    this.mouseY = -1;
    if (this.onHoverCandle) this.onHoverCandle(null);
    this.markDirty('ov');
  }

  onMouseDown(clientX) {
    this.dragX0    = clientX;
    this.dragView0 = { s: this.viewStart, e: this.viewEnd };
  }

  onWindowMouseMove(clientX) {
    if (this.dragX0 === null || !this.dragView0) return;
    const n   = this.dragView0.e - this.dragView0.s;
    const cw2 = this._mW / n;
    const sh  = Math.round((this.dragX0 - clientX) / cw2);
    let ns = this.dragView0.s + sh;
    let ne = this.dragView0.e + sh;
    if (ns < 0) { ne -= ns; ns = 0; }
    if (ne > this.candles.length) { ns -= (ne - this.candles.length); ne = this.candles.length; }
    this.viewStart = Math.max(0, ns);
    this.viewEnd   = Math.min(this.candles.length, ne);
    this.markDirty('grid', 'main', 'vol', 'prof', 'ov');
  }

  onWindowMouseUp() {
    this.dragX0    = null;
    this.dragView0 = null;
  }

  onWheel(deltaY, clientX, rect) {
    const n      = this.viewEnd - this.viewStart;
    const change = Math.max(3, Math.floor(n * 0.09));
    const ratio  = (clientX - rect.left - LAYOUT.LEFT_PAD) / this._mW;
    const safeR  = Math.max(0, Math.min(1, ratio));
    if (deltaY > 0) {
      // Zoom out
      this.viewStart = Math.max(0, this.viewStart - Math.round(change * safeR));
      this.viewEnd   = Math.min(this.candles.length, this.viewEnd + Math.round(change * (1 - safeR)));
    } else {
      // Zoom in
      if (n <= LAYOUT.MIN_CANDLES) return;
      const ns = Math.min(this.viewEnd - LAYOUT.MIN_CANDLES, this.viewStart + Math.round(change * safeR));
      const ne = Math.max(this.viewStart + LAYOUT.MIN_CANDLES, this.viewEnd - Math.round(change * (1 - safeR)));
      this.viewStart = Math.max(0, ns);
      this.viewEnd   = Math.min(this.candles.length, ne);
    }
    this.markDirty('grid', 'main', 'vol', 'prof', 'ov');
  }

  onTouchStart(touches) {
    if (touches.length === 1) {
      this.touchX0    = touches[0].clientX;
      this.touchView0 = { s: this.viewStart, e: this.viewEnd };
      this.touchDist0 = null;
    } else if (touches.length === 2) {
      this.touchDist0 = Math.abs(touches[0].clientX - touches[1].clientX);
      this.touchView0 = { s: this.viewStart, e: this.viewEnd };
      this.touchX0    = null;
    }
  }

  onTouchMove(touches) {
    if (touches.length === 1 && this.touchX0 !== null && this.touchView0) {
      const dx  = this.touchX0 - touches[0].clientX;
      const n   = this.touchView0.e - this.touchView0.s;
      const sh  = Math.round(dx / (this._mW / n));
      let ns = this.touchView0.s + sh;
      let ne = this.touchView0.e + sh;
      if (ns < 0) { ne -= ns; ns = 0; }
      if (ne > this.candles.length) { ns -= (ne - this.candles.length); ne = this.candles.length; }
      this.viewStart = Math.max(0, ns);
      this.viewEnd   = Math.min(this.candles.length, ne);
      this.markDirty('grid', 'main', 'vol', 'prof', 'ov');
    } else if (touches.length === 2 && this.touchDist0 !== null && this.touchView0) {
      const dist  = Math.abs(touches[0].clientX - touches[1].clientX);
      const scale = this.touchDist0 / dist;
      const n     = this.touchView0.e - this.touchView0.s;
      const newN  = Math.min(this.candles.length, Math.max(LAYOUT.MIN_CANDLES, Math.round(n * scale)));
      const mid   = Math.floor((this.touchView0.s + this.touchView0.e) / 2);
      this.viewStart = Math.max(0, mid - Math.floor(newN / 2));
      this.viewEnd   = Math.min(this.candles.length, this.viewStart + newN);
      this.markDirty('grid', 'main', 'vol', 'prof', 'ov');
    }
  }

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// React hook — wraps ChartRenderer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Object}   canvasRefs   – { bg, grid, main, vol, prof, ov } → React refs
 * @param {Object}   wrapRef      – ref to the chart wrapper div (for ResizeObserver)
 * @param {Object}   data         – { candles, lastWsPrice, currentIv, showPOC, showLiq, showVA }
 * @param {Function} onHoverCandle – callback(candle|null)
 * @param {Function} onViewChange  – callback(viewInfo)
 * @returns {Object} event handler props for the overlay canvas
 */
export function useChartRenderer(canvasRefs, wrapRef, data, onHoverCandle, onViewChange) {
  const rendererRef = useRef(null);

  // One-time init
  useEffect(() => {
    const renderer = new ChartRenderer();
    rendererRef.current = renderer;

    // Map React refs → HTMLCanvasElement map
    const canvasMap = {};
    for (const [key, ref] of Object.entries(canvasRefs)) {
      canvasMap[key] = ref.current;
    }
    renderer.init(canvasMap);
    renderer.onHoverCandle = onHoverCandle;
    renderer.onViewChange  = onViewChange;

    // Resize observer
    let ro = null;
    if (wrapRef.current) {
      ro = new ResizeObserver((entries) => {
        const { width, height } = entries[0].contentRect;
        renderer.resize(Math.round(width), Math.round(height));
      });
      ro.observe(wrapRef.current);
    }

    // Initial size
    if (wrapRef.current) {
      const { width, height } = wrapRef.current.getBoundingClientRect();
      renderer.resize(Math.round(width), Math.round(height));
    }

    // Window drag events
    const onMove = (e) => renderer.onWindowMouseMove(e.clientX);
    const onUp   = ()  => renderer.onWindowMouseUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);

    // Native touch listeners on the overlay canvas for 120fps smooth panning
    const ovCanvas = canvasRefs.ov.current;
    const onTouchStart = (e) => {
      e.preventDefault();
      renderer.onTouchStart(Array.from(e.touches));
    };
    const onTouchMove = (e) => {
      e.preventDefault();
      renderer.onTouchMove(Array.from(e.touches));
    };
    if (ovCanvas) {
      ovCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
      ovCanvas.addEventListener('touchmove', onTouchMove, { passive: false });
    }

    return () => {
      renderer.destroy();
      ro?.disconnect();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
      if (ovCanvas) {
        ovCanvas.removeEventListener('touchstart', onTouchStart);
        ovCanvas.removeEventListener('touchmove', onTouchMove);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep callbacks current
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.onHoverCandle = onHoverCandle;
    rendererRef.current.onViewChange  = onViewChange;
  }, [onHoverCandle, onViewChange]);

  // Sync data → renderer whenever it changes
  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.updateData(data);
  }, [data]);

  // Stable event handler object (never recreated)
  const handlers = useMemo(() => ({
    onMouseMove: (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      rendererRef.current?.onMouseMove(e.clientX, e.clientY, r);
    },
    onMouseLeave: () => rendererRef.current?.onMouseLeave(),
    onMouseDown:  (e) => {
      rendererRef.current?.onMouseDown(e.clientX);
      e.currentTarget.style.cursor = 'grabbing';
    },
    onMouseUp: (e) => {
      e.currentTarget.style.cursor = 'crosshair';
    },
    onWheel: (e) => {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      rendererRef.current?.onWheel(e.deltaY, e.clientX, r);
    },
  }), []);

  return handlers;
}
