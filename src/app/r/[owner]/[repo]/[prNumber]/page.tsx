interface Props {
  params: Promise<{ owner: string; repo: string; prNumber: string }>
}

export default async function ReportPage({ params }: Props) {
  const { owner, repo, prNumber } = await params
  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem' }}>
      <h1>Verdict Report</h1>
      <p>
        <strong>{owner}/{repo}</strong> — PR #{prNumber}
      </p>
      <p style={{ color: '#888' }}>Full report dashboard coming soon.</p>
    </main>
  )
}
