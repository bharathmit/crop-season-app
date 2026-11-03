import { formatINR } from '../lib/format'
import { perAcre } from '../lib/perAcre'

// "₹9,000" with "₹1,636.36 / acre" underneath. Used for every crop / farm / machine amount.
export default function AmountWithPerAcre({
  amount,
  acres,
  className = '',
  size = 'md',
}: {
  amount: number | null | undefined
  acres: number | null | undefined
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const pa = perAcre(amount ?? 0, acres)
  const main = size === 'lg' ? 'text-xl font-semibold' : size === 'sm' ? 'text-sm font-medium' : 'text-base font-semibold'
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={main}>{formatINR(amount ?? 0)}</span>
      <span className="text-xs text-stone-500">{pa == null ? '— / acre' : `${formatINR(pa)} / acre`}</span>
    </span>
  )
}
