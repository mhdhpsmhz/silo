import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Edit3,
  GripVertical,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useAddVideoToPlaylist,
  useDeletePlaylist,
  useLibraryData,
  useRemoveVideoFromPlaylist,
  useReorderPlaylist,
} from "../hooks/useLibrary";
import { translateVideoStatus } from "../i18n";
import { useUiStore } from "../store/uiStore";
import type { VideoWithRelations } from "../types/silo";
import { formatDurationHuman, formatSecondsToClock } from "../utils/progress";
import { getYouTubeThumbnailFallbackUrl } from "../utils/youtube";
import { ModalShell } from "../components/ui/ModalShell";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  ErrorState,
  PlaylistDetailLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoThumbnail } from "../components/ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
interface SortableRowProps {
  video: VideoWithRelations & {
    video_playlist_id: string;
    order_index: number;
  };
  index: number;
  playlistId: string;
  onRemove: (video: VideoWithRelations) => void;
}

function SortablePlaylistVideoRow({
  video,
  index,
  playlistId,
  onRemove,
}: SortableRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-silo-surface border rounded-xl ${
        isDragging
          ? "border-silo-text"
          : "border-silo-border hover:border-silo-border-hover"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SiloButton
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t("playlistDetail.reorderAria", { title: video.title })}
          className="p-1.5 rounded-md text-silo-muted hover:text-silo-text hover:bg-silo-elevated cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </SiloButton>

        <span className="w-7 text-center font-mono text-xs tabular-nums text-silo-muted shrink-0">
          #{index + 1}
        </span>

        <Link
          to="/videos/$videoId"
          params={{ videoId: video.id }}
          search={{ playlistId }}
          className="w-28 shrink-0 block"
        >
          <VideoThumbnail
            src={video.thumbnail_url}
            fallbackSrc={getYouTubeThumbnailFallbackUrl(video.youtube_video_id)}
            alt={video.title}
            compact
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <Link
            to="/videos/$videoId"
            params={{ videoId: video.id }}
            search={{ playlistId }}
            className="block text-sm font-semibold text-silo-text hover:underline line-clamp-1"
          >
            {video.title}
          </Link>
          <p className="text-xs text-silo-muted truncate">
            {[
              video.channel?.name ?? t("app.unknownChannel"),
              video.duration_seconds > 0
                ? formatSecondsToClock(video.duration_seconds)
                : t("app.durationUnset"),
              translateVideoStatus(video.status, t),
            ].join(" · ")}
          </p>
          <div className="flex items-center gap-2 max-w-xs">
            <ProgressBar
              percentage={video.progress_percentage}
              color={video.category?.color ?? "#48929B"}
              heightClass="h-1"
            />
            <span className="text-[11px] font-mono tabular-nums text-silo-muted">
              {video.progress_percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 shrink-0">
        {video.is_completed && (
          <CheckCircle2
            className="w-4 h-4 text-silo-success"
            aria-label={t("status.completed")}
          />
        )}
        <Link
          to="/videos/$videoId"
          params={{ videoId: video.id }}
          search={{ playlistId }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border"
        >
          <Play className="w-3.5 h-3.5" />
          {t("playlistDetail.openVideo")}
        </Link>
        <SiloButton
          type="button"
          onClick={() => onRemove(video)}
          aria-label={t("playlistDetail.removeVideoAria", {
            title: video.title,
          })}
          title={t("playlistDetail.removeVideoTitle")}
          className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated"
        >
          <X className="w-4 h-4" />
        </SiloButton>
      </div>
    </div>
  );
}

export function PlaylistDetailPage() {
  const { t } = useTranslation();
  const { playlistId } = useParams({ strict: false }) as { playlistId: string };
  const navigate = useNavigate();

  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const deletePlaylist = useDeletePlaylist();
  const reorderPlaylist = useReorderPlaylist();
  const addVideoToPlaylist = useAddVideoToPlaylist();
  const removeVideoFromPlaylist = useRemoveVideoFromPlaylist();
  const { openPlaylistModal, openVideoModal, openConfirmDialog } = useUiStore();

  const [addExistingOpen, setAddExistingOpen] = useState(false);
  const [existingSearch, setExistingSearch] = useState("");
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const playlist = library?.playlistsById.get(playlistId) ?? null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const availableVideosToAdd = useMemo(() => {
    if (!library || !playlist) return [];
    const existingIds = new Set(playlist.videos.map((v) => v.id));
    const q = existingSearch.trim().toLowerCase();
    return library.videos
      .filter((v) => !v.is_archived && !existingIds.has(v.id))
      .filter((v) => (!q ? true : v.title.toLowerCase().includes(q)));
  }, [library, playlist, existingSearch]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!playlist) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = playlist.videos.findIndex((v) => v.id === active.id);
    const newIndex = playlist.videos.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(playlist.videos, oldIndex, newIndex);
    reorderPlaylist.mutate({
      playlistId: playlist.id,
      orderedVideoIds: reordered.map((v) => v.id),
    });
  };

  const handleDeletePlaylist = () => {
    if (!playlist) return;
    openConfirmDialog({
      title: t("playlists.deleteTitle"),
      description: t("playlistDetail.deleteDesc", { name: playlist.name }),
      confirmLabel: t("playlists.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deletePlaylist.mutateAsync(playlist.id);
        navigate({ to: "/playlists" });
      },
    });
  };

  const handleRemoveVideo = (video: VideoWithRelations) => {
    if (!playlist) return;
    removeVideoFromPlaylist.mutate({
      playlistId: playlist.id,
      videoId: video.id,
    });
  };

  const handlePlayPlaylist = () => {
    if (!playlist || playlist.videos.length === 0) return;
    const nextVideo =
      playlist.videos.find((v) => !v.is_completed) ?? playlist.videos[0];
    navigate({
      to: "/videos/$videoId",
      params: { videoId: nextVideo.id },
      search: { playlistId: playlist.id },
    });
  };

  if (isLoading) return <PlaylistDetailLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!playlist) {
    return (
      <EmptyState
        title={t("playlistDetail.notFoundTitle")}
        description={t("playlistDetail.notFoundDescription")}
        action={
          <Link
            to="/playlists"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text"
          >
            {t("playlistDetail.backToPlaylists")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/playlists"
        className="inline-flex items-center gap-1.5 text-sm text-silo-muted hover:text-silo-text"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("playlistDetail.backToPlaylists")}
      </Link>

      {/* Playlist Header Card */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-4">
          <VideoThumbnail
            src={playlist.cover_thumbnail_url}
            alt={playlist.name}
          />
        </div>

        <div className="lg:col-span-8 space-y-4">
          <div className="space-y-1.5">
            {playlist.category && (
              <Link
                to="/categories/$categoryId"
                params={{ categoryId: playlist.category.id }}
                className="inline-flex items-center gap-1.5 text-xs text-silo-text-secondary hover:underline"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: playlist.category.color }}
                />
                {playlist.category.name}
              </Link>
            )}
            <h2 className="text-2xl font-bold text-silo-text tracking-tight">
              {playlist.name}
            </h2>
            {playlist.description && (
              <p className="text-sm text-silo-muted leading-relaxed">
                {playlist.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">
                {t("playlistDetail.statVideos")}
              </span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {playlist.total_videos}
              </p>
            </div>
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">
                {t("playlistDetail.statCompleted")}
              </span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {playlist.completed_videos} / {playlist.total_videos}
              </p>
            </div>
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">
                {t("playlistDetail.statWatchedTime")}
              </span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {formatDurationHuman(playlist.total_watched_seconds)}
              </p>
            </div>
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">
                {t("playlistDetail.statTotalDuration")}
              </span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {formatDurationHuman(playlist.total_duration_seconds)}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono tabular-nums">
              <span className="text-silo-muted">
                {t("playlistDetail.durationWeightedProgress")}
              </span>
              <span className="text-silo-text">
                {playlist.progress_percentage}%
              </span>
            </div>
            <ProgressBar
              percentage={playlist.progress_percentage}
              color={playlist.category?.color ?? "#F4EFE3"}
              heightClass="h-2"
            />
          </div>

          <div className="pt-2 border-t border-silo-border space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <SiloButton
                type="button"
                disabled={playlist.videos.length === 0}
                onClick={handlePlayPlaylist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                {t("playlistDetail.playPlaylist")}
              </SiloButton>

              <SiloButton
                type="button"
                onClick={() => setMobileActionsOpen((prev) => !prev)}
                aria-expanded={mobileActionsOpen}
                className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
              >
                <span>{t("app.quickActions")}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    mobileActionsOpen ? "rotate-180" : ""
                  }`}
                />
              </SiloButton>

              <div
                className={`${
                  mobileActionsOpen ? "flex" : "hidden"
                } sm:flex flex-wrap items-center gap-2 w-full sm:w-auto`}
              >
                <SiloButton
                  type="button"
                  onClick={() => setAddExistingOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("playlistDetail.addExisting")}
                </SiloButton>

                <SiloButton
                  type="button"
                  onClick={() =>
                    openVideoModal({
                      defaultPlaylistId: playlist.id,
                      defaultCategoryId: playlist.category_id ?? undefined,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("playlistDetail.newVideo")}
                </SiloButton>

                <SiloButton
                  type="button"
                  onClick={() => openPlaylistModal(playlist.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {t("app.edit")}
                </SiloButton>

                <SiloButton
                  type="button"
                  onClick={handleDeletePlaylist}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("app.delete")}
                </SiloButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Drag & Drop Ordered List */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-silo-text">
            {t("playlistDetail.playlistSequence")}
          </h3>
        </div>

        {playlist.videos.length === 0 ? (
          <EmptyState
            title={t("playlistDetail.emptyTitle")}
            description={t("playlistDetail.emptyDescription")}
            action={
              <SiloButton
                type="button"
                onClick={() => setAddExistingOpen(true)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
              >
                {t("playlistDetail.addExistingButton")}
              </SiloButton>
            }
          />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={playlist.videos.map((v) => v.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2.5">
                {playlist.videos.map((v, idx) => (
                  <SortablePlaylistVideoRow
                    key={v.id}
                    video={v}
                    index={idx}
                    playlistId={playlist.id}
                    onRemove={handleRemoveVideo}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Add Existing Video Modal */}
      <ModalShell
        open={addExistingOpen}
        onClose={() => setAddExistingOpen(false)}
        title={t("playlistDetail.modalTitle")}
        footer={
          <SiloButton
            type="button"
            onClick={() => setAddExistingOpen(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text"
          >
            {t("app.done")}
          </SiloButton>
        }
      >
        <div className="space-y-4">
          <SiloInput
            type="search"
            value={existingSearch}
            onChange={(e) => setExistingSearch(e.target.value)}
            placeholder={t("playlistDetail.filterPlaceholder")}
            aria-label={t("playlistDetail.filterAria")}
            className="w-full px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
          />

          {availableVideosToAdd.length === 0 ? (
            <p className="text-sm text-silo-muted py-6 text-center">
              {t("playlistDetail.noAvailableVideos")}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableVideosToAdd.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-silo-bg border border-silo-border rounded-lg"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-silo-text truncate">
                      {v.title}
                    </p>
                    <p className="text-xs text-silo-muted truncate">
                      {v.channel?.name ?? t("app.unknownChannel")}
                    </p>
                  </div>
                  <SiloButton
                    type="button"
                    disabled={addVideoToPlaylist.isPending}
                    onClick={() =>
                      addVideoToPlaylist.mutate({
                        playlistId: playlist.id,
                        videoId: v.id,
                      })
                    }
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover shrink-0 disabled:opacity-50"
                  >
                    {t("app.add")}
                  </SiloButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
