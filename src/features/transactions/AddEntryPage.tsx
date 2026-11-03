import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PlaceholderPage from '../../pages/PlaceholderPage'
import type { Scope } from '../../types/domain'
import TransactionForm from './TransactionForm'

// /add/expense and /add/income (quick add). Optional ?scope=&crop=&stage=&farm=&machine=
export default function AddEntryPage() {
  const { kind } = useParams()
  const [q] = useSearchParams()
  const navigate = useNavigate()

  if (kind !== 'expense' && kind !== 'income') return <PlaceholderPage title={`Add ${kind ?? ''}`} />

  const close = () => (window.history.length > 1 ? navigate(-1) : navigate('/'))
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
