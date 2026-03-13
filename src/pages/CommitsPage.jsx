import CommitHeatmap  from '../components/CommitHeatmap'
import AdoptionTrend  from '../components/AdoptionTrend'
import FilesChart     from '../components/FilesChart'
import LinesChart     from '../components/LinesChart'
import CommitList     from '../components/CommitList'

export default function CommitsPage({ loading, myTaggedCommits, taggedCommits, since, until, avgFilesChanged, claudeLines, manualLines }) {
  // Commits page shows MY personal commits
  const personal = myTaggedCommits ?? taggedCommits
  return (
    <div className="space-y-4">
      <AdoptionTrend taggedCommits={personal} since={since} until={until} loading={loading} />
      <CommitHeatmap taggedCommits={personal} loading={loading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FilesChart taggedCommits={personal} since={since} until={until} avgFilesChanged={avgFilesChanged} loading={loading} />
        <LinesChart taggedCommits={personal} since={since} until={until} claudeLines={claudeLines} manualLines={manualLines} loading={loading} />
      </div>
      <CommitList taggedCommits={personal} loading={loading} />
    </div>
  )
}
