import type { ReactNode } from "react";
import { AlertCircle, Inbox, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SiloButton } from "@/components/ui/SiloButton";
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-lg bg-silo-elevated ${className}`}
    />
  );
}

function SkeletonCard({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl border border-silo-border bg-silo-surface p-4 ${className}`}
    >
      {children}
    </div>
  );
}

function SkeletonPage({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      className="space-y-6 motion-safe:animate-pulse"
      aria-busy="true"
      aria-label={t("app.loadingLibrary")}
    >
      {children}
      <span className="sr-only">{t("app.loadingLibrary")}</span>
    </div>
  );
}

function PlaceholderToolbar({ action = true }: { action?: boolean }) {
  return (
    <div aria-hidden="true" className="flex items-center justify-between gap-4">
      <SkeletonBlock className="h-4 w-32" />
      {action && <SkeletonBlock className="h-9 w-28" />}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <SkeletonPage>
      <PlaceholderToolbar />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((n) => (
          <SkeletonCard key={n} className="space-y-3">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-7 w-14" />
            <SkeletonBlock className="h-3 w-32" />
          </SkeletonCard>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <SkeletonCard className="lg:col-span-5 space-y-5">
          <SkeletonBlock className="h-5 w-44" />
          <SkeletonBlock className="h-3 w-56" />
          <SkeletonBlock className="h-9 w-24" />
          <SkeletonBlock className="h-2 w-full" />
          <SkeletonBlock className="h-3 w-full" />
        </SkeletonCard>
        <SkeletonCard className="lg:col-span-7 space-y-4">
          <PlaceholderToolbar action={false} />
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <SkeletonBlock className="sm:col-span-5 aspect-video w-full" />
            <div className="sm:col-span-7 space-y-3">
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-5 w-full" />
              <SkeletonBlock className="h-5 w-4/5" />
              <SkeletonBlock className="h-2 w-full" />
              <SkeletonBlock className="h-9 w-36" />
            </div>
          </div>
        </SkeletonCard>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((n) => (
          <SkeletonCard key={n} className="space-y-4">
            <PlaceholderToolbar action={false} />
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <SkeletonBlock className="h-14 w-24 shrink-0" />
                <div className="flex-1 space-y-2">
                  <SkeletonBlock className="h-4 w-4/5" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </SkeletonCard>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {[1, 2].map((n) => (
          <SkeletonCard
            key={n}
            className={`${n === 1 ? "lg:col-span-7" : "lg:col-span-5"} space-y-4`}
          >
            <PlaceholderToolbar action={false} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2].map((card) => (
                <div key={card} className="space-y-3">
                  <SkeletonBlock className="aspect-video w-full" />
                  <SkeletonBlock className="h-4 w-4/5" />
                  <SkeletonBlock className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function VideoGridLoadingSkeleton({
  layout = "grid",
}: {
  layout?: "grid" | "list";
}) {
  return (
    <SkeletonPage>
      <PlaceholderToolbar />
      <SkeletonCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SkeletonBlock className="h-9 w-56" />
          <SkeletonBlock className="h-9 w-32" />
        </div>
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-8 w-2/3" />
      </SkeletonCard>
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            : "space-y-3"
        }
      >
        {Array.from({ length: layout === "grid" ? 6 : 5 }, (_, index) => (
          <SkeletonCard
            key={index}
            className={
              layout === "grid" ? "space-y-4" : "flex gap-4 items-center"
            }
          >
            <SkeletonBlock
              className={
                layout === "grid" ? "aspect-video w-full" : "h-20 w-36 shrink-0"
              }
            />
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-3 w-2/3" />
              {layout === "grid" && <SkeletonBlock className="h-2 w-full" />}
              {layout === "list" && <SkeletonBlock className="h-3 w-1/2" />}
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function EntityGridLoadingSkeleton({
  labels = false,
}: {
  labels?: boolean;
}) {
  return (
    <SkeletonPage>
      <PlaceholderToolbar />
      {labels && (
        <SkeletonCard className="space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-10 w-full" />
        </SkeletonCard>
      )}
      <SkeletonCard className="space-y-3">
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-8 w-1/2" />
      </SkeletonCard>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <SkeletonCard key={n} className="space-y-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 shrink-0 rounded-full" />
              <SkeletonBlock className="h-4 w-2/3" />
            </div>
            <SkeletonBlock className="h-3 w-full" />
            <SkeletonBlock className="h-3 w-3/4" />
            <SkeletonBlock className="h-2 w-full" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function CollectionDetailLoadingSkeleton({
  labels = false,
}: {
  labels?: boolean;
}) {
  return (
    <SkeletonPage>
      <SkeletonCard className="space-y-5">
        <div className="flex items-start gap-4">
          <SkeletonBlock className="h-14 w-14 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-6 w-1/2" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
          <SkeletonBlock className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <SkeletonBlock key={n} className="h-14 w-full" />
          ))}
        </div>
        {labels && (
          <div className="flex gap-2 border-t border-silo-border pt-4">
            {[1, 2, 3, 4].map((n) => (
              <SkeletonBlock key={n} className="h-7 w-20" />
            ))}
          </div>
        )}
      </SkeletonCard>
      <SkeletonCard className="space-y-4">
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-8 w-1/2" />
      </SkeletonCard>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((n) => (
          <SkeletonCard key={n} className="space-y-3">
            <SkeletonBlock className="aspect-video w-full" />
            <SkeletonBlock className="h-4 w-4/5" />
            <SkeletonBlock className="h-3 w-2/3" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function PlaylistDetailLoadingSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonCard className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <SkeletonBlock className="lg:col-span-4 aspect-video w-full" />
        <div className="lg:col-span-8 space-y-4">
          <SkeletonBlock className="h-6 w-1/2" />
          <SkeletonBlock className="h-3 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((n) => (
              <SkeletonBlock key={n} className="h-14" />
            ))}
          </div>
        </div>
      </SkeletonCard>
      <SkeletonCard className="space-y-4">
        <SkeletonBlock className="h-9 w-full" />
        <SkeletonBlock className="h-8 w-1/2" />
      </SkeletonCard>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((n) => (
          <SkeletonCard key={n} className="flex gap-4 items-center">
            <SkeletonBlock className="h-20 w-36 shrink-0" />
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function QueueLoadingSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonCard className="space-y-4">
        <SkeletonBlock className="h-5 w-40" />
        <div className="flex flex-wrap gap-3">
          <SkeletonBlock className="h-9 w-40" />
          <SkeletonBlock className="h-9 w-32" />
          <SkeletonBlock className="h-9 w-24" />
        </div>
      </SkeletonCard>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <SkeletonCard key={n} className="flex items-center gap-4">
            <SkeletonBlock className="h-4 w-4 shrink-0" />
            <SkeletonBlock className="h-20 w-36 shrink-0" />
            <div className="flex-1 space-y-3">
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-3 w-2/3" />
              <SkeletonBlock className="h-2 w-1/2" />
            </div>
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function AnalyticsLoadingSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-4 w-56" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <SkeletonCard key={n} className="space-y-3">
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-6 w-1/3" />
          </SkeletonCard>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((n) => (
          <SkeletonCard key={n} className="space-y-4">
            <SkeletonBlock className="h-5 w-1/2" />
            <SkeletonBlock className="h-72 w-full rounded-lg" />
          </SkeletonCard>
        ))}
      </div>
    </SkeletonPage>
  );
}

export function PivotLoadingSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-4 w-56" />
      <SkeletonCard className="space-y-5">
        <SkeletonBlock className="h-9 w-44" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((n) => (
            <SkeletonBlock key={n} className="h-10 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-9 w-36" />
      </SkeletonCard>
      <SkeletonCard className="space-y-3 overflow-hidden">
        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div key={row} className="flex gap-3">
            {[1, 2, 3, 4, 5].map((col) => (
              <SkeletonBlock
                key={col}
                className={`h-10 ${col === 1 ? "w-40" : "flex-1"}`}
              />
            ))}
          </div>
        ))}
      </SkeletonCard>
    </SkeletonPage>
  );
}

export function VideoDetailLoadingSkeleton() {
  return (
    <SkeletonPage>
      <SkeletonBlock className="h-4 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 space-y-5">
          <SkeletonBlock className="aspect-video w-full rounded-xl" />
          <SkeletonCard className="space-y-3">
            <SkeletonBlock className="h-6 w-4/5" />
            <SkeletonBlock className="h-3 w-1/2" />
            <SkeletonBlock className="h-2 w-full" />
          </SkeletonCard>
          <SkeletonCard className="space-y-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-24 w-full" />
          </SkeletonCard>
        </div>
        <aside className="lg:col-span-4 space-y-5">
          {[1, 2, 3].map((n) => (
            <SkeletonCard key={n} className="space-y-4">
              <SkeletonBlock className="h-5 w-1/2" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </SkeletonCard>
          ))}
        </aside>
      </div>
    </SkeletonPage>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-silo-surface border border-silo-border rounded-xl">
      <div className="w-11 h-11 rounded-lg bg-silo-elevated border border-silo-border flex items-center justify-center text-silo-muted mb-4">
        <Inbox className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-silo-text">{title}</h3>
      <p className="text-sm text-silo-muted max-w-md mt-1.5 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 bg-silo-surface border border-silo-danger rounded-xl">
      <div className="w-11 h-11 rounded-lg bg-silo-danger-surface text-silo-danger-text flex items-center justify-center mb-4">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-base font-semibold text-silo-text">
        {t("app.unableToLoad")}
      </h3>
      <p className="text-sm text-silo-muted max-w-md mt-1.5">{message}</p>
      {onRetry && (
        <SiloButton
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t("app.retry")}
        </SiloButton>
      )}
    </div>
  );
}
