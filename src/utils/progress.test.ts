import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCollectionProgress,
  calculatePlaylistProgress,
  calculateVideoProgress,
  formatSecondsToClock,
  formatSecondsToMmSs,
  getVideoStatus,
  parseMmSsToSeconds,
  parseTimeInputToSeconds,
  shouldMarkCompleted,
} from './progress';

test('calculateVideoProgress handles zero duration, clamping, and exact ratio', () => {
  assert.equal(calculateVideoProgress(120, 0), 0);
  assert.equal(calculateVideoProgress(-10, 100), 0);
  assert.equal(calculateVideoProgress(150, 100), 100);
  assert.equal(calculateVideoProgress(50, 200), 25);
});

test('shouldMarkCompleted triggers at 95% threshold', () => {
  assert.equal(shouldMarkCompleted(94, 100), false);
  assert.equal(shouldMarkCompleted(95, 100), true);
  assert.equal(shouldMarkCompleted(100, 100), true);
  assert.equal(shouldMarkCompleted(10, 0), false);
});

test('getVideoStatus distinguishes Completed, In Progress, and Not Started', () => {
  assert.equal(
    getVideoStatus({ is_completed: true, last_watched_seconds: 100, duration_seconds: 100 }),
    'Completed'
  );
  assert.equal(
    getVideoStatus({ is_completed: false, last_watched_seconds: 30, duration_seconds: 100 }),
    'In Progress'
  );
  assert.equal(
    getVideoStatus({ is_completed: false, last_watched_seconds: 0, duration_seconds: 100 }),
    'Not Started'
  );
});

test('calculatePlaylistProgress computes duration-weighted ratio rather than percentage average', () => {
  // Video A: 100s / 100s (100% completed)
  // Video B: 0s / 900s (0% not started)
  // Average of percentages would be 50%, but duration-weighted must be 100 / 1000 = 10%
  const result = calculatePlaylistProgress([
    { last_watched_seconds: 100, duration_seconds: 100, is_completed: true },
    { last_watched_seconds: 0, duration_seconds: 900, is_completed: false },
  ]);
  assert.equal(result.percentage, 10);
  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 2);
  assert.equal(result.totalWatchedSeconds, 100);
  assert.equal(result.totalDurationSeconds, 1000);
});

test('calculateCollectionProgress excludes archived videos', () => {
  const result = calculateCollectionProgress([
    { is_completed: true, is_archived: false },
    { is_completed: false, is_archived: false },
    { is_completed: true, is_archived: true }, // archived must be ignored
  ]);
  assert.equal(result.totalActiveCount, 2);
  assert.equal(result.completedCount, 1);
  assert.equal(result.percentage, 50);
});

test('time parser accepts hh:mm:ss, h.mm.ss, mm:ss, and m.ss accurately', () => {
  assert.equal(parseMmSsToSeconds('12:30'), 750);
  assert.equal(parseTimeInputToSeconds('00:05'), 5);
  assert.equal(parseTimeInputToSeconds('5.08'), 308);
  assert.equal(parseTimeInputToSeconds('6:31:16'), 23476);
  assert.equal(parseTimeInputToSeconds('6.31.16'), 23476);
  assert.equal(parseTimeInputToSeconds('1:00:00'), 3600);
  assert.equal(parseTimeInputToSeconds('10:65'), null);
  assert.equal(parseTimeInputToSeconds('1:65:00'), null);
  assert.equal(parseTimeInputToSeconds('abc'), null);
  assert.equal(formatSecondsToMmSs(750), '12:30');
  assert.equal(formatSecondsToClock(3665), '1:01:05');
  assert.equal(formatSecondsToClock(23476), '6:31:16');
});
