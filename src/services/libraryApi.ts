import type {
  CategoryFormPayload,
  ChannelFormPayload,
  ImportMode,
  ImportResultSummary,
  Label,
  LibrarySnapshot,
  PlaylistFormPayload,
  Video,
  VideoFormPayload,
} from '../types/silo';
import { mergeLibrarySnapshots } from '../utils/libraryBackup';
import { SUPABASE_CONFIGURED, supabase } from './supabaseClient';
import {
  localAddToQueue,
  localAddVideoToPlaylist,
  localClearQueue,
  localCreateLabel,
  localDeleteCategory,
  localDeleteChannel,
  localDeleteLabel,
  localDeletePlaylist,
  localDeleteVideo,
  localFetchSnapshot,
  localImport,
  localPatchVideo,
  localReorderPlaylist,
  localReorderQueue,
  localReadBackup,
  localRemoveFromQueue,
  localRemoveVideoFromPlaylist,
  localReset,
  localSaveCategory,
  localSaveChannel,
  localSavePlaylist,
  localSaveVideo,
  localUpdateLabel,
  localWriteBackup,
} from './localLibrary';

function stripOwnerId<T>(rows: T[] | null): T[] {
  return (rows ?? []).map((row) => {
    const clean = { ...(row as Record<string, unknown>) };
    delete clean.owner_id;
    return clean as T;
  });
}

export interface OEmbedResult {
  title: string;
  author_name: string;
  thumbnail_url: string;
}

export async function fetchYouTubeOEmbed(url: string): Promise<OEmbedResult | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<OEmbedResult>;
    return {
      title: data.title ?? '',
      author_name: data.author_name ?? '',
      thumbnail_url: data.thumbnail_url ?? '',
    };
  } catch {
    return null;
  }
}

export async function fetchLibrarySnapshot(): Promise<LibrarySnapshot> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localFetchSnapshot();
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Sign in is required to load your library.');

  try {
    const [catRes, lblRes, chRes, plRes, vidRes, vpRes, vlRes, wqRes] = await Promise.all([
      supabase.from('categories').select('*').order('created_at', { ascending: true }),
      supabase.from('labels').select('*').order('name', { ascending: true }),
      supabase.from('channels').select('*').order('name', { ascending: true }),
      supabase.from('playlists').select('*').order('created_at', { ascending: false }),
      supabase.from('videos').select('*').order('created_at', { ascending: false }),
      supabase.from('video_playlists').select('*').order('order_index', { ascending: true }),
      supabase.from('video_labels').select('*'),
      supabase.from('watch_queue').select('*').order('position', { ascending: true }),
    ]);

    const errors = [catRes, lblRes, chRes, plRes, vidRes, vpRes, vlRes, wqRes]
      .map((r) => r.error)
      .filter(Boolean);
    if (errors.length > 0) {
      throw new Error(errors[0]!.message);
    }

    const snapshot: LibrarySnapshot = {
      categories: stripOwnerId(catRes.data),
      labels: stripOwnerId(lblRes.data),
      channels: stripOwnerId(chRes.data),
      playlists: stripOwnerId(plRes.data),
      videos: stripOwnerId(vidRes.data),
      video_playlists: stripOwnerId(vpRes.data),
      video_labels: stripOwnerId(vlRes.data),
      watch_queue: stripOwnerId(wqRes.data),
    };
    try {
      await localWriteBackup(session.user.id, snapshot);
    } catch {
      // The browser cache is best-effort; Supabase remains the source of truth.
    }
    return snapshot;
  } catch (error) {
    const cached = await localReadBackup(session.user.id).catch(() => null);
    if (cached) return cached;
    throw error instanceof Error ? error : new Error('Failed to load library from Supabase.');
  }
}

export async function saveVideo(payload: VideoFormPayload): Promise<{ id: string }> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localSaveVideo(payload);
  }

  // Check duplicate youtube_video_id
  const { data: existingDup, error: dupErr } = await supabase
    .from('videos')
    .select('id')
    .eq('youtube_video_id', payload.youtube_video_id)
    .maybeSingle();

  if (dupErr) throw new Error(dupErr.message);
  if (existingDup && existingDup.id !== payload.id) {
    throw new Error('A video with this YouTube ID already exists in your library.');
  }

  let videoId = payload.id;
  if (videoId) {
    const { error } = await supabase
      .from('videos')
      .update({
        youtube_video_id: payload.youtube_video_id,
        url: payload.url,
        title: payload.title,
        thumbnail_url: payload.thumbnail_url,
        channel_id: payload.channel_id,
        category_id: payload.category_id,
        notes: payload.notes,
      })
      .eq('id', videoId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from('videos')
      .insert({
        youtube_video_id: payload.youtube_video_id,
        url: payload.url,
        title: payload.title,
        thumbnail_url: payload.thumbnail_url,
        channel_id: payload.channel_id,
        category_id: payload.category_id,
        notes: payload.notes,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    videoId = data.id;
  }

  // Sync video_labels (validate labels belong to selected category)
  const { data: catLabels, error: lblFetchErr } = await supabase
    .from('labels')
    .select('id')
    .eq('category_id', payload.category_id);
  if (lblFetchErr) throw new Error(lblFetchErr.message);

  const allowedLabels = new Set((catLabels ?? []).map((l) => l.id));
  const filteredLabels = Array.from(new Set(payload.label_ids)).filter((id) =>
    allowedLabels.has(id)
  );

  const { error: delLblErr } = await supabase
    .from('video_labels')
    .delete()
    .eq('video_id', videoId);
  if (delLblErr) throw new Error(delLblErr.message);

  if (filteredLabels.length > 0) {
    const { error: insLblErr } = await supabase.from('video_labels').insert(
      filteredLabels.map((label_id) => ({ video_id: videoId!, label_id }))
    );
    if (insLblErr) throw new Error(insLblErr.message);
  }

  // Sync video_playlists preserving order_index
  const { data: currentVp, error: vpErr } = await supabase
    .from('video_playlists')
    .select('id, playlist_id')
    .eq('video_id', videoId);
  if (vpErr) throw new Error(vpErr.message);

  const currentMap = new Map((currentVp ?? []).map((vp) => [vp.playlist_id, vp.id]));
  const desiredSet = new Set(payload.playlist_ids);

  const toDeleteIds = (currentVp ?? [])
    .filter((vp) => !desiredSet.has(vp.playlist_id))
    .map((vp) => vp.id);

  if (toDeleteIds.length > 0) {
    const { error: delVpErr } = await supabase
      .from('video_playlists')
      .delete()
      .in('id', toDeleteIds);
    if (delVpErr) throw new Error(delVpErr.message);
  }

  const toAddPlaylistIds = payload.playlist_ids.filter((pid) => !currentMap.has(pid));
  for (const pid of toAddPlaylistIds) {
    const { data: maxRow, error: maxErr } = await supabase
      .from('video_playlists')
      .select('order_index')
      .eq('playlist_id', pid)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw new Error(maxErr.message);
    const nextOrder = (maxRow?.order_index ?? -1) + 1;
    const { error: insVpErr } = await supabase.from('video_playlists').insert({
      video_id: videoId!,
      playlist_id: pid,
      order_index: nextOrder,
    });
    if (insVpErr) throw new Error(insVpErr.message);
  }

  return { id: videoId! };
}

export async function patchVideo(
  id: string,
  patch: Partial<
    Pick<
      Video,
      | 'duration_seconds'
      | 'last_watched_seconds'
      | 'is_completed'
      | 'is_favorite'
      | 'is_archived'
      | 'last_watched_at'
      | 'notes'
    >
  >
): Promise<Video> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localPatchVideo(id, patch);
  }

  const { data, error } = await supabase
    .from('videos')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteVideo(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localDeleteVideo(id);
  }

  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveChannel(payload: ChannelFormPayload): Promise<{ id: string }> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localSaveChannel(payload);
  }

  if (payload.id) {
    const { error } = await supabase
      .from('channels')
      .update({
        name: payload.name,
        channel_url: payload.channel_url,
        avatar_url: payload.avatar_url,
        default_category_id: payload.default_category_id,
        notes: payload.notes,
      })
      .eq('id', payload.id);
    if (error) throw new Error(error.message);
    return { id: payload.id };
  }

  const { data, error } = await supabase
    .from('channels')
    .insert({
      name: payload.name,
      channel_url: payload.channel_url,
      avatar_url: payload.avatar_url,
      default_category_id: payload.default_category_id,
      notes: payload.notes,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deleteChannel(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localDeleteChannel(id);
  }

  const { error } = await supabase.from('channels').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function saveCategory(payload: CategoryFormPayload): Promise<{ id: string }> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localSaveCategory(payload);
  }

  const cleanName = payload.name.trim();
  const { data: existingCat } = await supabase
    .from('categories')
    .select('id, name')
    .ilike('name', cleanName)
    .maybeSingle();

  if (existingCat && existingCat.id !== payload.id) {
    throw new Error('Category name already exists.');
  }

  let categoryId = payload.id;
  if (categoryId) {
    const { error } = await supabase
      .from('categories')
      .update({
        name: cleanName,
        color: payload.color,
        icon_name: payload.icon_name,
        description: payload.description,
      })
      .eq('id', categoryId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: cleanName,
        color: payload.color,
        icon_name: payload.icon_name,
        description: payload.description,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    categoryId = data.id;
  }

  // Sync labels cleanly preserving existing label IDs
  const desiredNames = Array.from(
    new Map(
      payload.label_names
        .map((n) => n.trim())
        .filter(Boolean)
        .map((n) => [n.toLowerCase(), n])
    ).values()
  );

  const { data: existingLabels, error: lblErr } = await supabase
    .from('labels')
    .select('*')
    .eq('category_id', categoryId);
  if (lblErr) throw new Error(lblErr.message);

  const desiredLowerSet = new Set(desiredNames.map((n) => n.toLowerCase()));
  const toDelete = (existingLabels ?? [])
    .filter((l) => !desiredLowerSet.has(l.name.toLowerCase()))
    .map((l) => l.id);

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from('labels').delete().in('id', toDelete);
    if (delErr) throw new Error(delErr.message);
  }

  const existingLowerSet = new Set((existingLabels ?? []).map((l) => l.name.toLowerCase()));
  const toInsert = desiredNames
    .filter((n) => !existingLowerSet.has(n.toLowerCase()))
    .map((name) => ({ name, category_id: categoryId! }));

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from('labels').insert(toInsert);
    if (insErr) throw new Error(insErr.message);
  }

  return { id: categoryId! };
}

export async function deleteCategory(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localDeleteCategory(id);
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createLabel(categoryId: string, name: string): Promise<Label> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localCreateLabel(categoryId, name);
  }

  const clean = name.trim();
  const { data, error } = await supabase
    .from('labels')
    .insert({ category_id: categoryId, name: clean })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateLabel(id: string, name: string): Promise<Label> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localUpdateLabel(id, name);
  }

  const { data, error } = await supabase
    .from('labels')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteLabel(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localDeleteLabel(id);
  }

  const { error } = await supabase.from('labels').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function savePlaylist(payload: PlaylistFormPayload): Promise<{ id: string }> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localSavePlaylist(payload);
  }

  if (payload.id) {
    const { error } = await supabase
      .from('playlists')
      .update({
        name: payload.name.trim(),
        category_id: payload.category_id,
        description: payload.description,
      })
      .eq('id', payload.id);
    if (error) throw new Error(error.message);
    return { id: payload.id };
  }

  const { data, error } = await supabase
    .from('playlists')
    .insert({
      name: payload.name.trim(),
      category_id: payload.category_id,
      description: payload.description,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}

export async function deletePlaylist(id: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localDeletePlaylist(id);
  }

  const { error } = await supabase.from('playlists').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function addVideoToPlaylist(playlistId: string, videoId: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localAddVideoToPlaylist(playlistId, videoId);
  }

  const { data: maxRow, error: maxErr } = await supabase
    .from('video_playlists')
    .select('order_index')
    .eq('playlist_id', playlistId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);

  const { error } = await supabase.from('video_playlists').insert({
    playlist_id: playlistId,
    video_id: videoId,
    order_index: (maxRow?.order_index ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
}

export async function removeVideoFromPlaylist(playlistId: string, videoId: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localRemoveVideoFromPlaylist(playlistId, videoId);
  }

  const { error } = await supabase
    .from('video_playlists')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('video_id', videoId);
  if (error) throw new Error(error.message);

  // Normalize order_index
  const { data: remaining, error: remErr } = await supabase
    .from('video_playlists')
    .select('id')
    .eq('playlist_id', playlistId)
    .order('order_index', { ascending: true });
  if (remErr) throw new Error(remErr.message);

  await Promise.all(
    (remaining ?? []).map((row, idx) =>
      supabase!.from('video_playlists').update({ order_index: idx }).eq('id', row.id)
    )
  );
}

export async function reorderPlaylistVideos(
  playlistId: string,
  orderedVideoIds: string[]
): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localReorderPlaylist(playlistId, orderedVideoIds);
  }

  const results = await Promise.all(
    orderedVideoIds.map((videoId, idx) =>
      supabase!
        .from('video_playlists')
        .update({ order_index: idx })
        .eq('playlist_id', playlistId)
        .eq('video_id', videoId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function resetLibraryData(): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localReset();
  }

  await supabase.from('watch_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('video_labels').delete().neq('video_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('video_playlists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('videos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('playlists').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('channels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('labels').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('categories').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

export async function addToWatchQueue(videoId: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localAddToQueue(videoId);
  }

  const { data: maxRow, error: maxErr } = await supabase
    .from('watch_queue')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxErr) throw new Error(maxErr.message);

  const { error } = await supabase.from('watch_queue').insert({
    video_id: videoId,
    position: (maxRow?.position ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
}

export async function removeFromWatchQueue(videoId: string): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localRemoveFromQueue(videoId);
  }

  const { error } = await supabase.from('watch_queue').delete().eq('video_id', videoId);
  if (error) throw new Error(error.message);

  const { data: remaining, error: remErr } = await supabase
    .from('watch_queue')
    .select('id')
    .order('position', { ascending: true });
  if (remErr) throw new Error(remErr.message);

  await Promise.all(
    (remaining ?? []).map((row, idx) =>
      supabase!.from('watch_queue').update({ position: idx }).eq('id', row.id)
    )
  );
}

export async function reorderWatchQueue(orderedVideoIds: string[]): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localReorderQueue(orderedVideoIds);
  }

  const results = await Promise.all(
    orderedVideoIds.map((videoId, idx) =>
      supabase!.from('watch_queue').update({ position: idx }).eq('video_id', videoId)
    )
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}

export async function clearWatchQueue(scope: 'completed' | 'all', completedVideoIds?: string[]): Promise<void> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localClearQueue(scope, completedVideoIds);
  }

  if (scope === 'completed') {
    const ids = completedVideoIds ?? [];
    if (ids.length === 0) return;
    const { error } = await supabase.from('watch_queue').delete().in('video_id', ids);
    if (error) throw new Error(error.message);

    const { data: remaining, error: remErr } = await supabase
      .from('watch_queue')
      .select('id')
      .order('position', { ascending: true });
    if (remErr) throw new Error(remErr.message);

    await Promise.all(
      (remaining ?? []).map((row, idx) =>
        supabase!.from('watch_queue').update({ position: idx }).eq('id', row.id)
      )
    );
    return;
  }

  const { error } = await supabase
    .from('watch_queue')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw new Error(error.message);
}

export async function importLibraryData(
  mode: ImportMode,
  data: LibrarySnapshot
): Promise<ImportResultSummary> {
  if (!SUPABASE_CONFIGURED || !supabase) {
    return localImport(mode, data);
  }

  let toInsert: LibrarySnapshot = data;
  let summary: ImportResultSummary;

  if (mode === 'replace') {
    await resetLibraryData();
    summary = {
      mode: 'replace',
      addedVideos: data.videos.length,
      skippedVideos: 0,
      addedCategories: data.categories.length,
      addedChannels: data.channels.length,
      addedLabels: data.labels.length,
      addedPlaylists: data.playlists.length,
      addedQueueItems: data.watch_queue?.length ?? 0,
    };
  } else {
    const existing = await fetchLibrarySnapshot();
    const mergedPlan = mergeLibrarySnapshots(existing, data);
    toInsert = mergedPlan.insertions;
    summary = mergedPlan.summary;
  }

  if (toInsert.categories.length > 0) {
    const { error } = await supabase.from('categories').insert(toInsert.categories);
    if (error) throw new Error(error.message);
  }
  if (toInsert.labels.length > 0) {
    const { error } = await supabase.from('labels').insert(toInsert.labels);
    if (error) throw new Error(error.message);
  }
  if (toInsert.channels.length > 0) {
    const { error } = await supabase.from('channels').insert(toInsert.channels);
    if (error) throw new Error(error.message);
  }
  if (toInsert.playlists.length > 0) {
    const { error } = await supabase.from('playlists').insert(toInsert.playlists);
    if (error) throw new Error(error.message);
  }
  if (toInsert.videos.length > 0) {
    const { error } = await supabase.from('videos').insert(toInsert.videos);
    if (error) throw new Error(error.message);
  }
  if (toInsert.video_labels.length > 0) {
    const { error } = await supabase.from('video_labels').insert(toInsert.video_labels);
    if (error) throw new Error(error.message);
  }
  if (toInsert.video_playlists.length > 0) {
    const { error } = await supabase.from('video_playlists').insert(toInsert.video_playlists);
    if (error) throw new Error(error.message);
  }
  if ((toInsert.watch_queue ?? []).length > 0) {
    const { error } = await supabase.from('watch_queue').insert(toInsert.watch_queue!);
    if (error) throw new Error(error.message);
  }

  return summary;
}
