import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { StatusChip } from "../../components/ui/StatusChip";
import type { LogSummary } from "../../types/transcribe/domain.ts";

type TranscribeLogListProps = {
  logs: LogSummary[];
  isLoading: boolean;
  isFetching: boolean;
  selectedCallSid: string;
  onSelectCallSid: (callSid: string) => void;
};

export function TranscribeLogList(props: TranscribeLogListProps) {
  const statusMessage = !props.isLoading && props.isFetching
    ? "更新中..."
    : !props.isLoading && props.logs.length === 0
      ? "対象データがありません。"
      : "\u00A0";

  return (
    <>
      <h2>通話ログ一覧 <span className="log-count">{props.logs.length}件</span></h2>

      {props.isLoading ? <LoadingSkeleton lines={5} /> : null}
      <p className={`log-list-feedback${!props.isLoading && props.isFetching ? " loading-inline" : ""}`}>
        {statusMessage}
      </p>

      <ul className="log-list">
        {props.logs.map((log) => {
          const date = new Date(log.startedAt);
          const startedAtLabel = Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("ja-JP");

          return (
            <li key={log.callSid}>
              <button
                type="button"
                className={props.selectedCallSid === log.callSid ? "is-active" : ""}
                onClick={() => props.onSelectCallSid(log.callSid)}
              >
                <div className="log-row-top">
                  <strong>{startedAtLabel}</strong>
                  <StatusChip status={log.status || ""} />
                </div>
                <span className="log-row-meta">メモ: {log.memo || "-"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
