import type { InputPoint, LogDetail, LogFilters, LogHistory, LogSummary, UserInput } from "../types/transcribe/domain.ts";
import { env } from "./useEnv";

type LogSummaryPayload = {
  callSid: string;
  company: string;
  startedAt: string;
  callFrom: string;
  minutes: number;
  status: string;
  memo?: string;
  inputPreview: string;
};

type LogsResponsePayload = {
  items?: LogSummaryPayload[];
};

type StatusCheckpointsResponsePayload = {
  items?: string[];
};

type UserInputPayload = {
  question_id: string;
  input: string;
  created_time: string;
};

type InputPointPayload = {
  question_id: string;
  created_time?: string;
  start_time?: number | string;
  end_time?: number | string;
  input?: string;
  success?: boolean;
};

type LogHistoryPayload = {
  call_sid: string;
  company: string;
  start_time: string;
  call_from: string;
  call_to: string;
  duration: string;
  minutes: number;
  status: string;
  user_status: string;
  memo: string;
  recording_url: string[];
  user_inputs: UserInputPayload[];
  inputs_point: InputPointPayload[];
};

type LogDetailPayload = {
  callSid: string;
  history: LogHistoryPayload;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
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

function mapLogSummary(dto: LogSummaryPayload): LogSummary {
  return {
    callSid: String(dto.callSid || ""),
    company: String(dto.company || ""),
    startedAt: String(dto.startedAt || ""),
    callFrom: String(dto.callFrom || ""),
    minutes: Number(dto.minutes || 0),
    status: String(dto.status || ""),
    memo: String(dto.memo || dto.inputPreview || ""),
    inputPreview: String(dto.inputPreview || ""),
  };
}

function mapUserInput(dto: UserInputPayload): UserInput {
  return {
    questionId: String(dto.question_id || ""),
    input: String(dto.input || ""),
    createdAt: String(dto.created_time || ""),
  };
}

function mapInputPoint(dto: InputPointPayload): InputPoint {
  return {
    questionId: String(dto.question_id || ""),
    createdAt: dto.created_time ? String(dto.created_time) : undefined,
    startTime: dto.start_time,
    endTime: dto.end_time,
    input: dto.input ? String(dto.input) : undefined,
    success: dto.success,
  };
}

function mapLogHistory(dto: LogHistoryPayload): LogHistory {
  return {
    callSid: String(dto.call_sid || ""),
    company: String(dto.company || ""),
    startedAt: String(dto.start_time || ""),
    callFrom: String(dto.call_from || ""),
    callTo: String(dto.call_to || ""),
    duration: String(dto.duration || ""),
    minutes: Number(dto.minutes || 0),
    status: String(dto.status || ""),
    userStatus: String(dto.user_status || ""),
    memo: String(dto.memo || ""),
    recordingUrls: Array.isArray(dto.recording_url) ? dto.recording_url.map((v) => String(v)) : [],
    userInputs: Array.isArray(dto.user_inputs) ? dto.user_inputs.map(mapUserInput) : [],
    inputPoints: Array.isArray(dto.inputs_point) ? dto.inputs_point.map(mapInputPoint) : [],
  };
}

function mapLogDetail(dto: LogDetailPayload): LogDetail {
  return {
    callSid: String(dto.callSid || ""),
    history: mapLogHistory(dto.history),
  };
}

function createLogsParams(company: string, filters: LogFilters): URLSearchParams {
  const params = new URLSearchParams({ company });
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.statusCheckpoint) params.set("statusCheckpoint", filters.statusCheckpoint);
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
  const fetchLogs = async (token: string | null, company: string, filters: LogFilters): Promise<LogSummary[]> => {
    const params = createLogsParams(company, filters);

    const data = await requestJson<LogsResponsePayload>(serviceUrl(`logs?${params.toString()}`), { token });
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map(mapLogSummary);
  };

  const fetchLogDetail = async (
    token: string | null,
    company: string,
    callSid: string,
  ): Promise<LogDetail | null> => {
    const params = new URLSearchParams({ company });
    try {
      const data = await requestJson<LogDetailPayload>(
        serviceUrl(`logs/${encodeURIComponent(callSid)}?${params.toString()}`),
        { token },
      );
      return mapLogDetail(data);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  };

  const fetchCallsCsvDownloadUrl = async (
    token: string | null,
    company: string,
    filters: LogFilters,
  ): Promise<string> => {
    const params = createLogsParams(company, filters);
    const payload = await requestJson<CsvDownloadResponseDto>(serviceUrl(`logs/csv/calls?${params.toString()}`), { token });
    return extractDownloadUrl(payload);
  };

  const fetchTranscriptionsCsvDownloadUrl = async (
    token: string | null,
    company: string,
    filters: LogFilters,
  ): Promise<string> => {
    const params = createLogsParams(company, filters);
    const payload = await requestJson<CsvDownloadResponseDto>(
      serviceUrl(`logs/csv/transcriptions?${params.toString()}`),
      { token },
    );
    return extractDownloadUrl(payload);
  };

  const fetchStatusCheckpoints = async (token: string | null, company: string): Promise<string[]> => {
    const params = new URLSearchParams({ company });
    const data = await requestJson<StatusCheckpointsResponsePayload>(
      serviceUrl(`status-checkpoints?${params.toString()}`),
      { token },
    );
    return Array.isArray(data.items) ? data.items.map((value) => String(value)) : [];
  };

  return {
    fetchLogs,
    fetchLogDetail,
    fetchCallsCsvDownloadUrl,
    fetchTranscriptionsCsvDownloadUrl,
    fetchStatusCheckpoints,
  };
}