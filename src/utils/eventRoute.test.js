import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'js-yaml';
import { eventDetailParams } from './eventRoute.js';
import { parseEventDate } from './data.js';

test('detail route payload is JSON-safe and preserves published calendar days', () => {
  const originalTZ = process.env.TZ;
  try {
    for (const zone of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'America/New_York']) {
      process.env.TZ = zone;
      for (const date of [load('date: 2026-10-17').date, '2026-10-17', parseEventDate('2026-10-17')]) {
        for (const id of ['known', undefined]) {
          const params = eventDetailParams({ id, name: 'Published', date, end_date: date });
          assert.deepEqual(params, JSON.parse(JSON.stringify(params)));
          assert.equal(params.event.date, '2026-10-17');
          assert.equal(params.event.end_date, '2026-10-17');
        }
      }
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});
