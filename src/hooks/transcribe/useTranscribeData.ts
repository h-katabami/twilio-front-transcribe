import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useApiProxy } from "../useApiProxy";
import { useAuth } from "../useAuth";

type LogFilters = {
  startDate: string;
  endDate: string;
};

function createInitialFilters(): LogFilters {
  const value = dayjs().format("YYYY-MM-DD");
  return {
    startDate: value,
    endDate: value,
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    if (error.message.includes("company または company_name は必須です")) {
      return "会社がヒットしませんでした";
    }
    return error.message;
  }
  return "CSVダウンロードURLの取得に失敗しました。";
}

export function useTranscribeData() {
  const { fetchLogs, fetchCallsCsvDownloadUrl, fetchTranscriptionsCsvDownloadUrl } = useApiProxy();
  const { getToken } = useAuth();
  const [downloadError, setDownloadError] = useState("");
  const [isDownloadingCalls, setIsDownloadingCalls] = useState(false);
  const [isDownloadingTranscriptions, setIsDownloadingTranscriptions] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [draftFilters, setDraftFilters] = useState<LogFilters>(createInitialFilters);
  const [appliedCompanyName, setAppliedCompanyName] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(createInitialFilters);

  const logsQuery = useQuery({
    queryKey: ["logs", appliedCompanyName, appliedFilters.startDate, appliedFilters.endDate] as const,
    queryFn: async () => fetchLogs(await getToken(), appliedCompanyName, appliedFilters),
    enabled: Boolean(appliedCompanyName),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const logsCount = logsQuery.data ?? 0;
  const isSearching = logsQuery.isFetching;
  const isActionLocked = isSearching || isDownloadingCalls || isDownloadingTranscriptions;

  useEffect(() => {
    if (!appliedCompanyName) {
      return;
    }

    if (logsQuery.status === "error") {
      setDownloadError(toErrorMessage(logsQuery.error));
      return;
    }

    if (logsQuery.status === "success" && logsCount === 0) {
      setDownloadError("会社がヒットしませんでした");
    }
  }, [appliedCompanyName, logsQuery.status, logsQuery.error, logsQuery.dataUpdatedAt, logsCount]);

  const onCompanyNameChange = (nextCompanyName: string) => {
    setCompanyName(nextCompanyName);
  };

  const onSearch = () => {
    if (isSearching) {
      return;
    }

    setDownloadError("");
    const nextCompanyName = companyName.trim();
    setAppliedCompanyName(nextCompanyName);
    setAppliedFilters(draftFilters);
  };

  const canDownloadCsv = Boolean(appliedCompanyName) && logsQuery.status === "success";

  const onDownloadCallsCsv = async () => {
    if (isActionLocked || !canDownloadCsv) {
      return;
    }

    setDownloadError("");
    setIsDownloadingCalls(true);
    try {
      const token = await getToken();
      const url = await fetchCallsCsvDownloadUrl(
        token,
        appliedCompanyName,
        appliedFilters,
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      window.setTimeout(() => {
        iframe.remove();
      }, 2000);
    } catch (error) {
      setDownloadError(toErrorMessage(error));
    } finally {
      setIsDownloadingCalls(false);
    }
  };

  const onDownloadTranscriptionsCsv = async () => {
    if (isActionLocked || !canDownloadCsv) {
      return;
    }

    setDownloadError("");
    setIsDownloadingTranscriptions(true);
    try {
      const token = await getToken();
      const url = await fetchTranscriptionsCsvDownloadUrl(
        token,
        appliedCompanyName,
        appliedFilters,
      );

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);

      window.setTimeout(() => {
        iframe.remove();
      }, 2000);
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
    logsCount,
    companyName,
    onCompanyNameChange,
    filters: draftFilters,
    setFilters: setDraftFilters,
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
  };
}
