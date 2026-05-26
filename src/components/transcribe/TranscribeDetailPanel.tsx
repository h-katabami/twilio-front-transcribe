import { LoadingSkeleton } from "../../components/ui/LoadingSkeleton";
import { StatusChip } from "../../components/ui/StatusChip";
import { useInputPointAudioPlayer } from "../../hooks/transcribe/useInputPointAudioPlayer";
import type { InputPoint, LogDetail } from "../../types/transcribe/domain.ts";

type TranscribeDetailPanelProps = {
  selectedCallSid: string;
  detail: LogDetail | null | undefined;
  isLoading: boolean;
  isFetching: boolean;
};

function getInputPoints(detail: LogDetail | null | undefined): InputPoint[] {
  if (!detail) {
    return [];
  }
  return Array.isArray(detail.history.inputPoints) ? detail.history.inputPoints : [];
}

export function TranscribeDetailPanel(props: TranscribeDetailPanelProps) {
  const points = getInputPoints(props.detail);
  const shouldShowInitialLoading = props.isLoading && Boolean(props.selectedCallSid) && !props.detail;
  const recordingUrl = props.detail?.history.recordingUrls[0];
  const startedAtLabel = (() => {
    if (!props.detail) {
      return "-";
    }
    const date = new Date(props.detail.history.startedAt);
    if (Number.isNaN(date.getTime())) {
      return "-";
    }
    return date.toLocaleString("ja-JP");
  })();
  const {
    audioRef,
    activeInputPointIndex,
    onInputPointPlayToggle,
    hasPlayableAudio,
  } = useInputPointAudioPlayer({
    resetKey: props.detail?.callSid,
    recordingUrl,
  });

  return (
    <>
      <h2>通話ログ詳細</h2>
      {!props.selectedCallSid ? <p>一覧からログを選択してください。</p> : null}
      {shouldShowInitialLoading ? <LoadingSkeleton lines={6} /> : null}
      {!props.isFetching && !props.isLoading && props.selectedCallSid && !props.detail ? <p>詳細データがありません。</p> : null}

      {props.detail ? (
        <div className="detail-wrap">
          <div className="detail-grid">
            <p><strong>Call SID:</strong> {props.detail.callSid}</p>
            <p><strong>会社:</strong> {props.detail.history.company || "-"}</p>
            <p><strong>発信元:</strong> {props.detail.history.callFrom || "-"}</p>
            <p><strong>着信先:</strong> {props.detail.history.callTo || "-"}</p>
            <p className="detail-full-row"><strong>開始:</strong> {startedAtLabel}</p>
            <div className="detail-status-row">
              <p>
                <strong>ステータス:</strong>{" "}
                <StatusChip status={props.detail.history.status || ""} />
              </p>
              <p>
                <strong>対応ステータス:</strong>{" "}
                <StatusChip status={props.detail.history.userStatus || ""} />
              </p>
            </div>
          </div>

          <div className="audio-wrap">
            <audio
              ref={audioRef}
              src={recordingUrl || undefined}
              controls
              preload="metadata"
              className={`detail-audio${recordingUrl ? "" : " is-hidden"}`}
            />
            {!recordingUrl ? <p className="audio-empty">録音データがありません。</p> : null}
          </div>

          <h3>聞き取り内容</h3>
          <ul className="point-list">
            {points.map((point, index) => (
              <li key={`${point.questionId}-${index}`} className="point-item">
                <div className="point-head">
                  <p><strong>{point.questionId}</strong></p>
                  <button
                    type="button"
                    className="point-play-button"
                    onClick={() => onInputPointPlayToggle(point, index)}
                    disabled={!hasPlayableAudio}
                  >
                    {activeInputPointIndex === index ? "停止" : "再生"}
                  </button>
                </div>
                <p>入力: {point.input || "-"}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
