import { TranscribeDetailPanel } from "../components/transcribe/TranscribeDetailPanel";
import { TranscribeFiltersPanel } from "../components/transcribe/TranscribeFiltersPanel";
import { TranscribeLogList } from "../components/transcribe/TranscribeLogList";
import { ErrorModal } from "../components/ui/ErrorModal";
import { QueryErrorNotice } from "../components/ui/QueryErrorNotice";
import { useTranscribeData } from "../hooks/transcribe/useTranscribeData";
import { useAuth } from "../hooks/useAuth";

export function TranscribePage() {
  const { signOut } = useAuth();
  const {
    companies,
    companiesQuery,
    statusCheckpoints,
    statusCheckpointsQuery,
    logs,
    logsQuery,
    detail,
    detailQuery,
    company,
    onCompanyChange,
    filters,
    setFilters,
    onSearch,
    canDownloadCsv,
    downloadError,
    closeDownloadError,
    isDownloadingCalls,
    isDownloadingTranscriptions,
    onDownloadCallsCsv,
    onDownloadTranscriptionsCsv,
    selectedCallSid,
    setSelectedCallSid,
  } = useTranscribeData();

  return (
    <main className="page-layout transcribe-shell">
      <header className="page-header page-hero">
        <div>
          <h1>AIC 書き起こし管理</h1>
        </div>
        <button type="button" onClick={() => void signOut()}>サインアウト</button>
      </header>

      <QueryErrorNotice errors={[companiesQuery.error, statusCheckpointsQuery.error, logsQuery.error, detailQuery.error]} />

      <section className="content-grid">
        <article className="panel panel-log-column">
          <TranscribeFiltersPanel
            companies={companies}
            statusCheckpoints={statusCheckpoints}
            isLoadingStatusCheckpoints={statusCheckpointsQuery.isLoading || statusCheckpointsQuery.isFetching}
            company={company}
            filters={filters}
            onCompanyChange={onCompanyChange}
            onFiltersChange={setFilters}
            onSearch={onSearch}
          />
          <TranscribeLogList
            logs={logs}
            isLoading={logsQuery.isLoading}
            isFetching={logsQuery.isFetching}
            selectedCallSid={selectedCallSid}
            onSelectCallSid={setSelectedCallSid}
          />
          <section className="download-actions" aria-label="CSVダウンロード">
            <button
              type="button"
              className="download-button"
              onClick={() => void onDownloadCallsCsv()}
              disabled={!canDownloadCsv || isDownloadingCalls || isDownloadingTranscriptions}
            >
              {isDownloadingCalls ? "URL生成中..." : "通話ログのダウンロード"}
            </button>
            <button
              type="button"
              className="download-button"
              onClick={() => void onDownloadTranscriptionsCsv()}
              disabled={!canDownloadCsv || isDownloadingCalls || isDownloadingTranscriptions}
            >
              {isDownloadingTranscriptions ? "URL生成中..." : "書き起こしログのダウンロード"}
            </button>
          </section>
        </article>

        <article className="panel panel-detail-column">
          <TranscribeDetailPanel
            selectedCallSid={selectedCallSid}
            detail={detail}
            isLoading={detailQuery.isLoading}
            isFetching={detailQuery.isFetching}
          />
        </article>
      </section>

      {downloadError ? <ErrorModal message={downloadError} onClose={closeDownloadError} /> : null}
    </main>
  );
}
