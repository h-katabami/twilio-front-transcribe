type StatusTone = "done" | "pending" | "warning" | "default";

type StatusChipProps = {
  status: string;
  fallbackLabel?: string;
};

function toStatusTone(status: string): StatusTone {
  if (status.includes("完了")) {
    return "done";
  }
  if (status.includes("未対応")) {
    return "pending";
  }
  if (status.includes("切断") || status.includes("失敗")) {
    return "warning";
  }
  return "default";
}

export function StatusChip(props: StatusChipProps) {
  const label = props.status || props.fallbackLabel || "-";
  return <span className={`status-chip status-chip-${toStatusTone(props.status)}`}>{label}</span>;
}