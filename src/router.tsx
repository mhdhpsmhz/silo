import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { AppShell } from './components/layout/AppShell';
import { useAuth } from './auth/AuthProvider';
import { SUPABASE_CONFIGURED } from './services/supabaseClient';
import { SignInPage } from './pages/SignInPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ArchivePage } from './pages/ArchivePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { ChannelDetailPage } from './pages/ChannelDetailPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { DashboardPage } from './pages/DashboardPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { LabelDetailPage } from './pages/LabelDetailPage';
import { LabelsPage } from './pages/LabelsPage';
import { PivotPage } from './pages/PivotPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { SettingsPage } from './pages/SettingsPage';
import { VideoDetailPage } from './pages/VideoDetailPage';
import { VideosPage } from './pages/VideosPage';
import { WatchQueuePage } from './pages/WatchQueuePage';

function NotFoundView() {
  const { t } = useTranslation();
  return (
    <div className="p-8 text-center space-y-2">
      <h2 className="text-lg font-semibold text-silo-text">{t('app.notFoundTitle')}</h2>
      <p className="text-sm text-silo-muted">{t('app.notFoundDescription')}</p>
    </div>
  );
}

function RootLayout() {
  const { loading, session } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <main className="min-h-screen bg-silo-bg text-silo-muted flex items-center justify-center" aria-busy="true">
        <p className="text-sm">{t('auth.loadingSession')}</p>
      </main>
    );
  }

  if (!SUPABASE_CONFIGURED) {
    if (import.meta.env.DEV) {
      return <AppShell><Outlet /></AppShell>;
    }
    return (
      <main className="min-h-screen bg-silo-bg text-silo-text flex items-center justify-center px-6 text-center">
        <p className="max-w-md text-sm text-silo-muted">{t('auth.configurationRequired')}</p>
      </main>
    );
  }

  if (!session) return <SignInPage />;
  return <AppShell><Outlet /></AppShell>;
}

const rootRoute = createRootRoute({
  component: RootLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsPage,
});

const pivotRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pivot',
  component: PivotPage,
});

const queueRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/queue',
  component: WatchQueuePage,
});

const videosRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/videos',
  validateSearch: (search: Record<string, unknown>): { labelId?: string; categoryId?: string } => ({
    labelId: typeof search.labelId === 'string' ? search.labelId : undefined,
    categoryId: typeof search.categoryId === 'string' ? search.categoryId : undefined,
  }),
  component: VideosPage,
});

const videoDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/videos/$videoId',
  validateSearch: (search: Record<string, unknown>): { playlistId?: string; queue?: string } => ({
    playlistId: typeof search.playlistId === 'string' ? search.playlistId : undefined,
    queue: typeof search.queue === 'string' ? search.queue : undefined,
  }),
  component: VideoDetailPage,
});

const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels',
  component: ChannelsPage,
});

const channelDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels/$channelId',
  component: ChannelDetailPage,
});

const categoriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories',
  component: CategoriesPage,
});

const categoryDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/categories/$categoryId',
  component: CategoryDetailPage,
});

const labelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/labels',
  component: LabelsPage,
});

const labelDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/labels/$labelId',
  component: LabelDetailPage,
});

const playlistsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playlists',
  component: PlaylistsPage,
});

const playlistDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/playlists/$playlistId',
  component: PlaylistDetailPage,
});

const favoritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favorites',
  component: FavoritesPage,
});

const archiveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/archive',
  component: ArchivePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  analyticsRoute,
  pivotRoute,
  queueRoute,
  videosRoute,
  videoDetailRoute,
  channelsRoute,
  channelDetailRoute,
  categoriesRoute,
  categoryDetailRoute,
  labelsRoute,
  labelDetailRoute,
  playlistsRoute,
  playlistDetailRoute,
  favoritesRoute,
  archiveRoute,
  settingsRoute,
]);

export const router = createRouter({
  routeTree,
  defaultNotFoundComponent: NotFoundView,
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
