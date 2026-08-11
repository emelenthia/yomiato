type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <p className="empty-state-label">空の状態</p>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
