import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import Fuse from "fuse.js";
import { useNavigate } from "@tanstack/react-router";
import {
  FolderKanban,
  ListVideo,
  Play,
  Plus,
  Search,
  Tag,
  Tv,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLibraryData } from "../../hooks/useLibrary";
import { useUiStore } from "../../store/uiStore";

import { SiloButton } from "@/components/ui/SiloButton";
interface SearchableItem {
  id: string;
  kind: "video" | "channel" | "category" | "label" | "playlist";
  title: string;
  subtitle: string;
  categoryId?: string;
}

export function CommandPalette() {
  const { t } = useTranslation();
  const { commandPaletteOpen, setCommandPaletteOpen, openVideoModal } =
    useUiStore();
  const { library } = useLibraryData();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      } else if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) setQuery("");
  }, [commandPaletteOpen]);

  const items = useMemo<SearchableItem[]>(() => {
    if (!library) return [];
    const list: SearchableItem[] = [];
    for (const v of library.videos) {
      list.push({
        id: v.id,
        kind: "video",
        title: v.title,
        subtitle:
          [v.channel?.name, v.category?.name].filter(Boolean).join(" · ") ||
          t("commandPalette.kinds.video"),
      });
    }
    for (const ch of library.channels) {
      list.push({
        id: ch.id,
        kind: "channel",
        title: ch.name,
        subtitle: `${t("commandPalette.kinds.channel")} · ${t("commandPalette.channelSubtitle", { count: ch.total_active_videos })}`,
      });
    }
    for (const cat of library.categories) {
      list.push({
        id: cat.id,
        kind: "category",
        title: cat.name,
        subtitle: `${t("commandPalette.kinds.category")} · ${t("commandPalette.categorySubtitle", { count: cat.total_active_videos })}`,
      });
    }
    for (const lbl of library.labels) {
      const cat = library.categoriesById.get(lbl.category_id);
      const count = library.videos.filter(
        (v) => !v.is_archived && v.labels.some((l) => l.id === lbl.id),
      ).length;
      list.push({
        id: lbl.id,
        kind: "label",
        title: lbl.name,
        categoryId: lbl.category_id,
        subtitle: t("commandPalette.labelSubtitle", {
          category: cat?.name ?? t("app.uncategorized"),
          count,
        }),
      });
    }
    for (const pl of library.playlists) {
      list.push({
        id: pl.id,
        kind: "playlist",
        title: pl.name,
        subtitle: `${t("commandPalette.kinds.playlist")} · ${t("commandPalette.playlistSubtitle", { count: pl.total_videos })}`,
      });
    }
    return list;
  }, [library, t]);

  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys: ["title", "subtitle"],
        threshold: 0.35,
      }),
    [items],
  );

  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return items.slice(0, 12);
    return fuse
      .search(trimmed)
      .slice(0, 16)
      .map((r) => r.item);
  }, [query, items, fuse]);

  if (!commandPaletteOpen) return null;

  const handleSelectItem = (item: SearchableItem) => {
    setCommandPaletteOpen(false);
    if (item.kind === "video") {
      navigate({ to: "/videos/$videoId", params: { videoId: item.id } });
    } else if (item.kind === "channel") {
      navigate({ to: "/channels/$channelId", params: { channelId: item.id } });
    } else if (item.kind === "category") {
      navigate({
        to: "/categories/$categoryId",
        params: { categoryId: item.id },
      });
    } else if (item.kind === "label") {
      navigate({ to: "/labels/$labelId", params: { labelId: item.id } });
    } else {
      navigate({
        to: "/playlists/$playlistId",
        params: { playlistId: item.id },
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
      style={{ backgroundColor: "rgba(18, 18, 18, 0.85)" }}
      role="dialog"
      aria-modal="true"
      aria-label={t("commandPalette.ariaLabel")}
    >
      <Command
        shouldFilter={false}
        className="w-full max-w-xl bg-silo-surface border border-silo-border rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-silo-border">
          <Search className="w-4 h-4 text-silo-muted shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            autoFocus
            placeholder={t("commandPalette.placeholder")}
            className="flex-1 bg-transparent text-sm text-silo-text placeholder:text-silo-subtle focus:outline-none"
          />
          <SiloButton
            type="button"
            onClick={() => setCommandPaletteOpen(false)}
            aria-label={t("commandPalette.closeSearch")}
            className="p-1 rounded-md text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
          >
            <X className="w-4 h-4" />
          </SiloButton>
        </div>

        <Command.List className="max-h-80 overflow-y-auto p-2 space-y-1">
          <Command.Group>
            <Command.Item
              onSelect={() => {
                setCommandPaletteOpen(false);
                openVideoModal();
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-silo-text cursor-pointer aria-selected:bg-silo-elevated hover:bg-silo-elevated"
            >
              <Plus className="w-4 h-4 text-silo-muted" />
              <span>{t("commandPalette.addNewVideo")}</span>
            </Command.Item>
          </Command.Group>

          {results.length === 0 ? (
            <div className="py-8 text-center text-sm text-silo-muted">
              {t("commandPalette.noMatches")}
            </div>
          ) : (
            <Command.Group>
              {results.map((item) => {
                const IconComp =
                  item.kind === "video"
                    ? Play
                    : item.kind === "channel"
                      ? Tv
                      : item.kind === "category"
                        ? FolderKanban
                        : item.kind === "label"
                          ? Tag
                          : ListVideo;
                return (
                  <Command.Item
                    key={`${item.kind}-${item.id}`}
                    value={`${item.kind}-${item.id}`}
                    onSelect={() => handleSelectItem(item)}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer aria-selected:bg-silo-elevated hover:bg-silo-elevated"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComp className="w-4 h-4 text-silo-muted shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-silo-text truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-silo-muted truncate">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-silo-subtle shrink-0">
                      {t(`commandPalette.kinds.${item.kind}`)}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
