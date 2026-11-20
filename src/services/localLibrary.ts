import Dexie, { type Table } from 'dexie';
import type {
  Category,
  Channel,
  ImportMode,
  ImportResultSummary,
  Label,
  LibrarySnapshot,
  Playlist,
  Video,
  VideoFormPayload,
  ChannelFormPayload,
  CategoryFormPayload,
  PlaylistFormPayload,
} from '../types/silo';
import { createEmptyLibrary } from '../data/seedLibrary';
import { mergeLibrarySnapshots } from '../utils/libraryBackup';

interface SnapshotRecord {
  id: string;
  value: LibrarySnapshot;
}

class SiloLocalDatabase extends Dexie {
  snapshots!: Table<SnapshotRecord, string>;

  constructor() {
    super('silo-local-library');
    this.version(1).stores({ snapshots: 'id' });
  }
}

const db = new SiloLocalDatabase();
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const now = () => new Date().toISOString();

async function read(): Promise<LibrarySnapshot> {
  return (await db.snapshots.get('library'))?.value ?? createEmptyLibrary();
}

async function mutate<T>(fn: (snapshot: LibrarySnapshot) => T | Promise<T>): Promise<T> {
  return db.transaction('rw', db.snapshots, async () => {
    const snapshot = (await db.snapshots.get('library'))?.value ?? createEmptyLibrary();
    const result = await fn(snapshot);
    await db.snapshots.put({ id: 'library', value: snapshot });
    return result;
  });
}

export async function localFetchSnapshot(): Promise<LibrarySnapshot> {
  return read();
}

export async function localReadBackup(ownerId: string): Promise<LibrarySnapshot | null> {
  return (await db.snapshots.get(`backup:${ownerId}`))?.value ?? null;
}

export async function localWriteBackup(ownerId: string, snapshot: LibrarySnapshot): Promise<void> {
  await db.snapshots.put({ id: `backup:${ownerId}`, value: snapshot });
}

export async function localSaveVideo(payload: VideoFormPayload): Promise<{ id: string }> {
  return mutate((s) => {
    const duplicate = s.videos.find((v) => v.youtube_video_id === payload.youtube_video_id && v.id !== payload.id);
    if (duplicate) throw new Error('A video with this YouTube ID already exists in your library.');
    const id = payload.id ?? makeId();
    const existing = s.videos.find((v) => v.id === id);
    const video: Video = {
      id,
      youtube_video_id: payload.youtube_video_id,
      url: payload.url,
      title: payload.title,
      thumbnail_url: payload.thumbnail_url,
      channel_id: payload.channel_id,
      category_id: payload.category_id,
      notes: payload.notes,
      duration_seconds: existing?.duration_seconds ?? 0,
      last_watched_seconds: existing?.last_watched_seconds ?? 0,
      is_completed: existing?.is_completed ?? false,
      is_favorite: existing?.is_favorite ?? false,
      is_archived: existing?.is_archived ?? false,
      created_at: existing?.created_at ?? now(),
      updated_at: now(),
      last_watched_at: existing?.last_watched_at ?? null,
    };
    if (existing) Object.assign(existing, video);
    else s.videos.push(video);
    s.video_labels = s.video_labels.filter((row) => row.video_id !== id);
    const allowed = new Set(s.labels.filter((label) => label.category_id === payload.category_id).map((label) => label.id));
    for (const label_id of new Set(payload.label_ids)) if (allowed.has(label_id)) s.video_labels.push({ video_id: id, label_id });
    const current = s.video_playlists.filter((row) => row.video_id === id);
    s.video_playlists = s.video_playlists.filter((row) => row.video_id !== id || payload.playlist_ids.includes(row.playlist_id));
    for (const playlist_id of payload.playlist_ids) {
      if (current.some((row) => row.playlist_id === playlist_id)) continue;
      const order_index = Math.max(-1, ...s.video_playlists.filter((row) => row.playlist_id === playlist_id).map((row) => row.order_index)) + 1;
      s.video_playlists.push({ id: makeId(), video_id: id, playlist_id, order_index });
    }
    return { id };
  });
}

export async function localPatchVideo(id: string, patch: Partial<Video>): Promise<Video> {
  return mutate((s) => {
    const video = s.videos.find((row) => row.id === id);
    if (!video) throw new Error('Video not found.');
    Object.assign(video, patch, { updated_at: now() });
    return video;
  });
}

export async function localDeleteVideo(id: string): Promise<void> {
  await mutate((s) => {
    s.videos = s.videos.filter((row) => row.id !== id);
    s.video_labels = s.video_labels.filter((row) => row.video_id !== id);
    s.video_playlists = s.video_playlists.filter((row) => row.video_id !== id);
    s.watch_queue = (s.watch_queue ?? []).filter((row) => row.video_id !== id);
  });
}

export async function localSaveChannel(payload: ChannelFormPayload): Promise<{ id: string }> {
  return mutate((s) => {
    const id = payload.id ?? makeId();
    const existing = s.channels.find((row) => row.id === id);
    const channel: Channel = { ...payload, id, created_at: existing?.created_at ?? now(), updated_at: now() };
    if (existing) Object.assign(existing, channel);
    else s.channels.push(channel);
    return { id };
  });
}

export async function localDeleteChannel(id: string): Promise<void> {
  await mutate((s) => {
    s.channels = s.channels.filter((row) => row.id !== id);
    for (const video of s.videos) if (video.channel_id === id) video.channel_id = null;
  });
}

export async function localSaveCategory(payload: CategoryFormPayload): Promise<{ id: string }> {
  return mutate((s) => {
    const name = payload.name.trim();
    if (s.categories.some((c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== payload.id)) throw new Error('Category name already exists.');
    const id = payload.id ?? makeId();
    const existing = s.categories.find((row) => row.id === id);
    const category: Category = { id, name, color: payload.color, icon_name: payload.icon_name, description: payload.description, created_at: existing?.created_at ?? now(), updated_at: now() };
    if (existing) Object.assign(existing, category);
    else s.categories.push(category);
    const desired = Array.from(new Map(payload.label_names.map((n) => n.trim()).filter(Boolean).map((n) => [n.toLowerCase(), n])).values());
    const existingLabels = s.labels.filter((label) => label.category_id === id);
    const desiredLower = new Set(desired.map((n) => n.toLowerCase()));
    const removed = new Set(existingLabels.filter((label) => !desiredLower.has(label.name.toLowerCase())).map((label) => label.id));
    s.labels = s.labels.filter((label) => !removed.has(label.id));
    s.video_labels = s.video_labels.filter((row) => !removed.has(row.label_id));
    const existingLower = new Set(existingLabels.map((label) => label.name.toLowerCase()));
    for (const labelName of desired.filter((n) => !existingLower.has(n.toLowerCase()))) s.labels.push({ id: makeId(), name: labelName, category_id: id, created_at: now(), updated_at: now() });
    return { id };
  });
}

export async function localDeleteCategory(id: string): Promise<void> {
  await mutate((s) => {
    const labelIds = new Set(s.labels.filter((row) => row.category_id === id).map((row) => row.id));
    s.categories = s.categories.filter((row) => row.id !== id);
    s.labels = s.labels.filter((row) => !labelIds.has(row.id));
    s.video_labels = s.video_labels.filter((row) => !labelIds.has(row.label_id));
    for (const video of s.videos) if (video.category_id === id) video.category_id = null;
    for (const channel of s.channels) if (channel.default_category_id === id) channel.default_category_id = null;
    for (const playlist of s.playlists) if (playlist.category_id === id) playlist.category_id = null;
  });
}

export async function localCreateLabel(categoryId: string, name: string): Promise<Label> {
  return mutate((s) => {
    const clean = name.trim();
    if (s.labels.some((row) => row.category_id === categoryId && row.name.toLowerCase() === clean.toLowerCase())) throw new Error('Label already exists in this category.');
    const label: Label = { id: makeId(), category_id: categoryId, name: clean, created_at: now(), updated_at: now() };
    s.labels.push(label);
    return label;
  });
}

export async function localUpdateLabel(id: string, name: string): Promise<Label> {
  return mutate((s) => {
    const label = s.labels.find((row) => row.id === id);
    if (!label) throw new Error('Label not found.');
    const clean = name.trim();
    if (s.labels.some((row) => row.id !== id && row.category_id === label.category_id && row.name.toLowerCase() === clean.toLowerCase())) throw new Error('Label already exists in this category.');
    label.name = clean;
    label.updated_at = now();
    return label;
  });
}

export async function localDeleteLabel(id: string): Promise<void> {
  await mutate((s) => {
    s.labels = s.labels.filter((row) => row.id !== id);
    s.video_labels = s.video_labels.filter((row) => row.label_id !== id);
  });
}

export async function localSavePlaylist(payload: PlaylistFormPayload): Promise<{ id: string }> {
  return mutate((s) => {
    const id = payload.id ?? makeId();
    const existing = s.playlists.find((row) => row.id === id);
    const playlist: Playlist = { id, name: payload.name.trim(), category_id: payload.category_id, description: payload.description, created_at: existing?.created_at ?? now(), updated_at: now() };
    if (existing) Object.assign(existing, playlist);
    else s.playlists.push(playlist);
    return { id };
  });
}

export async function localDeletePlaylist(id: string): Promise<void> {
  await mutate((s) => {
    s.playlists = s.playlists.filter((row) => row.id !== id);
    s.video_playlists = s.video_playlists.filter((row) => row.playlist_id !== id);
  });
}

export async function localAddVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  await mutate((s) => {
    if (s.video_playlists.some((row) => row.playlist_id === playlistId && row.video_id === videoId)) return;
    const order_index = Math.max(-1, ...s.video_playlists.filter((row) => row.playlist_id === playlistId).map((row) => row.order_index)) + 1;
    s.video_playlists.push({ id: makeId(), playlist_id: playlistId, video_id: videoId, order_index });
  });
}

export async function localRemoveVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  await mutate((s) => {
    s.video_playlists = s.video_playlists.filter((row) => !(row.playlist_id === playlistId && row.video_id === videoId));
    s.video_playlists.filter((row) => row.playlist_id === playlistId).sort((a, b) => a.order_index - b.order_index).forEach((row, index) => { row.order_index = index; });
  });
}

export async function localReorderPlaylist(playlistId: string, videoIds: string[]): Promise<void> {
  await mutate((s) => videoIds.forEach((videoId, index) => {
    const row = s.video_playlists.find((entry) => entry.playlist_id === playlistId && entry.video_id === videoId);
    if (row) row.order_index = index;
  }));
}

export async function localReset(): Promise<void> {
  await db.snapshots.put({ id: 'library', value: createEmptyLibrary() });
}

export async function localAddToQueue(videoId: string): Promise<void> {
  await mutate((s) => {
    const queue = s.watch_queue ?? (s.watch_queue = []);
    if (queue.some((row) => row.video_id === videoId)) return;
    queue.push({ id: makeId(), video_id: videoId, position: queue.length, added_at: now() });
  });
}

export async function localRemoveFromQueue(videoId: string): Promise<void> {
  await mutate((s) => {
    s.watch_queue = (s.watch_queue ?? []).filter((row) => row.video_id !== videoId).sort((a, b) => a.position - b.position).map((row, position) => ({ ...row, position }));
  });
}

export async function localReorderQueue(videoIds: string[]): Promise<void> {
  await mutate((s) => {
    const queue = s.watch_queue ?? [];
    s.watch_queue = videoIds.flatMap((videoId, position) => {
      const found = queue.find((row) => row.video_id === videoId);
      return found ? [{ ...found, position }] : [];
    });
  });
}

export async function localClearQueue(scope: 'completed' | 'all', completedVideoIds: string[] = []): Promise<void> {
  await mutate((s) => {
    const remove = new Set(scope === 'all' ? (s.watch_queue ?? []).map((q) => q.video_id) : completedVideoIds);
    s.watch_queue = (s.watch_queue ?? []).filter((q) => !remove.has(q.video_id)).sort((a, b) => a.position - b.position).map((row, position) => ({ ...row, position }));
  });
}

export async function localImport(mode: ImportMode, data: LibrarySnapshot): Promise<ImportResultSummary> {
  return mutate((current) => {
    if (mode === 'replace') {
      Object.assign(current, data, { watch_queue: data.watch_queue ?? [] });
      return { mode, addedVideos: data.videos.length, skippedVideos: 0, addedCategories: data.categories.length, addedChannels: data.channels.length, addedLabels: data.labels.length, addedPlaylists: data.playlists.length, addedQueueItems: data.watch_queue?.length ?? 0 };
    }
    const merged = mergeLibrarySnapshots(current, data);
    Object.assign(current, {
      categories: [...current.categories, ...merged.insertions.categories],
      labels: [...current.labels, ...merged.insertions.labels],
      channels: [...current.channels, ...merged.insertions.channels],
      playlists: [...current.playlists, ...merged.insertions.playlists],
      videos: [...current.videos, ...merged.insertions.videos],
      video_labels: [...current.video_labels, ...merged.insertions.video_labels],
      video_playlists: [...current.video_playlists, ...merged.insertions.video_playlists],
      watch_queue: [...(current.watch_queue ?? []), ...(merged.insertions.watch_queue ?? [])],
    });
    return merged.summary;
  });
}
