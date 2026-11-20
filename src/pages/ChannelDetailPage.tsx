import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useDeleteChannel,
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { VideoStatus, VideoWithRelations } from "../types/silo";
import { ChannelAvatar } from "../components/ui/ChannelAvatar";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  CollectionDetailLoadingSkeleton,
  EmptyState,
  ErrorState,
} from "../components/ui/StateViews";
import { VideoCard } from "../components/ui/VideoCard";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function ChannelDetailPage() {
  const { t } = useTranslation();
  const { channelId } = useParams({ strict: false }) as { channelId: string };
  const navigate = useNavigate();

  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const deleteChannel = useDeleteChannel();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const { openChannelModal, openVideoModal, openConfirmDialog } = useUiStore();

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | VideoStatus>("");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "progress">(
    "newest",
  );

  const channel = library?.channelsById.get(channelId) ?? null;

  const channelVideos = useMemo(() => {
    if (!library || !channel) return [];
    const q = search.trim().toLowerCase();
    return library.videos
      .filter((v) => v.channel_id === channel.id && !v.is_archived)
      .filter((v) => {
        if (q && !v.title.toLowerCase().includes(q)) return false;
        if (statusFilter && v.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "progress")
          return b.progress_percentage - a.progress_percentage;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [library, channel, search, statusFilter, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSortBy("newest");
  };

  const handleDeleteChannel = () => {
    if (!channel) return;
    openConfirmDialog({
      title: t("channels.deleteTitle"),
      description: t("channelDetail.deleteDesc", { name: channel.name }),
      confirmLabel: t("channels.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteChannel.mutateAsync(channel.id);
        navigate({ to: "/channels" });
      },
    });
  };

  const handleDeleteVideo = (v: VideoWithRelations) => {
    openConfirmDialog({
      title: t("videos.deleteDialogTitle"),
      description: t("channelDetail.deleteVideoDesc", { title: v.title }),
      confirmLabel: t("videos.deleteDialogConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteVideo.mutateAsync(v.id);
      },
    });
  };

  if (isLoading) return <CollectionDetailLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!channel) {
    return (
      <EmptyState
        title={t("channelDetail.notFoundTitle")}
        description={t("channelDetail.notFoundDescription")}
        action={
          <Link
            to="/channels"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text"
          >
            {t("channelDetail.backToChannels")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/channels"
        className="inline-flex items-center gap-1.5 text-sm text-silo-muted hover:text-silo-text"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("channelDetail.backToChannels")}
      </Link>

      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <ChannelAvatar
              name={channel.name}
              avatarUrl={channel.avatar_url}
              accentColor={channel.default_category?.color}
              size="lg"
            />
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-silo-text tracking-tight">
                {channel.name}
              </h2>
              <a
                href={channel.channel_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-mono text-silo-muted hover:text-silo-text break-all"
              >
                {channel.channel_url}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
              <p className="text-xs text-silo-text-secondary">
                {t("channelDetail.defaultCategoryLabel")}{" "}
                {channel.default_category ? (
                  <Link
                    to="/categories/$categoryId"
                    params={{ categoryId: channel.default_category.id }}
                    className="underline"
                  >
                    {channel.default_category.name}
                  </Link>
                ) : (
                  t("app.none")
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SiloButton
              type="button"
              onClick={() => openVideoModal({ defaultChannelId: channel.id })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("app.addVideo")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => openChannelModal(channel.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {t("channelDetail.editChannel")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={handleDeleteChannel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("channelDetail.deleteChannel")}
            </SiloButton>
          </div>
        </div>

        {channel.notes && (
          <p className="text-sm text-silo-text-secondary leading-relaxed">
            {channel.notes}
          </p>
        )}

        <div className="space-y-1.5 pt-2 border-t border-silo-border">
          <div className="flex justify-between text-xs font-mono tabular-nums">
            <span className="text-silo-muted">
              {t("channelDetail.activeCompleted", {
                completed: channel.completed_videos,
                total: channel.total_active_videos,
              })}
            </span>
            <span className="text-silo-text">
              {channel.progress_percentage}%
            </span>
          </div>
          <ProgressBar
            percentage={channel.progress_percentage}
            color={channel.default_category?.color ?? "#48929B"}
            heightClass="h-2"
          />
        </div>
      </section>

      {/* Collapsible Filter & Video List */}
      <CollapsibleToolbar
        open={toolbarOpen}
        onToggle={() => setToolbarOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        controlsId="channel-videos-toolbar-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-55 max-w-sm">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("channelDetail.searchPlaceholder")}
              aria-label={t("channelDetail.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SiloSelect
              ariaLabel={t("channelDetail.filterByStatusAria")}
              value={statusFilter}
              onChange={(value) => setStatusFilter(value as "" | VideoStatus)}
              placeholder={t("status.allStatus")}
              options={[
                { value: "", label: t("status.allStatus") },
                { value: "Not Started", label: t("status.notStarted") },
                { value: "In Progress", label: t("status.inProgress") },
                { value: "Completed", label: t("status.completed") },
              ]}
              className="w-44"
            />

            <SiloSelect
              ariaLabel={t("channelDetail.sortAria")}
              value={sortBy}
              onChange={(value) =>
                setSortBy(value as "newest" | "title" | "progress")
              }
              placeholder={t("toolbar.sortDateAdded")}
              options={[
                { value: "newest", label: t("toolbar.sortDateAdded") },
                { value: "title", label: t("toolbar.sortTitle") },
                { value: "progress", label: t("toolbar.sortProgressShort") },
              ]}
              className="w-40"
            />
          </div>
        </div>
      </CollapsibleToolbar>

      {channelVideos.length === 0 ? (
        <EmptyState
          title={t("channelDetail.emptyTitle")}
          description={t("channelDetail.emptyDescription")}
          action={
            <SiloButton
              type="button"
              onClick={() => openVideoModal({ defaultChannelId: channel.id })}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
            >
              {t("app.addVideo")}
            </SiloButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channelVideos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onEdit={(video) => openVideoModal({ editVideoId: video.id })}
              onDelete={handleDeleteVideo}
              onToggleFavorite={(video) =>
                patchVideo.mutate({
                  id: video.id,
                  patch: { is_favorite: !video.is_favorite },
                })
              }
              onToggleArchive={(video) =>
                patchVideo.mutate({
                  id: video.id,
                  patch: { is_archived: !video.is_archived },
                })
              }
              onMarkCompleted={(video) =>
                patchVideo.mutate({
                  id: video.id,
                  patch: {
                    is_completed: true,
                    last_watched_seconds:
                      video.duration_seconds > 0
                        ? video.duration_seconds
                        : video.last_watched_seconds,
                    last_watched_at: new Date().toISOString(),
                  },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
