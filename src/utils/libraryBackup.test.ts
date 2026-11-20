import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLibraryExportPayload,
  mergeLibrarySnapshots,
  parseAndValidateLibraryImport,
} from './libraryBackup';
import type { LibrarySnapshot } from '../types/silo';

function makeSnapshot(): LibrarySnapshot {
  return {
    categories: [
      {
        id: 'cat-1',
        name: 'Systems',
        color: '#1F4788',
        icon_name: 'lucide:cpu',
        description: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    labels: [
      {
        id: 'lbl-1',
        name: 'Distributed',
        category_id: 'cat-1',
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    channels: [
      {
        id: 'ch-1',
        name: 'MIT OCW',
        channel_url: 'https://youtube.com/@mitocw',
        avatar_url: null,
        default_category_id: 'cat-1',
        notes: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    playlists: [
      {
        id: 'pl-1',
        name: 'Foundations',
        category_id: 'cat-1',
        description: null,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    videos: [
      {
        id: 'vid-1',
        youtube_video_id: 'AAAAAAAAAAA',
        url: 'https://youtube.com/watch?v=AAAAAAAAAAA',
        title: 'Existing Video',
        thumbnail_url: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg',
        channel_id: 'ch-1',
        category_id: 'cat-1',
        notes: null,
        duration_seconds: 500,
        last_watched_seconds: 120,
        is_completed: false,
        is_favorite: false,
        is_archived: false,
        created_at: '2026-01-01T00:00:00Z',
        last_watched_at: null,
      },
    ],
    video_playlists: [{ id: 'vp-1', video_id: 'vid-1', playlist_id: 'pl-1', order_index: 0 }],
    video_labels: [{ video_id: 'vid-1', label_id: 'lbl-1' }],
    watch_queue: [{ id: 'wq-1', video_id: 'vid-1', position: 0, added_at: '2026-01-01T00:00:00Z' }],
  };
}

test('buildLibraryExportPayload and parseAndValidateLibraryImport roundtrip cleanly', () => {
  const snapshot = makeSnapshot();
  const payload = buildLibraryExportPayload(snapshot);

  assert.equal(payload.app, 'SILO');
  assert.equal(payload.version, 1);
  assert.equal(payload.counts.videos, 1);
  assert.equal(payload.counts.watch_queue, 1);

  const parsed = parseAndValidateLibraryImport(JSON.stringify(payload));
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.counts.categories, 1);
  assert.equal(parsed.counts.videos, 1);
  assert.equal(parsed.counts.watch_queue, 1);
  assert.equal(parsed.data.videos[0].youtube_video_id, 'AAAAAAAAAAA');
});

test('parseAndValidateLibraryImport accepts raw LibrarySnapshot and rejects invalid inputs', () => {
  const invalidJson = parseAndValidateLibraryImport('{not valid');
  assert.deepEqual(invalidJson, { ok: false, errorCode: 'invalidJson' });

  const wrongApp = parseAndValidateLibraryImport(
    JSON.stringify({ app: 'OTHER', data: makeSnapshot() })
  );
  assert.deepEqual(wrongApp, { ok: false, errorCode: 'invalidStructure' });

  const empty = parseAndValidateLibraryImport(
    JSON.stringify({
      categories: [],
      labels: [],
      channels: [],
      playlists: [],
      videos: [],
    })
  );
  assert.deepEqual(empty, { ok: false, errorCode: 'emptyPayload' });

  const rawParsed = parseAndValidateLibraryImport(JSON.stringify(makeSnapshot()));
  assert.equal(rawParsed.ok, true);
});

test('mergeLibrarySnapshots deduplicates videos by youtube_video_id and remaps relations', () => {
  const existing = makeSnapshot();
  const incoming: LibrarySnapshot = {
    categories: [
      {
        id: 'imp-cat-1',
        name: 'systems', // Case-insensitive match to existing Systems (cat-1)
        color: '#000000',
        icon_name: 'lucide:cpu',
        description: null,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'imp-cat-2',
        name: 'Mathematics',
        color: '#2E7D32',
        icon_name: 'lucide:sigma',
        description: null,
        created_at: '2026-02-01T00:00:00Z',
      },
    ],
    labels: [
      {
        id: 'imp-lbl-1',
        name: 'distributed', // Matches existing Distributed under Systems
        category_id: 'imp-cat-1',
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'imp-lbl-2',
        name: 'Linear Algebra',
        category_id: 'imp-cat-2',
        created_at: '2026-02-01T00:00:00Z',
      },
    ],
    channels: [
      {
        id: 'imp-ch-1',
        name: 'MIT OCW',
        channel_url: 'https://youtube.com/@mitocw',
        avatar_url: null,
        default_category_id: 'imp-cat-1',
        notes: null,
        created_at: '2026-02-01T00:00:00Z',
      },
    ],
    playlists: [
      {
        id: 'imp-pl-1',
        name: 'Foundations',
        category_id: 'imp-cat-1',
        description: null,
        created_at: '2026-02-01T00:00:00Z',
      },
    ],
    videos: [
      {
        id: 'imp-vid-dup',
        youtube_video_id: 'AAAAAAAAAAA', // Duplicate of existing vid-1
        url: 'https://youtube.com/watch?v=AAAAAAAAAAA',
        title: 'Duplicate Should Skip',
        thumbnail_url: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg',
        channel_id: 'imp-ch-1',
        category_id: 'imp-cat-1',
        notes: null,
        duration_seconds: 500,
        last_watched_seconds: 0,
        is_completed: false,
        is_favorite: false,
        is_archived: false,
        created_at: '2026-02-01T00:00:00Z',
        last_watched_at: null,
      },
      {
        id: 'imp-vid-new',
        youtube_video_id: 'DDDDDDDDDDD',
        url: 'https://youtube.com/watch?v=DDDDDDDDDDD',
        title: 'Eigenvalues',
        thumbnail_url: 'https://i.ytimg.com/vi/DDDDDDDDDDD/hqdefault.jpg',
        channel_id: 'imp-ch-1',
        category_id: 'imp-cat-2',
        notes: null,
        duration_seconds: 900,
        last_watched_seconds: 0,
        is_completed: false,
        is_favorite: true,
        is_archived: false,
        created_at: '2026-02-02T00:00:00Z',
        last_watched_at: null,
      },
    ],
    video_playlists: [
      { id: 'imp-vp-1', video_id: 'imp-vid-new', playlist_id: 'imp-pl-1', order_index: 0 },
    ],
    video_labels: [
      { video_id: 'imp-vid-new', label_id: 'imp-lbl-2' },
      { video_id: 'imp-vid-new', label_id: 'imp-lbl-1' },
    ],
    watch_queue: [
      { id: 'imp-wq-dup', video_id: 'imp-vid-dup', position: 0, added_at: '2026-02-01T00:00:00Z' },
      { id: 'imp-wq-new', video_id: 'imp-vid-new', position: 1, added_at: '2026-02-02T00:00:00Z' },
    ],
  };

  const { merged, insertions, summary } = mergeLibrarySnapshots(existing, incoming);

  assert.equal(summary.addedVideos, 1);
  assert.equal(summary.skippedVideos, 1);
  assert.equal(summary.addedCategories, 1);
  assert.equal(summary.addedLabels, 1);
  assert.equal(summary.addedChannels, 0);
  assert.equal(summary.addedPlaylists, 0);
  assert.equal(summary.addedQueueItems, 1);

  assert.equal(merged.videos.length, 2);
  assert.equal(insertions.videos[0].channel_id, 'ch-1');
  assert.equal(insertions.videos[0].category_id, 'imp-cat-2');
  assert.equal(insertions.video_playlists[0].playlist_id, 'pl-1');
  assert.equal(insertions.video_playlists[0].order_index, 1);
  assert.deepEqual(
    insertions.video_labels.map((vl) => vl.label_id).sort(),
    ['imp-lbl-2', 'lbl-1']
  );
  assert.equal(merged.watch_queue?.length, 2);
  assert.equal(insertions.watch_queue?.[0].position, 1);
  assert.equal(insertions.watch_queue?.[0].video_id, 'imp-vid-new');
});
