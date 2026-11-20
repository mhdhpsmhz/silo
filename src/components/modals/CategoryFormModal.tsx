import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Icon } from "@iconify/react";
import { Check, Loader2, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLibraryData, useSaveCategory } from "../../hooks/useLibrary";
import { useUiStore } from "../../store/uiStore";
import {
  CATEGORY_ICON_OPTIONS,
  DEFAULT_CATEGORY_ICON,
  DENTOU_IRO_COLORS,
} from "../../utils/constants";
import { ModalShell } from "../ui/ModalShell";

import { SiloButton } from "@/components/ui/SiloButton";
import { SiloInput } from "@/components/ui/SiloInput";
import { SiloTextarea } from "@/components/ui/SiloTextarea";
interface CategoryFormValues {
  name: string;
  icon_name: string;
  color: string;
  label_names: string[];
  description: string;
}

interface IconifySearchResponse {
  icons?: string[];
  total?: number;
  limit?: number;
  start?: number;
}

async function searchIconifyIcons(
  query: string,
  start: number,
  signal: AbortSignal,
): Promise<IconifySearchResponse> {
  const hosts = [
    "https://api.iconify.design",
    "https://api.simplesvg.com",
    "https://api.unisvg.com",
  ];

  for (const host of hosts) {
    try {
      const params = new URLSearchParams({
        query,
        limit: "64",
        start: String(start),
      });
      const response = await fetch(`${host}/search?${params}`, { signal });
      if (!response.ok) continue;
      const result = (await response.json()) as IconifySearchResponse;
      if (Array.isArray(result.icons)) return result;
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }

  throw new Error("Iconify search is unavailable");
}

function iconOptionFromName(name: string): {
  name: string;
  label: string;
  keywords: string[];
} {
  const shortName = name.split(":").at(-1) ?? name;
  return {
    name,
    label: shortName.replace(/[-_]/g, " "),
    keywords: [],
  };
}

export function CategoryFormModal() {
  const { t } = useTranslation();
  const { categoryModal, closeCategoryModal } = useUiStore();
  const { library } = useLibraryData();
  const saveCategory = useSaveCategory();

  const [iconQuery, setIconQuery] = useState("");
  const [iconSearchResults, setIconSearchResults] = useState<string[] | null>(
    null,
  );
  const [iconSearchLoading, setIconSearchLoading] = useState(false);
  const [iconSearchError, setIconSearchError] = useState(false);
  const [iconSearchHasMore, setIconSearchHasMore] = useState(false);
  const iconSearchRequestId = useRef(0);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);

  const categorySchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t("modals.category.errors.nameRequired")),
        icon_name: z
          .string()
          .trim()
          .min(1, t("modals.category.errors.iconRequired")),
        color: z
          .string()
          .trim()
          .min(1, t("modals.category.errors.colorRequired")),
        label_names: z.array(z.string()),
        description: z.string(),
      }),
    [t],
  );

  const editingCategory = useMemo(() => {
    if (!categoryModal.editCategoryId || !library) return null;
    return library.categoriesById.get(categoryModal.editCategoryId) ?? null;
  }, [categoryModal.editCategoryId, library]);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      icon_name: DEFAULT_CATEGORY_ICON,
      color: DENTOU_IRO_COLORS[0].hex,
      label_names: [],
      description: "",
    },
  });

  useEffect(() => {
    if (!categoryModal.open) return;
    setIconQuery("");
    setIconSearchResults(null);
    setIconSearchError(false);
    setIconSearchHasMore(false);
    setLabelDraft("");
    setLabelError(null);

    if (editingCategory) {
      reset({
        name: editingCategory.name,
        icon_name: editingCategory.icon_name || DEFAULT_CATEGORY_ICON,
        color: editingCategory.color || DENTOU_IRO_COLORS[0].hex,
        label_names: editingCategory.labels.map((l) => l.name),
        description: editingCategory.description ?? "",
      });
    } else {
      reset({
        name: "",
        icon_name: DEFAULT_CATEGORY_ICON,
        color: DENTOU_IRO_COLORS[0].hex,
        label_names: [],
        description: "",
      });
    }
  }, [categoryModal.open, editingCategory, reset]);

  const watchedIcon = watch("icon_name");
  const watchedColor = watch("color");
  const watchedLabels = watch("label_names");

  useEffect(() => {
    const query = iconQuery.trim();
    const requestId = ++iconSearchRequestId.current;
    if (!categoryModal.open || !query) {
      setIconSearchResults(null);
      setIconSearchLoading(false);
      setIconSearchError(false);
      setIconSearchHasMore(false);
      return;
    }

    setIconSearchResults([]);
    setIconSearchLoading(true);
    setIconSearchError(false);
    setIconSearchHasMore(false);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchIconifyIcons(query, 0, controller.signal);
        if (requestId !== iconSearchRequestId.current) return;
        const icons = result.icons ?? [];
        setIconSearchResults(icons);
        setIconSearchHasMore(icons.length >= (result.limit ?? 64));
      } catch {
        if (
          !controller.signal.aborted &&
          requestId === iconSearchRequestId.current
        ) {
          setIconSearchResults([]);
          setIconSearchHasMore(false);
          setIconSearchError(true);
        }
      } finally {
        if (
          !controller.signal.aborted &&
          requestId === iconSearchRequestId.current
        ) {
          setIconSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [categoryModal.open, iconQuery]);

  const filteredIcons = useMemo(() => {
    const options =
      iconSearchResults === null
        ? CATEGORY_ICON_OPTIONS
        : iconSearchResults.map(iconOptionFromName);
    if (
      !iconQuery.trim() &&
      watchedIcon &&
      !options.some((option) => option.name === watchedIcon)
    ) {
      return [iconOptionFromName(watchedIcon), ...options];
    }
    return options;
  }, [iconQuery, iconSearchResults, watchedIcon]);

  const loadMoreIcons = async () => {
    const query = iconQuery.trim();
    if (!query || !iconSearchResults?.length || iconSearchLoading) return;
    const controller = new AbortController();
    const requestId = ++iconSearchRequestId.current;
    setIconSearchLoading(true);
    setIconSearchError(false);
    try {
      const result = await searchIconifyIcons(
        query,
        iconSearchResults.length,
        controller.signal,
      );
      if (
        requestId !== iconSearchRequestId.current ||
        query !== iconQuery.trim()
      )
        return;
      const nextIcons = result.icons ?? [];
      setIconSearchResults((current) => [...(current ?? []), ...nextIcons]);
      setIconSearchHasMore(nextIcons.length >= (result.limit ?? 64));
    } catch {
      if (requestId === iconSearchRequestId.current) setIconSearchError(true);
    } finally {
      if (requestId === iconSearchRequestId.current)
        setIconSearchLoading(false);
    }
  };

  const selectedColorMeta = useMemo(
    () =>
      DENTOU_IRO_COLORS.find(
        (c) => c.hex.toUpperCase() === watchedColor.toUpperCase(),
      ),
    [watchedColor],
  );

  const addLabelDraft = () => {
    const clean = labelDraft.trim();
    if (!clean) return;
    const duplicate = watchedLabels.some(
      (l) => l.toLowerCase() === clean.toLowerCase(),
    );
    if (duplicate) {
      setLabelError(t("modals.category.duplicateLabelError"));
      return;
    }
    setLabelError(null);
    setValue("label_names", [...watchedLabels, clean]);
    setLabelDraft("");
  };

  const handleLabelKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLabelDraft();
    }
  };

  const onSubmit = async (values: CategoryFormValues) => {
    const cleanName = values.name.trim();
    const dup = library?.categories.find(
      (c) =>
        c.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        c.id !== editingCategory?.id,
    );
    if (dup) {
      setError("name", { message: t("modals.category.errors.nameUnique") });
      return;
    }

    await saveCategory.mutateAsync({
      id: editingCategory?.id,
      name: cleanName,
      icon_name: values.icon_name,
      color: values.color,
      label_names: values.label_names,
      description: values.description.trim() ? values.description.trim() : null,
    });
    closeCategoryModal();
  };

  const isBusy = isSubmitting || saveCategory.isPending;

  return (
    <ModalShell
      open={categoryModal.open}
      onClose={closeCategoryModal}
      title={
        editingCategory
          ? t("modals.category.editTitle")
          : t("modals.category.addTitle")
      }
      footer={
        <>
          <SiloButton
            type="button"
            onClick={closeCategoryModal}
            disabled={isBusy}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-silo-border bg-silo-elevated text-silo-text hover:bg-silo-border transition-colors whitespace-nowrap shrink-0 disabled:opacity-50"
          >
            {t("app.cancel")}
          </SiloButton>
          <SiloButton
            type="submit"
            form="silo-category-form"
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
        id="silo-category-form"
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="category-name"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.category.nameLabel")}{" "}
            <span className="text-silo-danger-text">*</span>
          </label>
          <SiloInput
            id="category-name"
            type="text"
            placeholder={t("modals.category.namePlaceholder")}
            {...register("name")}
            className="w-full px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
          />
          {errors.name && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.name.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-silo-text">
              {t("modals.category.iconPickerLabel")}{" "}
              <span className="text-silo-danger-text">*</span>
            </span>
            <div className="inline-flex items-center gap-2 text-xs text-silo-text-secondary">
              <span>{t("modals.category.selected")}</span>
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-silo-border"
                style={{ backgroundColor: watchedColor }}
              >
                <Icon icon={watchedIcon} className="w-4 h-4 text-silo-text" />
              </span>
              <span className="font-mono text-silo-muted">{watchedIcon}</span>
            </div>
          </div>

          <div className="relative mb-2.5">
            <Search className="w-4 h-4 text-silo-subtle absolute left-3 top-1/2 -translate-y-1/2" />
            <SiloInput
              type="text"
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              placeholder={t("modals.category.searchIconsPlaceholder")}
              aria-label={t("modals.category.searchIconsAria")}
              className="w-full pl-9 pr-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
          </div>

          {iconSearchLoading && (
            <p
              className="mb-2 flex items-center gap-2 text-xs text-silo-muted"
              role="status"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("modals.category.searchIconsLoading")}
            </p>
          )}
          {iconSearchError && (
            <p className="mb-2 text-xs text-silo-danger-text" role="alert">
              {t("modals.category.searchIconsError")}
            </p>
          )}

          <Controller
            name="icon_name"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-36 overflow-y-auto p-2 bg-silo-bg border border-silo-border rounded-lg">
                {filteredIcons.map((opt) => {
                  const active = field.value === opt.name;
                  return (
                    <SiloButton
                      key={opt.name}
                      type="button"
                      onClick={() => field.onChange(opt.name)}
                      title={opt.label}
                      aria-label={t("modals.category.selectIconAria", {
                        label: opt.label,
                      })}
                      aria-pressed={active}
                      className={`flex items-center justify-center h-10 rounded-lg border transition-colors ${
                        active
                          ? "bg-silo-text text-silo-bg border-silo-text"
                          : "bg-silo-surface text-silo-text-secondary border-silo-border hover:border-silo-subtle"
                      }`}
                    >
                      <Icon icon={opt.name} className="w-4 h-4" />
                    </SiloButton>
                  );
                })}
                {filteredIcons.length === 0 &&
                  !iconSearchLoading &&
                  !iconSearchError && (
                    <div className="col-span-full py-3 text-center text-xs text-silo-muted">
                      {t("modals.category.noIconsFound")}
                    </div>
                  )}
              </div>
            )}
          />
          {iconSearchHasMore && (
            <div className="mt-2 flex justify-center">
              <SiloButton
                type="button"
                disabled={iconSearchLoading}
                onClick={() => void loadMoreIcons()}
                className="rounded-lg border border-silo-border bg-silo-elevated px-3 py-1.5 text-xs text-silo-text hover:bg-silo-border"
              >
                {t("modals.category.loadMoreIcons")}
              </SiloButton>
            </div>
          )}
          {errors.icon_name && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.icon_name.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-silo-text">
              {t("modals.category.colorLabel")}{" "}
              <span className="text-silo-danger-text">*</span>
            </span>
            <span className="inline-flex items-center gap-2 text-xs font-mono text-silo-text-secondary">
              <span
                className="w-3.5 h-3.5 rounded-sm border border-silo-border"
                style={{ backgroundColor: watchedColor }}
              />
              {selectedColorMeta
                ? `${selectedColorMeta.japanese} (${watchedColor})`
                : watchedColor}
            </span>
          </div>

          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2.5">
                {DENTOU_IRO_COLORS.map((swatch) => {
                  const active =
                    field.value.toUpperCase() === swatch.hex.toUpperCase();
                  return (
                    <SiloButton
                      key={swatch.hex}
                      type="button"
                      onClick={() => field.onChange(swatch.hex)}
                      aria-label={t("modals.category.colorAria", {
                        name: swatch.name,
                        hex: swatch.hex,
                      })}
                      aria-pressed={active}
                      className={`h-10 rounded-lg flex items-center justify-center border transition-transform ${
                        active
                          ? "border-silo-text ring-2 ring-silo-text scale-[1.03]"
                          : "border-silo-border hover:border-silo-muted"
                      }`}
                      style={{ backgroundColor: swatch.hex }}
                    >
                      {active && <Check className="w-4 h-4 text-silo-text" />}
                    </SiloButton>
                  );
                })}
              </div>
            )}
          />
          {errors.color && (
            <p className="text-xs text-silo-danger-text mt-1.5">
              {errors.color.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="category-label-input"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.category.labelsLabel")}
          </label>
          <div className="flex gap-2">
            <SiloInput
              id="category-label-input"
              type="text"
              value={labelDraft}
              onChange={(e) => {
                setLabelDraft(e.target.value);
                setLabelError(null);
              }}
              onKeyDown={handleLabelKeyDown}
              placeholder={t("modals.category.labelDraftPlaceholder")}
              className="flex-1 px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text"
            />
            <SiloButton
              type="button"
              onClick={addLabelDraft}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors whitespace-nowrap shrink-0"
            >
              {t("modals.category.addLabelBtn")}
            </SiloButton>
          </div>
          {labelError && (
            <p className="text-xs text-silo-danger-text mt-1">{labelError}</p>
          )}

          {watchedLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {watchedLabels.map((lbl) => (
                <span
                  key={lbl}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-silo-elevated border border-silo-border text-silo-text"
                >
                  {lbl}
                  <SiloButton
                    type="button"
                    onClick={() =>
                      setValue(
                        "label_names",
                        watchedLabels.filter((x) => x !== lbl),
                      )
                    }
                    aria-label={t("modals.category.removeLabelAria", {
                      label: lbl,
                    })}
                    className="text-silo-muted hover:text-silo-danger-text"
                  >
                    <X className="w-3 h-3" />
                  </SiloButton>
                </span>
              ))}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="category-description"
            className="block text-sm font-medium text-silo-text mb-1.5"
          >
            {t("modals.category.descriptionLabel")}
          </label>
          <SiloTextarea
            id="category-description"
            rows={3}
            placeholder={t("modals.category.descriptionPlaceholder")}
            {...register("description")}
            className="w-full px-3.5 py-2 text-sm bg-silo-bg border border-silo-border rounded-lg text-silo-text placeholder:text-silo-subtle focus:outline-none focus:border-silo-text resize-y"
          />
        </div>
      </form>
    </ModalShell>
  );
}
