import { useRef, useState } from "react";
import {
  Check,
  Copy,
  Database,
  Download,
  FileJson,
  Globe,
  LogOut,
  Trash2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useImportLibrary,
  useLibraryData,
  useResetLibrary,
} from "../hooks/useLibrary";
import type { SupportedLanguage } from "../i18n";
import { getSupabaseConnectionInfo } from "../services/supabaseClient";
import { useUiStore } from "../store/uiStore";
import { useAuth } from "../auth/AuthProvider";
import { Button } from "@/components/ui/button";
import type {
  ImportMode,
  LibrarySnapshot,
  SiloExportCounts,
} from "../types/silo";
import {
  buildLibraryExportPayload,
  parseAndValidateLibraryImport,
} from "../utils/libraryBackup";

import { SiloButton } from "@/components/ui/SiloButton";
const SCHEMA_SUMMARY_SQL = `-- Run supabase/schema.sql in your Supabase SQL Editor (idempotent)
-- Tables: categories, channels, labels, playlists, videos, video_playlists, video_labels, watch_queue
-- Includes owner_id columns, authenticated owner-only RLS, and updated_at triggers
-- Create the first Auth user before applying this schema when migrating existing library rows.
-- Disable public sign-ups in Supabase Auth settings; create users from the Dashboard.
-- Environment variables required in .env:
--   VITE_SUPABASE_URL="https://your-project.supabase.co"
--   VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"`;

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { session, signOut } = useAuth();
  const { library, snapshot } = useLibraryData();
  const resetLibrary = useResetLibrary();
  const importLibrary = useImportLibrary();
  const {
    videosViewMode,
    setVideosViewMode,
    compactDensity,
    setCompactDensity,
    openConfirmDialog,
  } = useUiStore();

  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importError, setImportError] = useState<string | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    fileName: string;
    data: LibrarySnapshot;
    counts: SiloExportCounts;
    exportedAt: string | null;
  } | null>(null);

  const connection = getSupabaseConnectionInfo();
  const currentLang: SupportedLanguage = i18n.language === "id" ? "id" : "en";

  const handleLanguageChange = (lng: SupportedLanguage) => {
    i18n.changeLanguage(lng);
  };

  const handleCopyEnvSnippet = async () => {
    try {
      await navigator.clipboard.writeText(SCHEMA_SUMMARY_SQL);
      setCopied(true);
      toast.success(t("settings.copiedToast"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("settings.copyFailedToast"));
    }
  };

  const handleExportJson = () => {
    if (!snapshot) return;
    const payload = buildLibraryExportPayload(snapshot);
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `silo-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      t("settings.exportSuccessToast", { videos: payload.counts.videos }),
    );
  };

  const handleImportFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setPendingImport(null);

    try {
      const text = await file.text();
      const result = parseAndValidateLibraryImport(text);
      if (!result.ok) {
        const errKey =
          result.errorCode === "invalidJson"
            ? "settings.importInvalidJson"
            : result.errorCode === "emptyPayload"
              ? "settings.importEmptyPayload"
              : "settings.importInvalidStructure";
        setImportError(t(errKey));
        return;
      }
      setPendingImport({
        fileName: file.name,
        data: result.data,
        counts: result.counts,
        exportedAt: result.exportedAt,
      });
    } catch {
      setImportError(t("settings.importInvalidJson"));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const executeImport = async () => {
    if (!pendingImport) return;
    await importLibrary.mutateAsync({
      mode: importMode,
      data: pendingImport.data,
    });
    setPendingImport(null);
    setImportError(null);
  };

  const handleApplyImport = () => {
    if (!pendingImport) return;
    if (importMode === "replace") {
      openConfirmDialog({
        title: t("settings.importReplaceConfirmTitle"),
        description: t("settings.importReplaceConfirmDesc"),
        confirmLabel: t("settings.importReplaceConfirmLabel"),
        destructive: true,
        onConfirm: executeImport,
      });
      return;
    }
    executeImport();
  };

  const handleClearAll = () => {
    openConfirmDialog({
      title: t("settings.clearConfirmTitle"),
      description: t("settings.clearConfirmDesc"),
      confirmLabel: t("settings.clearConfirmLabel"),
      destructive: true,
      onConfirm: async () => {
        await resetLibrary.mutateAsync();
      },
    });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-silo-text">
              {t("settings.accountTitle")}
            </h3>
            <p className="text-sm text-silo-text-secondary">
              {session?.user.email}
            </p>
          </div>
          <Button
            type="button"
            onClick={() =>
              void signOut().catch(() => toast.error(t("auth.signOutError")))
            }
            variant="outline"
            className="h-9 gap-2 rounded-lg border-silo-border bg-silo-bg px-3.5 text-sm font-medium text-silo-text transition-colors hover:bg-silo-elevated hover:text-silo-text"
          >
            <LogOut className="w-4 h-4" />
            {t("app.signOut")}
          </Button>
        </div>
      </section>

      {/* Appearance & Language Settings */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
        <h3 className="text-base font-semibold text-silo-text">
          {t("settings.appearanceTitle")}
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-silo-border">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-silo-text" />
              <p className="text-sm font-medium text-silo-text">
                {t("settings.languageLabel")}
              </p>
            </div>
          </div>
          <div
            className="inline-flex p-1 bg-silo-bg border border-silo-border rounded-lg self-start sm:self-auto shrink-0"
            role="group"
            aria-label={t("settings.languageLabel")}
          >
            <SiloButton
              type="button"
              onClick={() => handleLanguageChange("en")}
              aria-pressed={currentLang === "en"}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                currentLang === "en"
                  ? "bg-silo-elevated text-silo-text"
                  : "text-silo-muted hover:text-silo-text"
              }`}
            >
              {t("settings.langEnglish")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => handleLanguageChange("id")}
              aria-pressed={currentLang === "id"}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                currentLang === "id"
                  ? "bg-silo-elevated text-silo-text"
                  : "text-silo-muted hover:text-silo-text"
              }`}
            >
              {t("settings.langIndonesian")}
            </SiloButton>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-2 border-b border-silo-border">
          <div>
            <p className="text-sm font-medium text-silo-text">
              {t("settings.defaultLayoutLabel")}
            </p>
          </div>
          <div className="inline-flex p-1 bg-silo-bg border border-silo-border rounded-lg shrink-0">
            <SiloButton
              type="button"
              onClick={() => setVideosViewMode("grid")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                videosViewMode === "grid"
                  ? "bg-silo-elevated text-silo-text"
                  : "text-silo-muted hover:text-silo-text"
              }`}
            >
              {t("settings.layoutGrid")}
            </SiloButton>
            <SiloButton
              type="button"
              onClick={() => setVideosViewMode("list")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                videosViewMode === "list"
                  ? "bg-silo-elevated text-silo-text"
                  : "text-silo-muted hover:text-silo-text"
              }`}
            >
              {t("settings.layoutList")}
            </SiloButton>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 py-1">
          <div>
            <p className="text-sm font-medium text-silo-text">
              {t("settings.compactDensityLabel")}
            </p>
          </div>
          <SiloButton
            type="button"
            role="switch"
            aria-checked={compactDensity}
            onClick={() => setCompactDensity(!compactDensity)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
              compactDensity
                ? "bg-silo-text text-silo-bg border-silo-text"
                : "bg-silo-bg text-silo-muted border-silo-border"
            }`}
          >
            {compactDensity
              ? t("settings.densityCompact")
              : t("settings.densityStandard")}
          </SiloButton>
        </div>
      </section>

      {/* Supabase Connection Info */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-silo-text" />
            <h3 className="text-base font-semibold text-silo-text">
              {t("settings.supabaseTitle")}
            </h3>
          </div>
          <span
            className={`px-2.5 py-1 text-xs font-mono rounded-md border ${
              connection.configured
                ? "bg-silo-success-surface border-silo-success text-silo-text"
                : "bg-silo-elevated border-silo-border text-silo-text-secondary"
            }`}
          >
            {connection.mode}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
            <p className="text-silo-muted">{t("settings.sourceOfTruth")}</p>
            <p className="font-mono text-silo-text mt-1">
              {connection.configured
                ? t("settings.supabaseModePg")
                : t("settings.supabaseModeLocal")}
            </p>
          </div>
          <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
            <p className="text-silo-muted">{t("settings.projectEndpoint")}</p>
            <p className="font-mono text-silo-text mt-1 truncate">
              {connection.url ?? t("settings.configureEnvHint")}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-silo-bg border border-silo-border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-silo-text-secondary">
              {t("settings.schemaFile")}{" "}
              <span className="font-mono">supabase/schema.sql</span>
            </p>
            <SiloButton
              type="button"
              onClick={handleCopyEnvSnippet}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-silo-surface border border-silo-border text-silo-text hover:bg-silo-elevated"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? t("settings.copied") : t("settings.copyNotes")}
            </SiloButton>
          </div>
          <pre className="text-xs font-mono text-silo-muted overflow-x-auto leading-relaxed">
            {SCHEMA_SUMMARY_SQL}
          </pre>
        </div>
      </section>

      {/* Library Statistics & Data Actions */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
        <h3 className="text-base font-semibold text-silo-text">
          {t("settings.dataManagementTitle")}
        </h3>

        {library && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">{t("nav.videos")}</span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {library.videos.length}
              </p>
            </div>
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">{t("nav.channels")}</span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {library.channels.length}
              </p>
            </div>
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">{t("nav.categories")}</span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {library.categories.length}
              </p>
            </div>
            <div className="p-3 bg-silo-bg border border-silo-border rounded-lg">
              <span className="text-silo-muted">{t("nav.playlists")}</span>
              <p className="text-base font-bold text-silo-text mt-0.5">
                {library.playlists.length}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <SiloButton
            type="button"
            onClick={handleClearAll}
            disabled={resetLibrary.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-silo-danger-surface border border-silo-danger text-silo-danger-text hover:bg-silo-danger-surface-hover transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {t("settings.clearAllData")}
          </SiloButton>
        </div>
      </section>

      {/* JSON Export & Import Backup */}
      <section className="p-5 bg-silo-surface border border-silo-border rounded-xl space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <FileJson className="w-4 h-4 text-silo-text" />
            <h3 className="text-base font-semibold text-silo-text">
              {t("settings.backupTitle")}
            </h3>
          </div>
          <p className="text-xs text-silo-muted leading-relaxed">
            {t("settings.backupSubtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SiloButton
            type="button"
            onClick={handleExportJson}
            disabled={!snapshot}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-silo-text text-silo-bg hover:bg-silo-text-hover transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            {t("settings.exportJson")}
          </SiloButton>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFileChange}
            aria-label={t("settings.importJsonLabel")}
            className="hidden"
          />
          <SiloButton
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importLibrary.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-silo-elevated border border-silo-border text-silo-text hover:bg-silo-border transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            {t("settings.importChooseFile")}
          </SiloButton>
        </div>

        {importError && (
          <div
            role="alert"
            className="p-3 bg-silo-danger-surface border border-silo-danger rounded-lg text-xs text-silo-danger-text"
          >
            {importError}
          </div>
        )}

        {pendingImport && (
          <div className="p-4 bg-silo-bg border border-silo-border rounded-[10px] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-semibold text-silo-text">
                  {t("settings.importPreviewTitle")}
                </h4>
                <p className="text-xs text-silo-muted">
                  {t("settings.importSelectedFile", {
                    name: pendingImport.fileName,
                  })}
                  {pendingImport.exportedAt
                    ? ` · ${t("settings.importPreviewExportedAt", {
                        date: pendingImport.exportedAt.slice(0, 10),
                      })}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs font-mono tabular-nums">
              <div className="p-2.5 bg-silo-surface border border-silo-border rounded-lg">
                <span className="text-silo-muted">{t("nav.videos")}</span>
                <p className="text-sm font-bold text-silo-text mt-0.5">
                  {pendingImport.counts.videos}
                </p>
              </div>
              <div className="p-2.5 bg-silo-surface border border-silo-border rounded-lg">
                <span className="text-silo-muted">{t("nav.categories")}</span>
                <p className="text-sm font-bold text-silo-text mt-0.5">
                  {pendingImport.counts.categories}
                </p>
              </div>
              <div className="p-2.5 bg-silo-surface border border-silo-border rounded-lg">
                <span className="text-silo-muted">
                  {t("settings.importLabelsLabel")}
                </span>
                <p className="text-sm font-bold text-silo-text mt-0.5">
                  {pendingImport.counts.labels}
                </p>
              </div>
              <div className="p-2.5 bg-silo-surface border border-silo-border rounded-lg">
                <span className="text-silo-muted">{t("nav.channels")}</span>
                <p className="text-sm font-bold text-silo-text mt-0.5">
                  {pendingImport.counts.channels}
                </p>
              </div>
              <div className="p-2.5 bg-silo-surface border border-silo-border rounded-lg">
                <span className="text-silo-muted">{t("nav.playlists")}</span>
                <p className="text-sm font-bold text-silo-text mt-0.5">
                  {pendingImport.counts.playlists}
                </p>
              </div>
              <div className="p-2.5 bg-silo-surface border border-silo-border rounded-lg">
                <span className="text-silo-muted">
                  {t("settings.importQueueLabel")}
                </span>
                <p className="text-sm font-bold text-silo-text mt-0.5">
                  {pendingImport.counts.watch_queue}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-silo-text-secondary">
                {t("settings.importModeLabel")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <SiloButton
                  type="button"
                  onClick={() => setImportMode("merge")}
                  aria-pressed={importMode === "merge"}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    importMode === "merge"
                      ? "bg-silo-elevated border-silo-text"
                      : "bg-silo-surface border-silo-border hover:border-silo-border-hover"
                  }`}
                >
                  <p className="text-xs font-semibold text-silo-text">
                    {t("settings.importModeMerge")}
                  </p>
                  <p className="text-[11px] text-silo-muted mt-1 leading-relaxed">
                    {t("settings.importModeMergeHint")}
                  </p>
                </SiloButton>

                <SiloButton
                  type="button"
                  onClick={() => setImportMode("replace")}
                  aria-pressed={importMode === "replace"}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    importMode === "replace"
                      ? "bg-silo-danger-surface border-silo-danger"
                      : "bg-silo-surface border-silo-border hover:border-silo-border-hover"
                  }`}
                >
                  <p className="text-xs font-semibold text-silo-text">
                    {t("settings.importModeReplace")}
                  </p>
                  <p className="text-[11px] text-silo-muted mt-1 leading-relaxed">
                    {t("settings.importModeReplaceHint")}
                  </p>
                </SiloButton>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <SiloButton
                type="button"
                onClick={handleApplyImport}
                disabled={importLibrary.isPending}
                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 ${
                  importMode === "replace"
                    ? "bg-silo-danger text-silo-text hover:bg-silo-danger-hover-strong"
                    : "bg-silo-text text-silo-bg hover:bg-silo-text-hover"
                }`}
              >
                {importLibrary.isPending
                  ? t("app.processing")
                  : t("settings.importApplyBtn")}
              </SiloButton>
              <SiloButton
                type="button"
                onClick={() => {
                  setPendingImport(null);
                  setImportError(null);
                }}
                disabled={importLibrary.isPending}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-silo-surface border border-silo-border text-silo-muted hover:text-silo-text"
              >
                {t("settings.importClearSelection")}
              </SiloButton>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
