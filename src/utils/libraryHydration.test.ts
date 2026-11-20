import test from 'node:test';
import assert from 'node:assert/strict';
import { hydrateLibrary } from './libraryHydration';
import type { LibrarySnapshot } from '../types/silo';

test('hydrateLibrary orders playlist videos by order_index and sets cover thumbnail from first video', () => {
  const snapshot: LibrarySnapshot = {
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
        name: 'MIT',
        channel_url: 'https://youtube.com/@MIT',
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
        title: 'First Added',
        thumbnail_url: 'https://i.ytimg.com/vi/AAAAAAAAAAA/hqdefault.jpg',
        channel_id: 'ch-1',
        category_id: 'cat-1',
        notes: null,
        duration_seconds: 100,
        last_watched_seconds: 50,
        is_completed: false,
        is_favorite: false,
        is_archived: false,
        created_at: '2026-01-01T00:00:00Z',
        last_watched_at: null,
      },
      {
        id: 'vid-2',
        youtube_video_id: 'BBBBBBBBBBB',
        url: 'https://youtube.com/watch?v=BBBBBBBBBBB',
        title: 'Should Be First In Playlist',
        thumbnail_url: 'https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg',
        channel_id: 'ch-1',
        category_id: 'cat-1',
        notes: null,
        duration_seconds: 300,
        last_watched_seconds: 300,
        is_completed: true,
        is_favorite: true,
        is_archived: false,
        created_at: '2026-01-02T00:00:00Z',
        last_watched_at: '2026-01-03T00:00:00Z',
      },
    ],
    video_playlists: [
      { id: 'vp-1', video_id: 'vid-1', playlist_id: 'pl-1', order_index: 1 },
      { id: 'vp-2', video_id: 'vid-2', playlist_id: 'pl-1', order_index: 0 },
    ],
    video_labels: [{ video_id: 'vid-1', label_id: 'lbl-1' }],
  };

  const hydrated = hydrateLibrary(snapshot);
  const pl = hydrated.playlistsById.get('pl-1');
  assert.ok(pl);
  assert.equal(pl.videos.length, 2);
  assert.equal(pl.videos[0].id, 'vid-2');
  assert.equal(pl.cover_thumbnail_url, 'https://i.ytimg.com/vi/BBBBBBBBBBB/hqdefault.jpg');
  // Duration weighted: (50 + 300) / (100 + 300) = 350 / 400 = 87.5%
  assert.equal(pl.progress_percentage, 87.5);

  const ch = hydrated.channelsById.get('ch-1');
  assert.ok(ch);
  assert.equal(ch.progress_percentage, 50);
  assert.equal(ch.completed_videos, 1);
});
