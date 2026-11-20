import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArchiveRestore, Play, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
} from "../hooks/useLibrary";
import { translateVideoStatus } from "../i18n";
import { useUiStore } from "../store/uiStore";
import type { VideoWithRelations } from "../types/silo";
import { getYouTubeThumbnailFallbackUrl } from "../utils/youtube";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  ErrorState,
  VideoGridLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoThumbnail } from "../components/ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function ArchivePage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const { openConfirmDialog } = useUiStore();

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "title">("newest");

  const archived = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    return library.videos
      .filter((v) => v.is_archived)
      .filter((v) => {
        if (!q) return true;
        return (
          v.title.toLowerCase().includes(q) ||
          (v.channel?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) =>
        sortBy === "title"
          ? a.title.localeCompare(b.title)
          : b.created_at.localeCompare(a.created_at),
      );
  }, [library, search, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setSortBy("newest");
  };

  const handleRestore = (v: VideoWithRelations) => {
    patchVideo.mutate({ id: v.id, patch: { is_archived: false } });
  };

  const handleDeletePermanently = (v: VideoWithRelations) => {
    openConfirmDialog({
      title: t("archive.deleteTitle"),
      description: t("archive.deleteDesc", { title: v.title }),
      confirmLabel: t("archive.deleteTitle"),
      destructive: true,
      onConfirm: async () => {
        await deleteVideo.mutateAsync(v.id);
      },
    });
  };

  if (isLoading) return <VideoGridLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      <CollapsibleToolbar
        open={toolbarOpen}
        onToggle={() => setToolbarOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        label={t("toolbar.searchAndSort")}
        controlsId="archive-toolbar-panel"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("archive.searchPlaceholder")}
              aria-label={t("archive.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="archive-sort" className="text-xs text-silo-muted">
              {t("toolbar.sortLabel")}
            </label>
            <SiloSelect
              ariaLabel={t("archive.sortAria")}
              value={sortBy}
              onChange={(value) => setSortBy(value as "newest" | "title")}
              placeholder={t("toolbar.sortDateAdded")}
              options={[
                { value: "newest", label: t("toolbar.sortDateAdded") },
                { value: "title", label: t("toolbar.sortTitle") },
              ]}
              className="w-40"
            />
          </div>
        </div>
      </CollapsibleToolbar>

      {archived.length === 0 ? (
        <EmptyState
          title={t("archive.emptyTitle")}
          description={t("archive.emptyDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {archived.map((v) => (
            <article
              key={v.id}
              className="flex flex-col bg-silo-surface border border-silo-border rounded-xl overflow-hidden p-4 gap-3"
            >
              <Link
                to="/videos/$videoId"
                params={{ videoId: v.id }}
                className="block"
              >
                <VideoThumbnail
                  src={v.thumbnail_url}
                  fallbackSrc={getYouTubeThumbnailFallbackUrl(
                    v.youtube_video_id,
                  )}
                  alt={v.title}
                />
              </Link>

              <div className="space-y-1 flex-1">
                <p className="text-xs text-silo-muted truncate">
                  {[v.category?.name, v.channel?.name]
                    .filter(Boolean)
                    .join(" · ") || t("app.uncategorized")}
                </p>
                <Link
                  to="/videos/$videoId"
                  params={{ videoId: v.id }}
                  className="block text-sm font-semibold text-silo-text hover:underline line-clamp-2"
                >
                  {v.title}
                </Link>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono tabular-nums text-silo-muted">
                  <span>{translateVideoStatus(v.status, t)}</span>
                  <span>{v.progress_percentage}%</span>
                </div>
                <ProgressBar percentage={v.progress_percentage} />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-silo-border">
                <SiloButton
                  type="button"
                  onClick={() => handleRestore(v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors whitespace-nowrap shrink-0"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  {t("archive.restoreVideo")}
                </SiloButton>

                <div className="flex items-center gap-1">
                  <Link
                    to="/videos/$videoId"
                    params={{ videoId: v.id }}
                    aria-label={t("archive.openDetailAria", { title: v.title })}
                    className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Link>
                  <SiloButton
                    type="button"
                    onClick={() => handleDeletePermanently(v)}
                    aria-label={t("archive.deletePermanentAria", {
                      title: v.title,
                    })}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-silo-danger-surface text-silo-danger-text hover:bg-silo-danger-surface-hover transition-colors whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("app.delete")}
                  </SiloButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
