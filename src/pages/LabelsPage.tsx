import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
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
  useCreateLabel,
  useDeleteLabel,
  useLibraryData,
  useUpdateLabel,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { Label } from "../types/silo";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import {
  EmptyState,
  EntityGridLoadingSkeleton,
  ErrorState,
} from "../components/ui/StateViews";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function LabelsPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();
  const { openCategoryModal, openConfirmDialog } = useUiStore();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "category" | "videos">("name");

  const [createOpen, setCreateOpen] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newLabelName, setNewLabelName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState("");

  const enrichedLabels = useMemo(() => {
    if (!library) return [];
    const activeCountByLabel = new Map<string, number>();
    for (const v of library.videos) {
      if (v.is_archived) continue;
      for (const l of v.labels) {
        activeCountByLabel.set(l.id, (activeCountByLabel.get(l.id) ?? 0) + 1);
      }
    }

    const q = search.trim().toLowerCase();
    return library.labels
      .map((lbl) => {
        const category = library.categoriesById.get(lbl.category_id) ?? null;
        return {
          ...lbl,
          category,
          videoCount: activeCountByLabel.get(lbl.id) ?? 0,
        };
      })
      .filter((item) => {
        if (categoryFilter && item.category_id !== categoryFilter) return false;
        if (!q) return true;
        return (
          item.name.toLowerCase().includes(q) ||
          (item.category?.name.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (sortBy === "videos") {
          if (b.videoCount !== a.videoCount) return b.videoCount - a.videoCount;
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "category") {
          const catCmp = (a.category?.name ?? "").localeCompare(
            b.category?.name ?? "",
          );
          if (catCmp !== 0) return catCmp;
          return a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });
  }, [library, search, categoryFilter, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) +
    (categoryFilter ? 1 : 0) +
    (sortBy !== "name" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setSortBy("name");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCategoryId = newCategoryId || library?.categories[0]?.id || "";
    const clean = newLabelName.trim();
    if (!targetCategoryId || !clean) return;
    await createLabel.mutateAsync({
      categoryId: targetCategoryId,
      name: clean,
    });
    setNewLabelName("");
    setCreateOpen(false);
  };

  const handleSaveEdit = async (label: Label) => {
    const clean = editingDraft.trim();
    if (!clean || clean === label.name) {
      setEditingId(null);
      return;
    }
    await updateLabel.mutateAsync({ id: label.id, name: clean });
    setEditingId(null);
  };

  const handleDelete = (
    item: Label & { category: { name: string } | null },
  ) => {
    openConfirmDialog({
      title: t("labelsPage.deleteTitle"),
      description: t("labelsPage.deleteDesc", {
        name: item.name,
        category: item.category?.name ?? t("app.uncategorized"),
      }),
      confirmLabel: t("labelsPage.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteLabel.mutateAsync(item.id);
      },
    });
  };

  if (isLoading) return <EntityGridLoadingSkeleton labels />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  const categories = library?.categories ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <SiloButton
          type="button"
          onClick={() => {
            if (categories.length === 0) {
              openCategoryModal();
              return;
            }
            if (!newCategoryId && categories[0]) {
              setNewCategoryId(categories[0].id);
            }
            setCreateOpen((prev) => !prev);
          }}
          aria-expanded={createOpen}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t("labelsPage.addLabel")}</span>
        </SiloButton>
      </div>

      {createOpen && (
        <section className="p-4 bg-silo-surface border border-silo-border rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-silo-text">
              {t("labelsPage.createPanelTitle")}
            </h2>
            <SiloButton
              type="button"
              onClick={() => setCreateOpen(false)}
              aria-label={t("app.close")}
              className="p-1 rounded-md text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
            >
              <X className="w-4 h-4" />
            </SiloButton>
          </div>
          {categories.length === 0 ? (
            <p className="text-xs text-silo-muted">
              {t("labelsPage.needCategoryFirst")}
            </p>
          ) : (
            <form
              onSubmit={handleCreateSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              <div className="sm:col-span-4">
                <SiloSelect
                  ariaLabel={t("labelsPage.selectCategory")}
                  value={newCategoryId || categories[0]?.id || ""}
                  onChange={setNewCategoryId}
                  placeholder={categories[0]?.name ?? ""}
                  options={categories.map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  }))}
                  className="w-full"
                />
              </div>
              <div className="sm:col-span-6">
                <SiloInput
                  type="text"
                  value={newLabelName}
                  onChange={(e) => setNewLabelName(e.target.value)}
                  placeholder={t("labelsPage.labelNamePlaceholder")}
                  aria-label={t("labelsPage.labelNamePlaceholder")}
                  className="w-full px-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
                />
              </div>
              <div className="sm:col-span-2">
                <SiloButton
                  type="submit"
                  disabled={createLabel.isPending || !newLabelName.trim()}
                  className="w-full px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  {t("labelsPage.createButton")}
                </SiloButton>
              </div>
            </form>
          )}
        </section>
      )}

      <CollapsibleToolbar
        open={filtersOpen}
        onToggle={() => setFiltersOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        controlsId="labels-filter-panel"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("labelsPage.searchPlaceholder")}
              aria-label={t("labelsPage.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="md:col-span-4">
            <SiloSelect
              ariaLabel={t("labelsPage.filterCategoryAria")}
              value={categoryFilter}
              onChange={setCategoryFilter}
              placeholder={t("toolbar.allCategories")}
              options={[
                { value: "", label: t("toolbar.allCategories") },
                ...categories.map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })),
              ]}
              className="w-full"
            />
          </div>

          <div className="md:col-span-3">
            <SiloSelect
              ariaLabel={t("labelsPage.sortAria")}
              value={sortBy}
              onChange={(value) =>
                setSortBy(value as "name" | "category" | "videos")
              }
              placeholder={t("toolbar.sortNameAZ")}
              options={[
                { value: "name", label: t("toolbar.sortNameAZ") },
                { value: "category", label: t("toolbar.sortCategory") },
                { value: "videos", label: t("toolbar.sortMostVideos") },
              ]}
              className="w-full"
            />
          </div>
        </div>
      </CollapsibleToolbar>

      {enrichedLabels.length === 0 ? (
        <EmptyState
          title={t("labelsPage.emptyTitle")}
          description={t("labelsPage.emptyDescription")}
          action={
            categories.length > 0 ? (
              <SiloButton
                type="button"
                onClick={() => {
                  if (!newCategoryId && categories[0])
                    setNewCategoryId(categories[0].id);
                  setCreateOpen(true);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
              >
                {t("labelsPage.addLabel")}
              </SiloButton>
            ) : (
              <SiloButton
                type="button"
                onClick={() => openCategoryModal()}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
              >
                {t("categories.addCategory")}
              </SiloButton>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {enrichedLabels.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <article
                key={item.id}
                className="p-4 bg-silo-surface border border-silo-border rounded-xl flex flex-col justify-between gap-3 hover:border-silo-border-hover transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-silo-muted">
                    {item.category ? (
                      <Link
                        to="/categories/$categoryId"
                        params={{ categoryId: item.category.id }}
                        className="inline-flex items-center gap-1.5 text-silo-text-secondary hover:underline truncate"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.category.color }}
                        />
                        <span className="truncate">{item.category.name}</span>
                      </Link>
                    ) : (
                      <span>{t("app.uncategorized")}</span>
                    )}
                    <span className="font-mono tabular-nums shrink-0">
                      {t("labelsPage.videosCount", { count: item.videoCount })}
                    </span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <SiloInput
                        type="text"
                        value={editingDraft}
                        onChange={(e) => setEditingDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleSaveEdit(item);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        aria-label={t("labelsPage.editAria", {
                          name: item.name,
                        })}
                        className="flex-1 px-2.5 py-1.5 text-sm bg-silo-bg border border-silo-text rounded-lg text-silo-text focus:outline-none"
                        autoFocus
                      />
                      <SiloButton
                        type="button"
                        onClick={() => handleSaveEdit(item)}
                        aria-label={t("labelsPage.saveEditAria", {
                          name: item.name,
                        })}
                        className="p-2 rounded-lg bg-silo-success-surface text-silo-success hover:bg-silo-success-surface-hover"
                      >
                        <Check className="w-4 h-4" />
                      </SiloButton>
                      <SiloButton
                        type="button"
                        onClick={() => setEditingId(null)}
                        aria-label={t("labelsPage.cancelEditAria", {
                          name: item.name,
                        })}
                        className="p-2 rounded-lg bg-silo-elevated text-silo-muted hover:text-silo-text"
                      >
                        <X className="w-4 h-4" />
                      </SiloButton>
                    </div>
                  ) : (
                    <Link
                      to="/labels/$labelId"
                      params={{ labelId: item.id }}
                      className="flex items-center gap-2 min-w-0 group"
                    >
                      <Tag className="w-4 h-4 text-silo-muted shrink-0" />
                      <span className="text-base font-semibold text-silo-text group-hover:underline truncate">
                        {item.name}
                      </span>
                    </Link>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-silo-border">
                  <Link
                    to="/labels/$labelId"
                    params={{ labelId: item.id }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-silo-text hover:underline"
                  >
                    <span>{t("labelsPage.viewVideos")}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <SiloButton
                      type="button"
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingDraft(item.name);
                      }}
                      aria-label={t("labelsPage.editAria", { name: item.name })}
                      className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </SiloButton>
                    <SiloButton
                      type="button"
                      onClick={() => handleDelete(item)}
                      aria-label={t("labelsPage.deleteAria", {
                        name: item.name,
                      })}
                      className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </SiloButton>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
