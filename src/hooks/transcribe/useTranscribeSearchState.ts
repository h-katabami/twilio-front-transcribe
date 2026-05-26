import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import type { LogFilters } from "../../types/transcribe/domain.ts";

function today(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function createInitialFilters(): LogFilters {
  const value = today();
  return {
    startDate: value,
    endDate: value,
    statusCheckpoint: "",
  };
}

type UseTranscribeSearchStateResult = {
  company: string;
  onCompanyChange: (nextCompany: string) => void;
  filters: LogFilters;
  setFilters: Dispatch<SetStateAction<LogFilters>>;
  appliedCompany: string;
  appliedFilters: LogFilters;
  onSearch: () => void;
};

export function useTranscribeSearchState(companies: string[]): UseTranscribeSearchStateResult {
  const [company, setCompany] = useState("");
  const [draftFilters, setDraftFilters] = useState<LogFilters>(createInitialFilters);
  const [appliedCompany, setAppliedCompany] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<LogFilters>(createInitialFilters);

  useEffect(() => {
    if (!company && companies.length > 0) {
      setCompany(companies[0]);
    }
  }, [company, companies]);

  const onCompanyChange = (nextCompany: string) => {
    setCompany(nextCompany);
    setDraftFilters((current) => ({
      ...current,
      statusCheckpoint: "",
    }));
    setAppliedCompany("");
  };

  const onSearch = () => {
    setAppliedCompany(company);
    setAppliedFilters(draftFilters);
  };

  return {
    company,
    onCompanyChange,
    filters: draftFilters,
    setFilters: setDraftFilters,
    appliedCompany,
    appliedFilters,
    onSearch,
  };
}