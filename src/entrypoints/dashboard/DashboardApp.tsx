import './DashboardApp.css';

const views = [
  { title: 'Inbox', description: '未読ページを確認します。' },
  { title: '読書ログ', description: '読了したページと振り返りを確認します。' },
  {
    title: '設定・データ管理',
    description: '保存方針とデータ管理を確認します。',
  },
];

function DashboardApp() {
  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">よみあと</p>
          <h1>読書の記録</h1>
        </div>
        <p className="status" role="status">
          画面の骨格を表示しています。
        </p>
      </header>

      <nav aria-label="管理画面のビュー">
        {views.map((view) => (
          <button type="button" key={view.title} disabled>
            {view.title}
          </button>
        ))}
      </nav>

      <section className="view-grid" aria-label="管理画面の概要">
        {views.map((view) => (
          <article className="view-card" key={view.title}>
            <h2>{view.title}</h2>
            <p>{view.description}</p>
            <p className="empty">データはまだありません。</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export default DashboardApp;
