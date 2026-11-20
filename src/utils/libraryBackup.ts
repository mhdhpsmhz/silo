import type {
  Category,
  Channel,
  ImportResultSummary,
  Label,
  LibrarySnapshot,
  Playlist,
  SiloExportCounts,
  SiloExportPayload,
  Video,
  VideoLabel,
  VideoPlaylist,
  WatchQueueItem,
} from '../types/silo';

function makeUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function buildLibraryExportPayload(snapshot: LibrarySnapshot): SiloExportPayload {
  const normalized: LibrarySnapshot = {
    categories: snapshot.categories ?? [],
    labels: snapshot.labels ?? [],
    channels: snapshot.channels ?? [],
    playlists: snapshot.playlists ?? [],
    videos: snapshot.videos ?? [],
    video_playlists: snapshot.video_playlists ?? [],
    video_labels: snapshot.video_labels ?? [],
    watch_queue: snapshot.watch_queue ?? [],
  };

  return {
    app: 'SILO',
    version: 1,
    exported_at: new Date().toISOString(),
    counts: {
      categories: normalized.categories.length,
      labels: normalized.labels.length,
      channels: normalized.channels.length,
      playlists: normalized.playlists.length,
      videos: normalized.videos.length,
      watch_queue: normalized.watch_queue?.length ?? 0,
    },
    data: normalized,
  };
}

export type ParsedImportResult =
  | {
      ok: true;
      data: LibrarySnapshot;
      counts: SiloExportCounts;
      exportedAt: string | null;
    }
  | {
      ok: false;
      errorCode: 'invalidJson' | 'invalidStructure' | 'emptyPayload';
    };

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function asNonEmptyString(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseAndValidateLibraryImport(rawJson: string): ParsedImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, errorCode: 'invalidJson' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, errorCode: 'invalidStructure' };
  }

  let exportedAt: string | null = null;
  let candidate: Record<string, unknown> = parsed;

  if (isRecord(parsed.data)) {
    if (parsed.app !== undefined && parsed.app !== 'SILO') {
      return { ok: false, errorCode: 'invalidStructure' };
    }
    exportedAt = typeof parsed.exported_at === 'string' ? parsed.exported_at : null;
    candidate = parsed.data;
  }

  const requiredKeys = ['categories', 'labels', 'channels', 'playlists', 'videos'] as const;
  for (const key of requiredKeys) {
    if (!Array.isArray(candidate[key])) {
      return { ok: false, errorCode: 'invalidStructure' };
    }
  }

  const now = new Date().toISOString();

  const categories: Category[] = [];
  for (const raw of candidate.categories as unknown[]) {
    if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
    const id = asNonEmptyString(raw.id) ?? makeUuid();
    const name = asNonEmptyString(raw.name);
    if (!name) return { ok: false, errorCode: 'invalidStructure' };
    categories.push({
      id,
      name,
      color: asNonEmptyString(raw.color) ?? '#48929B',
      icon_name: asNonEmptyString(raw.icon_name) ?? 'lucide:folder-kanban',
      description: typeof raw.description === 'string' ? raw.description : null,
      created_at: typeof raw.created_at === 'string' ? raw.created_at : now,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    });
  }

  const labels: Label[] = [];
  for (const raw of candidate.labels as unknown[]) {
    if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
    const id = asNonEmptyString(raw.id) ?? makeUuid();
    const name = asNonEmptyString(raw.name);
    const category_id = asNonEmptyString(raw.category_id);
    if (!name || !category_id) return { ok: false, errorCode: 'invalidStructure' };
    labels.push({
      id,
      name,
      category_id,
      created_at: typeof raw.created_at === 'string' ? raw.created_at : now,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    });
  }

  const channels: Channel[] = [];
  for (const raw of candidate.channels as unknown[]) {
    if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
    const id = asNonEmptyString(raw.id) ?? makeUuid();
    const name = asNonEmptyString(raw.name);
    const channel_url = asNonEmptyString(raw.channel_url);
    if (!name || !channel_url) return { ok: false, errorCode: 'invalidStructure' };
    channels.push({
      id,
      name,
      channel_url,
      avatar_url: typeof raw.avatar_url === 'string' ? raw.avatar_url : null,
      default_category_id:
        typeof raw.default_category_id === 'string' ? raw.default_category_id : null,
      notes: typeof raw.notes === 'string' ? raw.notes : null,
      created_at: typeof raw.created_at === 'string' ? raw.created_at : now,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    });
  }

  const playlists: Playlist[] = [];
  for (const raw of candidate.playlists as unknown[]) {
    if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
    const id = asNonEmptyString(raw.id) ?? makeUuid();
    const name = asNonEmptyString(raw.name);
    if (!name) return { ok: false, errorCode: 'invalidStructure' };
    playlists.push({
      id,
      name,
      category_id: typeof raw.category_id === 'string' ? raw.category_id : null,
      description: typeof raw.description === 'string' ? raw.description : null,
      created_at: typeof raw.created_at === 'string' ? raw.created_at : now,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    });
  }

  const videos: Video[] = [];
  for (const raw of candidate.videos as unknown[]) {
    if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
    const id = asNonEmptyString(raw.id) ?? makeUuid();
    const youtube_video_id = asNonEmptyString(raw.youtube_video_id);
    const url = asNonEmptyString(raw.url);
    const title = asNonEmptyString(raw.title);
    if (!youtube_video_id || !url || !title) {
      return { ok: false, errorCode: 'invalidStructure' };
    }
    const duration_seconds =
      typeof raw.duration_seconds === 'number' && Number.isFinite(raw.duration_seconds)
        ? Math.max(0, Math.round(raw.duration_seconds))
        : 0;
    const last_watched_seconds =
      typeof raw.last_watched_seconds === 'number' && Number.isFinite(raw.last_watched_seconds)
        ? Math.max(0, Math.round(raw.last_watched_seconds))
        : 0;
    videos.push({
      id,
      youtube_video_id,
      url,
      title,
      thumbnail_url:
        asNonEmptyString(raw.thumbnail_url) ??
        `https://i.ytimg.com/vi/${youtube_video_id}/hqdefault.jpg`,
      channel_id: typeof raw.channel_id === 'string' ? raw.channel_id : null,
      category_id: typeof raw.category_id === 'string' ? raw.category_id : null,
      notes: typeof raw.notes === 'string' ? raw.notes : null,
      duration_seconds,
      last_watched_seconds,
      is_completed: Boolean(raw.is_completed),
      is_favorite: Boolean(raw.is_favorite),
      is_archived: Boolean(raw.is_archived),
      created_at: typeof raw.created_at === 'string' ? raw.created_at : now,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
      last_watched_at: typeof raw.last_watched_at === 'string' ? raw.last_watched_at : null,
    });
  }

  const video_playlists: VideoPlaylist[] = [];
  if (Array.isArray(candidate.video_playlists)) {
    for (const raw of candidate.video_playlists as unknown[]) {
      if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
      const video_id = asNonEmptyString(raw.video_id);
      const playlist_id = asNonEmptyString(raw.playlist_id);
      if (!video_id || !playlist_id) continue;
      video_playlists.push({
        id: asNonEmptyString(raw.id) ?? makeUuid(),
        video_id,
        playlist_id,
        order_index:
          typeof raw.order_index === 'number' && Number.isFinite(raw.order_index)
            ? Math.max(0, Math.round(raw.order_index))
            : 0,
      });
    }
  }

  const video_labels: VideoLabel[] = [];
  if (Array.isArray(candidate.video_labels)) {
    for (const raw of candidate.video_labels as unknown[]) {
      if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
      const video_id = asNonEmptyString(raw.video_id);
      const label_id = asNonEmptyString(raw.label_id);
      if (!video_id || !label_id) continue;
      video_labels.push({ video_id, label_id });
    }
  }

  const watch_queue: WatchQueueItem[] = [];
  if (Array.isArray(candidate.watch_queue)) {
    for (const raw of candidate.watch_queue as unknown[]) {
      if (!isRecord(raw)) return { ok: false, errorCode: 'invalidStructure' };
      const video_id = asNonEmptyString(raw.video_id);
      if (!video_id) continue;
      watch_queue.push({
        id: asNonEmptyString(raw.id) ?? makeUuid(),
        video_id,
        position:
          typeof raw.position === 'number' && Number.isFinite(raw.position)
            ? Math.max(0, Math.round(raw.position))
            : watch_queue.length,
        added_at: typeof raw.added_at === 'string' ? raw.added_at : now,
      });
    }
  }

  const totalCount =
    categories.length + labels.length + channels.length + playlists.length + videos.length;
  if (totalCount === 0) {
    return { ok: false, errorCode: 'emptyPayload' };
  }

  const data: LibrarySnapshot = {
    categories,
    labels,
    channels,
    playlists,
    videos,
    video_playlists,
    video_labels,
    watch_queue,
  };

  return {
    ok: true,
    data,
    counts: {
      categories: categories.length,
      labels: labels.length,
      channels: channels.length,
      playlists: playlists.length,
      videos: videos.length,
      watch_queue: watch_queue.length,
    },
    exportedAt,
  };
}

export function mergeLibrarySnapshots(
  existing: LibrarySnapshot,
  incoming: LibrarySnapshot
): {
  merged: LibrarySnapshot;
  insertions: LibrarySnapshot;
  summary: ImportResultSummary;
} {
  const categoryIdMap = new Map<string, string>();
  const existingCatByName = new Map<string, Category>(
    existing.categories.map((c) => [c.name.trim().toLowerCase(), c])
  );
  const existingCatIds = new Set(existing.categories.map((c) => c.id));
  const addedCategories: Category[] = [];

  for (const cat of incoming.categories) {
    const byName = existingCatByName.get(cat.name.trim().toLowerCase());
    if (byName) {
      categoryIdMap.set(cat.id, byName.id);
      continue;
    }
    const targetId = existingCatIds.has(cat.id) ? makeUuid() : cat.id;
    const nextCat: Category = { ...cat, id: targetId };
    existingCatIds.add(targetId);
    existingCatByName.set(nextCat.name.trim().toLowerCase(), nextCat);
    categoryIdMap.set(cat.id, targetId);
    addedCategories.push(nextCat);
  }

  // Labels (unique per category_id + lowercase name)
  const labelIdMap = new Map<string, string>();
  const existingLabelsByKey = new Map<string, Label>(
    existing.labels.map((l) => [`${l.category_id}::${l.name.trim().toLowerCase()}`, l])
  );
  const existingLabelIds = new Set(existing.labels.map((l) => l.id));
  const addedLabels: Label[] = [];

  for (const lbl of incoming.labels) {
    const mappedCatId = categoryIdMap.get(lbl.category_id);
    if (!mappedCatId) continue;
    const key = `${mappedCatId}::${lbl.name.trim().toLowerCase()}`;
    const existingMatch = existingLabelsByKey.get(key);
    if (existingMatch) {
      labelIdMap.set(lbl.id, existingMatch.id);
      continue;
    }
    const targetId = existingLabelIds.has(lbl.id) ? makeUuid() : lbl.id;
    const nextLabel: Label = { ...lbl, id: targetId, category_id: mappedCatId };
    existingLabelIds.add(targetId);
    existingLabelsByKey.set(key, nextLabel);
    labelIdMap.set(lbl.id, targetId);
    addedLabels.push(nextLabel);
  }

  // Channels
  const channelIdMap = new Map<string, string>();
  const existingChannelsByKey = new Map<string, Channel>(
    existing.channels.map((ch) => [
      `${ch.name.trim().toLowerCase()}::${ch.channel_url.trim().toLowerCase()}`,
      ch,
    ])
  );
  const existingChannelIds = new Set(existing.channels.map((c) => c.id));
  const addedChannels: Channel[] = [];

  for (const ch of incoming.channels) {
    const key = `${ch.name.trim().toLowerCase()}::${ch.channel_url.trim().toLowerCase()}`;
    const existingMatch = existingChannelsByKey.get(key);
    if (existingMatch) {
      channelIdMap.set(ch.id, existingMatch.id);
      continue;
    }
    const targetId = existingChannelIds.has(ch.id) ? makeUuid() : ch.id;
    const nextChannel: Channel = {
      ...ch,
      id: targetId,
      default_category_id: ch.default_category_id
        ? (categoryIdMap.get(ch.default_category_id) ?? null)
        : null,
    };
    existingChannelIds.add(targetId);
    existingChannelsByKey.set(key, nextChannel);
    channelIdMap.set(ch.id, targetId);
    addedChannels.push(nextChannel);
  }

  // Playlists
  const playlistIdMap = new Map<string, string>();
  const existingPlaylistsByName = new Map<string, Playlist>(
    existing.playlists.map((p) => [p.name.trim().toLowerCase(), p])
  );
  const existingPlaylistIds = new Set(existing.playlists.map((p) => p.id));
  const addedPlaylists: Playlist[] = [];

  for (const pl of incoming.playlists) {
    const existingMatch = existingPlaylistsByName.get(pl.name.trim().toLowerCase());
    if (existingMatch) {
      playlistIdMap.set(pl.id, existingMatch.id);
      continue;
    }
    const targetId = existingPlaylistIds.has(pl.id) ? makeUuid() : pl.id;
    const nextPlaylist: Playlist = {
      ...pl,
      id: targetId,
      category_id: pl.category_id ? (categoryIdMap.get(pl.category_id) ?? null) : null,
    };
    existingPlaylistIds.add(targetId);
    existingPlaylistsByName.set(nextPlaylist.name.trim().toLowerCase(), nextPlaylist);
    playlistIdMap.set(pl.id, targetId);
    addedPlaylists.push(nextPlaylist);
  }

  // Videos (deduplicated strictly by youtube_video_id)
  const videoIdMap = new Map<string, string>();
  const existingVideosByYtId = new Map<string, Video>(
    existing.videos.map((v) => [v.youtube_video_id, v])
  );
  const existingVideoIds = new Set(existing.videos.map((v) => v.id));
  const addedVideos: Video[] = [];
  let skippedVideos = 0;

  for (const vid of incoming.videos) {
    const existingMatch = existingVideosByYtId.get(vid.youtube_video_id);
    if (existingMatch) {
      videoIdMap.set(vid.id, existingMatch.id);
      skippedVideos += 1;
      continue;
    }
    const targetId = existingVideoIds.has(vid.id) ? makeUuid() : vid.id;
    const nextVideo: Video = {
      ...vid,
      id: targetId,
      channel_id: vid.channel_id ? (channelIdMap.get(vid.channel_id) ?? null) : null,
      category_id: vid.category_id ? (categoryIdMap.get(vid.category_id) ?? null) : null,
    };
    existingVideoIds.add(targetId);
    existingVideosByYtId.set(nextVideo.youtube_video_id, nextVideo);
    videoIdMap.set(vid.id, targetId);
    addedVideos.push(nextVideo);
  }

  // Video Labels
  const existingVideoLabelSet = new Set(
    existing.video_labels.map((vl) => `${vl.video_id}::${vl.label_id}`)
  );
  const addedVideoLabels: VideoLabel[] = [];
  for (const vl of incoming.video_labels) {
    const mappedVid = videoIdMap.get(vl.video_id);
    const mappedLbl = labelIdMap.get(vl.label_id);
    if (!mappedVid || !mappedLbl) continue;
    const key = `${mappedVid}::${mappedLbl}`;
    if (existingVideoLabelSet.has(key)) continue;
    existingVideoLabelSet.add(key);
    addedVideoLabels.push({ video_id: mappedVid, label_id: mappedLbl });
  }

  // Video Playlists
  const existingVideoPlaylistSet = new Set(
    existing.video_playlists.map((vp) => `${vp.playlist_id}::${vp.video_id}`)
  );
  const maxOrderByPlaylist = new Map<string, number>();
  for (const vp of existing.video_playlists) {
    maxOrderByPlaylist.set(
      vp.playlist_id,
      Math.max(maxOrderByPlaylist.get(vp.playlist_id) ?? -1, vp.order_index)
    );
  }
  const addedVideoPlaylists: VideoPlaylist[] = [];
  const sortedIncomingVp = incoming.video_playlists
    .slice()
    .sort((a, b) => a.order_index - b.order_index);

  for (const vp of sortedIncomingVp) {
    const mappedVid = videoIdMap.get(vp.video_id);
    const mappedPl = playlistIdMap.get(vp.playlist_id);
    if (!mappedVid || !mappedPl) continue;
    const pairKey = `${mappedPl}::${mappedVid}`;
    if (existingVideoPlaylistSet.has(pairKey)) continue;
    existingVideoPlaylistSet.add(pairKey);
    const nextOrder = (maxOrderByPlaylist.get(mappedPl) ?? -1) + 1;
    maxOrderByPlaylist.set(mappedPl, nextOrder);
    addedVideoPlaylists.push({
      id: makeUuid(),
      video_id: mappedVid,
      playlist_id: mappedPl,
      order_index: nextOrder,
    });
  }

  // Watch Queue
  const existingQueueVideoIds = new Set((existing.watch_queue ?? []).map((q) => q.video_id));
  let maxQueuePos = (existing.watch_queue ?? []).reduce(
    (max, q) => Math.max(max, q.position),
    -1
  );
  const addedWatchQueue: WatchQueueItem[] = [];
  const sortedIncomingQueue = (incoming.watch_queue ?? [])
    .slice()
    .sort((a, b) => a.position - b.position);

  for (const item of sortedIncomingQueue) {
    const mappedVid = videoIdMap.get(item.video_id);
    if (!mappedVid || existingQueueVideoIds.has(mappedVid)) continue;
    existingQueueVideoIds.add(mappedVid);
    maxQueuePos += 1;
    addedWatchQueue.push({
      id: makeUuid(),
      video_id: mappedVid,
      position: maxQueuePos,
      added_at: item.added_at,
    });
  }

  const merged: LibrarySnapshot = {
    categories: [...existing.categories, ...addedCategories],
    labels: [...existing.labels, ...addedLabels],
    channels: [...existing.channels, ...addedChannels],
    playlists: [...existing.playlists, ...addedPlaylists],
    videos: [...addedVideos, ...existing.videos],
    video_playlists: [...existing.video_playlists, ...addedVideoPlaylists],
    video_labels: [...existing.video_labels, ...addedVideoLabels],
    watch_queue: [...(existing.watch_queue ?? []), ...addedWatchQueue],
  };

  const insertions: LibrarySnapshot = {
    categories: addedCategories,
    labels: addedLabels,
    channels: addedChannels,
    playlists: addedPlaylists,
    videos: addedVideos,
    video_playlists: addedVideoPlaylists,
    video_labels: addedVideoLabels,
    watch_queue: addedWatchQueue,
  };

  const summary: ImportResultSummary = {
    mode: 'merge',
    addedVideos: addedVideos.length,
    skippedVideos,
    addedCategories: addedCategories.length,
    addedChannels: addedChannels.length,
    addedLabels: addedLabels.length,
    addedPlaylists: addedPlaylists.length,
    addedQueueItems: addedWatchQueue.length,
  };

  return { merged, insertions, summary };
}
