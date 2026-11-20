import { create } from "zustand";

export interface VideoModalState {
  open: boolean;
  editVideoId?: string;
  defaultChannelId?: string;
  defaultCategoryId?: string;
  defaultLabelId?: string;
  defaultPlaylistId?: string;
}

export interface ChannelModalState {
  open: boolean;
  editChannelId?: string;
}

export interface CategoryModalState {
  open: boolean;
  editCategoryId?: string;
}

export interface PlaylistModalState {
  open: boolean;
  editPlaylistId?: string;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: (() => Promise<void> | void) | null;
}

interface UiStoreState {
  videoModal: VideoModalState;
  channelModal: ChannelModalState;
  categoryModal: CategoryModalState;
  playlistModal: PlaylistModalState;
  confirmDialog: ConfirmDialogState;
  commandPaletteOpen: boolean;
  mobileNavOpen: boolean;
  videosViewMode: "grid" | "list";
  compactDensity: boolean;

  openVideoModal: (opts?: Omit<VideoModalState, "open">) => void;
  closeVideoModal: () => void;

  openChannelModal: (editChannelId?: string) => void;
  closeChannelModal: () => void;

  openCategoryModal: (editCategoryId?: string) => void;
  closeCategoryModal: () => void;

  openPlaylistModal: (editPlaylistId?: string) => void;
  closePlaylistModal: () => void;

  openConfirmDialog: (opts: Omit<ConfirmDialogState, "open">) => void;
  closeConfirmDialog: () => void;

  setCommandPaletteOpen: (open: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setVideosViewMode: (mode: "grid" | "list") => void;
  setCompactDensity: (compact: boolean) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  videoModal: { open: false },
  channelModal: { open: false },
  categoryModal: { open: false },
  playlistModal: { open: false },
  confirmDialog: {
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    destructive: false,
    onConfirm: null,
  },
  commandPaletteOpen: false,
  mobileNavOpen: false,
  videosViewMode: "grid",
  compactDensity: false,

  openVideoModal: (opts) => set({ videoModal: { open: true, ...opts } }),
  closeVideoModal: () => set({ videoModal: { open: false } }),

  openChannelModal: (editChannelId) =>
    set({ channelModal: { open: true, editChannelId } }),
  closeChannelModal: () => set({ channelModal: { open: false } }),

  openCategoryModal: (editCategoryId) =>
    set({ categoryModal: { open: true, editCategoryId } }),
  closeCategoryModal: () => set({ categoryModal: { open: false } }),

  openPlaylistModal: (editPlaylistId) =>
    set({ playlistModal: { open: true, editPlaylistId } }),
  closePlaylistModal: () => set({ playlistModal: { open: false } }),

  openConfirmDialog: (opts) =>
    set({
      confirmDialog: {
        open: true,
        ...opts,
      },
    }),
  closeConfirmDialog: () =>
    set((s) => ({
      confirmDialog: { ...s.confirmDialog, open: false, onConfirm: null },
    })),

  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  setVideosViewMode: (mode) => set({ videosViewMode: mode }),
  setCompactDensity: (compact) => set({ compactDensity: compact }),
}));
