import './App.css';

function App() {
  return (
    <main className="popup-shell">
      <header>
        <p className="eyebrow">よみあと</p>
        <h1>読みたいページを、あとで読める場所へ。</h1>
      </header>

      <section className="page-card" aria-labelledby="current-page-heading">
        <p className="section-label" id="current-page-heading">
          現在のページ
        </p>
        <p className="muted">ページ情報はここに表示されます。</p>
      </section>

      <div className="action-stack">
        <button type="button" disabled>
          後で読む
        </button>
        <button type="button" className="secondary" disabled>
          読了として記録
        </button>
      </div>

      <p className="status" role="status">
        画面の骨格を表示しています。
      </p>
    </main>
  );
}

export default App;
