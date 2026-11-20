import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLibraryData, useSaveChannel } from "../../hooks/useLibrary";
import { useUiStore } from "../../store/uiStore";
import { extractChannelHandle, isValidHttpUrl } from "../../utils/youtube";
import { ChannelAvatar } from "../ui/ChannelAvatar";
import { ModalShell } from "../ui/ModalShell";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { SiloSelect } from "../ui/SiloSelect";

interface ChannelFormValues {
  channel_url: string;
  name: string;
  avatar_url: string;
  default_category_id: string;
  notes: string;
}

export function ChannelFormModal() {
  const { t } = useTranslation();
  const { channelModal, closeChannelModal } = useUiStore();
  const { library } = useLibraryData();
  const saveChannel = useSaveChannel();

  const channelSchema = useMemo(
    () =>
      z.object({
        channel_url: z
          .string()
          .trim()
          .min(1, t("modals.channel.errors.urlRequired"))
          .refine(
            (v) => isValidHttpUrl(v),
            t("modals.channel.errors.urlValid"),
          ),
        name: z.string().trim().min(1, t("modals.channel.errors.nameRequired")),
        avatar_url: z
          .string()
          .trim()
          .refine(
            (v) => !v || isValidHttpUrl(v),
            t("modals.channel.errors.avatarValid"),
          ),
        default_category_id: z.string(),
        notes: z.string(),
      }),
    [t],
  );

  const editingChannel = useMemo(() => {
    if (!channelModal.editChannelId || !library) return null;
    return library.channelsById.get(channelModal.editChannelId) ?? null;
  }, [channelModal.editChannelId, library]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema),
    defaultValues: {
      channel_url: "",
      name: "",
      avatar_url: "",
      default_category_id: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!channelModal.open) return;
    if (editingChannel) {
      reset({
        channel_url: editingChannel.channel_url,
        name: editingChannel.name,
        avatar_url: editingChannel.avatar_url ?? "",
        default_category_id: editingChannel.default_category_id ?? "",
        notes: editingChannel.notes ?? "",
      });
    } else {
      reset({
        channel_url: "",
        name: "",
        avatar_url: "",
        default_category_id: "",
        notes: "",
      });
    }
  }, [channelModal.open, editingChannel, reset]);

  const watchedUrl = watch("channel_url");
  const watchedName = watch("name");
  const watchedAvatar = watch("avatar_url");

  useEffect(() => {
    if (!channelModal.open || editingChannel) return;
    const handle = extractChannelHandle(watchedUrl);
    if (handle && !dirtyFields.name) {
      setValue("name", handle, { shouldValidate: true });
    }
  }, [
    channelModal.open,
    editingChannel,
    watchedUrl,
    dirtyFields.name,
    setValue,
  ]);

  const onSubmit = async (values: ChannelFormValues) => {
    await saveChannel.mutateAsync({
      id: editingChannel?.id,
      channel_url: values.channel_url.trim(),
      name: values.name.trim(),
      avatar_url: values.avatar_url.trim() ? values.avatar_url.trim() : null,
      default_category_id: values.default_category_id || null,
      notes: values.notes.trim() ? values.notes.trim() : null,
    });
    closeChannelModal();
  };

  const isBusy = isSubmitting || saveChannel.isPending;

  return (
    <ModalShell
      open={channelModal.open}
      onClose={closeChannelModal}
      title={
        editingChannel
          ? t("modals.channel.editTitle")
          : t("modals.channel.addTitle")
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={closeChannelModal}
            disabled={isBusy}
            className="h-9 rounded-lg border-silo-border bg-silo-elevated px-4 text-sm font-medium text-silo-text transition-colors hover:bg-silo-border hover:text-silo-text"
          >
            {t("app.cancel")}
          </Button>
          <Button
            type="submit"
            form="silo-channel-form"
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
        id="silo-channel-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="channel-url"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.channel.urlLabel")}{" "}
            <span className="text-silo-danger-text">*</span>
          </label>
          <Input
            id="channel-url"
            type="url"
            placeholder={t("modals.channel.urlPlaceholder")}
            {...register("channel_url")}
            className="h-10 w-full rounded-lg border-silo-border bg-silo-bg px-3.5 text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0"
          />
          {errors.channel_url && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.channel_url.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="channel-name"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.channel.nameLabel")}{" "}
            <span className="text-silo-danger-text">*</span>
          </label>
          <Input
            id="channel-name"
            type="text"
            placeholder={t("modals.channel.namePlaceholder")}
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
            htmlFor="channel-avatar"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.channel.avatarLabel")}
          </label>
          <div className="flex items-center gap-3">
            <ChannelAvatar
              name={watchedName || t("commandPalette.kinds.channel")}
              avatarUrl={watchedAvatar || null}
              size="md"
            />
            <Input
              id="channel-avatar"
              type="url"
              placeholder={t("modals.channel.avatarPlaceholder")}
              {...register("avatar_url")}
              className="h-10 flex-1 rounded-lg border-silo-border bg-silo-bg px-3.5 text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0"
            />
          </div>
          {errors.avatar_url && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.avatar_url.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="channel-category"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.channel.defaultCategoryLabel")}
          </label>
          <SiloSelect
            value={watch("default_category_id")}
            onChange={(value) =>
              setValue("default_category_id", value, { shouldDirty: true })
            }
            ariaLabel={t("modals.channel.defaultCategoryLabel")}
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
          <label
            htmlFor="channel-notes"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.channel.notesLabel")}
          </label>
          <Textarea
            id="channel-notes"
            rows={3}
            placeholder={t("modals.channel.notesPlaceholder")}
            {...register("notes")}
            className="w-full resize-y rounded-lg border-silo-border bg-silo-bg px-3.5 py-2 text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0"
          />
        </div>
      </form>
    </ModalShell>
  );
}
