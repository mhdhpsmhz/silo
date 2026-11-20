import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { translateVideoStatus } from "../i18n";
import {
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { VideoStatus, VideoWithRelations } from "../types/silo";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import {
  EmptyState,
  ErrorState,
  VideoGridLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoCard } from "../components/ui/VideoCard";
import { Input } from "@/components/ui/input";
import { SiloSelect } from "../components/ui/SiloSelect";

import { SiloButton } from "@/components/ui/SiloButton";
const PAGE_SIZE = 12;

export function VideosPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const routeSearch = useSearch({ strict: false }) as {
    labelId?: string;
    categoryId?: string;
  };
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const {
    openVideoModal,
    openConfirmDialog,
    videosViewMode,
    setVideosViewMode,
  } = useUiStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(routeSearch.categoryId ?? "");
  const [channelId, setChannelId] = useState("");
  const [labelId, setLabelId] = useState(routeSearch.labelId ?? "");
  const [playlistId, setPlaylistId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | VideoStatus>("");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "progress">(
    "newest",
  );
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (routeSearch.labelId) {
      setLabelId(routeSearch.labelId);
      setPage(1);
    }
    if (routeSearch.categoryId) {
      setCategoryId(routeSearch.categoryId);
      setPage(1);
    }
  }, [routeSearch.labelId, routeSearch.categoryId]);

  const availableLabels = useMemo(() => {
    if (!library) return [];
    if (!categoryId) return library.labels;
    return library.labelsByCategoryId.get(categoryId) ?? [];
  }, [library, categoryId]);

  const filteredVideos = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();

    const list = library.videos.filter((v) => {
      if (v.is_archived) return false;
      if (q) {
        const hay = [
          v.title,
          v.channel?.name ?? "",
          v.category?.name ?? "",
          v.labels.map((l) => l.name).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (categoryId && v.category_id !== categoryId) return false;
      if (channelId && v.channel_id !== channelId) return false;
      if (labelId && !v.labels.some((l) => l.id === labelId)) return false;
      if (playlistId && !v.playlists.some((p) => p.id === playlistId))
        return false;
      if (statusFilter && v.status !== statusFilter) return false;
      return true;
    });

    list.sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "progress")
        return b.progress_percentage - a.progress_percentage;
      return b.created_at.localeCompare(a.created_at);
    });

    return list;
  }, [
    library,
    search,
    categoryId,
    channelId,
    labelId,
    playlistId,
    statusFilter,
    sortBy,
  ]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryId ? 1 : 0) +
    (channelId ? 1 : 0) +
    (labelId ? 1 : 0) +
    (playlistId ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    void navigate({
      to: "/videos",
      search: { categoryId: undefined, labelId: undefined },
    });
    setSearch("");
    setCategoryId("");
    setChannelId("");
    setLabelId("");
    setPlaylistId("");
    setStatusFilter("");
    setSortBy("newest");
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedVideos = filteredVideos.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const handleToggleFavorite = (v: VideoWithRelations) => {
    patchVideo.mutate({ id: v.id, patch: { is_favorite: !v.is_favorite } });
  };

  const handleToggleArchive = (v: VideoWithRelations) => {
    patchVideo.mutate({ id: v.id, patch: { is_archived: !v.is_archived } });
  };

  const handleMarkCompleted = (v: VideoWithRelations) => {
    patchVideo.mutate({
      id: v.id,
      patch: {
        is_completed: true,
        last_watched_seconds:
          v.duration_seconds > 0 ? v.duration_seconds : v.last_watched_seconds,
        last_watched_at: new Date().toISOString(),
      },
    });
  };

  const handleDelete = (v: VideoWithRelations) => {
    openConfirmDialog({
      title: t("videos.deleteDialogTitle"),
      description: t("videos.deleteDialogDesc", { title: v.title }),
      confirmLabel: t("videos.deleteDialogConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteVideo.mutateAsync(v.id);
      },
    });
  };

  if (isLoading) return <VideoGridLoadingSkeleton layout={videosViewMode} />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-silo-muted font-mono tabular-nums">
          {t("videos.countSubtitle", { count: filteredVideos.length })}
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex p-1 bg-silo-surface border border-silo-border rounded-lg">
            <SiloButton
              type="button"
              onClick={() => setVideosViewMode("grid")}
              aria-label={t("toolbar.gridView")}
              aria-pressed={videosViewMode === "grid"}
              className={`p-1.5 rounded-md transition-colors ${
                videosViewMode === "grid"
                  ? "bg-silo-elevated text-silo-text"
                  : "text-silo-muted hover:text-silo-text"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => setVideosViewMode("list")}
              aria-label={t("toolbar.listView")}
              aria-pressed={videosViewMode === "list"}
              className={`p-1.5 rounded-md transition-colors ${
                videosViewMode === "list"
                  ? "bg-silo-elevated text-silo-text"
                  : "text-silo-muted hover:text-silo-text"
              }`}
            >
              <List className="w-4 h-4" />
            </SiloButton>
          </div>

          <SiloButton
            type="button"
            onClick={() => openVideoModal()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t("app.addVideo")}
          </SiloButton>
        </div>
      </div>

      {/* Collapsible Filter Toolbar (Hidden by default) */}
      <CollapsibleToolbar
        open={filtersOpen}
        onToggle={() => setFiltersOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        controlsId="videos-filter-panel"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("videos.searchPlaceholder")}
              aria-label={t("videos.searchAria")}
              className="h-10 w-full rounded-lg border-silo-border bg-silo-bg py-2 pl-9 pr-3 text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0"
            />
          </div>

          <div className="md:col-span-2">
            <SiloSelect
              ariaLabel={t("videos.filterByCategory")}
              value={categoryId}
              onChange={(value) => {
                setCategoryId(value);
                setLabelId("");
                setPage(1);
              }}
              placeholder={t("toolbar.allCategories")}
              options={[
                { value: "", label: t("toolbar.allCategories") },
                ...(library?.categories ?? []).map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })),
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <SiloSelect
              ariaLabel={t("videos.filterByChannel")}
              value={channelId}
              onChange={(value) => {
                setChannelId(value);
                setPage(1);
              }}
              placeholder={t("toolbar.allChannels")}
              options={[
                { value: "", label: t("toolbar.allChannels") },
                ...(library?.channels ?? []).map((ch) => ({
                  value: ch.id,
                  label: ch.name,
                })),
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <SiloSelect
              ariaLabel={t("videos.filterByLabel")}
              value={labelId}
              onChange={(value) => {
                setLabelId(value);
                setPage(1);
              }}
              placeholder={t("toolbar.allLabels")}
              options={[
                { value: "", label: t("toolbar.allLabels") },
                ...availableLabels.map((lbl) => ({
                  value: lbl.id,
                  label: lbl.name,
                })),
              ]}
            />
          </div>

          <div className="md:col-span-2">
            <SiloSelect
              ariaLabel={t("videos.filterByPlaylist")}
              value={playlistId}
              onChange={(value) => {
                setPlaylistId(value);
                setPage(1);
              }}
              placeholder={t("toolbar.allPlaylists")}
              options={[
                { value: "", label: t("toolbar.allPlaylists") },
                ...(library?.playlists ?? []).map((pl) => ({
                  value: pl.id,
                  label: pl.name,
                })),
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-silo-border">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["", "Not Started", "In Progress", "Completed"] as const).map(
              (st) => (
                <SiloButton
                  key={st || "all"}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === st
                      ? "bg-silo-text text-silo-bg border-silo-text"
                      : "bg-silo-bg text-silo-muted border-silo-border hover:text-silo-text"
                  }`}
                >
                  {st ? translateVideoStatus(st, t) : t("status.allStatus")}
                </SiloButton>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="videos-sort" className="text-xs text-silo-muted">
              {t("toolbar.sortLabel")}
            </label>
            <SiloSelect
              ariaLabel={t("toolbar.sortLabel")}
              value={sortBy}
              onChange={(value) =>
                setSortBy(value as "newest" | "title" | "progress")
              }
              placeholder={t("toolbar.sortDateAdded")}
              options={[
                { value: "newest", label: t("toolbar.sortDateAdded") },
                { value: "title", label: t("toolbar.sortTitleAZ") },
                { value: "progress", label: t("toolbar.sortProgress") },
              ]}
              className="h-8 w-36 text-xs"
            />
          </div>
        </div>
      </CollapsibleToolbar>

      {/* Video Grid / List */}
      {paginatedVideos.length === 0 ? (
        <EmptyState
          title={t("videos.emptyTitle")}
          description={t("videos.emptyDescription")}
          action={
            activeFilterCount > 0 ? (
              <SiloButton
                type="button"
                onClick={handleResetFilters}
                className="px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border"
              >
                {t("toolbar.resetFilters")}
              </SiloButton>
            ) : undefined
          }
        />
      ) : (
        <div
          className={
            videosViewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              : "space-y-3"
          }
        >
          {paginatedVideos.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              layout={videosViewMode}
              onEdit={(video) => openVideoModal({ editVideoId: video.id })}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
              onToggleArchive={handleToggleArchive}
              onMarkCompleted={handleMarkCompleted}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs font-mono tabular-nums text-silo-muted">
            {t("videos.pageOf", { current: safePage, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <SiloButton
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text disabled:opacity-40"
            >
              {t("videos.previous")}
            </SiloButton>
            <SiloButton
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text disabled:opacity-40"
            >
              {t("videos.next")}
            </SiloButton>
          </div>
        </div>
      )}
    </div>
  );
}
