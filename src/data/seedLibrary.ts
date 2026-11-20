import type { LibrarySnapshot } from "../types/silo";

export function createEmptyLibrary(): LibrarySnapshot {
  return {
    categories: [],
    labels: [],
    channels: [],
    playlists: [],
    videos: [],
    video_playlists: [],
    video_labels: [],
    watch_queue: [],
  };
}
