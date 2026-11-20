import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLibraryData, useSaveVideo } from "../../hooks/useLibrary";
import { fetchYouTubeOEmbed } from "../../services/libraryApi";
import { useUiStore } from "../../store/uiStore";
import {
  extractYouTubeVideoId,
  getYouTubeThumbnailFallbackUrl,
  getYouTubeThumbnailUrl,
  isValidYouTubeUrl,
} from "../../utils/youtube";
import { ModalShell } from "../ui/ModalShell";
import { VideoThumbnail } from "../ui/VideoThumbnail";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloTextarea } from "@/components/ui/SiloTextarea";
import { SiloSelect } from "../ui/SiloSelect";
interface VideoFormValues {
  url: string;
  title: string;
  channel_id: string;
  category_id: string;
  label_ids: string[];
  playlist_ids: string[];
  notes: string;
}

export function VideoFormModal() {
  const { t } = useTranslation();
  const { videoModal, closeVideoModal, openCategoryModal } = useUiStore();
  const { library } = useLibraryData();
  const saveVideo = useSaveVideo();

  const [oembedLoading, setOembedLoading] = useState(false);
  const [oembedNote, setOembedNote] = useState<string | null>(null);
  const [lastFetchedVideoId, setLastFetchedVideoId] = useState<string | null>(
    null,
  );

  const videoSchema = useMemo(
    () =>
      z.object({
        url: z
          .string()
          .trim()
          .min(1, t("modals.video.errors.urlRequired"))
          .refine(
            (val) => isValidYouTubeUrl(val),
            t("modals.video.errors.urlValid"),
          ),
        title: z.string().trim().min(1, t("modals.video.errors.titleRequired")),
        channel_id: z.string(),
        category_id: z
          .string()
          .min(1, t("modals.video.errors.categoryRequired")),
        label_ids: z.array(z.string()),
        playlist_ids: z.array(z.string()),
        notes: z.string(),
      }),
    [t],
  );

  const editingVideo = useMemo(() => {
    if (!videoModal.editVideoId || !library) return null;
    return library.videosById.get(videoModal.editVideoId) ?? null;
  }, [videoModal.editVideoId, library]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema),
    defaultValues: {
      url: "",
      title: "",
      channel_id: "",
      category_id: "",
      label_ids: [],
      playlist_ids: [],
      notes: "",
    },
  });

  useEffect(() => {
    if (!videoModal.open) return;
    setOembedNote(null);

    if (editingVideo) {
      setLastFetchedVideoId(editingVideo.youtube_video_id);
      reset({
        url: editingVideo.url,
        title: editingVideo.title,
        channel_id: editingVideo.channel_id ?? "",
        category_id: editingVideo.category_id ?? "",
        label_ids: editingVideo.labels.map((l) => l.id),
        playlist_ids: editingVideo.playlists.map((p) => p.id),
        notes: editingVideo.notes ?? "",
      });
    } else {
      setLastFetchedVideoId(null);
      const defaultChannel = videoModal.defaultChannelId
        ? library?.channelsById.get(videoModal.defaultChannelId)
        : null;
      const defaultLabel = videoModal.defaultLabelId
        ? library?.labels.find((l) => l.id === videoModal.defaultLabelId)
        : null;
      const initialCategory =
        videoModal.defaultCategoryId ??
        defaultLabel?.category_id ??
        defaultChannel?.default_category_id ??
        "";
      const initialLabelIds =
        defaultLabel && defaultLabel.category_id === initialCategory
          ? [defaultLabel.id]
          : [];
      reset({
        url: "",
        title: "",
        channel_id: videoModal.defaultChannelId ?? "",
        category_id: initialCategory,
        label_ids: initialLabelIds,
        playlist_ids: videoModal.defaultPlaylistId
          ? [videoModal.defaultPlaylistId]
          : [],
        notes: "",
      });
    }
  }, [
    videoModal.open,
    videoModal.defaultChannelId,
    videoModal.defaultCategoryId,
    videoModal.defaultLabelId,
    videoModal.defaultPlaylistId,
    editingVideo,
    library,
    reset,
  ]);

  const watchedUrl = watch("url");
  const watchedChannelId = watch("channel_id");
  const watchedCategoryId = watch("category_id");
  const watchedLabelIds = watch("label_ids");
  const watchedTitle = watch("title");

  const parsedVideoId = useMemo(
    () => extractYouTubeVideoId(watchedUrl),
    [watchedUrl],
  );
  const previewThumb = parsedVideoId
    ? getYouTubeThumbnailUrl(parsedVideoId, "hq")
    : null;

  useEffect(() => {
    if (!videoModal.open || !parsedVideoId) return;
    if (parsedVideoId === lastFetchedVideoId) return;

    let cancelled = false;
    setLastFetchedVideoId(parsedVideoId);
    setOembedLoading(true);
    setOembedNote(null);

    fetchYouTubeOEmbed(`https://www.youtube.com/watch?v=${parsedVideoId}`)
      .then((res) => {
        if (cancelled) return;
        if (res && res.title) {
          if (!watchedTitle.trim() || !editingVideo) {
            setValue("title", res.title, { shouldValidate: true });
          }
          setOembedNote(
            res.author_name
              ? t("modals.video.detectedAuthor", { author: res.author_name })
              : t("modals.video.metadataLoaded"),
          );
        } else {
          setOembedNote(t("modals.video.oembedFallback"));
        }
      })
      .finally(() => {
        if (!cancelled) setOembedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    videoModal.open,
    parsedVideoId,
    lastFetchedVideoId,
    watchedTitle,
    editingVideo,
    setValue,
    t,
  ]);

  const handleChannelChange = (channelId: string) => {
    setValue("channel_id", channelId);
    if (!channelId || !library) return;
    const ch = library.channelsById.get(channelId);
    if (ch?.default_category_id) {
      setValue("category_id", ch.default_category_id, { shouldValidate: true });
      const validIds = new Set(
        (library.labelsByCategoryId.get(ch.default_category_id) ?? []).map(
          (l) => l.id,
        ),
      );
      setValue(
        "label_ids",
        watchedLabelIds.filter((id) => validIds.has(id)),
      );
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setValue("category_id", categoryId, { shouldValidate: true });
    if (!library) {
      setValue("label_ids", []);
      return;
    }
    const validIds = new Set(
      (library.labelsByCategoryId.get(categoryId) ?? []).map((l) => l.id),
    );
    setValue(
      "label_ids",
      watchedLabelIds.filter((id) => validIds.has(id)),
    );
  };

  const availableLabels = useMemo(() => {
    if (!library || !watchedCategoryId) return [];
    return library.labelsByCategoryId.get(watchedCategoryId) ?? [];
  }, [library, watchedCategoryId]);

  const handleManualOembedRefresh = async () => {
    if (!parsedVideoId) return;
    setOembedLoading(true);
    setOembedNote(null);
    const res = await fetchYouTubeOEmbed(
      `https://www.youtube.com/watch?v=${parsedVideoId}`,
    );
    setOembedLoading(false);
    if (res?.title) {
      setValue("title", res.title, { shouldValidate: true });
      setOembedNote(t("modals.video.oembedRefreshed"));
    } else {
      setOembedNote(t("modals.video.oembedUnavailable"));
    }
  };

  const onSubmit = async (values: VideoFormValues) => {
    const ytId = extractYouTubeVideoId(values.url);
    if (!ytId) {
      setError("url", { message: t("modals.video.errors.urlInvalid") });
      return;
    }

    const dup = library?.videos.find(
      (v) => v.youtube_video_id === ytId && v.id !== editingVideo?.id,
    );
    if (dup) {
      setError("url", {
        message: t("modals.video.errors.duplicateVideo", { title: dup.title }),
      });
      return;
    }

    await saveVideo.mutateAsync({
      id: editingVideo?.id,
      youtube_video_id: ytId,
      url: values.url.trim(),
      title: values.title.trim(),
      thumbnail_url: getYouTubeThumbnailUrl(ytId, "hq"),
      channel_id: values.channel_id || null,
      category_id: values.category_id,
      label_ids: values.label_ids,
      playlist_ids: values.playlist_ids,
      notes: values.notes.trim() ? values.notes.trim() : null,
    });
    closeVideoModal();
  };

  const isBusy = isSubmitting || saveVideo.isPending;

  return (
    <ModalShell
      open={videoModal.open}
      onClose={closeVideoModal}
      title={
        editingVideo ? t("modals.video.editTitle") : t("modals.video.addTitle")
      }
      footer={
        <>
          <SiloButton
            type="button"
            onClick={closeVideoModal}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-silo-border bg-silo-elevated text-silo-text hover:bg-silo-border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {t("app.cancel")}
          </SiloButton>
          <SiloButton
            type="submit"
            form="silo-video-form"
            disabled={isBusy}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("app.save")}
          </SiloButton>
        </>
      }
    >
      <form
        id="silo-video-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="video-url"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.video.urlLabel")}{" "}
            <span className="text-silo-danger-text">*</span>
          </label>
          <div className="flex gap-2">
            <SiloInput
              id="video-url"
              type="url"
              placeholder={t("modals.video.urlPlaceholder")}
              {...register("url")}
              className="flex-1 px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
            {parsedVideoId && (
              <SiloButton
                type="button"
                onClick={handleManualOembedRefresh}
                disabled={oembedLoading}
                aria-label={t("modals.video.fetchTitleAria")}
                className="px-3 py-2 rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors shrink-0 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${oembedLoading ? "animate-spin" : ""}`}
                />
              </SiloButton>
            )}
          </div>
          {errors.url && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.url.message}
            </p>
          )}
          {oembedLoading && (
            <p className="text-xs text-silo-muted mt-1.5">
              {t("modals.video.fetchingOembed")}
            </p>
          )}
          {!oembedLoading && oembedNote && (
            <p className="text-xs text-silo-muted mt-1.5">{oembedNote}</p>
          )}
        </div>

        {parsedVideoId && previewThumb && (
          <div>
            <p className="block text-xs font-medium text-silo-muted mb-1.5">
              {t("modals.video.thumbnailPreview")}
            </p>
            <VideoThumbnail
              src={previewThumb}
              fallbackSrc={getYouTubeThumbnailFallbackUrl(parsedVideoId)}
              alt={watchedTitle || t("modals.video.thumbnailAltFallback")}
            />
          </div>
        )}

        <div>
          <label
            htmlFor="video-title"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.video.titleLabel")}{" "}
            <span className="text-silo-danger-text">*</span>
          </label>
          <SiloInput
            id="video-title"
            type="text"
            placeholder={t("modals.video.titlePlaceholder")}
            {...register("title")}
            className="w-full px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
          />
          {errors.title && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.title.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="video-channel"
              className="block text-sm font-medium text-silo-text mb-1.5"
            >
              {t("modals.video.channelLabel")}
            </label>
            <SiloSelect
              value={watchedChannelId}
              onChange={handleChannelChange}
              ariaLabel={t("modals.video.channelLabel")}
              placeholder={t("modals.video.noChannel")}
              options={[
                { value: "", label: t("modals.video.noChannel") },
                ...(library?.channels ?? []).map((ch) => ({
                  value: ch.id,
                  label: ch.name,
                })),
              ]}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="video-category"
                className="block text-sm font-medium text-silo-text"
              >
                {t("modals.video.categoryLabel")}{" "}
                <span className="text-silo-danger-text">*</span>
              </label>
              {(library?.categories.length ?? 0) === 0 && (
                <SiloButton
                  type="button"
                  onClick={() => openCategoryModal()}
                  className="text-xs text-silo-text underline"
                >
                  {t("modals.video.createCategory")}
                </SiloButton>
              )}
            </div>
            <SiloSelect
              value={watchedCategoryId}
              onChange={handleCategoryChange}
              ariaLabel={t("modals.video.categoryLabel")}
              placeholder={t("modals.video.selectCategory")}
              options={[
                { value: "", label: t("modals.video.selectCategory") },
                ...(library?.categories ?? []).map((cat) => ({
                  value: cat.id,
                  label: cat.name,
                })),
              ]}
            />
            {errors.category_id && (
              <p className="text-xs text-silo-danger-text mt-1.5">
                {errors.category_id.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-silo-text mb-1.5">
            {t("modals.video.labelsLabel")}
          </span>
          {!watchedCategoryId ? (
            <p className="text-xs text-silo-muted py-2 px-3 bg-silo-bg border border-silo-border rounded-lg">
              {t("modals.video.selectCategoryForLabels")}
            </p>
          ) : availableLabels.length === 0 ? (
            <p className="text-xs text-silo-muted py-2 px-3 bg-silo-bg border border-silo-border rounded-lg">
              {t("modals.video.noLabelsInCategory")}
            </p>
          ) : (
            <Controller
              name="label_ids"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {availableLabels.map((label) => {
                    const selected = field.value.includes(label.id);
                    return (
                      <SiloButton
                        key={label.id}
                        type="button"
                        onClick={() => {
                          const next = selected
                            ? field.value.filter((id) => id !== label.id)
                            : [...field.value, label.id];
                          field.onChange(next);
                        }}
                        aria-pressed={selected}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          selected
                            ? "bg-silo-text text-silo-bg border-silo-text"
                            : "bg-silo-bg text-silo-text-secondary border-silo-border hover:border-silo-subtle"
                        }`}
                      >
                        {selected && <Check className="w-3 h-3" />}
                        {label.name}
                      </SiloButton>
                    );
                  })}
                </div>
              )}
            />
          )}
        </div>

        <div>
          <span className="block text-sm font-medium text-silo-text mb-1.5">
            {t("modals.video.playlistsLabel")}
          </span>
          {(library?.playlists.length ?? 0) === 0 ? (
            <p className="text-xs text-silo-muted py-2 px-3 bg-silo-bg border border-silo-border rounded-lg">
              {t("modals.video.noPlaylistsYet")}
            </p>
          ) : (
            <Controller
              name="playlist_ids"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-silo-bg border border-silo-border rounded-lg">
                  {(library?.playlists ?? []).map((pl) => {
                    const checked = field.value.includes(pl.id);
                    return (
                      <label
                        key={pl.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-silo-surface cursor-pointer text-sm text-silo-text"
                      >
                        <SiloInput
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...field.value, pl.id]
                              : field.value.filter((id) => id !== pl.id);
                            field.onChange(next);
                          }}
                          className="w-4 h-4 accent-silo-text rounded"
                        />
                        <span className="truncate">{pl.name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          )}
        </div>

        <div>
          <label
            htmlFor="video-notes"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.video.notesLabel")}
          </label>
          <SiloTextarea
            id="video-notes"
            rows={3}
            placeholder={t("modals.video.notesPlaceholder")}
            {...register("notes")}
            className="w-full px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text resize-y"
          />
        </div>
      </form>
    </ModalShell>
  );
}
