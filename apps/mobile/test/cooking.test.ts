import assert from 'node:assert/strict';
import { test } from 'node:test';

import { resumable, stepMinutes } from '../src/services/cooking.ts';

test('timer minutes come from the step text, upper bound of a range', () => {
  assert.equal(stepMinutes('Start the rice with 2× its volume of water. Cover and simmer 15 minutes.'), 15);
  assert.equal(stepMinutes('Brown the chicken in oil over medium-high heat, 6–7 minutes, until no pink remains.'), 7);
  assert.equal(stepMinutes('Roast 20-25 min.'), 25);
  assert.equal(stepMinutes('Cut the chicken into bite-size pieces.'), null);
  assert.equal(stepMinutes('Rest 0 minutes'), null);
});

test('a cooking session resumes only for a meal still in the plan, within 12 hours', () => {
  const now = Date.parse('2026-09-24T18:00:00Z');
  const c = { mealId: 'dinner_wed', step: 2, timerEndsAt: null, timerMinutes: null, updatedAt: '2026-09-24T17:30:00Z' };
  assert.equal(resumable(c, ['dinner_wed'], now), true);
  assert.equal(resumable(c, ['dinner_thu'], now), false);
  assert.equal(resumable({ ...c, updatedAt: '2026-09-24T04:00:00Z' }, ['dinner_wed'], now), false);
  assert.equal(resumable(null, ['dinner_wed'], now), false);
});
