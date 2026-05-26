import { useEffect, useState } from "react";
import { useApiProxy } from "../useApiProxy";
import { useAuth } from "../useAuth";
import { useCompaniesQuery, useStatusCheckpointsQuery, useTranscribeQueries } from "./useTranscribeQueries";
import { useTranscribeSearchState } from "./useTranscribeSearchState";

const EMPTY_STATUS_CHECKPOINTS: string[] = [];

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "CSVダウンロードURLの取得に失敗しました。";
}

function triggerDownload(url: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);

  // Remove the temporary iframe after the request is fired.
  window.setTimeout(() => {
    iframe.remove();
  }, 2000);
}

export function useTranscribeData() {
  const { fetchCallsCsvDownloadUrl, fetchTranscriptionsCsvDownloadUrl } = useApiProxy();
  const { getToken } = useAuth();
  const [selectedCallSid, setSelectedCallSid] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isDownloadingCalls, setIsDownloadingCalls] = useState(false);
  const [isDownloadingTranscriptions, setIsDownloadingTranscriptions] = useState(false);

  const companiesQuery = useCompaniesQuery(getToken);
  const companies = companiesQuery.data ?? [];
  const searchState = useTranscribeSearchState(companies);
  const { setFilters } = searchState;
  const statusCheckpointsQuery = useStatusCheckpointsQuery(getToken, searchState.company);
  const statusCheckpoints = statusCheckpointsQuery.data ?? EMPTY_STATUS_CHECKPOINTS;
  const selectedStatusCheckpoint = searchState.filters.statusCheckpoint;

  useEffect(() => {
    if (!selectedStatusCheckpoint) {
      return;
    }
    if (!statusCheckpoints.includes(selectedStatusCheckpoint)) {
      setFilters((current) => ({
        ...current,
        statusCheckpoint: "",
      }));
    }
  }, [selectedStatusCheckpoint, setFilters, statusCheckpoints]);

  const { logs, logsQuery, detail, detailQuery } = useTranscribeQueries({
    getToken,
    appliedCompany: searchState.appliedCompany,
    appliedFilters: searchState.appliedFilters,
    selectedCallSid,
  });

  const onCompanyChange = (nextCompany: string) => {
    setSelectedCallSid("");
    searchState.onCompanyChange(nextCompany);
  };

  const onSearch = () => {
    setSelectedCallSid("");
    searchState.onSearch();
  };

  const canDownloadCsv = Boolean(searchState.appliedCompany);

  const onDownloadCallsCsv = async () => {
    if (!canDownloadCsv) {
      setDownloadError("先に検索を実行してからダウンロードしてください。");
      return;
    }

    setDownloadError("");
    setIsDownloadingCalls(true);
    try {
      const token = await getToken();
      const url = await fetchCallsCsvDownloadUrl(
        token,
        searchState.appliedCompany,
        searchState.appliedFilters,
      );
      triggerDownload(url);
    } catch (error) {
      setDownloadError(toErrorMessage(error));
    } finally {
      setIsDownloadingCalls(false);
    }
  };

  const onDownloadTranscriptionsCsv = async () => {
    if (!canDownloadCsv) {
      setDownloadError("先に検索を実行してからダウンロードしてください。");
      return;
    }

    setDownloadError("");
    setIsDownloadingTranscriptions(true);
    try {
      const token = await getToken();
      const url = await fetchTranscriptionsCsvDownloadUrl(
        token,
        searchState.appliedCompany,
        searchState.appliedFilters,
      );
      triggerDownload(url);
    } catch (error) {
      setDownloadError(toErrorMessage(error));
    } finally {
      setIsDownloadingTranscriptions(false);
    }
  };

  const closeDownloadError = () => {
    setDownloadError("");
  };

  return {
    companies,
    companiesQuery,
    statusCheckpoints,
    statusCheckpointsQuery,
    logs,
    logsQuery,
    detail,
    detailQuery,
    company: searchState.company,
    onCompanyChange,
    filters: searchState.filters,
    setFilters: searchState.setFilters,
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
  };
}
