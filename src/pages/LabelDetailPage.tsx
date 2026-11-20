import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Edit3,
  Plus,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useDeleteLabel,
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
  useUpdateLabel,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { VideoStatus, VideoWithRelations } from "../types/silo";
import { calculateCollectionProgress } from "../utils/progress";
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
export function LabelDetailPage() {
  const { t } = useTranslation();
  const { labelId } = useParams({ strict: false }) as { labelId: string };
  const navigate = useNavigate();

  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const { openVideoModal, openConfirmDialog } = useUiStore();

  const [isEditing, setIsEditing] = useState(false);
  const [editingDraft, setEditingDraft] = useState("");

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | VideoStatus>("");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "progress">(
    "newest",
  );

  const label = useMemo(
    () => library?.labels.find((l) => l.id === labelId) ?? null,
    [library, labelId],
  );

  const category = useMemo(
    () =>
      label && library
        ? (library.categoriesById.get(label.category_id) ?? null)
        : null,
    [label, library],
  );

  const allLabelVideos = useMemo(() => {
    if (!library || !label) return [];
    return library.videos.filter(
      (v) => !v.is_archived && v.labels.some((l) => l.id === label.id),
    );
  }, [library, label]);

  const labelStats = useMemo(
    () => calculateCollectionProgress(allLabelVideos),
    [allLabelVideos],
  );

  const filteredVideos = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allLabelVideos
      .filter((v) => {
        if (
          q &&
          !v.title.toLowerCase().includes(q) &&
          !(v.channel?.name.toLowerCase().includes(q) ?? false)
        ) {
          return false;
        }
        if (statusFilter && v.status !== statusFilter) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "progress")
          return b.progress_percentage - a.progress_percentage;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [allLabelVideos, search, statusFilter, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (statusFilter ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setSortBy("newest");
  };

  const handleSaveEdit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!label) return;
    const clean = editingDraft.trim();
    if (!clean || clean === label.name) {
      setIsEditing(false);
      return;
    }
    await updateLabel.mutateAsync({ id: label.id, name: clean });
    setIsEditing(false);
  };

  const handleDeleteLabel = () => {
    if (!label) return;
    openConfirmDialog({
      title: t("labelsPage.deleteTitle"),
      description: t("labelsPage.deleteDesc", {
        name: label.name,
        category: category?.name ?? t("app.uncategorized"),
      }),
      confirmLabel: t("labelsPage.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteLabel.mutateAsync(label.id);
        navigate({ to: "/labels" });
      },
    });
  };

  const handleDeleteVideo = (v: VideoWithRelations) => {
    openConfirmDialog({
      title: t("videos.deleteDialogTitle"),
      description: t("labelDetail.deleteVideoDesc", { title: v.title }),
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
  if (!label) {
    return (
      <EmptyState
        title={t("labelDetail.notFoundTitle")}
        description={t("labelDetail.notFoundDescription")}
        action={
          <Link
            to="/labels"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text"
          >
            {t("labelDetail.backToLabels")}
          </Link>
        }
      />
    );
  }

  const accentColor = category?.color ?? "#48929B";

  return (
    <div className="space-y-6">
      <Link
        to="/labels"
        className="inline-flex items-center gap-1.5 text-sm text-silo-muted hover:text-silo-text"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("labelDetail.backToLabels")}
      </Link>

      {/* Label Header */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0 flex-1">
            <span
              className="w-12 h-12 rounded-[10px] flex items-center justify-center border border-silo-border shrink-0"
              style={{ backgroundColor: accentColor }}
            >
              <Tag className="w-5 h-5 text-silo-text" />
            </span>

            <div className="space-y-1.5 min-w-0 flex-1">
              {isEditing ? (
                <form
                  onSubmit={handleSaveEdit}
                  className="flex flex-wrap items-center gap-2"
                >
                  <SiloInput
                    type="text"
                    value={editingDraft}
                    onChange={(e) => setEditingDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setIsEditing(false);
                      }
                    }}
                    aria-label={t("labelDetail.editInputAria")}
                    autoFocus
                    className="px-3 py-1.5 text-base font-semibold bg-silo-bg border border-silo-text rounded-lg text-silo-text focus:outline-none min-w-45"
                  />
                  <SiloButton
                    type="submit"
                    disabled={updateLabel.isPending || !editingDraft.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-success-surface border border-silo-success text-silo-text hover:bg-silo-success-surface-hover disabled:opacity-50 whitespace-nowrap"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {t("labelDetail.saveEdit")}
                  </SiloButton>
                  <SiloButton
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-muted hover:text-silo-text whitespace-nowrap"
                  >
                    <X className="w-3.5 h-3.5" />
                    {t("labelDetail.cancelEdit")}
                  </SiloButton>
                </form>
              ) : (
                <h2 className="text-2xl font-bold text-silo-text tracking-tight wrap-break-word">
                  {label.name}
                </h2>
              )}

              <p className="text-xs text-silo-text-secondary">
                {t("labelDetail.parentCategory")}{" "}
                {category ? (
                  <Link
                    to="/categories/$categoryId"
                    params={{ categoryId: category.id }}
                    className="inline-flex items-center gap-1.5 underline hover:text-silo-text"
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </Link>
                ) : (
                  t("app.uncategorized")
                )}
              </p>

              <p className="text-xs font-mono tabular-nums text-silo-muted">
                {t("labelDetail.statsLine", {
                  videos: labelStats.totalActiveCount,
                  completed: labelStats.completedCount,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SiloButton
              type="button"
              onClick={() =>
                openVideoModal({
                  defaultCategoryId: category?.id,
                  defaultLabelId: label.id,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("app.addVideo")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => {
                setEditingDraft(label.name);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {t("labelDetail.editLabel")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={handleDeleteLabel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("labelDetail.deleteLabel")}
            </SiloButton>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-silo-border">
          <div className="flex justify-between text-xs font-mono tabular-nums">
            <span className="text-silo-muted">
              {t("labelDetail.labelProgress")}
            </span>
            <span className="text-silo-text">{labelStats.percentage}%</span>
          </div>
          <ProgressBar
            percentage={labelStats.percentage}
            color={accentColor}
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
        controlsId="label-videos-toolbar-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-55 max-w-sm">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("labelDetail.searchPlaceholder")}
              aria-label={t("labelDetail.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SiloSelect
              ariaLabel={t("labelDetail.filterByStatusAria")}
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
              ariaLabel={t("labelDetail.sortAria")}
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

      {filteredVideos.length === 0 ? (
        <EmptyState
          title={t("labelDetail.emptyTitle")}
          description={t("labelDetail.emptyDescription")}
          action={
            <SiloButton
              type="button"
              onClick={() =>
                openVideoModal({
                  defaultCategoryId: category?.id,
                  defaultLabelId: label.id,
                })
              }
              className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
            >
              {t("app.addVideo")}
            </SiloButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVideos.map((v) => (
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
