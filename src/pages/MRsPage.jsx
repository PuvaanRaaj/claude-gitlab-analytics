import MRList           from '../components/MRList'
import MRSizeChart      from '../components/MRSizeChart'
import TimeToMergeChart from '../components/TimeToMergeChart'

export default function MRsPage({ loading, taggedMRs }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MRSizeChart      taggedMRs={taggedMRs} loading={loading} />
        <TimeToMergeChart taggedMRs={taggedMRs} loading={loading} />
      </div>
      <MRList taggedMRs={taggedMRs} loading={loading} />
    </div>
  )
}
