import { test } from "node:test";
import assert from "node:assert/strict";
import { placeCard } from "figpress-apps/legend.js";

const vp = { width: 800, height: 600 };
const rect = (left, top, width = 100, height = 20) => ({ left, top, width, height, right: left + width, bottom: top + height });

test("above the trigger, centred, when it fits with the margin", () => {
  assert.deepEqual(placeCard(rect(350, 300), { width: 200, height: 100 }, vp), { left: 300, top: 194 });
});

test("below the trigger when there is no room above", () => {
  assert.deepEqual(placeCard(rect(350, 50), { width: 200, height: 100 }, vp), { left: 300, top: 76 });
});

test("clamped inside the left and right edges, keeping the margin", () => {
  assert.equal(placeCard(rect(0, 300), { width: 200, height: 100 }, vp).left, 8);
  assert.equal(placeCard(rect(750, 300, 50), { width: 200, height: 100 }, vp).left, 800 - 200 - 8);
});

test("a card wider than the viewport is pinned to the left margin", () => {
  assert.equal(placeCard(rect(100, 300), { width: 900, height: 100 }, vp).left, 8);
});

test("a custom margin", () => {
  assert.deepEqual(placeCard(rect(0, 300), { width: 200, height: 100 }, vp, 20), { left: 20, top: 194 });
});
