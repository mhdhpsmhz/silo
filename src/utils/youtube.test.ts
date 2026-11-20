import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildYouTubeWatchUrlWithTimestamp,
  extractChannelHandle,
  extractYouTubeVideoId,
  getInitials,
  getYouTubeThumbnailUrl,
  isValidYouTubeUrl,
} from './youtube';

test('extractYouTubeVideoId handles standard watch, short, shorts, embed, and live URLs', () => {
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    'dQw4w9WgXcQ'
  );
  assert.equal(
    extractYouTubeVideoId('https://youtu.be/aircAruvnKk?t=42'),
    'aircAruvnKk'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/shorts/8aGhZQkoFbQ'),
    '8aGhZQkoFbQ'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/embed/rfscVS0vtbw'),
    'rfscVS0vtbw'
  );
  assert.equal(
    extractYouTubeVideoId('https://www.youtube.com/live/jfKfPfyJRdk'),
    'jfKfPfyJRdk'
  );
  assert.equal(extractYouTubeVideoId('https://vimeo.com/123456'), null);
  assert.equal(extractYouTubeVideoId('not-a-url'), null);
});

test('isValidYouTubeUrl validates YouTube video URLs accurately', () => {
  assert.equal(isValidYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), true);
  assert.equal(isValidYouTubeUrl('https://www.youtube.com/@Fireship'), false);
});

test('getYouTubeThumbnailUrl builds expected i.ytimg.com URL', () => {
  assert.equal(
    getYouTubeThumbnailUrl('dQw4w9WgXcQ', 'hq'),
    'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
  );
});

test('extractChannelHandle parses @handle URLs and ignores non-handle URLs', () => {
  assert.equal(extractChannelHandle('https://www.youtube.com/@3blue1brown'), '3blue1brown');
  assert.equal(extractChannelHandle('https://youtube.com/@MITOpenCourseWare/videos'), 'MITOpenCourseWare');
  assert.equal(extractChannelHandle('https://www.youtube.com/channel/UCYO_jab_esuFRV4b17AJtAw'), null);
});

test('getInitials returns clean uppercase initials for fallback avatars', () => {
  assert.equal(getInitials('3Blue1Brown'), '3B');
  assert.equal(getInitials('MIT OpenCourseWare'), 'MO');
  assert.equal(getInitials('Fireship'), 'FI');
});

test('buildYouTubeWatchUrlWithTimestamp appends or clears timestamp cleanly', () => {
  assert.equal(
    buildYouTubeWatchUrlWithTimestamp('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ', 23476),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=23476s'
  );
  assert.equal(
    buildYouTubeWatchUrlWithTimestamp('https://youtu.be/dQw4w9WgXcQ?t=10s', 'dQw4w9WgXcQ', 95),
    'https://youtu.be/dQw4w9WgXcQ?t=95s'
  );
  assert.equal(
    buildYouTubeWatchUrlWithTimestamp('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s', 'dQw4w9WgXcQ', 0),
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
  );
});
