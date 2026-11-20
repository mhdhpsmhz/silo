import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { VideoWithRelations } from "../types/silo";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import {
  EmptyState,
  ErrorState,
  VideoGridLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoCard } from "../components/ui/VideoCard";

import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function FavoritesPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const { openVideoModal, openConfirmDialog } = useUiStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "progress">(
    "newest",
  );

  const favorites = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    return library.videos
      .filter((v) => v.is_favorite && !v.is_archived)
      .filter((v) => {
        if (!q) return true;
        return (
          v.title.toLowerCase().includes(q) ||
          (v.channel?.name.toLowerCase().includes(q) ?? false) ||
          (v.category?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "progress")
          return b.progress_percentage - a.progress_percentage;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [library, search, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (sortBy !== "newest" ? 1 : 0);

  const handleToggleFavorite = (v: VideoWithRelations) => {
    patchVideo.mutate({ id: v.id, patch: { is_favorite: false } });
  };

  const handleDelete = (v: VideoWithRelations) => {
    openConfirmDialog({
      title: t("videos.deleteDialogTitle"),
      description: t("favorites.deleteConfirmDesc", { title: v.title }),
      confirmLabel: t("videos.deleteDialogConfirm"),
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-silo-muted font-mono tabular-nums">
          {t("favorites.countSubtitle", { count: favorites.length })}
        </p>
      </div>

      <CollapsibleToolbar
        open={filtersOpen}
        onToggle={() => setFiltersOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={() => {
          setSearch("");
          setSortBy("newest");
        }}
        label={t("toolbar.searchAndSort")}
        controlsId="favorites-filter-panel"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("favorites.searchPlaceholder")}
              aria-label={t("favorites.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <SiloSelect
            ariaLabel={t("favorites.sortAria")}
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
      </CollapsibleToolbar>

      {favorites.length === 0 ? (
        <EmptyState
          title={t("favorites.emptyTitle")}
          description={t("favorites.emptyDescription")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favorites.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onEdit={(video) => openVideoModal({ editVideoId: video.id })}
              onDelete={handleDelete}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
