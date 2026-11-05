import { test } from "node:test";
import assert from "node:assert/strict";
import { mollweide, unmollweide, lookAt, mat3, trackball, unit, dot } from "figpress-apps/geom.js";
import { shadeMollweide } from "figpress-apps/globe.js";

const close = (a, b, tol) => a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < tol, `${i}: ${x} vs ${b[i]}`));

test("mollweide: known points, and unmollweide inverts it", () => {
  close(mollweide([1, 0, 0]), [0, 0], 1e-12);
  close(mollweide([0, 0, 1]), [0, 1], 1e-12); // poles: top and bottom of the ellipse
  close(mollweide([0, 0, -1]), [0, -1], 1e-12);
  close(mollweide([-1, 1e-15, 0]), [2, 0], 1e-9); // lon π: right edge (longitude grows to the right)
  close(mollweide([0, 1, 0]), [1, 0], 1e-12);
  for (let i = 0; i < 200; i++) {
    const d = unit([Math.sin(i * 1.3), Math.cos(i * 0.7) * 0.9, Math.sin(i * 0.31 + 1)]);
    close(unmollweide(...mollweide(d)), d, 1e-9);
  }
  assert.equal(unmollweide(1.9, 0.5), null); // outside the ellipse
});

test("mollweide is equal-area: equal solid angles cover equal map areas", () => {
  // the band 0 < lat < 30° is 1/4 of the hemisphere's area, so 1/8 of the ellipse's (2π)
  const n = 400; let inBand = 0, all = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = -2 + 4 * (i + 0.5) / n, y = -1 + 2 * (j + 0.5) / n, d = unmollweide(x, y);
    if (!d) continue;
    all++; if (d[2] > 0 && d[2] < 0.5) inBand++;
  }
  assert.ok(Math.abs(inBand / all - 0.25) < 0.005, `${inBand / all}`);
});

test("lookAt faces d, stays orthonormal and keeps up when it can", () => {
  const cam = trackball(mat3.identity(), 30, -50, 100);
  for (const d of [[1, 2, 3], [0, 0, -1], mat3.row(cam, 1)]) {
    const C = lookAt(cam, d);
    close(mat3.row(C, 2), unit(d), 1e-12);
    close(mat3.mul(C, mat3.transpose(C)), mat3.identity(), 1e-12);
  }
  const C = lookAt(cam, [0.3, -0.2, 0.9]);
  assert.ok(dot(mat3.row(C, 1), mat3.row(cam, 1)) > 0.5); // a small turn keeps up roughly up
});

test("shadeMollweide: ellipse only; the hidden half veiled", () => {
  const H = 19, W = 37, tex = { shape: [H, W, 4], data: new Uint8Array(H * W * 4) }; // all transparent
  const w = 80, h = 40, out = new Uint8ClampedArray(w * h * 4);
  shadeMollweide(mat3.identity(), tex, w, h, out); // camera faces +z: the southern half is hidden
  assert.equal(out[3], 0); // corner untouched
  const px = (x, y) => out.subarray(4 * (y * w + x), 4 * (y * w + x) + 4);
  assert.deepEqual(Array.from(px(40, 5)), [255, 255, 255, 255]); // north: plain background
  assert.ok(px(40, 35)[0] < 230 && px(40, 35)[3] === 255); // south: veiled
});

test("shadeMollweide: turning the camera redoes only the veil, no trig per pixel", () => {
  // guards the rotation frame rate (test_drag_frame_rate): the texture lookup doesn't depend on the camera
  const H = 19, W = 37, tex = { shape: [H, W, 4], data: new Uint8Array(H * W * 4).fill(200) };
  const w = 80, h = 40, out = new Uint8ClampedArray(w * h * 4);
  shadeMollweide(mat3.identity(), tex, w, h, out);
  const atan2 = Math.atan2; let calls = 0;
  Math.atan2 = (y, x) => (calls++, atan2(y, x));
  try { shadeMollweide(trackball(mat3.identity(), 40, 10, 100), tex, w, h, out); } finally { Math.atan2 = atan2; }
  assert.equal(calls, 0);
});
