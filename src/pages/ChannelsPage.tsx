import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Edit3, Plus, Search, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDeleteChannel, useLibraryData } from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { ChannelWithStats } from "../types/silo";
import { ChannelAvatar } from "../components/ui/ChannelAvatar";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  EntityGridLoadingSkeleton,
  ErrorState,
} from "../components/ui/StateViews";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function ChannelsPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const deleteChannel = useDeleteChannel();
  const { openChannelModal, openConfirmDialog } = useUiStore();

  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "videos">("name");

  const channels = useMemo(() => {
    if (!library) return [];
    const q = search.trim().toLowerCase();
    return library.channels
      .filter((ch) => {
        if (!q) return true;
        return (
          ch.name.toLowerCase().includes(q) ||
          (ch.default_category?.name.toLowerCase().includes(q) ?? false) ||
          (ch.notes?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => {
        if (sortBy === "videos")
          return b.total_active_videos - a.total_active_videos;
        return a.name.localeCompare(b.name);
      });
  }, [library, search, sortBy]);

  const activeFilterCount =
    (search.trim() ? 1 : 0) + (sortBy !== "name" ? 1 : 0);

  const handleResetFilters = () => {
    setSearch("");
    setSortBy("name");
  };

  const handleDelete = (ch: ChannelWithStats) => {
    openConfirmDialog({
      title: t("channels.deleteTitle"),
      description: t("channels.deleteDesc", { name: ch.name }),
      confirmLabel: t("channels.deleteConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteChannel.mutateAsync(ch.id);
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
          onClick={() => openChannelModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          {t("channels.addChannel")}
        </SiloButton>
      </div>

      <CollapsibleToolbar
        open={toolbarOpen}
        onToggle={() => setToolbarOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        label={t("toolbar.searchAndSort")}
        controlsId="channels-toolbar-panel"
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("channels.searchPlaceholder")}
              aria-label={t("channels.searchAria")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="channels-sort" className="text-xs text-silo-muted">
              {t("toolbar.sortLabel")}
            </label>
            <SiloSelect
              ariaLabel={t("toolbar.sortLabel")}
              value={sortBy}
              onChange={(value) => setSortBy(value as "name" | "videos")}
              placeholder={t("toolbar.sortChannelNameAZ")}
              options={[
                { value: "name", label: t("toolbar.sortChannelNameAZ") },
                { value: "videos", label: t("toolbar.sortVideoCount") },
              ]}
              className="w-44"
            />
          </div>
        </div>
      </CollapsibleToolbar>

      {channels.length === 0 ? (
        <EmptyState
          title={t("channels.emptyTitle")}
          description={t("channels.emptyDescription")}
          action={
            <SiloButton
              type="button"
              onClick={() => openChannelModal()}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
            >
              {t("channels.addChannel")}
            </SiloButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {channels.map((ch) => (
            <article
              key={ch.id}
              className="p-5 bg-silo-surface border border-silo-border rounded-xl flex flex-col justify-between gap-4 hover:border-silo-border-hover transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <ChannelAvatar
                  name={ch.name}
                  avatarUrl={ch.avatar_url}
                  accentColor={ch.default_category?.color}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to="/channels/$channelId"
                    params={{ channelId: ch.id }}
                    className="block text-base font-semibold text-silo-text hover:underline truncate"
                  >
                    {ch.name}
                  </Link>
                  <p className="text-xs text-silo-muted mt-0.5 truncate">
                    {ch.default_category
                      ? t("channels.defaultCategory", {
                          name: ch.default_category.name,
                        })
                      : t("channels.noDefaultCategory")}
                  </p>
                </div>
              </div>

              {ch.notes && (
                <p className="text-xs text-silo-text-secondary line-clamp-2 leading-relaxed">
                  {ch.notes}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-silo-muted">
                    {t("channels.completedOfTotal", {
                      completed: ch.completed_videos,
                      total: ch.total_active_videos,
                    })}
                  </span>
                  <span className="text-silo-text">
                    {ch.progress_percentage}%
                  </span>
                </div>
                <ProgressBar
                  percentage={ch.progress_percentage}
                  color={ch.default_category?.color ?? "#48929B"}
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-silo-border">
                <Link
                  to="/channels/$channelId"
                  params={{ channelId: ch.id }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-silo-text hover:underline"
                >
                  {t("channels.openChannel")}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1">
                  <SiloButton
                    type="button"
                    onClick={() => openChannelModal(ch.id)}
                    aria-label={t("channels.editAria", { name: ch.name })}
                    className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </SiloButton>
                  <SiloButton
                    type="button"
                    onClick={() => handleDelete(ch)}
                    aria-label={t("channels.deleteAria", { name: ch.name })}
                    className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
