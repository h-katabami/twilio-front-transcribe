import { TranscribeFiltersPanel } from "../components/transcribe/TranscribeFiltersPanel";
import { ErrorModal } from "../components/ui/ErrorModal";
import { useTranscribeData } from "../hooks/transcribe/useTranscribeData";
import { useAuth } from "../hooks/useAuth";

export function TranscribePage() {
  const { signOut } = useAuth();
  const {
    logsCount,
    companyName,
    onCompanyNameChange,
    filters,
    setFilters,
    onSearch,
    canDownloadCsv,
    isSearching,
    isActionLocked,
    downloadError,
    closeDownloadError,
    isDownloadingCalls,
    isDownloadingTranscriptions,
    onDownloadCallsCsv,
    onDownloadTranscriptionsCsv,
  } = useTranscribeData();

  return (
    <main className="page-layout transcribe-shell">
      <header className="page-header page-hero">
        <div>
          <h1>AIC 書き起こし管理</h1>
        </div>
        <button type="button" onClick={() => void signOut()}>サインアウト</button>
      </header>

      <section className="content-grid">
        <article className="panel panel-search-column">
          <TranscribeFiltersPanel
            companyName={companyName}
            filters={filters}
            onCompanyNameChange={onCompanyNameChange}
            onFiltersChange={setFilters}
            onSearch={onSearch}
            isSearching={isSearching}
          />

          <section className="search-result-summary" aria-label="検索結果">
            <h2>検索結果</h2>
            <p className="result-count">該当件数: {logsCount}件</p>
          </section>

          <section className="download-actions" aria-label="CSVダウンロード">
            <button
              type="button"
              className="download-button"
              onClick={() => void onDownloadCallsCsv()}
              disabled={!canDownloadCsv || isActionLocked}
            >
              {isDownloadingCalls ? "URL生成中..." : "通話ログのダウンロード"}
            </button>
            <button
              type="button"
              className="download-button"
              onClick={() => void onDownloadTranscriptionsCsv()}
              disabled={!canDownloadCsv || isActionLocked}
            >
              {isDownloadingTranscriptions ? "URL生成中..." : "書き起こしログのダウンロード"}
            </button>
          </section>
        </article>
      </section>

      {downloadError ? <ErrorModal message={downloadError} onClose={closeDownloadError} /> : null}
    </main>
  );
}
