type ErrorModalProps = {
  message: string;
  onClose: () => void;
};

export function ErrorModal(props: ErrorModalProps) {
  return (
    <div className="error-modal-backdrop" role="presentation" onClick={props.onClose}>
      <div
        className="error-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="error-modal-title" className="error-modal-title">
          エラーが発生しました
        </h2>
        <p className="error-modal-message">{props.message}</p>
        <div className="error-modal-actions">
          <button className="error-modal-close" type="button" onClick={props.onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
