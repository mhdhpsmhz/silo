import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icon } from "@iconify/react";
import { ArrowRight, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeleteCategory, useLibraryData } from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { CategoryWithStats } from "../types/silo";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  EntityGridLoadingSkeleton,
  ErrorState,
} from "../components/ui/StateViews";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
export function CategoriesPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const deleteCategory = useDeleteCategory();
  const { openCategoryModal, openConfirmDialog } = useUiStore();

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const categories = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    return library.categories.filter((cat) => {
      if (!q) return true;
      return (
        cat.name.toLowerCase().includes(q) ||
        (cat.description?.toLowerCase().includes(q) ?? false) ||
        cat.labels.some((l) => l.name.toLowerCase().includes(q))
      );
    });
  }, [library, search]);

  const activeFilterCount = search.trim() ? 1 : 0;

  const handleDelete = (cat: CategoryWithStats) => {
    openConfirmDialog({
      title: t("categories.deleteTitle"),
      description: t("categories.deleteDesc", { name: cat.name }),
      confirmLabel: t("categories.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteCategory.mutateAsync(cat.id);
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
          onClick={() => openCategoryModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {t("categories.addCategory")}
        </SiloButton>
      </div>

      <CollapsibleToolbar
        open={toolbarOpen}
        onToggle={() => setToolbarOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={() => setSearch("")}
        label={t("toolbar.searchAndSort")}
        controlsId="categories-toolbar-panel"
      >
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
          <SiloInput
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("categories.searchPlaceholder")}
            aria-label={t("categories.searchAria")}
            className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
          />
        </div>
      </CollapsibleToolbar>

      {categories.length === 0 ? (
        <EmptyState
          title={t("categories.emptyTitle")}
          description={t("categories.emptyDescription")}
          action={
            <SiloButton
              type="button"
              onClick={() => openCategoryModal()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
            >
              {t("categories.addCategory")}
            </SiloButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <article
              key={cat.id}
              className="p-5 bg-silo-surface border border-silo-border rounded-xl flex flex-col justify-between gap-4 hover:border-silo-border-hover transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-silo-border"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Icon
                        icon={cat.icon_name}
                        className="w-5 h-5 text-silo-text"
                      />
                    </span>
                    <div className="min-w-0">
                      <Link
                        to="/categories/$categoryId"
                        params={{ categoryId: cat.id }}
                        className="block text-base font-semibold text-silo-text hover:underline truncate"
                      >
                        {cat.name}
                      </Link>
                      <p className="text-xs font-mono text-silo-muted tabular-nums">
                        {t("categories.videosAndLabels", {
                          videos: cat.total_active_videos,
                          labels: cat.labels.length,
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                {cat.description && (
                  <p className="text-xs text-silo-text-secondary line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                )}

                {cat.labels.length > 0 && (
                  <p className="text-xs text-silo-muted truncate">
                    {cat.labels.map((l) => l.name).join(" · ")}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono tabular-nums">
                    <span className="text-silo-muted">
                      {t("categories.completedOfTotal", {
                        completed: cat.completed_videos,
                        total: cat.total_active_videos,
                      })}
                    </span>
                    <span className="text-silo-text">
                      {cat.progress_percentage}%
                    </span>
                  </div>
                  <ProgressBar
                    percentage={cat.progress_percentage}
                    color={cat.color}
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-3 border-t border-silo-border">
                  <Link
                    to="/categories/$categoryId"
                    params={{ categoryId: cat.id }}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-silo-text hover:underline"
                  >
                    {t("categories.openCategory")}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center gap-1">
                    <SiloButton
                      type="button"
                      onClick={() => openCategoryModal(cat.id)}
                      aria-label={t("categories.editAria", { name: cat.name })}
                      className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </SiloButton>
                    <SiloButton
                      type="button"
                      onClick={() => handleDelete(cat)}
                      aria-label={t("categories.deleteAria", {
                        name: cat.name,
                      })}
                      className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </SiloButton>
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
