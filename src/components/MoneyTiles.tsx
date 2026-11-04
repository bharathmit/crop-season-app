import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { formatINR, netClass } from '../lib/format'
import { perAcre } from '../lib/perAcre'

// Owner's preferred colours (crop panel tiles): Expense light red + red icon, Income light green +
// green icon, Net profit light blue + blue icon with the amount red (loss) or green (profit).
export const TILE = {
  expense: { box: 'border-red-100 bg-red-50', icon: 'text-red-700', Icon: Receipt },
  income: { box: 'border-green-100 bg-green-50', icon: 'text-green-700', Icon: Wallet },
  net: { box: 'border-sky-100 bg-sky-50', icon: 'text-sky-700' },
} as const

export const NetIcon = ({ net, className = '' }: { net: number; className?: string }) =>
  net < 0 ? <TrendingDown aria-hidden className={`${TILE.net.icon} ${className}`} /> : <TrendingUp aria-hidden className={`${TILE.net.icon} ${className}`} />

// Expense / Income / Net profit as three small tiles. `suffix` labels the period, e.g. "(2026)".
// `acres` adds a per-acre line (crops only). `netHref` makes the Net tile a link.
// `spaced` adds more space between the label and the amount (Home).
export default function MoneyTiles({ expense, income, suffix = '', acres, netHref, spaced = false }: { expense: number; income: number; suffix?: string; acres?: number; netHref?: string; spaced?: boolean }) {
  const net = income - expense
  const pa = (v: number) => {
    if (acres == null) return null
    const x = perAcre(v, acres)
    return x == null ? null : <span className="block text-[11px] text-stone-500">{formatINR(x)}/ac</span>
  }
  const head = (icon: ReactNode, t: string) => (
    <span className="flex items-start gap-1 text-[11px] leading-tight text-stone-600">
      {icon}
      <span>{t}{suffix ? <> <span className="whitespace-nowrap">{suffix}</span></> : null}</span>
    </span>
  )
  const amt = spaced ? 'mt-1.5' : 'mt-0.5'
  const box = 'block min-w-0 rounded-xl border px-2 py-2 sm:px-2.5'
  const E = TILE.expense
  const I = TILE.income
  const netBody = (
    <>
      {head(<NetIcon net={net} className="h-3.5 w-3.5 shrink-0" />, netHref ? 'Net profit →' : 'Net profit')}
      <span className={`${amt} block truncate text-[13px] font-semibold tracking-tight sm:text-sm sm:tracking-normal ${netClass(net)}`}>{formatINR(net)}</span>
      {pa(net)}
    </>
  )
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className={`${box} ${E.box}`}>
        {head(<E.Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${E.icon}`} />, 'Expense')}
        <span className={`${amt} block truncate text-[13px] font-semibold tracking-tight sm:text-sm sm:tracking-normal text-stone-900`}>{formatINR(expense)}</span>
        {pa(expense)}
      </div>
      <div className={`${box} ${I.box}`}>
        {head(<I.Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${I.icon}`} />, 'Income')}
        <span className={`${amt} block truncate text-[13px] font-semibold tracking-tight sm:text-sm sm:tracking-normal text-stone-900`}>{formatINR(income)}</span>
        {pa(income)}
      </div>
      {netHref ? (
        <Link to={netHref} onClick={(e) => e.stopPropagation()} className={`${box} ${TILE.net.box} hover:border-sky-400`}>{netBody}</Link>
      ) : (
        <div className={`${box} ${TILE.net.box}`}>{netBody}</div>
      )}
    </div>
  )
}
