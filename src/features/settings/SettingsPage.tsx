import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Chips from '../../components/ui/Chips'
import { Button } from '../../components/ui/form'
import { useAuth } from '../../app/auth'
import { supabase } from '../../lib/supabase'
import CategoriesEditor from './CategoriesEditor'
import GuidanceEditor from './GuidanceEditor'

type Tab = 'items' | 'guidance' | 'account'

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('items')
  const { session } = useAuth()

  return (
    <div className="space-y-4">
      <Chips
        label="Settings section"
        value={tab}
        onChange={(k) => setTab(k as Tab)}
        chips={[
          { key: 'items', label: 'Categories & items' },
          { key: 'guidance', label: 'Stage checklist' },
          { key: 'account', label: 'Account' },
        ]}
      />

      {tab === 'items' && <CategoriesEditor />}
      {tab === 'guidance' && <GuidanceEditor />}
      {tab === 'account' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">Signed in as</p>
            <p className="break-all font-medium">{session?.user.email ?? '—'}</p>
            <Button tone="secondary" className="mt-4" onClick={() => void supabase.auth.signOut()}><LogOut className="h-4 w-4" />Sign out</Button>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4 text-sm">
            <p className="font-medium">Farms</p>
            <p className="text-stone-600">Add or edit farms, acres and ownership on the <Link to="/farm" className="font-medium text-green-800">Farm page →</Link></p>
          </div>
        </div>
      )}
    </div>
  )
}
