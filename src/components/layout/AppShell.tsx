import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  BarChart3,
  ChevronDown,
  Film,
  FolderKanban,
  Heart,
  Layers,
  LayoutDashboard,
  ListOrdered,
  ListVideo,
  Menu,
  PieChart,
  PlaySquare,
  Search,
  Settings,
  Table2,
  Tag,
  Tv,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";
import { useUiStore } from "../../store/uiStore";
import { CategoryFormModal } from "../modals/CategoryFormModal";
import { ChannelFormModal } from "../modals/ChannelFormModal";
import { PlaylistFormModal } from "../modals/PlaylistFormModal";
import { VideoFormModal } from "../modals/VideoFormModal";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { CommandPalette } from "./CommandPalette";

import { SiloButton } from "@/components/ui/SiloButton";
function isReportsGroupPath(pathname: string): boolean {
  return pathname.startsWith("/analytics") || pathname.startsWith("/pivot");
}

function isVideoGroupPath(pathname: string): boolean {
  return (
    pathname.startsWith("/videos") ||
    pathname.startsWith("/queue") ||
    pathname.startsWith("/favorites") ||
    pathname.startsWith("/archive")
  );
}

function isCategoryGroupPath(pathname: string): boolean {
  return pathname.startsWith("/categories") || pathname.startsWith("/labels");
}

function resolvePageTitleKey(pathname: string): string {
  if (pathname === "/") return "nav.dashboard";
  if (pathname.startsWith("/analytics")) return "nav.analytics";
  if (pathname.startsWith("/pivot")) return "nav.pivot";
  if (pathname.startsWith("/queue")) return "nav.queue";
  if (pathname.startsWith("/videos/")) return "nav.videoDetail";
  if (pathname.startsWith("/videos")) return "nav.videos";
  if (pathname.startsWith("/channels/")) return "nav.channelDetail";
  if (pathname.startsWith("/channels")) return "nav.channels";
  if (pathname.startsWith("/categories/")) return "nav.categoryDetail";
  if (pathname.startsWith("/categories")) return "nav.categories";
  if (pathname.startsWith("/labels/")) return "nav.labelDetail";
  if (pathname.startsWith("/labels")) return "nav.labels";
  if (pathname.startsWith("/playlists/")) return "nav.playlistDetail";
  if (pathname.startsWith("/playlists")) return "nav.playlists";
  if (pathname.startsWith("/favorites")) return "nav.favorites";
  if (pathname.startsWith("/archive")) return "nav.archive";
  if (pathname.startsWith("/settings")) return "nav.settings";
  return "";
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { mobileNavOpen, setMobileNavOpen, setCommandPaletteOpen } =
    useUiStore();

  const reportsGroupActive = isReportsGroupPath(pathname);
  const videoGroupActive = isVideoGroupPath(pathname);
  const categoryGroupActive = isCategoryGroupPath(pathname);

  const [reportsMenuOpen, setReportsMenuOpen] =
    useState<boolean>(reportsGroupActive);
  const [videosMenuOpen, setVideosMenuOpen] =
    useState<boolean>(videoGroupActive);
  const [categoriesMenuOpen, setCategoriesMenuOpen] =
    useState<boolean>(categoryGroupActive);

  useEffect(() => {
    if (reportsGroupActive) {
      setReportsMenuOpen(true);
    }
  }, [reportsGroupActive]);

  useEffect(() => {
    if (videoGroupActive) {
      setVideosMenuOpen(true);
    }
  }, [videoGroupActive]);

  useEffect(() => {
    if (categoryGroupActive) {
      setCategoriesMenuOpen(true);
    }
  }, [categoryGroupActive]);

  const titleKey = resolvePageTitleKey(pathname);
  const pageTitle = titleKey ? t(titleKey) : "SILO";

  const reportsSubItems = [
    { to: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { to: "/pivot", label: t("nav.pivot"), icon: Table2 },
  ];

  const videoSubItems = [
    { to: "/videos", label: t("nav.videos"), icon: PlaySquare },
    { to: "/queue", label: t("nav.queue"), icon: ListOrdered },
    { to: "/favorites", label: t("nav.favorites"), icon: Heart },
    { to: "/archive", label: t("nav.archive"), icon: Archive },
  ];

  const categorySubItems = [
    { to: "/categories", label: t("nav.categories"), icon: FolderKanban },
    { to: "/labels", label: t("nav.labels"), icon: Tag },
  ];

  const renderNavLink = (
    item: { to: string; label: string; icon: typeof LayoutDashboard },
    nested = false,
  ) => {
    const IconComp = item.icon;
    const isActive =
      item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        onClick={() => setMobileNavOpen(false)}
        className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
          nested ? "pl-9 pr-3 py-2" : "px-3 py-2.5"
        } ${
          isActive
            ? "bg-silo-elevated text-silo-text border border-silo-border"
            : "text-silo-muted border border-transparent hover:text-silo-text hover:bg-silo-bg"
        }`}
      >
        <IconComp className="w-4 h-4 shrink-0" />
        <span>{item.label}</span>
      </Link>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-silo-surface border-r border-silo-border">
      <div className="h-16 px-5 flex items-center justify-between border-b border-silo-border shrink-0">
        <Link
          to="/"
          onClick={() => setMobileNavOpen(false)}
          className="flex items-center gap-2.5 text-silo-text whitespace-nowrap shrink-0"
        >
          <span className="w-7 h-7 rounded-lg bg-silo-text text-silo-bg flex items-center justify-center font-mono text-xs font-semibold">
            S
          </span>
          <span className="text-base font-bold tracking-tight">SILO</span>
        </Link>
        <SiloButton
          type="button"
          onClick={() => setMobileNavOpen(false)}
          aria-label={t("app.closeNav")}
          className="lg:hidden p-1.5 rounded-lg text-silo-muted hover:text-silo-text hover:bg-silo-elevated"
        >
          <X className="w-4 h-4" />
        </SiloButton>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
        aria-label={t("nav.mainAria")}
      >
        {renderNavLink({
          to: "/",
          label: t("nav.dashboard"),
          icon: LayoutDashboard,
        })}

        {/* Reports Dropdown Menu (Analytics & Pivot Matrix) */}
        <div className="space-y-1">
          <SiloButton
            type="button"
            onClick={() => setReportsMenuOpen((prev) => !prev)}
            aria-expanded={reportsMenuOpen}
            aria-controls="reports-dropdown-menu"
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              reportsGroupActive && !reportsMenuOpen
                ? "bg-silo-elevated text-silo-text border border-silo-border"
                : reportsGroupActive
                  ? "text-silo-text border border-transparent hover:bg-silo-bg"
                  : "text-silo-muted border border-transparent hover:text-silo-text hover:bg-silo-bg"
            }`}
          >
            <span className="flex items-center gap-3">
              <PieChart className="w-4 h-4 shrink-0" />
              <span>{t("nav.reportsGroup")}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                reportsMenuOpen ? "rotate-180" : ""
              }`}
            />
          </SiloButton>

          {reportsMenuOpen && (
            <div id="reports-dropdown-menu" className="space-y-1">
              {reportsSubItems.map((subItem) => renderNavLink(subItem, true))}
            </div>
          )}
        </div>

        {/* Videos Dropdown Menu */}
        <div className="space-y-1">
          <SiloButton
            type="button"
            onClick={() => setVideosMenuOpen((prev) => !prev)}
            aria-expanded={videosMenuOpen}
            aria-controls="videos-dropdown-menu"
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              videoGroupActive && !videosMenuOpen
                ? "bg-silo-elevated text-silo-text border border-silo-border"
                : videoGroupActive
                  ? "text-silo-text border border-transparent hover:bg-silo-bg"
                  : "text-silo-muted border border-transparent hover:text-silo-text hover:bg-silo-bg"
            }`}
          >
            <span className="flex items-center gap-3">
              <Film className="w-4 h-4 shrink-0" />
              <span>{t("nav.mediaGroup")}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                videosMenuOpen ? "rotate-180" : ""
              }`}
            />
          </SiloButton>

          {videosMenuOpen && (
            <div id="videos-dropdown-menu" className="space-y-1">
              {videoSubItems.map((subItem) => renderNavLink(subItem, true))}
            </div>
          )}
        </div>

        {renderNavLink({ to: "/channels", label: t("nav.channels"), icon: Tv })}

        {/* Categories Dropdown Menu */}
        <div className="space-y-1">
          <SiloButton
            type="button"
            onClick={() => setCategoriesMenuOpen((prev) => !prev)}
            aria-expanded={categoriesMenuOpen}
            aria-controls="categories-dropdown-menu"
            className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
              categoryGroupActive && !categoriesMenuOpen
                ? "bg-silo-elevated text-silo-text border border-silo-border"
                : categoryGroupActive
                  ? "text-silo-text border border-transparent hover:bg-silo-bg"
                  : "text-silo-muted border border-transparent hover:text-silo-text hover:bg-silo-bg"
            }`}
          >
            <span className="flex items-center gap-3">
              <Layers className="w-4 h-4 shrink-0" />
              <span>{t("nav.topicsGroup")}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-150 ${
                categoriesMenuOpen ? "rotate-180" : ""
              }`}
            />
          </SiloButton>

          {categoriesMenuOpen && (
            <div id="categories-dropdown-menu" className="space-y-1">
              {categorySubItems.map((subItem) => renderNavLink(subItem, true))}
            </div>
          )}
        </div>

        {renderNavLink({
          to: "/playlists",
          label: t("nav.playlists"),
          icon: ListVideo,
        })}
        {renderNavLink({
          to: "/settings",
          label: t("nav.settings"),
          icon: Settings,
        })}
      </nav>

      <div className="p-4 border-t border-silo-border shrink-0">
        <p className="text-xs text-silo-muted leading-relaxed">
          {t("app.tagline")}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-silo-bg text-silo-text flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0"
            style={{ backgroundColor: "rgba(18, 18, 18, 0.85)" }}
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-50 w-64 max-w-[80vw] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-6 lg:px-8 bg-silo-bg border-b border-silo-border flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <SiloButton
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label={t("app.openNav")}
              className="lg:hidden p-2 rounded-lg bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated"
            >
              <Menu className="w-4 h-4" />
            </SiloButton>
            <h1 className="text-base sm:text-lg font-semibold text-silo-text tracking-tight truncate">
              {pageTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <SiloButton
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label={t("app.searchLibrary")}
              className="inline-flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm rounded-lg bg-silo-surface border border-silo-border text-silo-muted hover:text-silo-text hover:border-silo-border-hover transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{t("app.searchLibrary")}</span>
              <kbd className="hidden md:inline font-mono text-[11px] px-1.5 py-0.5 rounded bg-silo-bg border border-silo-border text-silo-muted">
                ⌘K
              </kbd>
            </SiloButton>
          </div>
        </header>

        <main className="flex-1 w-full max-w-360 mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </div>

      {/* Global Modals & Overlays */}
      <VideoFormModal />
      <ChannelFormModal />
      <CategoryFormModal />
      <PlaylistFormModal />
      <ConfirmDialog />
      <CommandPalette />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#242424",
            color: "#F4EFE3",
            border: "1px solid #363636",
          },
        }}
      />
    </div>
  );
}
