import { useState } from 'react'
import { todayISO } from './format'

// Date period for farm / machinery money: this month, this year, custom range or all.
export type PeriodKey = 'month' | 'year' | 'custom' | 'all'
export type DateRange = { from: string | null; to: string | null }

export function periodRange(key: PeriodKey, customFrom: string, customTo: string): DateRange {
  const today = todayISO()
  const [y, m] = today.split('-')
  if (key === 'month') {
    const last = new Date(Number(y), Number(m), 0).getDate()
    return { from: `${y}-${m}-01`, to: `${y}-${m}-${String(last).padStart(2, '0')}` }
  }
  if (key === 'year') return { from: `${y}-01-01`, to: `${y}-12-31` }
  if (key === 'custom') return { from: customFrom || null, to: customTo || null }
  return { from: null, to: null }
}

export function inRange(iso: string, r: DateRange) {
  const d = iso.slice(0, 10)
  return (!r.from || d >= r.from) && (!r.to || d <= r.to)
}

export function usePeriod(initial: PeriodKey = 'year') {
  const [key, setKey] = useState<PeriodKey>(initial)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  return { key, setKey, from, setFrom, to, setTo, range: periodRange(key, from, to) }
}

export type PeriodState = ReturnType<typeof usePeriod>
