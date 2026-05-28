import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import type { LogFilters, LogSummary } from "../../types/transcribe/domain";
import { useCompaniesQuery, useStatusCheckpointsQuery } from "../transcribe/useTranscribeQueries";
import { useApiProxy } from "../useApiProxy";
import { useAuth } from "../useAuth";

const EMPTY_STATUS_CHECKPOINTS: string[] = [];
export type DashboardPeriod = "today" | "yesterday" | "last7days" | "custom";

type DateRange = Pick<LogFilters, "startDate" | "endDate">;

function toDateRange(period: DashboardPeriod, customRange: DateRange): DateRange {
  if (period === "custom") {
    return customRange;
  }
  if (period === "yesterday") {
    return {
      startDate: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
      endDate: dayjs().subtract(1, "day").format("YYYY-MM-DD"),
    };
  }
  if (period === "last7days") {
    return {
      startDate: dayjs().subtract(6, "day").format("YYYY-MM-DD"),
      endDate: dayjs().format("YYYY-MM-DD"),
    };
  }
  return {
    startDate: dayjs().format("YYYY-MM-DD"),
    endDate: dayjs().format("YYYY-MM-DD"),
  };
}

function createColumns(period: DashboardPeriod, dateRange: DateRange): string[] {
  const start = dayjs(dateRange.startDate);
  const end = dayjs(dateRange.endDate);
  if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
    return [];
  }

  if (period === "last7days" || period === "custom") {
    const days = end.diff(start, "day") + 1;
    return Array.from({ length: days }, (_, index) => start.add(index, "day").format("YYYY-MM-DD"));
  }
  return Array.from({ length: 24 }, (_, index) => String(index));
}

function getBucketKey(log: LogSummary, period: DashboardPeriod): string {
  const dt = dayjs(log.startedAt);
  if (!dt.isValid()) {
    return "";
  }
  return period === "last7days" || period === "custom" ? dt.format("YYYY-MM-DD") : String(dt.hour());
}

export function useDashboardData() {
  const { getToken } = useAuth();
  const { fetchLogs } = useApiProxy();
  const [company, setCompany] = useState("");
  const [period, setPeriod] = useState<DashboardPeriod>("today");
  const today = dayjs().format("YYYY-MM-DD");
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [appliedCustomStartDate, setAppliedCustomStartDate] = useState(today);
  const [appliedCustomEndDate, setAppliedCustomEndDate] = useState(today);

  const companiesQuery = useCompaniesQuery(getToken);
  const companies = companiesQuery.data ?? [];

  useEffect(() => {
    if (!company && companies.length > 0) {
      setCompany(companies[0]);
    }
  }, [company, companies]);

  const statusCheckpointsQuery = useStatusCheckpointsQuery(getToken, company);
  const statusCheckpoints = statusCheckpointsQuery.data ?? EMPTY_STATUS_CHECKPOINTS;

  const isCustomRangeValid = useMemo(() => {
    const start = dayjs(customStartDate);
    const end = dayjs(customEndDate);
    return start.isValid() && end.isValid() && !end.isBefore(start);
  }, [customStartDate, customEndDate]);

  const canApplyCustomRange = isCustomRangeValid
    && (customStartDate !== appliedCustomStartDate || customEndDate !== appliedCustomEndDate);

  const applyCustomRange = () => {
    if (!isCustomRangeValid) {
      return;
    }
    setAppliedCustomStartDate(customStartDate);
    setAppliedCustomEndDate(customEndDate);
  };

  const dateRange = useMemo(
    () => toDateRange(period, { startDate: appliedCustomStartDate, endDate: appliedCustomEndDate }),
    [period, appliedCustomStartDate, appliedCustomEndDate],
  );

  const logsQuery = useQuery({
    queryKey: ["dashboardLogs", company, period, dateRange.startDate, dateRange.endDate] as const,
    queryFn: async () =>
      fetchLogs(await getToken(), company, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        statusCheckpoint: "",
        excludeTestNumber: false,
      }),
    enabled: Boolean(company),
  });

  const logs = logsQuery.data ?? [];

  const aggregation = useMemo(() => {
    const columns = createColumns(period, dateRange);
    const statusList = statusCheckpoints.length > 0
      ? statusCheckpoints
      : Array.from(new Set(logs.map((log) => log.status).filter(Boolean)));

    const countsByStatus: Record<string, number[]> = {
      all: columns.map(() => 0),
    };
    for (const status of statusList) {
      countsByStatus[status] = columns.map(() => 0);
    }

    for (const log of logs) {
      const bucket = getBucketKey(log, period);
      const columnIndex = columns.indexOf(bucket);
      if (columnIndex < 0) {
        continue;
      }

      countsByStatus.all[columnIndex] += 1;
      if (countsByStatus[log.status]) {
        countsByStatus[log.status][columnIndex] += 1;
      }
    }

    const statusTotals: Record<string, number> = {};
    for (const status of statusList) {
      statusTotals[status] = (countsByStatus[status] ?? []).reduce((sum, value) => sum + value, 0);
    }

    return {
      columns,
      statusList,
      countsByStatus,
      statusTotals,
      totalCalls: logs.length,
    };
  }, [logs, period, dateRange, statusCheckpoints]);

  return {
    company,
    setCompany,
    period,
    setPeriod,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    canApplyCustomRange,
    applyCustomRange,
    dateRange,
    companies,
    companiesQuery,
    statusCheckpoints,
    statusCheckpointsQuery,
    logsQuery,
    logs,
    aggregation,
  };
}
