export default function ReportNotFound() {
  return (
    <main className="not-found-page">
      <div className="not-found-inner">
        <div className="not-found-icon" aria-hidden="true">🔍</div>
        <h1 className="not-found-title">Report not found</h1>
        <p className="not-found-body">
          This report may still be processing, or it has expired after 30 days.
          Verdict analyses run automatically on each push — check back in a few seconds.
        </p>
        <div className="not-found-actions">
          <a href="/" className="btn-secondary">← Back to Verdict</a>
          <a
            href="https://github.com/apps/verdict-diff"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            Install Verdict
          </a>
        </div>
      </div>
    </main>
  )
}
