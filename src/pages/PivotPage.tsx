import { useMemo, useState } from "react";
import { ArrowLeftRight, Download, Table2, X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
} from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import type { VideoWithRelations } from "../types/silo";
import {
  buildPivotMatrix,
  exportPivotMatrixToCsv,
  formatPivotMetricValue,
  getMetricNumericValue,
  pivotCellKey,
  type PivotDimension,
  type PivotLabels,
  type PivotMetric,
} from "../utils/pivotMatrix";
import { CollapsibleToolbar } from "../components/ui/CollapsibleToolbar";
import {
  EmptyState,
  ErrorState,
  PivotLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoCard } from "../components/ui/VideoCard";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloSelect } from "../components/ui/SiloSelect";
export function PivotPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const patchVideo = usePatchVideo();
  const deleteVideo = useDeleteVideo();
  const { openVideoModal, openConfirmDialog } = useUiStore();

  const [rowDimension, setRowDimension] = useState<PivotDimension>("category");
  const [colDimension, setColDimension] = useState<PivotDimension>("status");
  const [metric, setMetric] = useState<PivotMetric>("count");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [categoryScope, setCategoryScope] = useState("");
  const [selectedCell, setSelectedCell] = useState<{
    rowKey: string;
    rowLabel: string;
    colKey: string;
    colLabel: string;
    videoIds: string[];
  } | null>(null);

  const pivotLabels = useMemo<PivotLabels>(
    () => ({
      uncategorized: t("app.uncategorized"),
      unknownChannel: t("app.unknownChannel"),
      unlabeled: t("pivot.unlabeled"),
      noPlaylist: t("pivot.noPlaylist"),
      statusNotStarted: t("status.notStarted"),
      statusInProgress: t("status.inProgress"),
      statusCompleted: t("status.completed"),
      favoriteYes: t("pivot.favoriteYes"),
      favoriteNo: t("pivot.favoriteNo"),
    }),
    [t],
  );

  const scopedVideos = useMemo(() => {
    if (!library) return [];
    return library.videos.filter((v) => {
      if (!includeArchived && v.is_archived) return false;
      if (categoryScope && v.category_id !== categoryScope) return false;
      return true;
    });
  }, [library, includeArchived, categoryScope]);

  const matrix = useMemo(
    () =>
      buildPivotMatrix(scopedVideos, {
        rowDimension,
        colDimension,
        metric,
        labels: pivotLabels,
      }),
    [scopedVideos, rowDimension, colDimension, metric, pivotLabels],
  );

  const selectedVideos = useMemo(() => {
    if (!library || !selectedCell) return [];
    return selectedCell.videoIds
      .map((id) => library.videosById.get(id))
      .filter((v): v is VideoWithRelations => Boolean(v));
  }, [library, selectedCell]);

  const activeFilterCount = (includeArchived ? 1 : 0) + (categoryScope ? 1 : 0);

  const dimensionOptions: Array<{ value: PivotDimension; label: string }> = [
    { value: "category", label: t("pivot.dimCategory") },
    { value: "channel", label: t("pivot.dimChannel") },
    { value: "label", label: t("pivot.dimLabel") },
    { value: "playlist", label: t("pivot.dimPlaylist") },
    { value: "status", label: t("pivot.dimStatus") },
    { value: "favorite", label: t("pivot.dimFavorite") },
  ];

  const metricOptions: Array<{ value: PivotMetric; label: string }> = [
    { value: "count", label: t("pivot.metricCount") },
    { value: "watchedDuration", label: t("pivot.metricWatchedDuration") },
    { value: "totalDuration", label: t("pivot.metricTotalDuration") },
    { value: "completionRate", label: t("pivot.metricCompletionRate") },
  ];

  const handleSwapAxes = () => {
    setRowDimension(colDimension);
    setColDimension(rowDimension);
    setSelectedCell(null);
  };

  const handleResetFilters = () => {
    setIncludeArchived(false);
    setCategoryScope("");
    setSelectedCell(null);
  };

  const handleExportCsv = () => {
    const rowDimLabel =
      dimensionOptions.find((d) => d.value === rowDimension)?.label ??
      rowDimension;
    const colDimLabel =
      dimensionOptions.find((d) => d.value === colDimension)?.label ??
      colDimension;
    const csv = exportPivotMatrixToCsv(
      matrix,
      metric,
      `${rowDimLabel} / ${colDimLabel}`,
      t("pivot.totalLabel"),
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `silo-pivot-${rowDimension}-x-${colDimension}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("pivot.csvExportedToast"));
  };

  const handleDeleteVideo = (v: VideoWithRelations) => {
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

  if (isLoading) return <PivotLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      {/* Unified Collapsible Configure & Filter Panel (hidden by default) */}
      <CollapsibleToolbar
        open={filtersOpen}
        onToggle={() => setFiltersOpen((prev) => !prev)}
        activeCount={activeFilterCount}
        onReset={handleResetFilters}
        label={t("pivot.configureAndFilter")}
        controlsId="pivot-configure-filter-panel"
        rightSlot={
          <>
            <span className="text-xs text-silo-muted hidden sm:inline whitespace-nowrap">
              {dimensionOptions.find((d) => d.value === rowDimension)?.label} ×{" "}
              {dimensionOptions.find((d) => d.value === colDimension)?.label} ·{" "}
              {metricOptions.find((m) => m.value === metric)?.label}
            </span>
            <SiloButton
              type="button"
              onClick={handleExportCsv}
              disabled={matrix.rows.length === 0}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors disabled:opacity-40 whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{t("pivot.exportCsv")}</span>
            </SiloButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-end">
            <div className="md:col-span-3 space-y-1.5">
              <label
                htmlFor="pivot-row-axis"
                className="block text-xs font-medium text-silo-text-secondary"
              >
                {t("pivot.rowAxis")}
              </label>
              <SiloSelect
                ariaLabel={t("pivot.rowAxis")}
                value={rowDimension}
                onChange={(value) => {
                  setRowDimension(value as PivotDimension);
                  setSelectedCell(null);
                }}
                placeholder={dimensionOptions[0]?.label ?? ""}
                options={dimensionOptions}
                className="w-full"
              />
            </div>

            <div className="md:col-span-1 flex md:justify-center">
              <SiloButton
                type="button"
                onClick={handleSwapAxes}
                aria-label={t("pivot.swapAxesAria")}
                title={t("pivot.swapAxesAria")}
                className="p-2.5 rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors"
              >
                <ArrowLeftRight className="w-4 h-4" />
              </SiloButton>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label
                htmlFor="pivot-col-axis"
                className="block text-xs font-medium text-silo-text-secondary"
              >
                {t("pivot.colAxis")}
              </label>
              <SiloSelect
                ariaLabel={t("pivot.colAxis")}
                value={colDimension}
                onChange={(value) => {
                  setColDimension(value as PivotDimension);
                  setSelectedCell(null);
                }}
                placeholder={dimensionOptions[0]?.label ?? ""}
                options={dimensionOptions}
                className="w-full"
              />
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label
                htmlFor="pivot-metric"
                className="block text-xs font-medium text-silo-text-secondary"
              >
                {t("pivot.metric")}
              </label>
              <SiloSelect
                ariaLabel={t("pivot.metric")}
                value={metric}
                onChange={(value) => setMetric(value as PivotMetric)}
                placeholder={metricOptions[0]?.label ?? ""}
                options={metricOptions}
                className="w-full"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-silo-border flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-55">
              <label
                htmlFor="pivot-cat-scope"
                className="text-xs font-medium text-silo-text-secondary shrink-0"
              >
                {t("pivot.categoryScope")}
              </label>
              <SiloSelect
                ariaLabel={t("pivot.categoryScope")}
                value={categoryScope}
                onChange={(value) => {
                  setCategoryScope(value);
                  setSelectedCell(null);
                }}
                placeholder={t("pivot.allCategoriesScope")}
                options={[
                  { value: "", label: t("pivot.allCategoriesScope") },
                  ...(library?.categories ?? []).map((cat) => ({
                    value: cat.id,
                    label: cat.name,
                  })),
                ]}
                className="min-w-44"
              />
            </div>

            <label className="inline-flex items-center gap-2.5 text-sm text-silo-text-secondary cursor-pointer select-none">
              <SiloInput
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => {
                  setIncludeArchived(e.target.checked);
                  setSelectedCell(null);
                }}
                className="w-4 h-4 rounded accent-silo-text"
              />
              <span>{t("pivot.includeArchived")}</span>
            </label>
          </div>
        </div>
      </CollapsibleToolbar>

      {/* Pivot Matrix Table */}
      {matrix.rows.length === 0 || matrix.columns.length === 0 ? (
        <EmptyState
          title={t("pivot.emptyTitle")}
          description={t("pivot.emptyDescription")}
        />
      ) : (
        <section className="bg-silo-surface border border-silo-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-silo-elevated border-b border-silo-border">
                  <th className="sticky left-0 z-10 bg-silo-elevated px-4 py-3 text-left text-xs font-semibold text-silo-text-secondary border-r border-silo-border min-w-45">
                    <span className="inline-flex items-center gap-2">
                      <Table2 className="w-3.5 h-3.5 text-silo-muted" />
                      <span>
                        {
                          dimensionOptions.find((d) => d.value === rowDimension)
                            ?.label
                        }{" "}
                        /{" "}
                        {
                          dimensionOptions.find((d) => d.value === colDimension)
                            ?.label
                        }
                      </span>
                    </span>
                  </th>
                  {matrix.columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-4 py-3 text-right text-xs font-semibold text-silo-text border-r border-silo-border whitespace-nowrap min-w-27.5"
                    >
                      <span className="inline-flex items-center justify-end gap-1.5">
                        {col.color && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: col.color }}
                          />
                        )}
                        <span>{col.label}</span>
                      </span>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-silo-text bg-silo-surface-raised whitespace-nowrap min-w-27.5">
                    {t("pivot.totalLabel")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => {
                  const rowTotal = matrix.rowTotals.get(row.key);
                  return (
                    <tr
                      key={row.key}
                      className="border-b border-silo-border last:border-b-0 hover:bg-silo-surface-hover transition-colors"
                    >
                      <th className="sticky left-0 z-10 bg-silo-surface px-4 py-3 text-left text-xs font-medium text-silo-text border-r border-silo-border">
                        <span className="inline-flex items-center gap-2">
                          {row.color && (
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: row.color }}
                            />
                          )}
                          <span className="truncate max-w-55">{row.label}</span>
                        </span>
                      </th>

                      {matrix.columns.map((col) => {
                        const stats = matrix.cells.get(
                          pivotCellKey(row.key, col.key),
                        );
                        const hasVideos = Boolean(stats && stats.count > 0);
                        const numVal = stats
                          ? getMetricNumericValue(stats, metric)
                          : 0;
                        const intensity =
                          hasVideos && matrix.maxMetricValue > 0
                            ? 0.04 + (numVal / matrix.maxMetricValue) * 0.14
                            : 0;
                        const isSelected =
                          selectedCell?.rowKey === row.key &&
                          selectedCell?.colKey === col.key;

                        return (
                          <td
                            key={col.key}
                            className="p-0 border-r border-silo-border text-right font-mono tabular-nums"
                          >
                            <SiloButton
                              type="button"
                              disabled={!hasVideos}
                              onClick={() => {
                                if (!stats || stats.count === 0) return;
                                if (isSelected) {
                                  setSelectedCell(null);
                                } else {
                                  setSelectedCell({
                                    rowKey: row.key,
                                    rowLabel: row.label,
                                    colKey: col.key,
                                    colLabel: col.label,
                                    videoIds: stats.videoIds,
                                  });
                                }
                              }}
                              style={{
                                backgroundColor: hasVideos
                                  ? `rgba(244, 239, 227, ${intensity.toFixed(3)})`
                                  : undefined,
                              }}
                              className={`w-full h-full px-4 py-3 text-right text-xs font-mono tabular-nums transition-colors ${
                                isSelected
                                  ? "ring-2 ring-inset ring-silo-text text-silo-text font-semibold"
                                  : hasVideos
                                    ? "text-silo-text hover:ring-1 hover:ring-inset hover:ring-silo-muted cursor-pointer"
                                    : "text-silo-subtle cursor-default"
                              }`}
                            >
                              {stats
                                ? formatPivotMetricValue(stats, metric)
                                : "—"}
                            </SiloButton>
                          </td>
                        );
                      })}

                      <td className="px-4 py-3 text-right text-xs font-mono tabular-nums font-semibold text-silo-text bg-silo-surface-raised">
                        {rowTotal
                          ? formatPivotMetricValue(rowTotal, metric)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-silo-elevated border-t border-silo-border">
                  <th className="sticky left-0 z-10 bg-silo-elevated px-4 py-3 text-left text-xs font-semibold text-silo-text border-r border-silo-border">
                    {t("pivot.grandTotalLabel")}
                  </th>
                  {matrix.columns.map((col) => {
                    const colTotal = matrix.columnTotals.get(col.key);
                    return (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-right text-xs font-mono tabular-nums font-semibold text-silo-text border-r border-silo-border"
                      >
                        {colTotal
                          ? formatPivotMetricValue(colTotal, metric)
                          : "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-right text-xs font-mono tabular-nums font-bold text-silo-text bg-silo-bg">
                    {formatPivotMetricValue(matrix.grandTotal, metric)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* Drill-down Panel */}
      {selectedCell ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-silo-surface border border-silo-border rounded-xl">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold text-silo-text">
                {t("pivot.drilldownTitle", {
                  row: selectedCell.rowLabel,
                  col: selectedCell.colLabel,
                })}
              </h2>
              <p className="text-xs font-mono tabular-nums text-silo-muted">
                {t("pivot.drilldownCount", { count: selectedVideos.length })}
              </p>
            </div>
            <SiloButton
              type="button"
              onClick={() => setSelectedCell(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border"
            >
              <X className="w-3.5 h-3.5" />
              {t("pivot.clearSelection")}
            </SiloButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {selectedVideos.map((v) => (
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
        </section>
      ) : null}
    </div>
  );
}
