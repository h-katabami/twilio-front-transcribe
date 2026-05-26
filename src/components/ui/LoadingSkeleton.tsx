type LoadingSkeletonProps = {
  lines?: number;
};

export function LoadingSkeleton(props: LoadingSkeletonProps) {
  const lines = props.lines ?? 3;

  return (
    <div className="loading-skeleton" aria-live="polite" aria-busy="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span key={index} className="loading-skeleton-line" />
      ))}
    </div>
  );
}
