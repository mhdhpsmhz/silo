import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { getDateFnsLocale } from "../i18n";
import { useLibraryData } from "../hooks/useLibrary";
import { formatDurationHuman } from "../utils/progress";
import { ProgressBar } from "../components/ui/ProgressBar";
import {
  AnalyticsLoadingSkeleton,
  EmptyState,
  ErrorState,
} from "../components/ui/StateViews";

export function AnalyticsPage() {
  const { t, i18n } = useTranslation();
  const { library, isLoading, isError, error, refetch } = useLibraryData();
  const dateLocale = getDateFnsLocale(i18n.language);

  const analytics = useMemo(() => {
    if (!library) return null;

    const allVideos = library.videos;
    const activeVideos = allVideos.filter((v) => !v.is_archived);
    const archivedVideos = allVideos.filter((v) => v.is_archived);
    const completedVideos = activeVideos.filter((v) => v.is_completed);
    const inProgressVideos = activeVideos.filter(
      (v) => !v.is_completed && v.last_watched_seconds > 0,
    );
    const notStartedVideos = activeVideos.filter(
      (v) => !v.is_completed && v.last_watched_seconds === 0,
    );
    const favoriteVideos = activeVideos.filter((v) => v.is_favorite);

    const totalWatchSeconds = allVideos.reduce(
      (acc, v) =>
        acc +
        (v.is_completed && v.duration_seconds > 0
          ? v.duration_seconds
          : v.last_watched_seconds),
      0,
    );

    const categoryChart = library.categories.map((cat) => ({
      name: cat.name,
      progress: cat.progress_percentage,
      completed: cat.completed_videos,
      total: cat.total_active_videos,
      color: cat.color,
    }));

    const channelChart = library.channels
      .slice()
      .sort((a, b) => b.total_active_videos - a.total_active_videos)
      .slice(0, 8)
      .map((ch) => ({
        name: ch.name,
        progress: ch.progress_percentage,
        completed: ch.completed_videos,
        total: ch.total_active_videos,
      }));

    const playlistProgress = library.playlists.map((pl) => ({
      id: pl.id,
      name: pl.name,
      progress: pl.progress_percentage,
      completed: pl.completed_videos,
      total: pl.total_videos,
      watchedSeconds: pl.total_watched_seconds,
      durationSeconds: pl.total_duration_seconds,
      color: pl.category?.color ?? "#48929B",
    }));

    const byDate = new Map<
      string,
      { date: string; minutes: number; videos: number }
    >();
    for (const v of allVideos) {
      if (!v.last_watched_at) continue;
      const day = v.last_watched_at.slice(0, 10);
      const entry = byDate.get(day) ?? { date: day, minutes: 0, videos: 0 };
      const sec =
        v.is_completed && v.duration_seconds > 0
          ? v.duration_seconds
          : v.last_watched_seconds;
      entry.minutes += Math.round(sec / 60);
      entry.videos += 1;
      byDate.set(day, entry);
    }
    const activityTimeline = Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        label: format(parseISO(d.date), "MMM d", { locale: dateLocale }),
        minutes: d.minutes,
        videos: d.videos,
      }));

    return {
      totalVideos: allVideos.length,
      totalWatchSeconds,
      completedCount: completedVideos.length,
      inProgressCount: inProgressVideos.length,
      notStartedCount: notStartedVideos.length,
      archivedCount: archivedVideos.length,
      favoriteCount: favoriteVideos.length,
      categoryChart,
      channelChart,
      playlistProgress,
      activityTimeline,
    };
  }, [library, dateLocale]);

  if (isLoading) return <AnalyticsLoadingSkeleton />;
  if (isError)
    return (
      <ErrorState
        message={(error as Error).message}
        onRetry={() => refetch()}
      />
    );
  if (!analytics) return null;

  return (
    <div className="space-y-8">
      {/* Top KPI Summary */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          {
            label: t("analytics.kpiTotalVideos"),
            value: analytics.totalVideos,
          },
          {
            label: t("analytics.kpiTotalWatchTime"),
            value: formatDurationHuman(analytics.totalWatchSeconds),
          },
          {
            label: t("analytics.kpiCompleted"),
            value: analytics.completedCount,
          },
          {
            label: t("analytics.kpiInProgress"),
            value: analytics.inProgressCount,
          },
          {
            label: t("analytics.kpiNotStarted"),
            value: analytics.notStartedCount,
          },
          {
            label: t("analytics.kpiFavorites"),
            value: analytics.favoriteCount,
          },
          { label: t("analytics.kpiArchived"), value: analytics.archivedCount },
        ].map((item) => (
          <div
            key={item.label}
            className="p-4 bg-silo-surface border border-silo-border rounded-xl"
          >
            <p className="text-xs text-silo-muted leading-snug">{item.label}</p>
            <p className="text-xl font-bold font-mono tabular-nums text-silo-text mt-1.5">
              {item.value}
            </p>
          </div>
        ))}
      </section>

      {analytics.totalVideos === 0 ? (
        <EmptyState
          title={t("analytics.emptyTitle")}
          description={t("analytics.emptyDescription")}
        />
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
              <div>
                <h3 className="text-base font-semibold text-silo-text">
                  {t("analytics.progressByCategory")}
                </h3>
              </div>
              {analytics.categoryChart.length === 0 ? (
                <p className="text-sm text-silo-muted py-8 text-center">
                  {t("analytics.noCategoriesYet")}
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.categoryChart}
                      margin={{ top: 8, right: 16, left: -12, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#363636"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tickFormatter={(val: string) =>
                          val.length > 14 ? `${val.slice(0, 13)}…` : val
                        }
                        tick={{ fill: "#9E9A90", fontSize: 11 }}
                        axisLine={{ stroke: "#363636" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "#9E9A90", fontSize: 11 }}
                        axisLine={{ stroke: "#363636" }}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        cursor={{ fill: "#2C2C2C" }}
                        contentStyle={{
                          backgroundColor: "#1C1C1C",
                          border: "1px solid #363636",
                          borderRadius: "8px",
                          color: "#F4EFE3",
                          fontSize: "12px",
                        }}
                        formatter={(value) => [
                          `${value}%`,
                          t("analytics.completionTooltip"),
                        ]}
                      />
                      <Bar
                        dataKey="progress"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      >
                        {analytics.categoryChart.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
              <div>
                <h3 className="text-base font-semibold text-silo-text">
                  {t("analytics.progressByChannel")}
                </h3>
              </div>
              {analytics.channelChart.length === 0 ? (
                <p className="text-sm text-silo-muted py-8 text-center">
                  {t("analytics.noChannelsYet")}
                </p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics.channelChart}
                      margin={{ top: 8, right: 16, left: -12, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#363636"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        interval={0}
                        tickFormatter={(val: string) =>
                          val.length > 14 ? `${val.slice(0, 13)}…` : val
                        }
                        tick={{ fill: "#9E9A90", fontSize: 11 }}
                        axisLine={{ stroke: "#363636" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "#9E9A90", fontSize: 11 }}
                        axisLine={{ stroke: "#363636" }}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        cursor={{ fill: "#2C2C2C" }}
                        contentStyle={{
                          backgroundColor: "#1C1C1C",
                          border: "1px solid #363636",
                          borderRadius: "8px",
                          color: "#F4EFE3",
                          fontSize: "12px",
                        }}
                        formatter={(value) => [
                          `${value}%`,
                          t("analytics.completionTooltip"),
                        ]}
                      />
                      <Bar
                        dataKey="progress"
                        fill="#48929B"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
              <div>
                <h3 className="text-base font-semibold text-silo-text">
                  {t("analytics.watchActivityTimeline")}
                </h3>
              </div>
              {analytics.activityTimeline.length === 0 ? (
                <p className="text-sm text-silo-muted py-10 text-center">
                  {t("analytics.noWatchTimestamps")}
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={analytics.activityTimeline}
                      margin={{ top: 8, right: 16, left: -12, bottom: 8 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#363636"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#9E9A90", fontSize: 11 }}
                        axisLine={{ stroke: "#363636" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "#9E9A90", fontSize: 11 }}
                        axisLine={{ stroke: "#363636" }}
                        tickLine={false}
                        unit="m"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1C1C1C",
                          border: "1px solid #363636",
                          borderRadius: "8px",
                          color: "#F4EFE3",
                          fontSize: "12px",
                        }}
                        formatter={(value) => [
                          t("analytics.minutesUnit", { count: Number(value) }),
                          t("analytics.watchTimeTooltip"),
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="minutes"
                        stroke="#1F9967"
                        fill="#1F9967"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="lg:col-span-6 p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
              <div>
                <h3 className="text-base font-semibold text-silo-text">
                  {t("analytics.progressByPlaylist")}
                </h3>
              </div>
              {analytics.playlistProgress.length === 0 ? (
                <p className="text-sm text-silo-muted py-10 text-center">
                  {t("analytics.noPlaylistsYet")}
                </p>
              ) : (
                <div className="space-y-4">
                  {analytics.playlistProgress.map((pl) => (
                    <div key={pl.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium text-silo-text truncate">
                          {pl.name}
                        </span>
                        <span className="font-mono tabular-nums text-silo-muted shrink-0">
                          {pl.completed}/{pl.total} ·{" "}
                          {formatDurationHuman(pl.watchedSeconds)} /{" "}
                          {formatDurationHuman(pl.durationSeconds)} (
                          {pl.progress}%)
                        </span>
                      </div>
                      <ProgressBar percentage={pl.progress} color={pl.color} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
