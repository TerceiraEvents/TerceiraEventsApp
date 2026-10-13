import { test } from 'node:test';
import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanupPastReminders } from './storage.js';

test('cleanup preserves today island reminders when device calendar day is already tomorrow', async (t) => {
  const originalZone = process.env.TZ;
  const originalRead = AsyncStorage.getItem;
  const originalWrite = AsyncStorage.setItem;
  process.env.TZ = 'Pacific/Kiritimati';
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-10-17T16:00:00Z') });
  try {
    AsyncStorage.getItem = async () => JSON.stringify(['2026-10-17|Published', '2026-10-16|Past']);
    AsyncStorage.setItem = async () => {};
    assert.deepEqual([...await cleanupPastReminders()], ['2026-10-17|Published']);
  } finally {
    AsyncStorage.getItem = originalRead; AsyncStorage.setItem = originalWrite;
    if (originalZone === undefined) delete process.env.TZ; else process.env.TZ = originalZone;
  }
});
