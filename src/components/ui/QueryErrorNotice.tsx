type QueryErrorNoticeProps = {
  errors: Array<unknown>;
};

function toMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "データ取得中にエラーが発生しました。";
}

export function QueryErrorNotice(props: QueryErrorNoticeProps) {
  const messages = Array.from(
    new Set(props.errors.map(toMessage).filter((value): value is string => Boolean(value))),
  );

  if (messages.length === 0) {
    return null;
  }

  return (
    <section className="query-error-notice" role="alert" aria-live="polite">
      <p className="query-error-title">エラーが発生しました</p>
      <ul className="query-error-list">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </section>
  );
}
