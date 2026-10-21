// A canvas that fills its element, is sharp on high-DPI screens and is drawn in CSS pixels;
// redraws are coalesced to one per animation frame. Plus a pointer-drag helper.

export function createStage(el, { draw, onResize } = {}) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
  el.appendChild(canvas);
  const stage = { canvas, ctx: canvas.getContext("2d"), width: 0, height: 0, dpr: 1, requestDraw, dispose };
  let pending = false, disposed = false, mq = null;

  function requestDraw() {
    if (pending || disposed) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; if (!disposed) draw?.(stage); });
  }
  function resize() {
    const box = el.getBoundingClientRect();
    stage.width = box.width; stage.height = box.height; stage.dpr = globalThis.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(box.width * stage.dpr));
    canvas.height = Math.max(1, Math.round(box.height * stage.dpr));
    stage.ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
    onResize?.(stage);
    requestDraw();
  }
  function watchDpr() { // moving to a screen with another pixel density
    mq?.removeEventListener("change", onDpr);
    mq = matchMedia(`(resolution: ${globalThis.devicePixelRatio || 1}dppx)`);
    mq.addEventListener("change", onDpr);
  }
  function onDpr() { resize(); watchDpr(); }
  const ro = new ResizeObserver(resize);
  ro.observe(el);
  watchDpr();
  resize();

  function dispose() {
    disposed = true;
    ro.disconnect();
    mq?.removeEventListener("change", onDpr);
    canvas.remove();
  }
  return stage;
}

/**
 * Pointer dragging on `el`, in CSS pixels relative to it. hitTest(x, y) picks what is dragged
 * (null = the background). Returns a dispose function.
 */
export function dragHelper(el, { hitTest, onStart, onMove, onEnd }) {
  let drag = null;
  const at = (e) => { const b = el.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
  const down = (e) => {
    const [x, y] = at(e);
    drag = { target: hitTest?.(x, y) ?? null, x, y, id: e.pointerId };
    try { el.setPointerCapture?.(e.pointerId); } catch { /* synthetic or already-released pointer */ }
    onStart?.(drag.target, x, y);
  };
  const move = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const [x, y] = at(e);
    onMove?.(drag.target, x - drag.x, y - drag.y, x, y);
    drag.x = x; drag.y = y;
  };
  const up = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { target } = drag;
    drag = null;
    onEnd?.(target);
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointermove", move);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  return () => {
    el.removeEventListener("pointerdown", down);
    el.removeEventListener("pointermove", move);
    el.removeEventListener("pointerup", up);
    el.removeEventListener("pointercancel", up);
  };
}
