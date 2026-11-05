// A figure's legend as its controls: entries that show or hide a curve when clicked (toggles), and
// entries that open a hover card of controls (a slider, a profile editor). The hover card is also
// exported on its own, for triggers that are not legend entries.
//
//   mount(el, model, { entries }) → dispose
//     entries: [{ icon, label, title?, toggle?, card?, busy? }], in order. `icon` is an Element the
//     app draws (the figure's own line style); `toggle` is a top-level boolean model key (missing
//     counts as on); `card` is an Element of controls; `busy()` holds the card open (a drag).
//   hoverCard(trigger, card, { busy, group }) → dispose
//   placeCard(triggerRect, cardSize, viewport, margin) → { left, top }   (pure)

const GAP = 6; // px between trigger and card
const CLOSE_MS = 250; // delay before a card closes once pointer and focus have left

/** Where a card of `cardSize` goes for a trigger at `triggerRect` in `viewport` ({width, height}):
 *  centred over the trigger, above it if it fits within `margin`, else below; kept inside the
 *  viewport, and pinned to the left margin if it is wider than the viewport. */
export function placeCard(triggerRect, { width, height }, viewport, margin = 8) {
  const centre = triggerRect.left + triggerRect.width / 2;
  const left = Math.max(margin, Math.min(centre - width / 2, viewport.width - width - margin));
  const above = triggerRect.top - height - GAP;
  return { left, top: above >= margin ? above : triggerRect.bottom + GAP };
}

/**
 * Make `card` a hover card of `trigger`. It opens while a mouse or pen is over either, or keyboard
 * focus is in either, and closes CLOSE_MS after both are left, unless `busy()`. A click or tap on
 * the trigger toggles it; Escape closes it and returns focus to the trigger. `group` (any object
 * shared by several cards) keeps at most one of them open. Returns dispose.
 */
export function hoverCard(trigger, card, { busy = () => false, group = {} } = {}) {
  card.popover = "manual";
  card.classList.add("fk-card");
  let timer = 0;
  const isOpen = () => card.matches(":popover-open");
  const place = () => {
    const { left, top } = placeCard(trigger.getBoundingClientRect(), card.getBoundingClientRect(), { width: innerWidth, height: innerHeight });
    card.style.left = `${left}px`; card.style.top = `${top}px`;
  };
  const setOpen = (open) => {
    clearTimeout(timer);
    if (open === isOpen()) return;
    if (open) {
      if (group.open && group.open !== close) group.open();
      card.showPopover(); place(); group.open = close;
    } else {
      card.hidePopover();
      if (group.open === close) group.open = null;
    }
    trigger.setAttribute("aria-expanded", String(open));
  };
  const close = () => setOpen(false);
  const focused = () => [trigger, card].some((n) => n.contains(document.activeElement));
  // Where the mouse is, tracked rather than read from :hover, which WebKit leaves on a drag's start
  // until the mouse moves again.
  let px = -1, py = -1;
  const hovered = () => [trigger, card].some((n) => {
    const r = n.getBoundingClientRect();
    return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
  });
  const closeSoon = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (!busy() && !focused() && !hovered()) setOpen(false); }, CLOSE_MS);
  };
  const isMouse = (ev) => ev.pointerType === "mouse" || ev.pointerType === "pen"; // a tap goes through click
  const track = (ev) => { if (isMouse(ev)) { px = ev.clientX; py = ev.clientY; } };
  const enter = (ev) => { track(ev); if (isMouse(ev)) setOpen(true); };
  const leave = (ev) => {
    if (!isMouse(ev)) return;
    track(ev);
    // A pointer leaving takes the focus with it: a slider dragged with the mouse keeps focus and
    // would hold the card open. Keyboard focus, which no pointer leaves, is untouched.
    if (!busy() && card.contains(document.activeElement)) document.activeElement.blur();
    closeSoon();
  };
  const focusout = (ev) => { if (!trigger.contains(ev.relatedTarget) && !card.contains(ev.relatedTarget)) closeSoon(); };
  const click = () => setOpen(!isOpen());
  // focus goes back first: arriving on the trigger by keyboard would otherwise reopen the card
  const key = (ev) => { if (ev.key === "Escape" && isOpen()) { trigger.focus(); setOpen(false); } };
  const replace = () => { if (isOpen()) place(); };
  const dragEnd = (ev) => { track(ev); if (isOpen()) closeSoon(); }; // a busy drag ended: close if outside

  const on = [];
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); on.push([target, type, fn, opts]); };
  for (const n of [trigger, card]) {
    listen(n, "pointerenter", enter); listen(n, "pointerleave", leave);
    // keyboard focus opens it; focus from a click or tap does not, or the click would toggle it shut
    listen(n, "focusin", (ev) => { if (ev.target.matches(":focus-visible")) setOpen(true); });
    listen(n, "focusout", focusout); listen(n, "keydown", key);
  }
  listen(trigger, "click", click);
  listen(window, "resize", replace); listen(window, "scroll", replace, true);
  listen(window, "pointermove", track, true); listen(window, "pointerup", dragEnd, true); listen(window, "pointercancel", dragEnd, true);
  const resized = new ResizeObserver(replace);
  resized.observe(card);
  trigger.setAttribute("aria-haspopup", "dialog");
  trigger.setAttribute("aria-expanded", "false");

  return () => {
    clearTimeout(timer);
    for (const [target, type, fn, opts] of on) target.removeEventListener(type, fn, opts);
    resized.disconnect();
    if (isOpen()) card.hidePopover();
    if (group.open === close) group.open = null;
  };
}

/** Render the legend's entries into `el` (see the header). Returns dispose. */
export function mount(el, model, { entries }) {
  el.classList.add("fk-legend");
  const group = {}, disposers = [];
  for (const { icon, label, title, toggle, card, busy } of entries) {
    if (toggle !== undefined && card !== undefined) throw new Error(`legend entry "${label}": toggle or card, not both`);
    const entry = document.createElement(toggle !== undefined || card ? "button" : "span");
    entry.className = "fk-legend-entry";
    if (entry.localName === "button") entry.type = "button";
    if (title) entry.title = title;
    entry.append(icon, label);
    if (toggle !== undefined) {
      entry.classList.add("fk-legend-toggle");
      const on = () => model.get(toggle) !== false;
      const sync = () => entry.setAttribute("aria-pressed", String(on()));
      entry.addEventListener("click", () => { model.set(toggle, !on()); model.save_changes(); });
      model.on(`change:${toggle}`, sync);
      disposers.push(() => model.off(`change:${toggle}`, sync));
      sync();
    } else if (card) {
      entry.classList.add("fk-legend-card");
      entry.append(" ✎");
      disposers.push(hoverCard(entry, card, { busy, group }));
    }
    // the card follows its entry, so Tab goes from the entry into its controls
    el.append(entry, ...(card ? [card] : []));
  }
  return () => {
    for (const d of disposers) d();
    el.replaceChildren();
    el.classList.remove("fk-legend");
  };
}
