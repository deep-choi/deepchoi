import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundImagePan, clampZoom, pinchTransform } from './imageZoom.ts';

test('pinch preserves the image point underneath an off-center midpoint', () => {
    const start = { zoom: 1, pan: { x: 0, y: 0 } };
    const next = pinchTransform(start, { x: 40, y: -30 }, { x: 50, y: -10 }, 2);
    assert.equal(next.zoom, 2);
    assert.deepEqual(next.pan, { x: -30, y: 50 });
    assert.equal((50 - next.pan.x) / next.zoom, 40);
    assert.equal((-10 - next.pan.y) / next.zoom, -30);
});

test('zoom uses the actual clamped scale for the pinch anchor', () => {
    const next = pinchTransform({ zoom: 2, pan: { x: 10, y: 20 } }, { x: 30, y: 40 }, { x: 30, y: 40 }, 10);
    assert.equal(next.zoom, 4);
    assert.deepEqual(next.pan, { x: -10, y: 0 });
    assert.equal(clampZoom(0.2), 1);
});

test('pan cannot move the image past its edges; shrinking recenters a fitted image', () => {
    assert.deepEqual(boundImagePan({ x: 900, y: -900 }, 2, { x: 300, y: 500 }, { x: 400, y: 600 }), { x: 100, y: -200 });
    assert.deepEqual(boundImagePan({ x: 100, y: -200 }, 1, { x: 300, y: 500 }, { x: 400, y: 600 }), { x: 0, y: 0 });
});
