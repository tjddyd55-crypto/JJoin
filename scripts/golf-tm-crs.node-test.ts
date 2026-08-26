/**
 * Unit checks for golf TM CRS (EPSG:2097) vs legacy 5174 offset.
 * Run: pnpm exec tsx scripts/golf-tm-crs.node-test.ts
 */
import assert from 'node:assert/strict';
import {
  convertGolfTmLegacy5174,
  convertGolfTmToWgs84,
  haversineMeters,
  normalizeAddressForCompare,
} from '../apps/api/src/modules/golf-facilities/sync/golf-tm-crs';

// 아차산골프연습장 — production source TM + Kakao address geocode reference
const ACHA = {
  tmX: 207190.600271,
  tmY: 450474.466965,
  geoLat: 37.556498995722,
  geoLng: 127.082129921719,
};

const ok = convertGolfTmToWgs84(ACHA.tmX, ACHA.tmY);
assert.equal(ok.ok, true);
const dOk = haversineMeters(ok.lat, ok.lng, ACHA.geoLat, ACHA.geoLng);
assert.ok(dOk < 15, `EPSG:2097 should be within 15m of address geocode, got ${dOk}`);

const legacy = convertGolfTmLegacy5174(ACHA.tmX, ACHA.tmY);
assert.equal(legacy.ok, true);
const dLegacy = haversineMeters(legacy.lat, legacy.lng, ACHA.geoLat, ACHA.geoLng);
assert.ok(dLegacy > 200, `legacy 5174 should be ~250m off, got ${dLegacy}`);

assert.equal(
  normalizeAddressForCompare('서울특별시 광진구 천호대로 575, 지하1층 (중곡동, 남양빌딩)'),
  normalizeAddressForCompare('서울 광진구 천호대로 575'),
);

console.log('golf-tm-crs.node-test.ts: PASS', {
  epsg2097_m: Math.round(dOk * 10) / 10,
  legacy5174_m: Math.round(dLegacy * 10) / 10,
});
