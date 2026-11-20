const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts a canonical 11-character YouTube video ID from common YouTube URL formats.
 */
export function extractYouTubeVideoId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

  if (host === 'youtu.be') {
    const id = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return YOUTUBE_ID_REGEX.test(id) ? id : null;
  }

  const allowedHosts = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'];
  if (!allowedHosts.includes(host)) {
    return null;
  }

  const vParam = parsed.searchParams.get('v');
  if (vParam && YOUTUBE_ID_REGEX.test(vParam)) {
    return vParam;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length >= 2 && ['embed', 'shorts', 'live', 'v'].includes(segments[0])) {
    const candidate = segments[1];
    return YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
  }

  return null;
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: 'hq' | 'mq' | 'maxres' = 'hq'
): string {
  const filename =
    quality === 'maxres'
      ? 'maxresdefault.jpg'
      : quality === 'mq'
        ? 'mqdefault.jpg'
        : 'hqdefault.jpg';
  return `https://i.ytimg.com/vi/${videoId}/${filename}`;
}

export function getYouTubeThumbnailFallbackUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

/**
 * Extracts a channel name from a YouTube @handle URL (e.g., https://youtube.com/@3blue1brown -> 3blue1brown).
 * Returns null if the URL is not a recognizable @handle URL.
 */
export function extractChannelHandle(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (!['youtube.com', 'm.youtube.com'].includes(host)) {
    return null;
  }

  const segments = parsed.pathname.split('/').filter(Boolean);
  const firstSegment = segments[0] ?? '';
  if (firstSegment.startsWith('@') && firstSegment.length > 1) {
    return decodeURIComponent(firstSegment.slice(1));
  }

  return null;
}

export function isValidHttpUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Builds a YouTube watch URL pointing to the saved timestamp (`t=Xs`) when progress > 0.
 */
export function buildYouTubeWatchUrlWithTimestamp(
  rawUrlOrId: string,
  youtubeVideoId: string,
  seconds: number
): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  let baseUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
  try {
    const parsed = new URL(rawUrlOrId);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      if (safeSeconds > 0) {
        parsed.searchParams.set('t', `${safeSeconds}s`);
      } else {
        parsed.searchParams.delete('t');
      }
      return parsed.toString();
    }
  } catch {
    // Fallback to canonical watch URL
  }
  return safeSeconds > 0 ? `${baseUrl}&t=${safeSeconds}s` : baseUrl;
}
