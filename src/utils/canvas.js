/**
 * canvas.js – Low-level canvas drawing primitives
 */
import { fmtPrice } from './format.js';

/**
 * Draw a rounded rectangle path (does NOT fill/stroke — caller must do that).
 */
export function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw a pill-shaped price tag badge.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x   – left edge of badge
 * @param {number} y   – vertical centre
 * @param {number} price
 * @param {string} bg  – fill colour
 * @param {string} [fg='#fff'] – text colour
 */
export function priceTag(ctx, x, y, price, bg, fg = '#fff') {
  const txt = fmtPrice(price);
  ctx.font = 'bold 9px Inter,sans-serif';
  const tw = ctx.measureText(txt).width;
  const pw = tw + 10;
  const ph = 15;
  rrect(ctx, x, y - ph / 2, pw, ph, 3);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.fillText(txt, x + pw / 2, y + 4);
}

/**
 * Scale all canvases in the layer map to the device pixel ratio.
 * @param {Object<string, HTMLCanvasElement>} canvases
 * @param {number} W – CSS width
 * @param {number} H – CSS height
 * @returns {Object<string, CanvasRenderingContext2D>} ctxMap
 */
export function scaleCanvases(canvases, W, H) {
  const dpr = window.devicePixelRatio || 1;
  const ctxMap = {};
  for (const [key, canvas] of Object.entries(canvases)) {
    if (!canvas) continue;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctxMap[key] = ctx;
  }
  return ctxMap;
}
