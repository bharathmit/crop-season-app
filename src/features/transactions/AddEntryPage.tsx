import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PlaceholderPage from '../../pages/PlaceholderPage'
import type { Scope } from '../../types/domain'
import TransactionForm from './TransactionForm'
import TaskForm from '../tasks/TaskForm'

// /add/expense and /add/income (quick add). Optional ?scope=&crop=&stage=&farm=&machine=
export default function AddEntryPage() {
  const { kind } = useParams()
  const [q] = useSearchParams()
  const navigate = useNavigate()

  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
  if (kind === 'task') return <TaskForm start={{ cropId: q.get('crop') ?? undefined }} onClose={close} onSaved={() => {}} />
  if (kind !== 'expense' && kind !== 'income') return <PlaceholderPage title={`Add ${kind ?? ''}`} />
  return (
    <TransactionForm
      key={kind}
      start={{
        entryType: kind,
        scope: (q.get('scope') as Scope) ?? undefined,
        cropId: q.get('crop') ?? undefined,
        stageId: q.get('stage') ?? undefined,
        farmId: q.get('farm') ?? undefined,
        machineId: q.get('machine') ?? undefined,
      }}
      onClose={close}
      onSaved={() => {}}
    />
  )
}
