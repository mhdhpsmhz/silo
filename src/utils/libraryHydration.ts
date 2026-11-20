import type {
  Category,
  CategoryWithStats,
  Channel,
  ChannelWithStats,
  Label,
  LibrarySnapshot,
  Playlist,
  PlaylistWithStats,
  VideoWithRelations,
  WatchQueueEntry,
} from '../types/silo';
import {
  calculateCollectionProgress,
  calculatePlaylistProgress,
  calculateVideoProgress,
  getVideoStatus,
} from './progress';

export interface HydratedLibrary {
  categories: CategoryWithStats[];
  channels: ChannelWithStats[];
  playlists: PlaylistWithStats[];
  videos: VideoWithRelations[];
  labels: Label[];
  watchQueue: WatchQueueEntry[];
  queuedVideoIds: Set<string>;
  categoriesById: Map<string, CategoryWithStats>;
  channelsById: Map<string, ChannelWithStats>;
  playlistsById: Map<string, PlaylistWithStats>;
  videosById: Map<string, VideoWithRelations>;
  labelsById: Map<string, Label>;
  labelsByCategoryId: Map<string, Label[]>;
}

export function hydrateLibrary(snapshot: LibrarySnapshot): HydratedLibrary {
  const rawCategoriesById = new Map<string, Category>(
    snapshot.categories.map((c) => [c.id, c])
  );
  const rawChannelsById = new Map<string, Channel>(
    snapshot.channels.map((ch) => [ch.id, ch])
  );
  const rawPlaylistsById = new Map<string, Playlist>(
    snapshot.playlists.map((pl) => [pl.id, pl])
  );
  const labelsById = new Map<string, Label>(
    snapshot.labels.map((lb) => [lb.id, lb])
  );

  const labelsByCategoryId = new Map<string, Label[]>();
  for (const label of snapshot.labels) {
    const existing = labelsByCategoryId.get(label.category_id) ?? [];
    existing.push(label);
    labelsByCategoryId.set(label.category_id, existing);
  }
  for (const [, list] of labelsByCategoryId) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Group video_labels by video_id
  const labelsForVideo = new Map<string, Label[]>();
  for (const vl of snapshot.video_labels) {
    const label = labelsById.get(vl.label_id);
    if (!label) continue;
    const arr = labelsForVideo.get(vl.video_id) ?? [];
    arr.push(label);
    labelsForVideo.set(vl.video_id, arr);
  }

  // Group video_playlists by video_id and playlist_id
  const playlistsForVideo = new Map<string, Array<Playlist & { order_index: number }>>();
  const playlistLinksByPlaylist = new Map<
    string,
    Array<{ id: string; video_id: string; order_index: number }>
  >();

  for (const vp of snapshot.video_playlists) {
    const playlist = rawPlaylistsById.get(vp.playlist_id);
    if (playlist) {
      const arr = playlistsForVideo.get(vp.video_id) ?? [];
      arr.push({ ...playlist, order_index: vp.order_index });
      playlistsForVideo.set(vp.video_id, arr);
    }

    const plArr = playlistLinksByPlaylist.get(vp.playlist_id) ?? [];
    plArr.push({ id: vp.id, video_id: vp.video_id, order_index: vp.order_index });
    playlistLinksByPlaylist.set(vp.playlist_id, plArr);
  }

  const videos: VideoWithRelations[] = snapshot.videos.map((video) => {
    const channel = video.channel_id ? (rawChannelsById.get(video.channel_id) ?? null) : null;
    const category = video.category_id ? (rawCategoriesById.get(video.category_id) ?? null) : null;
    const labels = (labelsForVideo.get(video.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const playlists = (playlistsForVideo.get(video.id) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const progress_percentage = calculateVideoProgress(
      video.is_completed && video.duration_seconds > 0 ? video.duration_seconds : video.last_watched_seconds,
      video.duration_seconds
    );
    const status = getVideoStatus(video);

    return {
      ...video,
      channel,
      category,
      labels,
      playlists,
      progress_percentage: video.is_completed ? 100 : progress_percentage,
      status,
    };
  });

  const videosById = new Map<string, VideoWithRelations>(videos.map((v) => [v.id, v]));

  // Hydrate Categories with active video progress
  const categories: CategoryWithStats[] = snapshot.categories.map((cat) => {
    const catVideos = videos.filter((v) => v.category_id === cat.id);
    const stats = calculateCollectionProgress(catVideos);
    return {
      ...cat,
      labels: labelsByCategoryId.get(cat.id) ?? [],
      total_active_videos: stats.totalActiveCount,
      completed_videos: stats.completedCount,
      progress_percentage: stats.percentage,
    };
  });

  // Hydrate Channels with active video progress
  const channels: ChannelWithStats[] = snapshot.channels.map((ch) => {
    const chVideos = videos.filter((v) => v.channel_id === ch.id);
    const stats = calculateCollectionProgress(chVideos);
    return {
      ...ch,
      default_category: ch.default_category_id ? (rawCategoriesById.get(ch.default_category_id) ?? null) : null,
      total_active_videos: stats.totalActiveCount,
      completed_videos: stats.completedCount,
      progress_percentage: stats.percentage,
    };
  });

  // Hydrate Playlists ordered by order_index, cover from smallest order_index
  const playlists: PlaylistWithStats[] = snapshot.playlists.map((pl) => {
    const links = (playlistLinksByPlaylist.get(pl.id) ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index);

    const orderedVideos = links
      .map((link) => {
        const video = videosById.get(link.video_id);
        if (!video) return null;
        return {
          ...video,
          video_playlist_id: link.id,
          order_index: link.order_index,
        };
      })
      .filter((item): item is VideoWithRelations & { video_playlist_id: string; order_index: number } => item !== null);

    const plStats = calculatePlaylistProgress(orderedVideos);
    const firstVideo = orderedVideos[0] ?? null;

    return {
      ...pl,
      category: pl.category_id ? (rawCategoriesById.get(pl.category_id) ?? null) : null,
      cover_thumbnail_url: firstVideo ? firstVideo.thumbnail_url : null,
      videos: orderedVideos,
      total_videos: plStats.totalCount,
      completed_videos: plStats.completedCount,
      total_watched_seconds: plStats.totalWatchedSeconds,
      total_duration_seconds: plStats.totalDurationSeconds,
      progress_percentage: plStats.percentage,
    };
  });

  const watchQueue: WatchQueueEntry[] = (snapshot.watch_queue ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((item) => {
      const video = videosById.get(item.video_id);
      if (!video) return null;
      return {
        ...video,
        queue_item_id: item.id,
        position: item.position,
        added_at: item.added_at,
      };
    })
    .filter((entry): entry is WatchQueueEntry => entry !== null);

  const queuedVideoIds = new Set(watchQueue.map((item) => item.id));

  return {
    categories,
    channels,
    playlists,
    videos,
    labels: snapshot.labels,
    watchQueue,
    queuedVideoIds,
    categoriesById: new Map(categories.map((c) => [c.id, c])),
    channelsById: new Map(channels.map((c) => [c.id, c])),
    playlistsById: new Map(playlists.map((p) => [p.id, p])),
    videosById,
    labelsById,
    labelsByCategoryId,
  };
}
