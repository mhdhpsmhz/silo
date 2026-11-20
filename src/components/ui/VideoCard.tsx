import { Link } from '@tanstack/react-router';
import {
  Archive,
  ArchiveRestore,
  CheckCircle2,
  CircleDot,
  Clock,
  Edit3,
  Heart,
  ListCheck,
  ListPlus,
  Play,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useAddToWatchQueue,
  useLibraryData,
  useRemoveFromWatchQueue,
} from '../../hooks/useLibrary';
import { translateVideoStatus } from '../../i18n';
import type { VideoWithRelations } from '../../types/silo';
import { formatSecondsToClock } from '../../utils/progress';
import { getYouTubeThumbnailFallbackUrl } from '../../utils/youtube';
import { ProgressBar } from './ProgressBar';
import { VideoThumbnail } from './VideoThumbnail';

import { SiloButton } from '@/components/ui/SiloButton';
interface VideoCardProps {
  video: VideoWithRelations;
  layout?: 'grid' | 'list';
  onEdit?: (video: VideoWithRelations) => void;
  onDelete?: (video: VideoWithRelations) => void;
  onToggleFavorite?: (video: VideoWithRelations) => void;
  onToggleArchive?: (video: VideoWithRelations) => void;
  onMarkCompleted?: (video: VideoWithRelations) => void;
}

export function VideoCard({
  video,
  layout = 'grid',
  onEdit,
  onDelete,
  onToggleFavorite,
  onToggleArchive,
  onMarkCompleted,
}: VideoCardProps) {
  const { t } = useTranslation();
  const { library } = useLibraryData();
  const addToQueue = useAddToWatchQueue();
  const removeFromQueue = useRemoveFromWatchQueue();
  const isQueued = library?.queuedVideoIds.has(video.id) ?? false;
  const accentColor = video.category?.color ?? '#48929B';
  const statusLabel = translateVideoStatus(video.status, t);

  const statusIcon =
    video.status === 'Completed' ? (
      <CheckCircle2 className="w-3.5 h-3.5 text-silo-success" />
    ) : video.status === 'In Progress' ? (
      <CircleDot className="w-3.5 h-3.5 text-silo-warning" />
    ) : (
      <Clock className="w-3.5 h-3.5 text-silo-muted" />
    );

  const actionBar = (
    <div className="flex items-center justify-between gap-2 pt-3 border-t border-silo-border">
      <Link
        to="/videos/$videoId"
        params={{ videoId: video.id }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-silo-elevated text-silo-text border border-silo-border hover:bg-silo-border transition-colors whitespace-nowrap shrink-0"
      >
        <Play className="w-3.5 h-3.5" />
        {video.last_watched_seconds > 0 && !video.is_completed
          ? t('videoCard.continue')
          : t('videoCard.watch')}
      </Link>

      <div className="flex items-center gap-1">
        {onToggleFavorite && (
          <SiloButton
            type="button"
            onClick={() => onToggleFavorite(video)}
            aria-label={
              video.is_favorite
                ? t('videoCard.removeFavoriteAria', { title: video.title })
                : t('videoCard.addFavoriteAria', { title: video.title })
            }
            title={
              video.is_favorite
                ? t('videoCard.removeFavoriteTitle')
                : t('videoCard.addFavoriteTitle')
            }
            className={`p-2 rounded-lg transition-colors ${
              video.is_favorite
                ? 'text-silo-danger-text bg-silo-elevated'
                : 'text-silo-muted hover:text-silo-text hover:bg-silo-elevated'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${video.is_favorite ? 'fill-current' : ''}`} />
          </SiloButton>
        )}

        {!video.is_archived && (
          <SiloButton
            type="button"
            onClick={() =>
              isQueued ? removeFromQueue.mutate(video.id) : addToQueue.mutate(video.id)
            }
            disabled={addToQueue.isPending || removeFromQueue.isPending}
            aria-label={
              isQueued
                ? t('videoCard.removeQueueAria', { title: video.title })
                : t('videoCard.addQueueAria', { title: video.title })
            }
            title={
              isQueued ? t('videoCard.removeQueueTitle') : t('videoCard.addQueueTitle')
            }
            className={`p-2 rounded-lg transition-colors ${
              isQueued
                ? 'text-silo-text bg-silo-elevated'
                : 'text-silo-muted hover:text-silo-text hover:bg-silo-elevated'
            }`}
          >
            {isQueued ? (
              <ListCheck className="w-3.5 h-3.5" />
            ) : (
              <ListPlus className="w-3.5 h-3.5" />
            )}
          </SiloButton>
        )}

        {onMarkCompleted && !video.is_completed && (
          <SiloButton
            type="button"
            onClick={() => onMarkCompleted(video)}
            aria-label={t('videoCard.markCompletedAria', { title: video.title })}
            title={t('videoCard.markCompletedTitle')}
            className="p-2 rounded-lg text-silo-muted hover:text-silo-success hover:bg-silo-elevated transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </SiloButton>
        )}

        {onEdit && (
          <SiloButton
            type="button"
            onClick={() => onEdit(video)}
            aria-label={t('videoCard.editVideoAria', { title: video.title })}
            title={t('videoCard.editVideoTitle')}
            className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </SiloButton>
        )}

        {onToggleArchive && (
          <SiloButton
            type="button"
            onClick={() => onToggleArchive(video)}
            aria-label={
              video.is_archived
                ? t('videoCard.restoreAria', { title: video.title })
                : t('videoCard.archiveAria', { title: video.title })
            }
            title={
              video.is_archived
                ? t('videoCard.restoreTitle')
                : t('videoCard.archiveTitle')
            }
            className="p-2 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated transition-colors"
          >
            {video.is_archived ? (
              <ArchiveRestore className="w-3.5 h-3.5" />
            ) : (
              <Archive className="w-3.5 h-3.5" />
            )}
          </SiloButton>
        )}

        {onDelete && (
          <SiloButton
            type="button"
            onClick={() => onDelete(video)}
            aria-label={t('videoCard.deleteVideoAria', { title: video.title })}
            title={t('videoCard.deleteVideoTitle')}
            className="p-2 rounded-lg text-silo-muted hover:text-silo-danger-text hover:bg-silo-elevated transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </SiloButton>
        )}
      </div>
    </div>
  );

  if (layout === 'list') {
    return (
      <article className="flex flex-col sm:flex-row gap-4 p-4 bg-silo-surface border border-silo-border rounded-xl hover:border-silo-border-hover transition-colors">
        <Link
          to="/videos/$videoId"
          params={{ videoId: video.id }}
          className="sm:w-56 shrink-0 block"
        >
          <VideoThumbnail
            src={video.thumbnail_url}
            fallbackSrc={getYouTubeThumbnailFallbackUrl(video.youtube_video_id)}
            alt={video.title}
          />
        </Link>

        <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-silo-muted flex-wrap">
              {video.category && (
                <span className="inline-flex items-center gap-1.5 text-silo-text">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: video.category.color }}
                  />
                  {video.category.name}
                </span>
              )}
              {video.category && video.channel && <span aria-hidden="true">·</span>}
              {video.channel && <span>{video.channel.name}</span>}
              {video.labels.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-silo-muted truncate">
                    {video.labels.map((l) => l.name).join(' / ')}
                  </span>
                </>
              )}
            </div>

            <Link
              to="/videos/$videoId"
              params={{ videoId: video.id }}
              className="block text-base font-semibold text-silo-text hover:underline line-clamp-2"
            >
              {video.title}
            </Link>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-silo-text-secondary">
                {statusIcon}
                <span>{statusLabel}</span>
              </span>
              <span className="font-mono tabular-nums text-silo-muted">
                {video.duration_seconds > 0
                  ? `${formatSecondsToClock(video.last_watched_seconds)} / ${formatSecondsToClock(video.duration_seconds)} (${video.progress_percentage}%)`
                  : `${video.progress_percentage}%`}
              </span>
            </div>
            <ProgressBar percentage={video.progress_percentage} color={accentColor} />
            {actionBar}
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="flex flex-col bg-silo-surface border border-silo-border rounded-xl overflow-hidden hover:border-silo-border-hover transition-colors">
      <Link
        to="/videos/$videoId"
        params={{ videoId: video.id }}
        className="block p-3 pb-0"
      >
        <VideoThumbnail
          src={video.thumbnail_url}
          fallbackSrc={getYouTubeThumbnailFallbackUrl(video.youtube_video_id)}
          alt={video.title}
        />
      </Link>

      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-silo-muted truncate">
            {video.category && (
              <span className="inline-flex items-center gap-1.5 text-silo-text-secondary shrink-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: video.category.color }}
                />
                {video.category.name}
              </span>
            )}
            {video.category && video.channel && <span aria-hidden="true">·</span>}
            {video.channel && <span className="truncate">{video.channel.name}</span>}
          </div>

          <Link
            to="/videos/$videoId"
            params={{ videoId: video.id }}
            className="block text-sm font-semibold text-silo-text hover:underline line-clamp-2 leading-snug"
          >
            {video.title}
          </Link>

          {video.labels.length > 0 && (
            <p className="text-xs text-silo-muted truncate">
              {video.labels.map((l) => l.name).join(' · ')}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-silo-text-secondary">
                {statusIcon}
                <span>{statusLabel}</span>
              </span>
              <span className="font-mono tabular-nums text-silo-text">
                {video.progress_percentage}%
              </span>
            </div>
            <ProgressBar percentage={video.progress_percentage} color={accentColor} />
          </div>
          {actionBar}
        </div>
      </div>
    </article>
  );
}
