import { env } from "./useEnv";

type LogFilters = {
  startDate: string;
  endDate: string;
};

type LogsResponsePayload = {
  items?: unknown[];
};

type CompanyItemDto = {
  company?: string;
  name?: string;
};

type CompaniesResponseDto = {
  results?: CompanyItemDto[];
};

type RequestOptions = {
  token?: string | null;
  method?: string;
  body?: unknown;
};

class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
  }
}

async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, `Request failed: ${response.status} ${text}`);
  }

  return (await response.json()) as T;
}

type CsvDownloadResponseDto = {
  downloadUrl?: string;
  url?: string;
  signedUrl?: string;
};

function serviceUrl(path: string): string {
  return `${env.proxyBaseUrl}/services/Transcribe/${path}`;
}

function createLogsParams(companyName: string, filters: LogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (companyName) {
    params.set("company_name", companyName);
  }
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  params.set("excludeTestNumber", "false");
  return params;
}

function extractDownloadUrl(payload: CsvDownloadResponseDto): string {
  const url = payload.downloadUrl || payload.url || payload.signedUrl || "";
  if (!url) {
    throw new Error("ダウンロードURLの取得に失敗しました。");
  }
  return url;
}

export function useApiProxy() {
  const fetchCompanies = async (token: string | null): Promise<string[]> => {
    const payload = await requestJson<CompaniesResponseDto>(serviceUrl("companies"), { token });
    if (!Array.isArray(payload.results)) {
      return [];
    }

    return payload.results
      .map((item) => String(item?.name ?? "").trim())
      .filter((name): name is string => Boolean(name));
  };

  const fetchLogs = async (token: string | null, companyName: string, filters: LogFilters): Promise<number> => {
    const params = createLogsParams(companyName, filters);

    const data = await requestJson<LogsResponsePayload>(serviceUrl(`logs?${params.toString()}`), { token });
    return Array.isArray(data.items) ? data.items.length : 0;
  };

  const fetchCallsCsvDownloadUrl = async (
    token: string | null,
    companyName: string,
    filters: LogFilters,
  ): Promise<string> => {
    const params = createLogsParams(companyName, filters);
    const payload = await requestJson<CsvDownloadResponseDto>(serviceUrl(`logs/csv/calls?${params.toString()}`), { token });
    return extractDownloadUrl(payload);
  };

  const fetchTranscriptionsCsvDownloadUrl = async (
    token: string | null,
    companyName: string,
    filters: LogFilters,
  ): Promise<string> => {
    const params = createLogsParams(companyName, filters);
    const payload = await requestJson<CsvDownloadResponseDto>(
      serviceUrl(`logs/csv/transcriptions?${params.toString()}`),
      { token },
    );
    return extractDownloadUrl(payload);
  };

  return {
    fetchCompanies,
    fetchLogs,
    fetchCallsCsvDownloadUrl,
    fetchTranscriptionsCsvDownloadUrl,
  };
}