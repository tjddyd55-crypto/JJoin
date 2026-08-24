#!/usr/bin/env node
/**
 * Batch EPSG:5174 → EPSG:4326 via proj4 (workspace dependency).
 * Usage: node batch-tm-to-wgs84.cjs <input.json> <output.json>
 * Does not call NAVER APIs.
 */
const fs = require('fs');

const proj4 = require('proj4');
const KR_LAT = [33, 39];
const KR_LNG = [124, 132];

function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node batch-tm-to-wgs84.cjs <input.json> <output.json>');
    process.exit(1);
  }

  proj4.defs(
    'EPSG:5174',
    '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
  );

  const rows = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const out = rows.map((row) => {
    const id = row.id || row.managementNo;
    try {
      const [lng, lat] = proj4('EPSG:5174', 'EPSG:4326', [row.tmX, row.tmY]);
      const ok =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= KR_LAT[0] &&
        lat <= KR_LAT[1] &&
        lng >= KR_LNG[0] &&
        lng <= KR_LNG[1];
      return {
        id,
        managementNo: row.managementNo || null,
        latitude: ok ? lat : null,
        longitude: ok ? lng : null,
        ok,
      };
    } catch (err) {
      return {
        id,
        managementNo: row.managementNo || null,
        latitude: null,
        longitude: null,
        ok: false,
        error: String(err && err.message ? err.message : err),
      };
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(out) + '\n', 'utf8');
  const okCount = out.filter((r) => r.ok).length;
  console.log(JSON.stringify({ input: rows.length, ok: okCount, fail: rows.length - okCount }));
}

main();
