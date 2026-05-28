import { TranscribeFiltersPanel } from "../components/transcribe/TranscribeFiltersPanel";
import { ErrorModal } from "../components/ui/ErrorModal";
import { useTranscribeData } from "../hooks/transcribe/useTranscribeData";
import { useAuth } from "../hooks/useAuth";

export function TranscribePage() {
  const { signOut } = useAuth();
  const transcribe = useTranscribeData();

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
            companyName={transcribe.companyName}
            companySuggestions={transcribe.companySuggestions}
            filters={transcribe.filters}
            onCompanyNameChange={transcribe.onCompanyNameChange}
            onFiltersChange={transcribe.setFilters}
            onSearch={transcribe.onSearch}
            isSearching={transcribe.isSearching}
          />

          <section className="search-result-summary" aria-label="検索結果">
            <h2>検索結果</h2>
            <p className="result-count">該当件数: {transcribe.logsCount}件</p>
          </section>

          <section className="download-actions" aria-label="CSVダウンロード">
            <button
              type="button"
              className="download-button"
              onClick={() => void transcribe.onDownloadCallsCsv()}
              disabled={!transcribe.canDownloadCsv || transcribe.isActionLocked}
            >
              {transcribe.isDownloadingCalls ? "URL生成中..." : "通話ログのダウンロード"}
            </button>
            <button
              type="button"
              className="download-button"
              onClick={() => void transcribe.onDownloadTranscriptionsCsv()}
              disabled={!transcribe.canDownloadCsv || transcribe.isActionLocked}
            >
              {transcribe.isDownloadingTranscriptions ? "URL生成中..." : "書き起こしログのダウンロード"}
            </button>
          </section>
        </article>
      </section>

      {transcribe.downloadError ? <ErrorModal message={transcribe.downloadError} onClose={transcribe.closeDownloadError} /> : null}
    </main>
  );
}
