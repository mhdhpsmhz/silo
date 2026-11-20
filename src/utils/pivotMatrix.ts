import type { VideoWithRelations } from '../types/silo';
import { formatDurationHuman } from './progress';

export type PivotDimension =
  | 'category'
  | 'channel'
  | 'label'
  | 'playlist'
  | 'status'
  | 'favorite';

export type PivotMetric =
  | 'count'
  | 'watchedDuration'
  | 'totalDuration'
  | 'completionRate';

export interface PivotHeader {
  key: string;
  label: string;
  color?: string;
}

export interface PivotBucketStats {
  count: number;
  completedCount: number;
  watchedSeconds: number;
  totalSeconds: number;
  completionRate: number;
  videoIds: string[];
}

export interface PivotMatrixResult {
  rows: PivotHeader[];
  columns: PivotHeader[];
  cells: Map<string, PivotBucketStats>;
  rowTotals: Map<string, PivotBucketStats>;
  columnTotals: Map<string, PivotBucketStats>;
  grandTotal: PivotBucketStats;
  maxMetricValue: number;
}

export interface PivotLabels {
  uncategorized: string;
  unknownChannel: string;
  unlabeled: string;
  noPlaylist: string;
  statusNotStarted: string;
  statusInProgress: string;
  statusCompleted: string;
  favoriteYes: string;
  favoriteNo: string;
}

const STATUS_ORDER = new Map<string, number>([
  ['Not Started', 0],
  ['In Progress', 1],
  ['Completed', 2],
]);

function extractDimensionBuckets(
  video: VideoWithRelations,
  dimension: PivotDimension,
  labels: PivotLabels
): PivotHeader[] {
  switch (dimension) {
    case 'category':
      return video.category
        ? [{ key: video.category.id, label: video.category.name, color: video.category.color }]
        : [{ key: '__uncategorized__', label: labels.uncategorized }];
    case 'channel':
      return video.channel
        ? [{ key: video.channel.id, label: video.channel.name }]
        : [{ key: '__unknown_channel__', label: labels.unknownChannel }];
    case 'label':
      return video.labels.length > 0
        ? video.labels.map((l) => ({ key: l.id, label: l.name }))
        : [{ key: '__unlabeled__', label: labels.unlabeled }];
    case 'playlist':
      return video.playlists.length > 0
        ? video.playlists.map((p) => ({ key: p.id, label: p.name }))
        : [{ key: '__no_playlist__', label: labels.noPlaylist }];
    case 'status': {
      const label =
        video.status === 'Completed'
          ? labels.statusCompleted
          : video.status === 'In Progress'
            ? labels.statusInProgress
            : labels.statusNotStarted;
      return [{ key: video.status, label }];
    }
    case 'favorite':
      return video.is_favorite
        ? [{ key: 'favorite', label: labels.favoriteYes }]
        : [{ key: 'standard', label: labels.favoriteNo }];
  }
}

function summarizeVideos(videos: VideoWithRelations[]): PivotBucketStats {
  const uniqueMap = new Map<string, VideoWithRelations>();
  for (const v of videos) {
    uniqueMap.set(v.id, v);
  }
  const unique = Array.from(uniqueMap.values());
  let completedCount = 0;
  let watchedSeconds = 0;
  let totalSeconds = 0;

  for (const v of unique) {
    if (v.is_completed) completedCount += 1;
    const effectiveWatched =
      v.is_completed && v.duration_seconds > 0
        ? v.duration_seconds
        : Math.max(0, v.last_watched_seconds);
    watchedSeconds += effectiveWatched;
    totalSeconds += Math.max(0, v.duration_seconds);
  }

  const count = unique.length;
  const completionRate = count > 0 ? Math.round((completedCount / count) * 100) : 0;

  return {
    count,
    completedCount,
    watchedSeconds,
    totalSeconds,
    completionRate,
    videoIds: unique.map((v) => v.id),
  };
}

export function getMetricNumericValue(stats: PivotBucketStats, metric: PivotMetric): number {
  switch (metric) {
    case 'count':
      return stats.count;
    case 'watchedDuration':
      return stats.watchedSeconds;
    case 'totalDuration':
      return stats.totalSeconds;
    case 'completionRate':
      return stats.completionRate;
  }
}

export function formatPivotMetricValue(stats: PivotBucketStats, metric: PivotMetric): string {
  if (stats.count === 0) return '—';
  switch (metric) {
    case 'count':
      return String(stats.count);
    case 'watchedDuration':
      return stats.watchedSeconds > 0 ? formatDurationHuman(stats.watchedSeconds) : '0m';
    case 'totalDuration':
      return stats.totalSeconds > 0 ? formatDurationHuman(stats.totalSeconds) : '0m';
    case 'completionRate':
      return `${stats.completionRate}%`;
  }
}

export function pivotCellKey(rowKey: string, colKey: string): string {
  return `${rowKey}::${colKey}`;
}

function sortHeaders(headers: PivotHeader[], dimension: PivotDimension): PivotHeader[] {
  return headers.slice().sort((a, b) => {
    if (dimension === 'status') {
      return (STATUS_ORDER.get(a.key) ?? 99) - (STATUS_ORDER.get(b.key) ?? 99);
    }
    if (dimension === 'favorite') {
      return a.key === b.key ? 0 : a.key === 'favorite' ? -1 : 1;
    }
    const aFallback = a.key.startsWith('__') && a.key.endsWith('__');
    const bFallback = b.key.startsWith('__') && b.key.endsWith('__');
    if (aFallback !== bFallback) return aFallback ? 1 : -1;
    return a.label.localeCompare(b.label);
  });
}

export function buildPivotMatrix(
  videos: VideoWithRelations[],
  options: {
    rowDimension: PivotDimension;
    colDimension: PivotDimension;
    metric: PivotMetric;
    labels: PivotLabels;
  }
): PivotMatrixResult {
  const { rowDimension, colDimension, metric, labels } = options;

  const rowHeadersMap = new Map<string, PivotHeader>();
  const colHeadersMap = new Map<string, PivotHeader>();
  const rowVideosMap = new Map<string, VideoWithRelations[]>();
  const colVideosMap = new Map<string, VideoWithRelations[]>();
  const cellVideosMap = new Map<string, VideoWithRelations[]>();

  for (const video of videos) {
    const rBuckets = extractDimensionBuckets(video, rowDimension, labels);
    const cBuckets = extractDimensionBuckets(video, colDimension, labels);

    for (const r of rBuckets) {
      rowHeadersMap.set(r.key, r);
      const rList = rowVideosMap.get(r.key) ?? [];
      rList.push(video);
      rowVideosMap.set(r.key, rList);
    }

    for (const c of cBuckets) {
      colHeadersMap.set(c.key, c);
      const cList = colVideosMap.get(c.key) ?? [];
      cList.push(video);
      colVideosMap.set(c.key, cList);
    }

    for (const r of rBuckets) {
      for (const c of cBuckets) {
        const key = pivotCellKey(r.key, c.key);
        const list = cellVideosMap.get(key) ?? [];
        list.push(video);
        cellVideosMap.set(key, list);
      }
    }
  }

  const rows = sortHeaders(Array.from(rowHeadersMap.values()), rowDimension);
  const columns = sortHeaders(Array.from(colHeadersMap.values()), colDimension);

  const cells = new Map<string, PivotBucketStats>();
  let maxMetricValue = 0;

  for (const r of rows) {
    for (const c of columns) {
      const key = pivotCellKey(r.key, c.key);
      const stats = summarizeVideos(cellVideosMap.get(key) ?? []);
      cells.set(key, stats);
      if (stats.count > 0) {
        maxMetricValue = Math.max(maxMetricValue, getMetricNumericValue(stats, metric));
      }
    }
  }

  const rowTotals = new Map<string, PivotBucketStats>();
  for (const r of rows) {
    rowTotals.set(r.key, summarizeVideos(rowVideosMap.get(r.key) ?? []));
  }

  const columnTotals = new Map<string, PivotBucketStats>();
  for (const c of columns) {
    columnTotals.set(c.key, summarizeVideos(colVideosMap.get(c.key) ?? []));
  }

  const grandTotal = summarizeVideos(videos);

  return {
    rows,
    columns,
    cells,
    rowTotals,
    columnTotals,
    grandTotal,
    maxMetricValue,
  };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportPivotMatrixToCsv(
  matrix: PivotMatrixResult,
  metric: PivotMetric,
  cornerLabel: string,
  totalLabel: string
): string {
  const headerRow = [
    cornerLabel,
    ...matrix.columns.map((c) => c.label),
    totalLabel,
  ];
  const lines: string[] = [headerRow.map(escapeCsvField).join(',')];

  for (const row of matrix.rows) {
    const rowValues = [row.label];
    for (const col of matrix.columns) {
      const stats = matrix.cells.get(pivotCellKey(row.key, col.key));
      rowValues.push(stats && stats.count > 0 ? formatPivotMetricValue(stats, metric) : '0');
    }
    const rTotal = matrix.rowTotals.get(row.key);
    rowValues.push(rTotal && rTotal.count > 0 ? formatPivotMetricValue(rTotal, metric) : '0');
    lines.push(rowValues.map(escapeCsvField).join(','));
  }

  const footerRow = [totalLabel];
  for (const col of matrix.columns) {
    const cTotal = matrix.columnTotals.get(col.key);
    footerRow.push(cTotal && cTotal.count > 0 ? formatPivotMetricValue(cTotal, metric) : '0');
  }
  footerRow.push(
    matrix.grandTotal.count > 0 ? formatPivotMetricValue(matrix.grandTotal, metric) : '0'
  );
  lines.push(footerRow.map(escapeCsvField).join(','));

  return lines.join('\n');
}
