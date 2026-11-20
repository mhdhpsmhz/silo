export interface Category {
  id: string;
  name: string;
  color: string;
  icon_name: string;
  description: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Label {
  id: string;
  name: string;
  category_id: string;
  created_at: string;
  updated_at?: string;
}

export interface Channel {
  id: string;
  name: string;
  channel_url: string;
  avatar_url: string | null;
  default_category_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Playlist {
  id: string;
  name: string;
  category_id: string | null;
  description: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Video {
  id: string;
  youtube_video_id: string;
  url: string;
  title: string;
  thumbnail_url: string;
  channel_id: string | null;
  category_id: string | null;
  notes: string | null;
  duration_seconds: number;
  last_watched_seconds: number;
  is_completed: boolean;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
  last_watched_at: string | null;
}

export interface VideoPlaylist {
  id: string;
  video_id: string;
  playlist_id: string;
  order_index: number;
}

export interface VideoLabel {
  video_id: string;
  label_id: string;
}

export interface WatchQueueItem {
  id: string;
  video_id: string;
  position: number;
  added_at: string;
}

export type VideoStatus = "Completed" | "In Progress" | "Not Started";

export interface VideoWithRelations extends Video {
  channel: Channel | null;
  category: Category | null;
  labels: Label[];
  playlists: Array<Playlist & { order_index: number }>;
  progress_percentage: number;
  status: VideoStatus;
}

export interface WatchQueueEntry extends VideoWithRelations {
  queue_item_id: string;
  position: number;
  added_at: string;
}

export interface ChannelWithStats extends Channel {
  default_category: Category | null;
  total_active_videos: number;
  completed_videos: number;
  progress_percentage: number;
}

export interface CategoryWithStats extends Category {
  labels: Label[];
  total_active_videos: number;
  completed_videos: number;
  progress_percentage: number;
}

export interface PlaylistWithStats extends Playlist {
  category: Category | null;
  cover_thumbnail_url: string | null;
  videos: Array<
    VideoWithRelations & { video_playlist_id: string; order_index: number }
  >;
  total_videos: number;
  completed_videos: number;
  total_watched_seconds: number;
  total_duration_seconds: number;
  progress_percentage: number;
}

export interface LibrarySnapshot {
  categories: Category[];
  labels: Label[];
  channels: Channel[];
  playlists: Playlist[];
  videos: Video[];
  video_playlists: VideoPlaylist[];
  video_labels: VideoLabel[];
  watch_queue?: WatchQueueItem[];
}

export interface SiloExportCounts {
  categories: number;
  labels: number;
  channels: number;
  playlists: number;
  videos: number;
  watch_queue: number;
}

export interface SiloExportPayload {
  app: "SILO";
  version: 1;
  exported_at: string;
  counts: SiloExportCounts;
  data: LibrarySnapshot;
}

export type ImportMode = "merge" | "replace";

export interface ImportResultSummary {
  mode: ImportMode;
  addedVideos: number;
  skippedVideos: number;
  addedCategories: number;
  addedChannels: number;
  addedLabels: number;
  addedPlaylists: number;
  addedQueueItems: number;
}

export interface VideoFormPayload {
  id?: string;
  youtube_video_id: string;
  url: string;
  title: string;
  thumbnail_url: string;
  channel_id: string | null;
  category_id: string;
  label_ids: string[];
  playlist_ids: string[];
  notes: string | null;
}

export interface ChannelFormPayload {
  id?: string;
  name: string;
  channel_url: string;
  avatar_url: string | null;
  default_category_id: string | null;
  notes: string | null;
}

export interface CategoryFormPayload {
  id?: string;
  name: string;
  color: string;
  icon_name: string;
  description: string | null;
  label_names: string[];
}

export interface PlaylistFormPayload {
  id?: string;
  name: string;
  category_id: string | null;
  description: string | null;
}
