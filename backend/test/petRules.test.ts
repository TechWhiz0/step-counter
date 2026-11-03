import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addDays, weekStart } from '../src/lib/dates.js';
import { cappedTotal, formFor, goldenTargets, stageFor, stageProgress, traitsFor } from '../src/lib/petRules.js';

const hours = (map: Record<number, number>) => Array.from({ length: 24 }, (_, h) => map[h] ?? 0);

test('stages unlock at growth thresholds', () => {
  assert.equal(stageFor(0), 'egg');
  assert.equal(stageFor(4999), 'egg');
  assert.equal(stageFor(5000), 'baby');
  assert.equal(stageFor(55000), 'teen');
  assert.equal(stageFor(205000), 'adult');
  assert.deepEqual(stageProgress(2500), { next: 'baby', progress: 0.5, remaining: 2500 });
  assert.equal(stageProgress(300000).next, null);
});

test('hourly cap limits shaken steps', () => {
  assert.equal(cappedTotal(hours({ 8: 9000, 9: 1000 })), 3500);
});

test('form follows when the owner walks most', () => {
  assert.equal(formFor(hours({ 6: 4000, 7: 3000, 13: 1000 })), 'sunrise');
  assert.equal(formFor(hours({ 12: 5000, 14: 2000 })), 'daytime');
  assert.equal(formFor(hours({ 19: 3000, 21: 3000, 8: 500 })), 'moonlight');
  assert.equal(formFor(hours({ 7: 1000, 12: 1000, 19: 1000 })), 'balanced');
  assert.equal(formFor(hours({})), 'balanced');
});

test('traits are stable for a seed and differ between seeds', () => {
  const input = { hourlySums: hours({ 8: 3000 }), avgDailySteps: 7000, bestStreak: 6 };
  assert.deepEqual(traitsFor({ seed: 42, ...input }), traitsFor({ seed: 42, ...input }));
  const looks = new Set(
    Array.from({ length: 200 }, (_, seed) => JSON.stringify(traitsFor({ seed, ...input }))),
  );
  assert.ok(looks.size > 150, `only ${looks.size} distinct looks from 200 seeds`);
  const t = traitsFor({ seed: 1, ...input });
  assert.equal(t.size, 'medium');
  assert.equal(t.markings, 3);
});

test('walking time shifts colour', () => {
  const morning = traitsFor({ seed: 7, hourlySums: hours({ 7: 5000 }), avgDailySteps: 5000, bestStreak: 0 });
  const evening = traitsFor({ seed: 7, hourlySums: hours({ 20: 5000 }), avgDailySteps: 5000, bestStreak: 0 });
  assert.notEqual(morning.hue, evening.hue);
});

test('golden targets are distinct and in range', () => {
  const t = goldenTargets(123, 6000);
  assert.equal(t.length, 3);
  assert.equal(new Set(t).size, 3);
  assert.ok(t.every((x) => x >= 1000 && x <= 7800));
});

test('date helpers', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(weekStart('2026-10-31'), '2026-10-26');
});
