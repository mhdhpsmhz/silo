import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import { format, parseISO } from "date-fns";
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit3,
  ExternalLink,
  Heart,
  ListCheck,
  ListPlus,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useAddToWatchQueue,
  useDeleteVideo,
  useLibraryData,
  usePatchVideo,
  useRemoveFromWatchQueue,
} from "../hooks/useLibrary";
import { getDateFnsLocale, translateVideoStatus } from "../i18n";
import { useUiStore } from "../store/uiStore";
import {
  formatSecondsToClock,
  parseTimeInputToSeconds,
  shouldMarkCompleted,
} from "../utils/progress";
import {
  buildYouTubeWatchUrlWithTimestamp,
  getYouTubeThumbnailFallbackUrl,
} from "../utils/youtube";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  ErrorState,
  VideoDetailLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoThumbnail } from "../components/ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloTextarea } from "@/components/ui/SiloTextarea";
export function VideoDetailPage() {
  const { t, i18n } = useTranslation();
  const { videoId } = useParams({ strict: false }) as { videoId: string };
  const search = useSearch({ strict: false }) as {
    playlistId?: string;
    queue?: string;
  };
  const navigate = useNavigate();

  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const patchVideo = usePatchVideo({ silent: true });
  const deleteVideo = useDeleteVideo();
  const addToQueue = useAddToWatchQueue();
  const removeFromQueue = useRemoveFromWatchQueue();
  const { openVideoModal, openConfirmDialog } = useUiStore();

  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const video = library?.videosById.get(videoId) ?? null;
  const isQueued = video
    ? (library?.queuedVideoIds.has(video.id) ?? false)
    : false;

  const activePlaylist = useMemo(() => {
    if (!library || !video) return null;
    if (search.playlistId) {
      return library.playlistsById.get(search.playlistId) ?? null;
    }
    return null;
  }, [library, video, search.playlistId]);

  const playlistNeighbors = useMemo(() => {
    if (!activePlaylist || !video)
      return { prev: null, next: null, index: -1, total: 0 };
    const idx = activePlaylist.videos.findIndex((v) => v.id === video.id);
    if (idx === -1)
      return {
        prev: null,
        next: null,
        index: -1,
        total: activePlaylist.videos.length,
      };
    return {
      prev: idx > 0 ? activePlaylist.videos[idx - 1] : null,
      next:
        idx < activePlaylist.videos.length - 1
          ? activePlaylist.videos[idx + 1]
          : null,
      index: idx,
      total: activePlaylist.videos.length,
    };
  }, [activePlaylist, video]);

  const queueMode = search.queue === "1" && !activePlaylist;

  const queueNeighbors = useMemo(() => {
    if (!library || !video || !queueMode) {
      return { prev: null, next: null, index: -1, total: 0 };
    }
    const q = library.watchQueue;
    const idx = q.findIndex((item) => item.id === video.id);
    if (idx === -1)
      return { prev: null, next: null, index: -1, total: q.length };
    return {
      prev: idx > 0 ? q[idx - 1] : null,
      next: idx < q.length - 1 ? q[idx + 1] : null,
      index: idx,
      total: q.length,
    };
  }, [library, video, queueMode]);

  // YouTube Player Ref & Throttled Progress Tracking
  const playerRef = useRef<YouTubePlayer | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const lastSavedSecondsRef = useRef<number>(0);
  const latestKnownDurationRef = useRef<number>(0);
  const [playerErrorCode, setPlayerErrorCode] = useState<number | null>(null);
  const [playerMountKey, setPlayerMountKey] = useState(0);

  // Manual hh:mm:ss / mm:ss fallback state
  const manualPosInputRef = useRef<HTMLInputElement | null>(null);
  const [manualPosInput, setManualPosInput] = useState("00:00");
  const [manualDurInput, setManualDurInput] = useState("00:00");
  const [manualError, setManualError] = useState<string | null>(null);

  // Notes auto-save state
  const [notesDraft, setNotesDraft] = useState("");
  const [notesSaveStatus, setNotesSaveStatus] = useState<
    "saved" | "saving" | "dirty"
  >("saved");
  const notesTimerRef = useRef<number | null>(null);
  const lastSavedNotesRef = useRef<string>("");
  const notesDraftRef = useRef<string>("");

  useEffect(() => {
    if (!video) return;
    lastSavedSecondsRef.current = video.last_watched_seconds;
    latestKnownDurationRef.current = video.duration_seconds;
    setPlayerErrorCode(null);
    setManualPosInput(formatSecondsToClock(video.last_watched_seconds));
    setManualDurInput(formatSecondsToClock(video.duration_seconds));
    setManualError(null);

    const initialNotes = video.notes ?? "";
    setNotesDraft(initialNotes);
    notesDraftRef.current = initialNotes;
    lastSavedNotesRef.current = initialNotes;
    setNotesSaveStatus("saved");
  }, [video?.id]);

  // Sync manual position inputs when video progress updates from player
  useEffect(() => {
    if (!video) return;
    setManualPosInput(formatSecondsToClock(video.last_watched_seconds));
    setManualDurInput(formatSecondsToClock(video.duration_seconds));
  }, [video?.last_watched_seconds, video?.duration_seconds]);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const persistPlaybackProgress = useCallback(
    async (rawCurrent: number, rawDuration: number, force = false) => {
      if (!video) return;
      const duration = Math.max(
        0,
        Math.round(rawDuration || latestKnownDurationRef.current || 0),
      );
      const current = Math.max(
        0,
        duration > 0
          ? Math.min(duration, Math.round(rawCurrent))
          : Math.round(rawCurrent),
      );

      if (
        !force &&
        Math.abs(current - lastSavedSecondsRef.current) < 4 &&
        duration === latestKnownDurationRef.current
      ) {
        return;
      }

      lastSavedSecondsRef.current = current;
      latestKnownDurationRef.current = duration;

      const completed = shouldMarkCompleted(current, duration);
      await patchVideo.mutateAsync({
        id: video.id,
        patch: {
          duration_seconds: duration,
          last_watched_seconds: completed && duration > 0 ? duration : current,
          is_completed: completed || video.is_completed,
          last_watched_at: new Date().toISOString(),
        },
      });
    },
    [video, patchVideo],
  );

  const persistPlaybackProgressRef = useRef(persistPlaybackProgress);
  persistPlaybackProgressRef.current = persistPlaybackProgress;

  const saveNotesNowRef = useRef<(text: string) => Promise<void>>(
    async () => {},
  );

  // Flush playback position and pending notes on unmount or video switch
  useEffect(() => {
    return () => {
      stopPolling();
      if (notesTimerRef.current !== null) {
        window.clearTimeout(notesTimerRef.current);
        notesTimerRef.current = null;
      }
      if (notesDraftRef.current !== lastSavedNotesRef.current) {
        saveNotesNowRef.current(notesDraftRef.current);
      }
      if (playerRef.current && video?.id) {
        try {
          const t = playerRef.current.getCurrentTime?.();
          const d = playerRef.current.getDuration?.();
          if (
            typeof t === "number" &&
            typeof d === "number" &&
            Math.abs(t - lastSavedSecondsRef.current) >= 2
          ) {
            persistPlaybackProgressRef.current(t, d, true);
          }
        } catch {
          // ignore if iframe already detached
        }
      }
    };
  }, [stopPolling, video?.id]);

  const handlePlayerReady = async (event: YouTubeEvent) => {
    playerRef.current = event.target;
    try {
      const duration = Math.round((await event.target.getDuration()) || 0);
      if (duration > 0 && video && duration !== video.duration_seconds) {
        latestKnownDurationRef.current = duration;
        await patchVideo.mutateAsync({
          id: video.id,
          patch: { duration_seconds: duration },
        });
      }
    } catch {
      // ignore if player metadata unavailable
    }
  };

  const handlePlayerStateChange = async (event: YouTubeEvent<number>) => {
    const state = event.data;
    // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
    if (state === 1) {
      stopPolling();
      pollIntervalRef.current = window.setInterval(async () => {
        if (!playerRef.current) return;
        try {
          const current = await playerRef.current.getCurrentTime();
          const duration = await playerRef.current.getDuration();
          await persistPlaybackProgress(current, duration, false);
        } catch {
          // ignore transient player read error
        }
      }, 10000);
    } else if (state === 2) {
      stopPolling();
      try {
        const current = await event.target.getCurrentTime();
        const duration = await event.target.getDuration();
        await persistPlaybackProgress(current, duration, true);
      } catch {
        // ignore
      }
    } else if (state === 0) {
      stopPolling();
      try {
        const duration = await event.target.getDuration();
        const finalDur =
          duration > 0 ? duration : latestKnownDurationRef.current;
        await persistPlaybackProgress(finalDur, finalDur, true);
      } catch {
        // ignore
      }
      if (queueMode && queueNeighbors.next) {
        toast.info(t("videoDetail.queueEndedNextToast"));
        navigate({
          to: "/videos/$videoId",
          params: { videoId: queueNeighbors.next.id },
          search: { queue: "1" },
        });
      }
    }
  };

  const handlePlayerError = (event: YouTubeEvent<number>) => {
    stopPolling();
    playerRef.current = null;
    setPlayerErrorCode(typeof event.data === "number" ? event.data : 150);
  };

  const handleManualProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    const parsedPos = parseTimeInputToSeconds(manualPosInput);
    if (parsedPos === null) {
      setManualError(t("videoDetail.invalidPosFormat"));
      return;
    }

    const parsedDur = parseTimeInputToSeconds(manualDurInput);
    if (parsedDur === null) {
      setManualError(t("videoDetail.invalidDurFormat"));
      return;
    }

    const effectiveDuration =
      parsedDur > 0 ? parsedDur : video.duration_seconds;
    if (effectiveDuration > 0 && parsedPos > effectiveDuration) {
      setManualError(t("videoDetail.posExceedsDur"));
      return;
    }

    setManualError(null);
    const completed = shouldMarkCompleted(parsedPos, effectiveDuration);
    const finalSeconds =
      completed && effectiveDuration > 0 ? effectiveDuration : parsedPos;

    lastSavedSecondsRef.current = finalSeconds;
    latestKnownDurationRef.current = effectiveDuration;

    await patchVideo.mutateAsync({
      id: video.id,
      patch: {
        duration_seconds: effectiveDuration,
        last_watched_seconds: finalSeconds,
        is_completed: completed,
        last_watched_at: new Date().toISOString(),
      },
    });
    toast.success(t("videoDetail.positionUpdated"));

    if (playerRef.current?.seekTo) {
      try {
        playerRef.current.seekTo(finalSeconds, true);
      } catch {
        // ignore
      }
    }
  };

  const handleContinueWatching = () => {
    if (!video || !playerRef.current) return;
    try {
      playerRef.current.seekTo(video.last_watched_seconds, true);
      playerRef.current.playVideo();
    } catch {
      toast.info(t("videoDetail.pressPlayToast"));
    }
  };

  // Debounced notes auto-save
  const saveNotesNow = useCallback(
    async (text: string) => {
      if (!video) return;
      if (text === lastSavedNotesRef.current) {
        setNotesSaveStatus("saved");
        return;
      }
      setNotesSaveStatus("saving");
      try {
        await patchVideo.mutateAsync({
          id: video.id,
          patch: { notes: text.trim() ? text : null },
        });
        lastSavedNotesRef.current = text;
        setNotesSaveStatus("saved");
      } catch {
        setNotesSaveStatus("dirty");
        toast.error(t("videoDetail.notesSaveError"));
      }
    },
    [video, patchVideo, t],
  );

  saveNotesNowRef.current = saveNotesNow;

  const handleNotesChange = (value: string) => {
    setNotesDraft(value);
    notesDraftRef.current = value;
    setNotesSaveStatus("dirty");
    if (notesTimerRef.current !== null) {
      window.clearTimeout(notesTimerRef.current);
    }
    notesTimerRef.current = window.setTimeout(() => {
      notesTimerRef.current = null;
      saveNotesNowRef.current(value);
    }, 600);
  };

  const handleToggleFavorite = () => {
    if (!video) return;
    patchVideo.mutate({
      id: video.id,
      patch: { is_favorite: !video.is_favorite },
    });
  };

  const handleToggleArchive = () => {
    if (!video) return;
    patchVideo.mutate(
      { id: video.id, patch: { is_archived: !video.is_archived } },
      {
        onSuccess: () => {
          toast.success(
            video.is_archived
              ? t("videoDetail.restoredToast")
              : t("videoDetail.archivedToast"),
          );
        },
      },
    );
  };

  const handleMarkCompleted = () => {
    if (!video) return;
    const nextCompleted = !video.is_completed;
    patchVideo.mutate(
      {
        id: video.id,
        patch: {
          is_completed: nextCompleted,
          last_watched_seconds:
            nextCompleted && video.duration_seconds > 0
              ? video.duration_seconds
              : nextCompleted
                ? video.last_watched_seconds
                : 0,
          last_watched_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          toast.success(
            nextCompleted
              ? t("videoDetail.markedCompletedToast")
              : t("videoDetail.markedNotStartedToast"),
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!video) return;
    openConfirmDialog({
      title: t("videos.deleteDialogTitle"),
      description: t("videoDetail.deleteConfirmDesc", { title: video.title }),
      confirmLabel: t("videos.deleteDialogConfirm"),
      destructive: true,
      onConfirm: async () => {
        await deleteVideo.mutateAsync(video.id);
        navigate({ to: "/videos" });
      },
    });
  };

  const dateLocale = getDateFnsLocale(i18n.language);

  if (isLoading) return <VideoDetailLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!video) {
    return (
      <EmptyState
        title={t("videoDetail.notFoundTitle")}
        description={t("videoDetail.notFoundDescription")}
        action={
          <Link
            to="/videos"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text"
          >
            {t("videoDetail.backToVideos")}
          </Link>
        }
      />
    );
  }

  const resumeYouTubeUrl = buildYouTubeWatchUrlWithTimestamp(
    video.url,
    video.youtube_video_id,
    video.last_watched_seconds,
  );
  const isOwnerEmbedBlocked =
    playerErrorCode === 101 || playerErrorCode === 150;

  const focusManualProgressInput = () => {
    manualPosInputRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    manualPosInputRef.current?.focus();
    manualPosInputRef.current?.select();
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Playlist / Queue Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            to={
              activePlaylist
                ? "/playlists/$playlistId"
                : queueMode
                  ? "/queue"
                  : "/videos"
            }
            params={
              activePlaylist ? { playlistId: activePlaylist.id } : undefined
            }
            className="inline-flex items-center gap-1.5 text-sm text-silo-muted hover:text-silo-text"
          >
            <ArrowLeft className="w-4 h-4" />
            {activePlaylist
              ? t("videoDetail.backToPlaylist", { name: activePlaylist.name })
              : queueMode
                ? t("videoDetail.backToQueue")
                : t("videoDetail.backToVideos")}
          </Link>
        </div>

        {activePlaylist && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tabular-nums text-silo-muted mr-1">
              {playlistNeighbors.index + 1} / {playlistNeighbors.total}
            </span>
            <SiloButton
              type="button"
              disabled={!playlistNeighbors.prev}
              onClick={() =>
                playlistNeighbors.prev &&
                navigate({
                  to: "/videos/$videoId",
                  params: { videoId: playlistNeighbors.prev.id },
                  search: { playlistId: activePlaylist.id },
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated disabled:opacity-40 whitespace-nowrap"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t("videoDetail.previousVideo")}
            </SiloButton>
            <SiloButton
              type="button"
              disabled={!playlistNeighbors.next}
              onClick={() =>
                playlistNeighbors.next &&
                navigate({
                  to: "/videos/$videoId",
                  params: { videoId: playlistNeighbors.next.id },
                  search: { playlistId: activePlaylist.id },
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated disabled:opacity-40 whitespace-nowrap"
            >
              {t("videoDetail.nextVideo")}
              <ChevronRight className="w-3.5 h-3.5" />
            </SiloButton>
          </div>
        )}

        {queueMode && queueNeighbors.total > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono tabular-nums text-silo-muted mr-1">
              {queueNeighbors.index + 1} / {queueNeighbors.total}
            </span>
            <SiloButton
              type="button"
              disabled={!queueNeighbors.prev}
              onClick={() =>
                queueNeighbors.prev &&
                navigate({
                  to: "/videos/$videoId",
                  params: { videoId: queueNeighbors.prev.id },
                  search: { queue: "1" },
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated disabled:opacity-40 whitespace-nowrap"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {t("videoDetail.previousVideo")}
            </SiloButton>
            <SiloButton
              type="button"
              disabled={!queueNeighbors.next}
              onClick={() =>
                queueNeighbors.next &&
                navigate({
                  to: "/videos/$videoId",
                  params: { videoId: queueNeighbors.next.id },
                  search: { queue: "1" },
                })
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated disabled:opacity-40 whitespace-nowrap"
            >
              {t("videoDetail.nextVideo")}
              <ChevronRight className="w-3.5 h-3.5" />
            </SiloButton>
          </div>
        )}
      </div>

      {/* Main 2-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Player + Title + Actions + Notes */}
        <div className="lg:col-span-8 space-y-5">
          <div className="relative w-full aspect-video bg-silo-backdrop border border-silo-border rounded-xl overflow-hidden">
            {playerErrorCode !== null ? (
              <div className="relative w-full h-full">
                <VideoThumbnail
                  src={video.thumbnail_url}
                  fallbackSrc={getYouTubeThumbnailFallbackUrl(
                    video.youtube_video_id,
                  )}
                  alt={video.title}
                  className="h-full border-0 rounded-none"
                />
                <div className="absolute inset-0 bg-linear-to-t from-silo-backdrop/95 via-silo-backdrop/80 to-silo-backdrop/45 flex flex-col justify-end p-4 sm:p-6">
                  <div className="max-w-xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-silo-text shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <h3 className="text-sm sm:text-base font-semibold text-silo-text">
                          {isOwnerEmbedBlocked
                            ? t("videoDetail.embedDisabledTitle")
                            : t("videoDetail.embedErrorTitle")}
                        </h3>
                        <p className="text-xs sm:text-sm text-silo-text-secondary leading-relaxed">
                          {isOwnerEmbedBlocked
                            ? t("videoDetail.embedDisabledDesc")
                            : t("videoDetail.embedErrorDesc")}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href={resumeYouTubeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {video.last_watched_seconds > 0
                          ? t("videoDetail.openOnYouTubeAtTime", {
                              time: formatSecondsToClock(
                                video.last_watched_seconds,
                              ),
                            })
                          : t("videoDetail.openOnYouTube")}
                      </a>

                      <SiloButton
                        type="button"
                        onClick={focusManualProgressInput}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap shrink-0"
                      >
                        {t("videoDetail.focusManualProgress")}
                      </SiloButton>

                      <SiloButton
                        type="button"
                        onClick={() => {
                          setPlayerErrorCode(null);
                          setPlayerMountKey((k) => k + 1);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-bg border border-silo-border text-silo-muted hover:text-silo-text transition-colors whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t("videoDetail.retryEmbed")}
                      </SiloButton>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <YouTube
                key={`${video.id}-${playerMountKey}`}
                videoId={video.youtube_video_id}
                className="w-full h-full"
                iframeClassName="w-full h-full"
                opts={{
                  width: "100%",
                  height: "100%",
                  playerVars: {
                    start: Math.floor(video.last_watched_seconds),
                    rel: 0,
                  },
                }}
                onReady={handlePlayerReady}
                onStateChange={handlePlayerStateChange}
                onError={handlePlayerError}
              />
            )}
          </div>

          <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-silo-muted">
                {video.category && (
                  <Link
                    to="/categories/$categoryId"
                    params={{ categoryId: video.category.id }}
                    className="inline-flex items-center gap-1.5 text-silo-text hover:underline"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: video.category.color }}
                    />
                    {video.category.name}
                  </Link>
                )}
                {video.category && video.channel && (
                  <span aria-hidden="true">·</span>
                )}
                {video.channel && (
                  <Link
                    to="/channels/$channelId"
                    params={{ channelId: video.channel.id }}
                    className="hover:text-silo-text hover:underline"
                  >
                    {video.channel.name}
                  </Link>
                )}
                {video.labels.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{video.labels.map((l) => l.name).join(" / ")}</span>
                  </>
                )}
              </div>

              <h2 className="text-xl font-bold text-silo-text leading-snug">
                {video.title}
              </h2>
            </div>

            {/* Action Toolbar (collapsed secondary actions behind Quick Actions on mobile) */}
            <div className="pt-3 border-t border-silo-border space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                {playerErrorCode !== null ? (
                  <a
                    href={resumeYouTubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {video.last_watched_seconds > 0
                      ? t("videoDetail.openOnYouTubeAtTime", {
                          time: formatSecondsToClock(
                            video.last_watched_seconds,
                          ),
                        })
                      : t("videoDetail.openOnYouTube")}
                  </a>
                ) : (
                  <SiloButton
                    type="button"
                    onClick={handleContinueWatching}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t("videoDetail.continueWatching")}
                  </SiloButton>
                )}

                <SiloButton
                  type="button"
                  onClick={() => setMobileActionsOpen((prev) => !prev)}
                  aria-expanded={mobileActionsOpen}
                  className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
                >
                  <span>{t("app.quickActions")}</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      mobileActionsOpen ? "rotate-180" : ""
                    }`}
                  />
                </SiloButton>

                <div
                  className={`${
                    mobileActionsOpen ? "flex" : "hidden"
                  } sm:flex flex-wrap items-center gap-2 w-full sm:w-auto`}
                >
                  <SiloButton
                    type="button"
                    onClick={handleMarkCompleted}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      video.is_completed
                        ? "bg-silo-success-surface border-silo-success text-silo-text"
                        : "bg-silo-elevated border-silo-border text-silo-text hover:bg-silo-border"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {video.is_completed
                      ? t("videoDetail.completedBadge")
                      : t("videoDetail.markAsCompleted")}
                  </SiloButton>

                  <SiloButton
                    type="button"
                    onClick={handleToggleFavorite}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                      video.is_favorite
                        ? "bg-silo-danger-surface-raised border-silo-danger-text text-silo-danger-text"
                        : "bg-silo-elevated border-silo-border text-silo-text hover:bg-silo-border"
                    }`}
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${video.is_favorite ? "fill-current" : ""}`}
                    />
                    {video.is_favorite
                      ? t("videoDetail.favorited")
                      : t("videoDetail.favorite")}
                  </SiloButton>

                  {!video.is_archived && (
                    <SiloButton
                      type="button"
                      onClick={() =>
                        isQueued
                          ? removeFromQueue.mutate(video.id)
                          : addToQueue.mutate(video.id)
                      }
                      disabled={
                        addToQueue.isPending || removeFromQueue.isPending
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                        isQueued
                          ? "bg-silo-elevated border-silo-text text-silo-text"
                          : "bg-silo-elevated border-silo-border text-silo-text hover:bg-silo-border"
                      }`}
                    >
                      {isQueued ? (
                        <ListCheck className="w-3.5 h-3.5" />
                      ) : (
                        <ListPlus className="w-3.5 h-3.5" />
                      )}
                      {isQueued
                        ? t("videoDetail.inQueue")
                        : t("videoDetail.addToQueue")}
                    </SiloButton>
                  )}

                  <SiloButton
                    type="button"
                    onClick={() => openVideoModal({ editVideoId: video.id })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {t("videoDetail.editVideo")}
                  </SiloButton>

                  <SiloButton
                    type="button"
                    onClick={handleToggleArchive}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border whitespace-nowrap shrink-0"
                  >
                    {video.is_archived ? (
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    ) : (
                      <Archive className="w-3.5 h-3.5" />
                    )}
                    {video.is_archived
                      ? t("videoDetail.restore")
                      : t("videoDetail.archiveVideo")}
                  </SiloButton>

                  <SiloButton
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover whitespace-nowrap shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t("videoDetail.deleteVideo")}
                  </SiloButton>

                  <a
                    href={resumeYouTubeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-bg border border-silo-border text-silo-muted hover:text-silo-text whitespace-nowrap shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t("videoDetail.youtubeLink")}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Notes Auto-Save */}
          <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="detail-notes"
                className="text-base font-semibold text-silo-text"
              >
                {t("videoDetail.personalNotes")}
              </label>
              <span className="text-xs font-mono text-silo-muted">
                {notesSaveStatus === "saving"
                  ? t("videoDetail.notesSaving")
                  : notesSaveStatus === "dirty"
                    ? t("videoDetail.notesDirty")
                    : t("videoDetail.notesSaved")}
              </span>
            </div>
            <SiloTextarea
              id="detail-notes"
              rows={6}
              value={notesDraft}
              onChange={(e) => handleNotesChange(e.target.value)}
              onBlur={() => saveNotesNow(notesDraft)}
              placeholder={t("videoDetail.notesPlaceholder")}
              className="w-full px-3.5 py-2.5 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text resize-y leading-relaxed"
            />
          </div>
        </div>

        {/* Right: Progress, Manual Fallback, Metadata & Playlists */}
        <aside className="lg:col-span-4 space-y-5">
          {/* Progress & Manual Position Fallback */}
          <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-silo-text">
                {t("videoDetail.watchProgress")}
              </h3>
              <span className="text-xs font-mono text-silo-text-secondary">
                {translateVideoStatus(video.status, t)}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between font-mono tabular-nums">
                <span className="text-2xl font-bold text-silo-text">
                  {video.progress_percentage}%
                </span>
                <span className="text-xs text-silo-muted">
                  {formatSecondsToClock(video.last_watched_seconds)} /{" "}
                  {video.duration_seconds > 0
                    ? formatSecondsToClock(video.duration_seconds)
                    : "--:--"}
                </span>
              </div>
              <ProgressBar
                percentage={video.progress_percentage}
                color={video.category?.color ?? "#F4EFE3"}
                heightClass="h-2"
              />
            </div>

            <form
              onSubmit={handleManualProgressSubmit}
              className="pt-4 border-t border-silo-border space-y-3"
            >
              <p className="text-xs font-medium text-silo-text-secondary">
                {t("videoDetail.manualProgressTitle")}
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="manual-pos"
                    className="block text-[11px] text-silo-muted mb-1"
                  >
                    {t("videoDetail.lastWatched")}
                  </label>
                  <SiloInput
                    ref={manualPosInputRef}
                    id="manual-pos"
                    type="text"
                    value={manualPosInput}
                    onChange={(e) => {
                      setManualPosInput(e.target.value);
                      setManualError(null);
                    }}
                    placeholder="05:30 / 1:25:00"
                    className="w-full px-3 py-1.5 text-sm font-mono bg-silo-bg border border-silo-border rounded-lg text-silo-text focus:outline-none focus:border-silo-text"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-dur"
                    className="block text-[11px] text-silo-muted mb-1"
                  >
                    {t("videoDetail.duration")}
                  </label>
                  <SiloInput
                    id="manual-dur"
                    type="text"
                    value={manualDurInput}
                    onChange={(e) => {
                      setManualDurInput(e.target.value);
                      setManualError(null);
                    }}
                    placeholder="20:00 / 6.31.16"
                    className="w-full px-3 py-1.5 text-sm font-mono bg-silo-bg border border-silo-border rounded-lg text-silo-text focus:outline-none focus:border-silo-text"
                  />
                </div>
              </div>

              {manualError && (
                <p className="text-xs text-silo-danger-text">{manualError}</p>
              )}

              <SiloButton
                type="submit"
                disabled={patchVideo.isPending}
                className="w-full px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors disabled:opacity-50"
              >
                {t("videoDetail.updateProgress")}
              </SiloButton>
            </form>
          </div>

          {/* Video Metadata */}
          <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
            <h3 className="text-base font-semibold text-silo-text">
              {t("videoDetail.details")}
            </h3>
            <VideoThumbnail
              src={video.thumbnail_url}
              fallbackSrc={getYouTubeThumbnailFallbackUrl(
                video.youtube_video_id,
              )}
              alt={video.title}
            />

            <dl className="space-y-2.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-silo-muted">
                  {t("videoDetail.youtubeId")}
                </dt>
                <dd className="font-mono text-silo-text">
                  {video.youtube_video_id}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-silo-muted">{t("videoDetail.duration")}</dt>
                <dd className="font-mono tabular-nums text-silo-text">
                  {video.duration_seconds > 0
                    ? formatSecondsToClock(video.duration_seconds)
                    : t("app.notSet")}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-silo-muted">
                  {t("videoDetail.createdDate")}
                </dt>
                <dd className="font-mono tabular-nums text-silo-text">
                  {format(parseISO(video.created_at), "MMM d, yyyy", {
                    locale: dateLocale,
                  })}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-silo-muted">
                  {t("videoDetail.lastWatched")}
                </dt>
                <dd className="font-mono tabular-nums text-silo-text">
                  {video.last_watched_at
                    ? format(
                        parseISO(video.last_watched_at),
                        "MMM d, yyyy HH:mm",
                        {
                          locale: dateLocale,
                        },
                      )
                    : t("app.never")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Playlists Membership */}
          <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-3">
            <h3 className="text-base font-semibold text-silo-text">
              {t("videoDetail.playlists")}
            </h3>
            {video.playlists.length === 0 ? (
              <p className="text-xs text-silo-muted">
                {t("videoDetail.noPlaylistsAssigned")}
              </p>
            ) : (
              <div className="space-y-2">
                {video.playlists.map((pl) => (
                  <Link
                    key={pl.id}
                    to="/videos/$videoId"
                    params={{ videoId: video.id }}
                    search={{ playlistId: pl.id }}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                      activePlaylist?.id === pl.id
                        ? "bg-silo-elevated border-silo-text text-silo-text"
                        : "bg-silo-bg border-silo-border text-silo-text-secondary hover:border-silo-subtle"
                    }`}
                  >
                    <span className="truncate font-medium">{pl.name}</span>
                    <span className="font-mono text-silo-muted shrink-0">
                      #{pl.order_index + 1}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
