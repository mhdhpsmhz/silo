import type { VideoStatus } from '../types/silo';

export const COMPLETION_THRESHOLD_PERCENT = 95;

/**
 * Computes individual video progress percentage: (last_watched_seconds / duration_seconds) * 100
 * Clamped between 0 and 100. Returns 0 when duration_seconds <= 0.
 */
export function calculateVideoProgress(
  lastWatchedSeconds: number,
  durationSeconds: number
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return 0;
  }
  if (!Number.isFinite(lastWatchedSeconds) || lastWatchedSeconds <= 0) {
    return 0;
  }
  const raw = (lastWatchedSeconds / durationSeconds) * 100;
  const clamped = Math.max(0, Math.min(100, raw));
  return Math.round(clamped * 10) / 10;
}

/**
 * Determines whether watch progress meets the >= 95% auto-completion threshold.
 */
export function shouldMarkCompleted(
  lastWatchedSeconds: number,
  durationSeconds: number
): boolean {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return false;
  }
  return calculateVideoProgress(lastWatchedSeconds, durationSeconds) >= COMPLETION_THRESHOLD_PERCENT;
}

export function getVideoStatus(video: {
  is_completed: boolean;
  last_watched_seconds: number;
  duration_seconds: number;
}): VideoStatus {
  if (video.is_completed) return 'Completed';
  if (video.last_watched_seconds > 0) return 'In Progress';
  return 'Not Started';
}

export interface PlaylistProgressResult {
  percentage: number;
  completedCount: number;
  totalCount: number;
  totalWatchedSeconds: number;
  totalDurationSeconds: number;
}

/**
 * Calculates playlist progress strictly from total watched seconds / total duration seconds * 100.
 * Never averages individual video percentages.
 */
export function calculatePlaylistProgress(
  videos: Array<{
    last_watched_seconds: number;
    duration_seconds: number;
    is_completed: boolean;
  }>
): PlaylistProgressResult {
  const totalCount = videos.length;
  let completedCount = 0;
  let totalWatchedSeconds = 0;
  let totalDurationSeconds = 0;

  for (const v of videos) {
    if (v.is_completed) completedCount += 1;
    const duration = Math.max(0, v.duration_seconds || 0);
    const watched = v.is_completed
      ? duration
      : Math.max(0, Math.min(duration > 0 ? duration : v.last_watched_seconds || 0, v.last_watched_seconds || 0));
    totalDurationSeconds += duration;
    totalWatchedSeconds += watched;
  }

  const percentage =
    totalDurationSeconds > 0
      ? Math.round(Math.max(0, Math.min(100, (totalWatchedSeconds / totalDurationSeconds) * 100)) * 10) / 10
      : 0;

  return {
    percentage,
    completedCount,
    totalCount,
    totalWatchedSeconds,
    totalDurationSeconds,
  };
}

export interface CollectionProgressResult {
  percentage: number;
  completedCount: number;
  totalActiveCount: number;
}

/**
 * Calculates Channel or Category progress from active (non-archived) videos:
 * (completed_videos / total_active_videos) * 100
 */
export function calculateCollectionProgress(
  videos: Array<{ is_completed: boolean; is_archived: boolean }>
): CollectionProgressResult {
  const active = videos.filter((v) => !v.is_archived);
  const totalActiveCount = active.length;
  if (totalActiveCount === 0) {
    return {
      percentage: 0,
      completedCount: 0,
      totalActiveCount: 0,
    };
  }
  const completedCount = active.filter((v) => v.is_completed).length;
  const percentage = Math.round((completedCount / totalActiveCount) * 1000) / 10;
  return {
    percentage,
    completedCount,
    totalActiveCount,
  };
}

/**
 * Formats seconds into mm:ss (or hh:mm:ss if >= 1 hour).
 */
export function formatSecondsToClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats total seconds strictly as mm:ss (e.g., 75 minutes -> 75:00) for manual mm:ss inputs.
 */
export function formatSecondsToMmSs(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Parses flexible duration/timestamp strings (hh:mm:ss, h.mm.ss, mm:ss, m.ss) into total seconds.
 * Returns null if the format or minute/second bounds are invalid.
 */
export function parseTimeInputToSeconds(value: string): number | null {
  const normalized = value.trim().replace(/\./g, ':');
  if (!normalized) return null;

  const hmsMatch = /^(\d+):([0-5]\d):([0-5]\d)$/.exec(normalized);
  if (hmsMatch) {
    const hours = Number.parseInt(hmsMatch[1], 10);
    const minutes = Number.parseInt(hmsMatch[2], 10);
    const seconds = Number.parseInt(hmsMatch[3], 10);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) {
      return null;
    }
    return hours * 3600 + minutes * 60 + seconds;
  }

  const msMatch = /^(\d+):([0-5]\d)$/.exec(normalized);
  if (msMatch) {
    const minutes = Number.parseInt(msMatch[1], 10);
    const seconds = Number.parseInt(msMatch[2], 10);
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;
    return minutes * 60 + seconds;
  }

  return null;
}

/**
 * Parses a time string (mm:ss, hh:mm:ss, m.ss, h.mm.ss) into total seconds. Returns null if invalid.
 */
export function parseMmSsToSeconds(value: string): number | null {
  return parseTimeInputToSeconds(value);
}

/**
 * Formats a duration in seconds into a readable summary (e.g. "2h 15m" or "42m").
 */
export function formatDurationHuman(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${safe}s`;
}
