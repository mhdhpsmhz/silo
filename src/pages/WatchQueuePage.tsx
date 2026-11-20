import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  GripVertical,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  useAddToWatchQueue,
  useClearWatchQueue,
  useLibraryData,
  useRemoveFromWatchQueue,
  useReorderWatchQueue,
} from "../hooks/useLibrary";
import { translateVideoStatus } from "../i18n";
import { useUiStore } from "../store/uiStore";
import type { WatchQueueEntry } from "../types/silo";
import { formatDurationHuman, formatSecondsToClock } from "../utils/progress";
import { getYouTubeThumbnailFallbackUrl } from "../utils/youtube";
import { ModalShell } from "../components/ui/ModalShell";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  ErrorState,
  QueueLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoThumbnail } from "../components/ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
interface SortableQueueRowProps {
  entry: WatchQueueEntry;
  index: number;
  total: number;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (videoId: string) => void;
}

function SortableQueueRow({
  entry,
  index,
  total,
  onMove,
  onRemove,
}: SortableQueueRowProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3.5 bg-silo-surface border rounded-xl ${
        isDragging
          ? "border-silo-text"
          : "border-silo-border hover:border-silo-border-hover"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SiloButton
          type="button"
          {...attributes}
          {...listeners}
          aria-label={t("queue.dragAria", { title: entry.title })}
          className="p-1.5 rounded-md text-silo-muted hover:text-silo-text hover:bg-silo-elevated cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </SiloButton>

        <span className="w-7 text-center font-mono text-xs tabular-nums text-silo-muted shrink-0">
          {String(index + 1).padStart(2, "0")}
        </span>

        <Link
          to="/videos/$videoId"
          params={{ videoId: entry.id }}
          search={{ queue: "1" }}
          className="w-28 shrink-0 block"
        >
          <VideoThumbnail
            src={entry.thumbnail_url}
            fallbackSrc={getYouTubeThumbnailFallbackUrl(entry.youtube_video_id)}
            alt={entry.title}
            compact
          />
        </Link>

        <div className="min-w-0 flex-1 space-y-1">
          <Link
            to="/videos/$videoId"
            params={{ videoId: entry.id }}
            search={{ queue: "1" }}
            className="block text-sm font-semibold text-silo-text hover:underline line-clamp-1"
          >
            {entry.title}
          </Link>
          <p className="text-xs text-silo-muted truncate">
            {[
              entry.category?.name ?? t("app.uncategorized"),
              entry.channel?.name ?? t("app.unknownChannel"),
              entry.duration_seconds > 0
                ? formatSecondsToClock(entry.duration_seconds)
                : t("app.durationUnset"),
              translateVideoStatus(entry.status, t),
            ].join(" · ")}
          </p>
          <div className="flex items-center gap-2 max-w-xs">
            <ProgressBar
              percentage={entry.progress_percentage}
              color={entry.category?.color ?? "#48929B"}
              heightClass="h-1"
            />
            <span className="text-[11px] font-mono tabular-nums text-silo-muted">
              {entry.progress_percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 shrink-0">
        {entry.is_completed && (
          <CheckCircle2
            className="w-4 h-4 text-silo-success mr-1"
            aria-label={t("status.completed")}
          />
        )}

        <SiloButton
          type="button"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          aria-label={t("queue.moveUpAria", { title: entry.title })}
          className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated disabled:opacity-30"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </SiloButton>

        <SiloButton
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          aria-label={t("queue.moveDownAria", { title: entry.title })}
          className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated disabled:opacity-30"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </SiloButton>

        <Link
          to="/videos/$videoId"
          params={{ videoId: entry.id }}
          search={{ queue: "1" }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap"
        >
          <Play className="w-3.5 h-3.5" />
          {t("queue.openVideo")}
        </Link>

        <SiloButton
          type="button"
          onClick={() => onRemove(entry.id)}
          aria-label={t("queue.removeAria", { title: entry.title })}
          className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated"
        >
          <X className="w-4 h-4" />
        </SiloButton>
      </div>
    </div>
  );
}

export function WatchQueuePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const addToQueue = useAddToWatchQueue();
  const removeFromQueue = useRemoveFromWatchQueue();
  const reorderQueue = useReorderWatchQueue();
  const clearQueue = useClearWatchQueue();
  const { openConfirmDialog } = useUiStore();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const watchQueue = library?.watchQueue ?? [];

  const queueStats = useMemo(() => {
    let completed = 0;
    let remainingSeconds = 0;
    for (const item of watchQueue) {
      if (item.is_completed) {
        completed += 1;
      } else if (item.duration_seconds > 0) {
        remainingSeconds += Math.max(
          0,
          item.duration_seconds - item.last_watched_seconds,
        );
      }
    }
    return {
      total: watchQueue.length,
      completed,
      remainingText:
        remainingSeconds > 0 ? formatDurationHuman(remainingSeconds) : "0m",
    };
  }, [watchQueue]);

  const availableVideos = useMemo(() => {
    if (!library) return [];
    const q = pickerSearch.trim().toLowerCase();
    return library.videos
      .filter((v) => !v.is_archived && !library.queuedVideoIds.has(v.id))
      .filter((v) =>
        !q
          ? true
          : v.title.toLowerCase().includes(q) ||
            (v.channel?.name.toLowerCase().includes(q) ?? false),
      );
  }, [library, pickerSearch]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = watchQueue.findIndex((v) => v.id === active.id);
    const newIndex = watchQueue.findIndex((v) => v.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(watchQueue, oldIndex, newIndex);
    reorderQueue.mutate(reordered.map((v) => v.id));
  };

  const handleMove = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= watchQueue.length) return;
    const reordered = arrayMove(watchQueue, index, target);
    reorderQueue.mutate(reordered.map((v) => v.id));
  };

  const handleStartQueue = () => {
    if (watchQueue.length === 0) return;
    const nextUnwatched =
      watchQueue.find((v) => !v.is_completed) ?? watchQueue[0];
    navigate({
      to: "/videos/$videoId",
      params: { videoId: nextUnwatched.id },
      search: { queue: "1" },
    });
  };

  const handleClearAll = () => {
    if (watchQueue.length === 0) return;
    openConfirmDialog({
      title: t("queue.clearAllConfirmTitle"),
      description: t("queue.clearAllConfirmDesc", { count: watchQueue.length }),
      confirmLabel: t("queue.clearAllConfirmLabel"),
      destructive: true,
      onConfirm: async () => {
        await clearQueue.mutateAsync({ scope: "all" });
      },
    });
  };

  if (isLoading) return <QueueLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      {/* Header Summary & Actions */}
      <section className="p-4 bg-silo-surface border border-silo-border rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono tabular-nums text-silo-text-secondary">
            {t("queue.summaryLine", {
              count: queueStats.total,
              completed: queueStats.completed,
              remaining: queueStats.remainingText,
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {watchQueue.length > 0 && (
            <SiloButton
              type="button"
              onClick={handleStartQueue}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              {queueStats.completed > 0
                ? t("queue.continueQueue")
                : t("queue.startQueue")}
            </SiloButton>
          )}

          <SiloButton
            type="button"
            onClick={() => {
              setPickerSearch("");
              setPickerOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("queue.addVideos")}
          </SiloButton>

          {queueStats.completed > 0 && (
            <SiloButton
              type="button"
              onClick={() =>
                clearQueue.mutate({
                  scope: "completed",
                  completedVideoIds: watchQueue
                    .filter((v) => v.is_completed)
                    .map((v) => v.id),
                })
              }
              disabled={clearQueue.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text-secondary hover:text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("queue.clearCompleted")}
            </SiloButton>
          )}

          {watchQueue.length > 0 && (
            <SiloButton
              type="button"
              onClick={handleClearAll}
              disabled={clearQueue.isPending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("queue.clearAll")}
            </SiloButton>
          )}
        </div>
      </section>

      {watchQueue.length === 0 ? (
        <EmptyState
          title={t("queue.emptyTitle")}
          description={t("queue.emptyDescription")}
          action={
            <SiloButton
              type="button"
              onClick={() => {
                setPickerSearch("");
                setPickerOpen(true);
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg"
            >
              {t("queue.addVideos")}
            </SiloButton>
          }
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={watchQueue.map((v) => v.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {watchQueue.map((entry, idx) => (
                <SortableQueueRow
                  key={entry.id}
                  entry={entry}
                  index={idx}
                  total={watchQueue.length}
                  onMove={handleMove}
                  onRemove={(videoId) => removeFromQueue.mutate(videoId)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Videos to Watch Queue Modal */}
      <ModalShell
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("queue.modalTitle")}
        maxWidthClass="max-w-xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="search"
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder={t("queue.modalSearchPlaceholder")}
              aria-label={t("queue.modalSearchPlaceholder")}
              className="w-full pl-9 pr-3 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
              autoFocus
            />
          </div>

          {availableVideos.length === 0 ? (
            <p className="py-8 text-center text-sm text-silo-muted">
              {t("queue.modalNoAvailable")}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {availableVideos.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 p-2.5 bg-silo-bg border border-silo-border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-16 shrink-0">
                      <VideoThumbnail
                        src={v.thumbnail_url}
                        fallbackSrc={getYouTubeThumbnailFallbackUrl(
                          v.youtube_video_id,
                        )}
                        alt={v.title}
                        compact
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-silo-text truncate">
                        {v.title}
                      </p>
                      <p className="text-xs text-silo-muted truncate">
                        {[v.category?.name, v.channel?.name]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <SiloButton
                    type="button"
                    disabled={addToQueue.isPending}
                    onClick={() => addToQueue.mutate(v.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("queue.modalAddBtn")}
                  </SiloButton>
                </div>
              ))}
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
}
