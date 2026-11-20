import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { animate, stagger } from "animejs";
import {
  ArrowRight,
  ChevronDown,
  FolderPlus,
  Heart,
  ListPlus,
  Play,
  Plus,
  Tv,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { translateVideoStatus } from "../i18n";
import { useLibraryData } from "../hooks/useLibrary";
import { useUiStore } from "../store/uiStore";
import { formatDurationHuman, formatSecondsToClock } from "../utils/progress";
import { getYouTubeThumbnailFallbackUrl } from "../utils/youtube";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  EmptyState,
  ErrorState,
  DashboardLoadingSkeleton,
} from "../components/ui/StateViews";
import { VideoThumbnail } from "../components/ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
export function DashboardPage() {
  const { t } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const {
    openVideoModal,
    openChannelModal,
    openCategoryModal,
    openPlaylistModal,
  } = useUiStore();
  const statsGridRef = useRef<HTMLDivElement>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  useEffect(() => {
    if (!library || !statsGridRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = statsGridRef.current.querySelectorAll("[data-stat-card]");
    if (cards.length === 0) return;
    animate(cards, {
      opacity: [0.6, 1],
      translateY: [6, 0],
      duration: 240,
      delay: stagger(35),
      ease: "outQuad",
    });
  }, [Boolean(library)]);

  const summary = useMemo(() => {
    if (!library) return null;
    const activeVideos = library.videos.filter((v) => !v.is_archived);
    const completedVideos = activeVideos.filter((v) => v.is_completed);
    const inProgressVideos = activeVideos
      .filter((v) => !v.is_completed && v.last_watched_seconds > 0)
      .sort((a, b) =>
        (b.last_watched_at ?? "").localeCompare(a.last_watched_at ?? ""),
      );
    const recentlyAdded = activeVideos
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 6);
    const recentlyWatched = activeVideos
      .filter((v) => v.last_watched_at !== null)
      .sort((a, b) =>
        (b.last_watched_at ?? "").localeCompare(a.last_watched_at ?? ""),
      )
      .slice(0, 6);
    const favorites = activeVideos.filter((v) => v.is_favorite).slice(0, 4);

    const overallPercentage =
      activeVideos.length > 0
        ? Math.round((completedVideos.length / activeVideos.length) * 1000) / 10
        : 0;

    return {
      totalVideos: activeVideos.length,
      totalChannels: library.channels.length,
      totalCategories: library.categories.length,
      totalPlaylists: library.playlists.length,
      completedCount: completedVideos.length,
      inProgressCount: inProgressVideos.length,
      overallPercentage,
      continueWatching: inProgressVideos.slice(0, 4),
      recentlyAdded,
      recentlyWatched,
      favorites,
      playlists: library.playlists.slice(0, 4),
    };
  }, [library]);

  if (isLoading) return <DashboardLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!summary) return null;

  const primaryContinue = summary.continueWatching[0] ?? null;

  return (
    <div className="space-y-8">
      {/* Quick Action Bar (No duplicate page title) */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-silo-border">
        <p className="text-sm text-silo-muted">{""}</p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <SiloButton
              type="button"
              onClick={() => openVideoModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t("app.addVideo")}
            </SiloButton>

            <SiloButton
              type="button"
              onClick={() => setMobileActionsOpen((prev) => !prev)}
              aria-expanded={mobileActionsOpen}
              aria-controls="dashboard-secondary-actions"
              className="sm:hidden inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t("app.quickActions")}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-150 ${
                  mobileActionsOpen ? "rotate-180" : ""
                }`}
              />
            </SiloButton>
          </div>

          <div
            id="dashboard-secondary-actions"
            className={`${
              mobileActionsOpen ? "flex" : "hidden"
            } sm:flex flex-wrap items-center gap-2`}
          >
            <SiloButton
              type="button"
              onClick={() => openChannelModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap shrink-0"
            >
              <Tv className="w-4 h-4" />
              {t("dashboard.addChannel")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => openCategoryModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap shrink-0"
            >
              <FolderPlus className="w-4 h-4" />
              {t("dashboard.addCategory")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => openPlaylistModal()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated transition-colors whitespace-nowrap shrink-0"
            >
              <ListPlus className="w-4 h-4" />
              {t("dashboard.addPlaylist")}
            </SiloButton>
          </div>
        </div>
      </section>

      {/* Primary KPI Grid */}
      <section
        ref={statsGridRef}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <div
          data-stat-card
          className="p-4 bg-silo-surface border border-silo-border rounded-xl"
        >
          <p className="text-xs text-silo-muted">
            {t("dashboard.totalVideos")}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-silo-text mt-1">
            {summary.totalVideos}
          </p>
          <p className="text-xs text-silo-muted mt-1.5 font-mono tabular-nums">
            {t("dashboard.completedInProgress", {
              completed: summary.completedCount,
              inProgress: summary.inProgressCount,
            })}
          </p>
        </div>

        <div
          data-stat-card
          className="p-4 bg-silo-surface border border-silo-border rounded-xl"
        >
          <p className="text-xs text-silo-muted">
            {t("dashboard.totalChannels")}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-silo-text mt-1">
            {summary.totalChannels}
          </p>
          <Link
            to="/channels"
            className="text-xs text-silo-muted hover:text-silo-text mt-1.5 inline-block"
          >
            {t("dashboard.browseChannels")}
          </Link>
        </div>

        <div
          data-stat-card
          className="p-4 bg-silo-surface border border-silo-border rounded-xl"
        >
          <p className="text-xs text-silo-muted">
            {t("dashboard.totalCategories")}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-silo-text mt-1">
            {summary.totalCategories}
          </p>
          <Link
            to="/categories"
            className="text-xs text-silo-muted hover:text-silo-text mt-1.5 inline-block"
          >
            {t("dashboard.manageTaxonomy")}
          </Link>
        </div>

        <div
          data-stat-card
          className="p-4 bg-silo-surface border border-silo-border rounded-xl"
        >
          <p className="text-xs text-silo-muted">
            {t("dashboard.totalPlaylists")}
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-silo-text mt-1">
            {summary.totalPlaylists}
          </p>
          <Link
            to="/playlists"
            className="text-xs text-silo-muted hover:text-silo-text mt-1.5 inline-block"
          >
            {t("dashboard.openPlaylists")}
          </Link>
        </div>
      </section>

      {/* Overall Watch Progress & Primary Continue Watching */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 p-5 bg-silo-surface border border-silo-border rounded-xl flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-silo-text">
              {t("dashboard.overallWatchProgress")}
            </h3>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-bold font-mono tabular-nums text-silo-text">
                {summary.overallPercentage}%
              </span>
              <span className="text-xs font-mono tabular-nums text-silo-muted">
                {t("dashboard.completedCountLabel", {
                  completed: summary.completedCount,
                  total: summary.totalVideos,
                })}
              </span>
            </div>
            <ProgressBar
              percentage={summary.overallPercentage}
              heightClass="h-2"
            />
            <div className="flex items-center justify-between text-xs text-silo-muted pt-1">
              <span>
                {t("dashboard.videosCompleted", {
                  count: summary.completedCount,
                })}
              </span>
              <span>
                {t("dashboard.inProgressCountLabel", {
                  count: summary.inProgressCount,
                })}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-silo-border flex items-center justify-between">
            <Link
              to="/analytics"
              className="text-xs font-medium text-silo-text hover:underline inline-flex items-center gap-1"
            >
              {t("dashboard.viewDetailedAnalytics")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              to="/videos"
              className="text-xs font-medium text-silo-muted hover:text-silo-text inline-flex items-center gap-1"
            >
              {t("dashboard.viewAllVideos")}
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7 p-5 bg-silo-surface border border-silo-border rounded-xl flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-silo-text">
              {t("dashboard.continueWatching")}
            </h3>
            <Link
              to="/videos"
              className="text-xs font-medium text-silo-muted hover:text-silo-text whitespace-nowrap"
            >
              {t("dashboard.viewAllVideos")}
            </Link>
          </div>

          {primaryContinue ? (
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <Link
                to="/videos/$videoId"
                params={{ videoId: primaryContinue.id }}
                className="sm:col-span-5 block"
              >
                <VideoThumbnail
                  src={primaryContinue.thumbnail_url}
                  fallbackSrc={getYouTubeThumbnailFallbackUrl(
                    primaryContinue.youtube_video_id,
                  )}
                  alt={primaryContinue.title}
                />
              </Link>
              <div className="sm:col-span-7 space-y-2.5 min-w-0">
                <p className="text-xs text-silo-muted truncate">
                  {[
                    primaryContinue.category?.name,
                    primaryContinue.channel?.name,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Link
                  to="/videos/$videoId"
                  params={{ videoId: primaryContinue.id }}
                  className="block text-base font-semibold text-silo-text hover:underline line-clamp-2"
                >
                  {primaryContinue.title}
                </Link>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-silo-muted">
                    <span>
                      {formatSecondsToClock(
                        primaryContinue.last_watched_seconds,
                      )}
                      {primaryContinue.duration_seconds > 0
                        ? ` / ${formatSecondsToClock(primaryContinue.duration_seconds)}`
                        : ""}
                    </span>
                    <span className="text-silo-text">
                      {primaryContinue.progress_percentage}%
                    </span>
                  </div>
                  <ProgressBar
                    percentage={primaryContinue.progress_percentage}
                    color={primaryContinue.category?.color ?? "#F4EFE3"}
                  />
                </div>
                <div className="pt-1">
                  <Link
                    to="/videos/$videoId"
                    params={{ videoId: primaryContinue.id }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {t("dashboard.continueWatching")}
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title={t("dashboard.nothingInProgressTitle")}
              description={t("dashboard.nothingInProgressDescription")}
            />
          )}
        </div>
      </section>

      {/* Recently Added & Recently Watched */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-silo-text">
              {t("dashboard.recentlyAddedVideos")}
            </h3>
            <Link
              to="/videos"
              className="text-xs font-medium text-silo-muted hover:text-silo-text inline-flex items-center gap-1"
            >
              {t("dashboard.viewAllVideos")}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {summary.recentlyAdded.length === 0 ? (
            <EmptyState
              title={t("dashboard.noVideosSavedTitle")}
              description={t("dashboard.noVideosSavedDescription")}
            />
          ) : (
            <div className="bg-silo-surface border border-silo-border rounded-xl divide-y divide-silo-border">
              {summary.recentlyAdded.map((v) => (
                <Link
                  key={v.id}
                  to="/videos/$videoId"
                  params={{ videoId: v.id }}
                  className="flex items-center gap-3 p-3 hover:bg-silo-elevated transition-colors"
                >
                  <div className="w-24 shrink-0">
                    <VideoThumbnail
                      src={v.thumbnail_url}
                      fallbackSrc={getYouTubeThumbnailFallbackUrl(
                        v.youtube_video_id,
                      )}
                      alt={v.title}
                      compact
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-silo-text truncate">
                      {v.title}
                    </p>
                    <p className="text-xs text-silo-muted truncate mt-0.5">
                      {[v.channel?.name, v.category?.name]
                        .filter(Boolean)
                        .join(" · ") || t("app.uncategorized")}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-silo-muted shrink-0">
                    {v.progress_percentage}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-silo-text">
              {t("dashboard.recentlyWatched")}
            </h3>
            <Link
              to="/videos"
              className="text-xs font-medium text-silo-muted hover:text-silo-text inline-flex items-center gap-1"
            >
              {t("dashboard.viewAllVideos")}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {summary.recentlyWatched.length === 0 ? (
            <EmptyState
              title={t("dashboard.noWatchHistoryTitle")}
              description={t("dashboard.noWatchHistoryDescription")}
            />
          ) : (
            <div className="bg-silo-surface border border-silo-border rounded-xl divide-y divide-silo-border">
              {summary.recentlyWatched.map((v) => (
                <Link
                  key={v.id}
                  to="/videos/$videoId"
                  params={{ videoId: v.id }}
                  className="flex items-center gap-3 p-3 hover:bg-silo-elevated transition-colors"
                >
                  <div className="w-24 shrink-0">
                    <VideoThumbnail
                      src={v.thumbnail_url}
                      fallbackSrc={getYouTubeThumbnailFallbackUrl(
                        v.youtube_video_id,
                      )}
                      alt={v.title}
                      compact
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-silo-text truncate">
                      {v.title}
                    </p>
                    <p className="text-xs text-silo-muted truncate mt-0.5">
                      {translateVideoStatus(v.status, t)} ·{" "}
                      {formatSecondsToClock(v.last_watched_seconds)}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-silo-text shrink-0">
                    {v.progress_percentage}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Playlist Overview & Favorite Videos */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-silo-text">
              {t("dashboard.playlistOverview")}
            </h3>
            <Link
              to="/playlists"
              className="text-xs font-medium text-silo-muted hover:text-silo-text inline-flex items-center gap-1"
            >
              {t("dashboard.viewAllPlaylists")}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {summary.playlists.length === 0 ? (
            <EmptyState
              title={t("dashboard.noPlaylistsTitle")}
              description={t("dashboard.noPlaylistsDescription")}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {summary.playlists.map((pl) => (
                <Link
                  key={pl.id}
                  to="/playlists/$playlistId"
                  params={{ playlistId: pl.id }}
                  className="p-4 bg-silo-surface border border-silo-border rounded-xl hover:border-silo-border-hover transition-colors space-y-3"
                >
                  <VideoThumbnail src={pl.cover_thumbnail_url} alt={pl.name} />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-silo-text truncate">
                      {pl.name}
                    </p>
                    <p className="text-xs text-silo-muted font-mono tabular-nums">
                      {t("playlists.completedDuration", {
                        completed: pl.completed_videos,
                        total: pl.total_videos,
                        duration: formatDurationHuman(
                          pl.total_duration_seconds,
                        ),
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono tabular-nums text-silo-muted">
                      <span>{t("dashboard.progressLabel")}</span>
                      <span className="text-silo-text">
                        {pl.progress_percentage}%
                      </span>
                    </div>
                    <ProgressBar
                      percentage={pl.progress_percentage}
                      color={pl.category?.color ?? "#F4EFE3"}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-silo-text">
              {t("dashboard.favoriteVideos")}
            </h3>
            <Link
              to="/favorites"
              className="text-xs font-medium text-silo-muted hover:text-silo-text inline-flex items-center gap-1"
            >
              {t("dashboard.allFavorites")}{" "}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {summary.favorites.length === 0 ? (
            <EmptyState
              title={t("dashboard.noFavoritesTitle")}
              description={t("dashboard.noFavoritesDescription")}
            />
          ) : (
            <div className="bg-silo-surface border border-silo-border rounded-xl divide-y divide-silo-border">
              {summary.favorites.map((v) => (
                <Link
                  key={v.id}
                  to="/videos/$videoId"
                  params={{ videoId: v.id }}
                  className="flex items-center justify-between gap-3 p-3.5 hover:bg-silo-elevated transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Heart className="w-4 h-4 text-silo-danger-text fill-current shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-silo-text truncate">
                        {v.title}
                      </p>
                      <p className="text-xs text-silo-muted truncate">
                        {v.channel?.name ?? t("app.unknownChannel")}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-silo-muted shrink-0">
                    {v.progress_percentage}%
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
