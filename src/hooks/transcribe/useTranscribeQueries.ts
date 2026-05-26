import { useQuery } from "@tanstack/react-query";
import type { LogFilters } from "../../types/transcribe/domain.ts";
import { useApiCommon } from "../useApiCommon";
import { useApiProxy } from "../useApiProxy";

type UseTranscribeQueriesParams = {
  getToken: () => Promise<string | null>;
  appliedCompany: string;
  appliedFilters: LogFilters;
  selectedCallSid: string;
};

export function useCompaniesQuery(getToken: () => Promise<string | null>) {
  const { fetchCompanies } = useApiCommon();

  return useQuery({
    queryKey: ["companies"] as const,
    queryFn: async () => fetchCompanies(await getToken()),
    staleTime: 5 * 60 * 1000,
  });
}

export function useStatusCheckpointsQuery(
  getToken: () => Promise<string | null>,
  company: string,
) {
  const { fetchStatusCheckpoints } = useApiProxy();

  return useQuery({
    queryKey: ["statusCheckpoints", company] as const,
    queryFn: async () => fetchStatusCheckpoints(await getToken(), company),
    enabled: Boolean(company),
    staleTime: 5 * 60 * 1000,
  });
}

export function useTranscribeQueries(params: UseTranscribeQueriesParams) {
  const { fetchLogs, fetchLogDetail } = useApiProxy();
  const { getToken, appliedCompany, appliedFilters, selectedCallSid } = params;
  const hasAppliedCompany = Boolean(appliedCompany);
  const hasSelectedCallSid = Boolean(selectedCallSid);

  const logsQuery = useQuery({
    queryKey: ["logs", appliedCompany, appliedFilters.startDate, appliedFilters.endDate, appliedFilters.statusCheckpoint] as const,
    queryFn: async () => fetchLogs(await getToken(), appliedCompany, appliedFilters),
    enabled: hasAppliedCompany,
  });

  const detailQuery = useQuery({
    queryKey: ["logDetail", appliedCompany, selectedCallSid] as const,
    queryFn: async () => fetchLogDetail(await getToken(), appliedCompany, selectedCallSid),
    enabled: hasAppliedCompany && hasSelectedCallSid,
  });

  return {
    logsQuery,
    detailQuery,
    logs: logsQuery.data ?? [],
    detail: detailQuery.data,
  };
}