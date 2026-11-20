import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPivotMatrix,
  exportPivotMatrixToCsv,
  formatPivotMetricValue,
  getMetricNumericValue,
  pivotCellKey,
  type PivotLabels,
} from './pivotMatrix';
import type { Category, Channel, Label, Playlist, VideoWithRelations } from '../types/silo';

const LABELS: PivotLabels = {
  uncategorized: 'Uncategorized',
  unknownChannel: 'Unknown Channel',
  unlabeled: 'Unlabeled',
  noPlaylist: 'No Playlist',
  statusNotStarted: 'Not Started',
  statusInProgress: 'In Progress',
  statusCompleted: 'Completed',
  favoriteYes: 'Favorite',
  favoriteNo: 'Standard',
};

const catSys: Category = {
  id: 'cat-sys',
  name: 'Systems',
  color: '#1F4788',
  icon_name: 'lucide:cpu',
  description: null,
  created_at: '2026-01-01T00:00:00Z',
};

const catDesign: Category = {
  id: 'cat-des',
  name: 'Design',
  color: '#48929B',
  icon_name: 'lucide:pen',
  description: null,
  created_at: '2026-01-01T00:00:00Z',
};

const ch1: Channel = {
  id: 'ch-1',
  name: 'Core Engineering',
  channel_url: 'https://youtube.com/@core',
  avatar_url: null,
  default_category_id: 'cat-sys',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
};

const lblPerf: Label = {
  id: 'lbl-perf',
  name: 'Performance',
  category_id: 'cat-sys',
  created_at: '2026-01-01T00:00:00Z',
};

const lblArch: Label = {
  id: 'lbl-arch',
  name: 'Architecture',
  category_id: 'cat-sys',
  created_at: '2026-01-01T00:00:00Z',
};

const plCore: Playlist & { order_index: number } = {
  id: 'pl-core',
  name: 'Must Watch',
  category_id: 'cat-sys',
  description: null,
  created_at: '2026-01-01T00:00:00Z',
  order_index: 0,
};

function makeVideos(): VideoWithRelations[] {
  return [
    {
      id: 'v1',
      youtube_video_id: 'AAAAAAAAAAA',
      url: 'https://youtube.com/watch?v=AAAAAAAAAAA',
      title: 'Distributed Cache',
      thumbnail_url: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg',
      channel_id: 'ch-1',
      category_id: 'cat-sys',
      notes: null,
      duration_seconds: 1200,
      last_watched_seconds: 600,
      is_completed: false,
      is_favorite: true,
      is_archived: false,
      created_at: '2026-01-01T00:00:00Z',
      last_watched_at: '2026-01-02T00:00:00Z',
      channel: ch1,
      category: catSys,
      labels: [lblPerf, lblArch],
      playlists: [plCore],
      progress_percentage: 50,
      status: 'In Progress',
    },
    {
      id: 'v2',
      youtube_video_id: 'BBBBBBBBBBB',
      url: 'https://youtube.com/watch?v=BBBBBBBBBBB',
      title: 'Kernel Profiling',
      thumbnail_url: 'https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg',
      channel_id: 'ch-1',
      category_id: 'cat-sys',
      notes: null,
      duration_seconds: 600,
      last_watched_seconds: 100, // Completed videos should count full duration_seconds as watched
      is_completed: true,
      is_favorite: false,
      is_archived: false,
      created_at: '2026-01-02T00:00:00Z',
      last_watched_at: '2026-01-03T00:00:00Z',
      channel: ch1,
      category: catSys,
      labels: [lblPerf],
      playlists: [],
      progress_percentage: 100,
      status: 'Completed',
    },
    {
      id: 'v3',
      youtube_video_id: 'CCCCCCCCCCC',
      url: 'https://youtube.com/watch?v=CCCCCCCCCCC',
      title: 'Grid Systems',
      thumbnail_url: 'https://i.ytimg.com/vi/CCCCCCCCCCC/hqdefault.jpg',
      channel_id: null,
      category_id: 'cat-des',
      notes: null,
      duration_seconds: 1800,
      last_watched_seconds: 0,
      is_completed: false,
      is_favorite: false,
      is_archived: false,
      created_at: '2026-01-03T00:00:00Z',
      last_watched_at: null,
      channel: null,
      category: catDesign,
      labels: [],
      playlists: [],
      progress_percentage: 0,
      status: 'Not Started',
    },
  ];
}

test('buildPivotMatrix aggregates category x status across metrics', () => {
  const videos = makeVideos();
  const matrix = buildPivotMatrix(videos, {
    rowDimension: 'category',
    colDimension: 'status',
    metric: 'count',
    labels: LABELS,
  });

  // Rows sorted alphabetically: Design, Systems
  assert.deepEqual(
    matrix.rows.map((r) => r.label),
    ['Design', 'Systems']
  );
  // Status columns sorted logically: Not Started, In Progress, Completed
  assert.deepEqual(
    matrix.columns.map((c) => c.key),
    ['Not Started', 'In Progress', 'Completed']
  );

  const sysCompleted = matrix.cells.get(pivotCellKey('cat-sys', 'Completed'));
  assert.ok(sysCompleted);
  assert.equal(sysCompleted.count, 1);
  assert.equal(sysCompleted.watchedSeconds, 600);
  assert.equal(sysCompleted.completionRate, 100);

  const sysTotal = matrix.rowTotals.get('cat-sys');
  assert.ok(sysTotal);
  assert.equal(sysTotal.count, 2);
  assert.equal(sysTotal.watchedSeconds, 1200);
  assert.equal(sysTotal.totalSeconds, 1800);
  assert.equal(sysTotal.completionRate, 50);

  assert.equal(matrix.grandTotal.count, 3);
  assert.equal(matrix.grandTotal.completionRate, 33);
  assert.equal(matrix.maxMetricValue, 1);
});

test('buildPivotMatrix deduplicates totals when multi-valued labels are used', () => {
  const videos = makeVideos();
  const matrix = buildPivotMatrix(videos, {
    rowDimension: 'label',
    colDimension: 'favorite',
    metric: 'watchedDuration',
    labels: LABELS,
  });

  // Unlabeled fallback sorts last
  assert.deepEqual(
    matrix.rows.map((r) => r.key),
    ['lbl-arch', 'lbl-perf', '__unlabeled__']
  );
  // Favorite sorts before Standard
  assert.deepEqual(
    matrix.columns.map((c) => c.key),
    ['favorite', 'standard']
  );

  // v1 has both Performance and Architecture labels, but grandTotal and columnTotal remain deduplicated
  assert.equal(matrix.grandTotal.count, 3);
  assert.equal(matrix.columnTotals.get('favorite')?.count, 1);
  assert.equal(matrix.columnTotals.get('standard')?.count, 2);

  const perfRowTotal = matrix.rowTotals.get('lbl-perf');
  assert.ok(perfRowTotal);
  assert.equal(perfRowTotal.count, 2);
  assert.equal(getMetricNumericValue(perfRowTotal, 'watchedDuration'), 1200);
  assert.equal(formatPivotMetricValue(perfRowTotal, 'watchedDuration'), '20m');
});

test('exportPivotMatrixToCsv formats matrix rows, totals, and CSV escaping cleanly', () => {
  const videos = makeVideos();
  const matrix = buildPivotMatrix(videos, {
    rowDimension: 'category',
    colDimension: 'channel',
    metric: 'completionRate',
    labels: LABELS,
  });

  const csv = exportPivotMatrixToCsv(matrix, 'completionRate', 'Category / Channel', 'Total');
  const lines = csv.split('\n');
  assert.equal(lines.length, 4);
  assert.equal(lines[0], 'Category / Channel,Core Engineering,Unknown Channel,Total');
  assert.equal(lines[1], 'Design,0,0%,0%');
  assert.equal(lines[2], 'Systems,50%,0,50%');
  assert.equal(lines[3], 'Total,50%,0%,33%');
});
