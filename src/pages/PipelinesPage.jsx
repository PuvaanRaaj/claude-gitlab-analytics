import PipelineChart from '../components/PipelineChart'

export default function PipelinesPage({ loading, pipelines, since, until }) {
  return (
    <div className="space-y-4">
      <PipelineChart pipelines={pipelines} since={since} until={until} loading={loading} />
    </div>
  )
}
