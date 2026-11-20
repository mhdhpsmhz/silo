import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLibraryData, useSavePlaylist } from "../../hooks/useLibrary";
import { useUiStore } from "../../store/uiStore";
import { ModalShell } from "../ui/ModalShell";
import { VideoThumbnail } from "../ui/VideoThumbnail";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { SiloSelect } from "../ui/SiloSelect";

interface PlaylistFormValues {
  name: string;
  category_id: string;
  description: string;
}

export function PlaylistFormModal() {
  const { t } = useTranslation();
  const { playlistModal, closePlaylistModal } = useUiStore();
  const { library } = useLibraryData();
  const savePlaylist = useSavePlaylist();

  const playlistSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t("modals.playlist.errors.nameRequired")),
        category_id: z.string(),
        description: z.string(),
      }),
    [t],
  );

  const editingPlaylist = useMemo(() => {
    if (!playlistModal.editPlaylistId || !library) return null;
    return library.playlistsById.get(playlistModal.editPlaylistId) ?? null;
  }, [playlistModal.editPlaylistId, library]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PlaylistFormValues>({
    resolver: zodResolver(playlistSchema),
    defaultValues: {
      name: "",
      category_id: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!playlistModal.open) return;
    if (editingPlaylist) {
      reset({
        name: editingPlaylist.name,
        category_id: editingPlaylist.category_id ?? "",
        description: editingPlaylist.description ?? "",
      });
    } else {
      reset({
        name: "",
        category_id: "",
        description: "",
      });
    }
  }, [playlistModal.open, editingPlaylist, reset]);

  const onSubmit = async (values: PlaylistFormValues) => {
    await savePlaylist.mutateAsync({
      id: editingPlaylist?.id,
      name: values.name.trim(),
      category_id: values.category_id || null,
      description: values.description.trim() ? values.description.trim() : null,
    });
    closePlaylistModal();
  };

  const isBusy = isSubmitting || savePlaylist.isPending;

  return (
    <ModalShell
      open={playlistModal.open}
      onClose={closePlaylistModal}
      title={
        editingPlaylist
          ? t("modals.playlist.editTitle")
          : t("modals.playlist.addTitle")
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={closePlaylistModal}
            disabled={isBusy}
            className="h-9 rounded-lg border-silo-border bg-silo-elevated px-4 text-sm font-medium text-silo-text transition-colors hover:bg-silo-border hover:text-silo-text"
          >
            {t("app.cancel")}
          </Button>
          <Button
            type="submit"
            form="silo-playlist-form"
            disabled={isBusy}
            className="h-9 gap-2 rounded-lg bg-silo-text px-4 text-sm font-medium text-silo-bg transition-colors hover:bg-silo-text-hover"
          >
            {isBusy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("app.save")}
          </Button>
        </>
      }
    >
      <form
        id="silo-playlist-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="playlist-name"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.playlist.nameLabel")}{" "}
            <span className="text-silo-danger-text">*</span>
          </label>
          <Input
            id="playlist-name"
            type="text"
            placeholder={t("modals.playlist.namePlaceholder")}
            {...register("name")}
            className="h-10 w-full rounded-lg border-silo-border bg-silo-bg px-3.5 text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0"
          />
          {errors.name && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="playlist-category"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.playlist.mainCategoryLabel")}
          </label>
          <SiloSelect
            value={watch("category_id")}
            onChange={(value) =>
              setValue("category_id", value, { shouldDirty: true })
            }
            ariaLabel={t("modals.playlist.mainCategoryLabel")}
            placeholder={t("app.none")}
            options={[
              { value: "", label: t("app.none") },
              ...(library?.categories ?? []).map((cat) => ({
                value: cat.id,
                label: cat.name,
              })),
            ]}
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-silo-text mb-1.5">
            {t("modals.playlist.coverLabel")}
          </span>
          <div className="space-y-2">
            <VideoThumbnail
              src={editingPlaylist?.cover_thumbnail_url}
              alt={
                editingPlaylist?.name ??
                t("modals.playlist.coverPlaceholderAlt")
              }
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="playlist-description"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.playlist.descriptionLabel")}
          </label>
          <Textarea
            id="playlist-description"
            rows={3}
            placeholder={t("modals.playlist.descriptionPlaceholder")}
            {...register("description")}
            className="w-full resize-y rounded-lg border-silo-border bg-silo-bg px-3.5 py-2 text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0"
          />
        </div>
      </form>
    </ModalShell>
  );
}
