import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeletePlaylist, useLibraryData } from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { PlaylistWithStats } from "../types/silo";
import { formatDurationHuman } from "../utils/progress";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  EntityGridLoadingSkeleton,
  ErrorState,
} from "../components/ui/StateViews";
import { VideoThumbnail } from "../components/ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function PlaylistsPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const deletePlaylist = useDeletePlaylist();
  const { openPlaylistModal, openConfirmDialog } = useUiStore();

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "name" | "progress">(
    "newest",
  );

  const playlists = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    return library.playlists
      .filter((pl) => {
        if (!q) return true;
        return (
          pl.name.toLowerCase().includes(q) ||
          (pl.description?.toLowerCase().includes(q) ?? false) ||
          (pl.category?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "progress")
          return b.progress_percentage - a.progress_percentage;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [library, search, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setSortBy("newest");
  };

  const handleDelete = (pl: PlaylistWithStats) => {
    openConfirmDialog({
      title: t("playlists.deleteTitle"),
      description: t("playlists.deleteDesc", { name: pl.name }),
      confirmLabel: t("playlists.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deletePlaylist.mutateAsync(pl.id);
      },
    });
  };

  if (isLoading) return <EntityGridLoadingSkeleton />;
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
        <SiloButton
          type="button"
          onClick={() => openPlaylistModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {t("playlists.addPlaylist")}
        </SiloButton>
      </div>

      <CollapsibleToolbar
        open={toolbarOpen}
        onToggle={() => setToolbarOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        label={t("toolbar.searchAndSort")}
        controlsId="playlists-toolbar-panel"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("playlists.searchPlaceholder")}
              aria-label={t("playlists.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="playlists-sort" className="text-xs text-silo-muted">
              {t("toolbar.sortLabel")}
            </label>
            <SiloSelect
              ariaLabel={t("toolbar.sortLabel")}
              value={sortBy}
              onChange={(value) =>
                setSortBy(value as "newest" | "name" | "progress")
              }
              placeholder={t("toolbar.sortDateCreated")}
              options={[
                { value: "newest", label: t("toolbar.sortDateCreated") },
                { value: "name", label: t("toolbar.sortNameAZ") },
                { value: "progress", label: t("toolbar.sortProgress") },
              ]}
              className="w-44"
            />
          </div>
        </div>
      </CollapsibleToolbar>

      {playlists.length === 0 ? (
        <EmptyState
          title={t("playlists.emptyTitle")}
          description={t("playlists.emptyDescription")}
          action={
            <SiloButton
              type="button"
              onClick={() => openPlaylistModal()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
            >
              {t("playlists.addPlaylist")}
            </SiloButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {playlists.map((pl) => (
            <article
              key={pl.id}
              className="flex flex-col bg-silo-surface border border-silo-border rounded-xl overflow-hidden hover:border-silo-border-hover transition-colors"
            >
              <Link
                to="/playlists/$playlistId"
                params={{ playlistId: pl.id }}
                className="block p-3 pb-0"
              >
                <VideoThumbnail src={pl.cover_thumbnail_url} alt={pl.name} />
              </Link>

              <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-silo-muted">
                    {pl.category ? (
                      <span className="inline-flex items-center gap-1.5 text-silo-text-secondary">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: pl.category.color }}
                        />
                        {pl.category.name}
                      </span>
                    ) : (
                      <span>{t("app.uncategorized")}</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {t("playlists.videosCount", { count: pl.total_videos })}
                    </span>
                  </div>

                  <Link
                    to="/playlists/$playlistId"
                    params={{ playlistId: pl.id }}
                    className="block text-base font-semibold text-silo-text hover:underline truncate"
                  >
                    {pl.name}
                  </Link>

                  {pl.description && (
                    <p className="text-xs text-silo-muted line-clamp-2 leading-relaxed">
                      {pl.description}
                    </p>
                  )}
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                      <span className="text-silo-muted">
                        {t("playlists.completedDuration", {
                          completed: pl.completed_videos,
                          total: pl.total_videos,
                          duration: formatDurationHuman(
                            pl.total_duration_seconds,
                          ),
                        })}
                      </span>
                      <span className="text-silo-text">
                        {pl.progress_percentage}%
                      </span>
                    </div>
                    <ProgressBar
                      percentage={pl.progress_percentage}
                      color={pl.category?.color ?? "#F4EFE3"}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-silo-border">
                    <Link
                      to="/playlists/$playlistId"
                      params={{ playlistId: pl.id }}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-silo-text hover:underline"
                    >
                      {t("playlists.openPlaylist")}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <div className="flex items-center gap-1">
                      <SiloButton
                        type="button"
                        onClick={() => openPlaylistModal(pl.id)}
                        aria-label={t("playlists.editAria", { name: pl.name })}
                        className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </SiloButton>
                      <SiloButton
                        type="button"
                        onClick={() => handleDelete(pl)}
                        aria-label={t("playlists.deleteAria", {
                          name: pl.name,
                        })}
                        className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </SiloButton>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
