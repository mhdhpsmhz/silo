import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useCreateLabel,
  useDeleteCategory,
  useDeleteLabel,
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
  useUpdateLabel,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { Label, VideoWithRelations } from "../types/silo";
import { getVisibleScopedLabels } from "../utils/labelsView";
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
export function CategoryDetailPage() {
  const { t } = useTranslation();
  const { categoryId } = useParams({ strict: false }) as { categoryId: string };
  const navigate = useNavigate();

  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const deleteCategory = useDeleteCategory();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const { openCategoryModal, openVideoModal, openConfirmDialog } = useUiStore();

  const [newLabelName, setNewLabelName] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelDraft, setEditingLabelDraft] = useState("");
  const [labelsExpanded, setLabelsExpanded] = useState(false);

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [labelFilterId, setLabelFilterId] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "title" | "progress">(
    "newest",
  );

  const category = library?.categoriesById.get(categoryId) ?? null;

  const scopedLabelsState = useMemo(() => {
    if (!category)
      return { visibleLabels: [], hiddenCount: 0, canToggle: false };
    return getVisibleScopedLabels(category.labels, {
      expanded: labelsExpanded,
      selectedLabelId: labelFilterId,
      editingLabelId,
    });
  }, [category, labelsExpanded, labelFilterId, editingLabelId]);

  const categoryVideos = useMemo(() => {
    if (!library || !category) return [];
    const q = search.trim().toLowerCase();
    return library.videos
      .filter((v) => v.category_id === category.id && !v.is_archived)
      .filter((v) => {
        if (q && !v.title.toLowerCase().includes(q)) return false;
        if (labelFilterId && !v.labels.some((l) => l.id === labelFilterId))
          return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "title") return a.title.localeCompare(b.title);
        if (sortBy === "progress")
          return b.progress_percentage - a.progress_percentage;
        return b.created_at.localeCompare(a.created_at);
      });
  }, [library, category, search, labelFilterId, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (labelFilterId ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setLabelFilterId("");
    setSortBy("newest");
  };

  const handleAddLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !newLabelName.trim()) return;
    await createLabel.mutateAsync({
      categoryId: category.id,
      name: newLabelName.trim(),
    });
    setNewLabelName("");
  };

  const handleSaveLabelEdit = async (label: Label) => {
    const clean = editingLabelDraft.trim();
    if (!clean || clean === label.name) {
      setEditingLabelId(null);
      return;
    }
    await updateLabel.mutateAsync({ id: label.id, name: clean });
    setEditingLabelId(null);
  };

  const handleDeleteLabel = (label: Label) => {
    openConfirmDialog({
      title: t("categoryDetail.deleteLabelTitle"),
      description: t("categoryDetail.deleteLabelDesc", { name: label.name }),
      confirmLabel: t("categoryDetail.deleteLabelConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteLabel.mutateAsync(label.id);
        if (labelFilterId === label.id) setLabelFilterId("");
      },
    });
  };

  const handleDeleteCategory = () => {
    if (!category) return;
    openConfirmDialog({
      title: t("categories.deleteTitle"),
      description: t("categoryDetail.deleteCategoryDesc", {
        name: category.name,
      }),
      confirmLabel: t("categories.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteCategory.mutateAsync(category.id);
        navigate({ to: "/categories" });
      },
    });
  };

  const handleDeleteVideo = (v: VideoWithRelations) => {
    openConfirmDialog({
      title: t("videos.deleteDialogTitle"),
      description: t("categoryDetail.deleteVideoDesc", { title: v.title }),
      confirmLabel: t("videos.deleteDialogConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteVideo.mutateAsync(v.id);
      },
    });
  };

  if (isLoading) return <CollectionDetailLoadingSkeleton labels />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!category) {
    return (
      <EmptyState
        title={t("categoryDetail.notFoundTitle")}
        description={t("categoryDetail.notFoundDescription")}
        action={
          <Link
            to="/categories"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text"
          >
            {t("categoryDetail.backToCategories")}
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/categories"
        className="inline-flex items-center gap-1.5 text-sm text-silo-muted hover:text-silo-text"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("categoryDetail.backToCategories")}
      </Link>

      {/* Category Header */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span
              className="w-12 h-12 rounded-[10px] flex items-center justify-center border border-silo-border shrink-0"
              style={{ backgroundColor: category.color }}
            >
              <Icon
                icon={category.icon_name}
                className="w-6 h-6 text-silo-text"
              />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-2xl font-bold text-silo-text tracking-tight">
                  {category.name}
                </h2>
                <span className="text-xs font-mono text-silo-muted">
                  {category.color}
                </span>
              </div>
              {category.description && (
                <p className="text-sm text-silo-muted leading-relaxed">
                  {category.description}
                </p>
              )}
              <p className="text-xs font-mono tabular-nums text-silo-text-secondary">
                {t("categoryDetail.statsLine", {
                  videos: category.total_active_videos,
                  labels: category.labels.length,
                  completed: category.completed_videos,
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <SiloButton
              type="button"
              onClick={() => openVideoModal({ defaultCategoryId: category.id })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("app.addVideo")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => openCategoryModal(category.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              {t("categoryDetail.editCategory")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={handleDeleteCategory}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("categoryDetail.deleteCategory")}
            </SiloButton>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-silo-border">
          <div className="flex justify-between text-xs font-mono tabular-nums">
            <span className="text-silo-muted">
              {t("categoryDetail.categoryProgress")}
            </span>
            <span className="text-silo-text">
              {category.progress_percentage}%
            </span>
          </div>
          <ProgressBar
            percentage={category.progress_percentage}
            color={category.color}
            heightClass="h-2"
          />
        </div>
      </section>

      {/* Scoped Labels Management */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-silo-text">
              {t("categoryDetail.scopedLabelsTitle")}
            </h3>
          </div>

          <form onSubmit={handleAddLabel} className="flex items-center gap-2">
            <SiloInput
              type="text"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              placeholder={t("categoryDetail.newLabelPlaceholder")}
              aria-label={t("categoryDetail.newLabelAria")}
              className="flex-1 sm:flex-none px-3 py-1.5 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
            <SiloButton
              type="submit"
              disabled={createLabel.isPending || !newLabelName.trim()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              {t("categoryDetail.addLabel")}
            </SiloButton>
          </form>
        </div>

        {category.labels.length === 0 ? (
          <p className="text-xs text-silo-muted">
            {t("categoryDetail.noLabelsYet")}
          </p>
        ) : (
          <div className="space-y-3">
            <div id="scoped-labels-list" className="flex flex-wrap gap-2">
              {scopedLabelsState.visibleLabels.map((lbl) => {
                const isSelected = labelFilterId === lbl.id;
                if (editingLabelId === lbl.id) {
                  return (
                    <div
                      key={lbl.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-silo-bg border border-silo-text rounded-lg"
                    >
                      <SiloInput
                        type="text"
                        value={editingLabelDraft}
                        onChange={(e) => setEditingLabelDraft(e.target.value)}
                        aria-label={t("categoryDetail.editLabelAria", {
                          name: lbl.name,
                        })}
                        className="w-28 bg-transparent text-xs text-silo-text focus:outline-none"
                      />
                      <SiloButton
                        type="button"
                        onClick={() => handleSaveLabelEdit(lbl)}
                        aria-label={t("categoryDetail.saveLabelAria")}
                        className="text-silo-success p-0.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </SiloButton>
                      <SiloButton
                        type="button"
                        onClick={() => setEditingLabelId(null)}
                        aria-label={t("categoryDetail.cancelLabelAria")}
                        className="text-silo-muted p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </SiloButton>
                    </div>
                  );
                }

                return (
                  <div
                    key={lbl.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs ${
                      isSelected
                        ? "bg-silo-text text-silo-bg border-silo-text"
                        : "bg-silo-bg text-silo-text border-silo-border"
                    }`}
                  >
                    <SiloButton
                      type="button"
                      onClick={() => setLabelFilterId(isSelected ? "" : lbl.id)}
                      className="font-medium"
                    >
                      {lbl.name}
                    </SiloButton>
                    <SiloButton
                      type="button"
                      onClick={() => {
                        setEditingLabelId(lbl.id);
                        setEditingLabelDraft(lbl.name);
                      }}
                      aria-label={t("categoryDetail.editLabelAria", {
                        name: lbl.name,
                      })}
                      className={`p-0.5 ${isSelected ? "text-silo-bg" : "text-silo-muted hover:text-silo-text"}`}
                    >
                      <Edit3 className="w-3 h-3" />
                    </SiloButton>
                    <SiloButton
                      type="button"
                      onClick={() => handleDeleteLabel(lbl)}
                      aria-label={t("categoryDetail.deleteLabelAria", {
                        name: lbl.name,
                      })}
                      className={`p-0.5 ${isSelected ? "text-silo-bg" : "text-silo-muted hover:text-silo-danger-text"}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </SiloButton>
                  </div>
                );
              })}
            </div>

            {scopedLabelsState.canToggle && (
              <div>
                <SiloButton
                  type="button"
                  onClick={() => setLabelsExpanded((prev) => !prev)}
                  aria-expanded={labelsExpanded}
                  aria-controls="scoped-labels-list"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-bg border border-silo-border text-silo-text-secondary hover:text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap"
                >
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      labelsExpanded ? "rotate-180" : ""
                    }`}
                  />
                  <span>
                    {labelsExpanded
                      ? t("categoryDetail.showFewerLabels")
                      : t("categoryDetail.showAllLabels", {
                          count: category.labels.length,
                        })}
                  </span>
                </SiloButton>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Collapsible Video Filters & Grid */}
      <CollapsibleToolbar
        open={toolbarOpen}
        onToggle={() => setToolbarOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        controlsId="category-videos-toolbar-panel"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-55 max-w-sm">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("categoryDetail.searchPlaceholder")}
              aria-label={t("categoryDetail.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <SiloSelect
              ariaLabel={t("categoryDetail.filterByLabelAria")}
              value={labelFilterId}
              onChange={setLabelFilterId}
              placeholder={t("toolbar.allLabels")}
              options={[
                { value: "", label: t("toolbar.allLabels") },
                ...category.labels.map((lbl) => ({
                  value: lbl.id,
                  label: lbl.name,
                })),
              ]}
              className="w-44"
            />

            <SiloSelect
              ariaLabel={t("categoryDetail.sortAria")}
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

      {categoryVideos.length === 0 ? (
        <EmptyState
          title={t("categoryDetail.emptyVideosTitle")}
          description={t("categoryDetail.emptyVideosDesc")}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categoryVideos.map((v) => (
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
