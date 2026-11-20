import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import i18n from "../i18n";
import * as api from "../services/libraryApi";
import { hydrateLibrary } from "../utils/libraryHydration";
import type {
  CategoryFormPayload,
  ChannelFormPayload,
  ImportMode,
  LibrarySnapshot,
  PlaylistFormPayload,
  Video,
  VideoFormPayload,
} from "../types/silo";

export const LIBRARY_QUERY_KEY = ["silo-library"] as const;

export function useLibraryData() {
  const query = useQuery({
    queryKey: LIBRARY_QUERY_KEY,
    queryFn: api.fetchLibrarySnapshot,
    staleTime: 1000 * 15,
  });

  const hydrated = useMemo(() => {
    if (!query.data) return null;
    return hydrateLibrary(query.data);
  }, [query.data]);

  return {
    ...query,
    snapshot: query.data ?? null,
    library: hydrated,
  };
}

export function useSaveVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: VideoFormPayload) => api.saveVideo(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(
        vars.id ? i18n.t("toasts.videoUpdated") : i18n.t("toasts.videoAdded"),
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.videoSaveError"));
    },
  });
}

export function usePatchVideo(options?: { silent?: boolean }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<
        Pick<
          Video,
          | "duration_seconds"
          | "last_watched_seconds"
          | "is_completed"
          | "is_favorite"
          | "is_archived"
          | "last_watched_at"
          | "notes"
        >
      >;
    }) => api.patchVideo(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
    },
    onError: (err: Error) => {
      if (!options?.silent) {
        toast.error(err.message || i18n.t("toasts.videoUpdateError"));
      }
    },
  });
}

export function useDeleteVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteVideo(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.videoDeleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.videoDeleteError"));
    },
  });
}

export function useSaveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChannelFormPayload) => api.saveChannel(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(
        vars.id
          ? i18n.t("toasts.channelUpdated")
          : i18n.t("toasts.channelCreated"),
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.channelSaveError"));
    },
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteChannel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.channelDeleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.channelDeleteError"));
    },
  });
}

export function useSaveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryFormPayload) => api.saveCategory(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(
        vars.id
          ? i18n.t("toasts.categoryUpdated")
          : i18n.t("toasts.categoryCreated"),
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.categorySaveError"));
    },
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.categoryDeleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.categoryDeleteError"));
    },
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, name }: { categoryId: string; name: string }) =>
      api.createLabel(categoryId, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.labelAdded"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.labelAddError"));
    },
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateLabel(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.labelUpdated"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.labelUpdateError"));
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteLabel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.labelDeleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.labelDeleteError"));
    },
  });
}

export function useSavePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: PlaylistFormPayload) => api.savePlaylist(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(
        vars.id
          ? i18n.t("toasts.playlistUpdated")
          : i18n.t("toasts.playlistCreated"),
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.playlistSaveError"));
    },
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePlaylist(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.playlistDeleted"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.playlistDeleteError"));
    },
  });
}

export function useAddVideoToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      videoId,
    }: {
      playlistId: string;
      videoId: string;
    }) => api.addVideoToPlaylist(playlistId, videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.addedToPlaylist"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.addToPlaylistError"));
    },
  });
}

export function useRemoveVideoFromPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      videoId,
    }: {
      playlistId: string;
      videoId: string;
    }) => api.removeVideoFromPlaylist(playlistId, videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.removedFromPlaylist"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.removeFromPlaylistError"));
    },
  });
}

export function useReorderPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      playlistId,
      orderedVideoIds,
    }: {
      playlistId: string;
      orderedVideoIds: string[];
    }) => api.reorderPlaylistVideos(playlistId, orderedVideoIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.playlistOrderSaved"));
    },
    onError: (err: Error) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.error(err.message || i18n.t("toasts.playlistOrderError"));
    },
  });
}

export function useResetLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.resetLibraryData(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.libraryCleared"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.libraryResetError"));
    },
  });
}

export function useAddToWatchQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => api.addToWatchQueue(videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.queueAdded"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.queueAddError"));
    },
  });
}

export function useRemoveFromWatchQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => api.removeFromWatchQueue(videoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.queueRemoved"));
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.queueRemoveError"));
    },
  });
}

export function useReorderWatchQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderedVideoIds: string[]) =>
      api.reorderWatchQueue(orderedVideoIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(i18n.t("toasts.queueOrderSaved"));
    },
    onError: (err: Error) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.error(err.message || i18n.t("toasts.queueOrderError"));
    },
  });
}

export function useClearWatchQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      scope,
      completedVideoIds,
    }: {
      scope: "completed" | "all";
      completedVideoIds?: string[];
    }) => api.clearWatchQueue(scope, completedVideoIds),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(
        vars.scope === "completed"
          ? i18n.t("toasts.queueClearedCompleted")
          : i18n.t("toasts.queueCleared"),
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.queueClearError"));
    },
  });
}

export function useImportLibrary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, data }: { mode: ImportMode; data: LibrarySnapshot }) =>
      api.importLibraryData(mode, data),
    onSuccess: (summary) => {
      qc.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });
      toast.success(
        summary.mode === "replace"
          ? i18n.t("toasts.importReplaced", { videos: summary.addedVideos })
          : i18n.t("toasts.importMerged", {
              added: summary.addedVideos,
              skipped: summary.skippedVideos,
            }),
      );
    },
    onError: (err: Error) => {
      toast.error(err.message || i18n.t("toasts.importError"));
    },
  });
}
