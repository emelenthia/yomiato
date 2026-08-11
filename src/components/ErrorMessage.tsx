type ErrorMessageProps = {
  title: string;
  description: string;
};

export function ErrorMessage({ title, description }: ErrorMessageProps) {
  return (
    <section
      className="error-message"
      role="alert"
      aria-labelledby="error-title"
    >
      <p className="empty-state-label">エラー</p>
      <h1 id="error-title">{title}</h1>
      <p>{description}</p>
    </section>
  );
}
