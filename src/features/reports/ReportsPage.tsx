import { useState } from 'react'
import { Download, Printer } from 'lucide-react'
import EmptyState from '../../components/ui/EmptyState'
import { Button, ErrorText, Field, Select } from '../../components/ui/form'
import { downloadCSV } from '../../lib/csv'
import { formatAcres, formatINR } from '../../lib/format'
import { perAcre } from '../../lib/perAcre'
import { supabase } from '../../lib/supabase'
import { useRows } from '../../lib/useRows'
import { useFarms } from '../farms/data'

type CropProfit = {
  crop_id: string; crop_name: string; variety: string | null; season: string; season_year: number; area_acres: number; net_yield_qtl: number | null
  revenue: number; expense: number; profit: number; revenue_per_acre: number; expense_per_acre: number; profit_per_acre: number
  roi_pct: number | null; cost_benefit_ratio: number | null; profit_per_qtl: number | null; produce_price_per_qtl: number | null
  breakeven_yield_qtl_per_acre: number | null; breakeven_price_per_qtl: number | null
}
type StageRow = { crop_stage_id: string; stage_name: string; sort_order: number; expense_net: number; expense_per_acre: number; share_pct: number | null }
type CatRow = { category_id: string; category_name: string; entry_type: string; sort_order: number; net_total: number; net_per_acre: number; share_pct: number | null }
type YearRow = { year: number; area_acres: number; crop_net: number; farm_net: number; machinery_net: number; overall_profit: number; overall_per_acre: number }

const card = 'rounded-2xl border border-stone-200 bg-white p-4 break-inside-avoid'
const num = (v: number | null | undefined, suffix = '') => (v == null ? '—' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}${suffix}`)
const money = (v: number | null | undefined) => (v == null ? '—' : formatINR(v))
const tone = (v: number | null | undefined) => (v == null ? '' : Number(v) < 0 ? 'text-red-700' : 'text-green-700')

function SectionHead({ title, onCsv }: { title: string; onCsv?: () => void }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h3 className="text-base font-semibold">{title}</h3>
      {onCsv && (
        <button onClick={onCsv} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-green-800 hover:bg-green-50 print:hidden">
          <Download className="h-4 w-4" />CSV
        </button>
      )}
    </div>
  )
}

export default function ReportsPage() {
  const farms = useFarms()
  const [farmPick, setFarmPick] = useState('')
  const farm = farms.data?.find((f) => f.id === farmPick) ?? farms.data?.[0]
  const farmId = farm?.id ?? ''

  const crops = useRows<CropProfit[]>(
    () => supabase.from('v_crop_profit').select('*').eq('farm_id', farmId).order('season_year', { ascending: false }).returns<CropProfit[]>(),
    [farmId],
  )
  const [cropPick, setCropPick] = useState('')
  const crop = crops.data?.find((c) => c.crop_id === cropPick) ?? crops.data?.[0]
  const cropId = crop?.crop_id ?? ''

  const stages = useRows<StageRow[]>(
    () => supabase.from('v_crop_stage_summary').select('crop_stage_id, stage_name, sort_order, expense_net, expense_per_acre, share_pct').eq('crop_id', cropId).order('sort_order').returns<StageRow[]>(),
    [cropId],
  )
  const cats = useRows<CatRow[]>(
    () => supabase.from('v_category_summary').select('category_id, category_name, entry_type, sort_order, net_total, net_per_acre, share_pct').eq('crop_id', cropId).order('entry_type').order('sort_order').returns<CatRow[]>(),
    [cropId],
  )
  const years = useRows<YearRow[]>(
    () => supabase.from('v_overall_profit').select('year, area_acres, crop_net, farm_net, machinery_net, overall_profit, overall_per_acre').eq('farm_id', farmId).order('year', { ascending: false }).returns<YearRow[]>(),
    [farmId],
  )

  async function exportEntries() {
    const { data, error } = await supabase
      .from('transactions')
      .select('start_date, end_date, entry_type, scope, quantity, unit, rate, amount, govt_support, net_amount, party, invoice_no, paid_by, paid_on, remarks, item:items(name, category:categories(name)), stage:crop_stages(name), crop:crops(crop_name, variety, season, season_year, area_acres), machine:machinery(name)')
      .eq('farm_id', farmId)
      .order('start_date')
      .returns<Record<string, any>[]>() // eslint-disable-line @typescript-eslint/no-explicit-any
    if (error || !data) return
    downloadCSV(
      `${farm?.name ?? 'farm'}-entries.csv`,
      ['Date', 'End date', 'Type', 'For', 'Crop / machine', 'Season', 'Stage', 'Category', 'Item', 'Qty', 'Unit', 'Rate', 'Amount', 'Subsidy / bonus', 'Net', 'Per acre', 'Supplier / buyer', 'Invoice no.', 'Paid by', 'Paid on', 'Remarks'],
      data.map((t) => {
        const acres = t.scope === 'crop' ? t.crop?.area_acres : farm?.area_acres
        return [
          t.start_date, t.end_date, t.entry_type, t.scope,
          t.scope === 'crop' ? `${t.crop?.crop_name ?? ''}${t.crop?.variety ? ` (${t.crop.variety})` : ''}` : t.scope === 'machinery' ? t.machine?.name : farm?.name,
          t.crop ? `${t.crop.season} ${t.crop.season_year}` : '', t.stage?.name ?? '', t.item?.category?.name ?? '', t.item?.name ?? '',
          t.quantity, t.unit, t.rate, t.amount, t.govt_support, t.net_amount, perAcre(t.net_amount, acres), t.party, t.invoice_no, t.paid_by, t.paid_on, t.remarks,
        ]
      }),
    )
  }

  if (!farms.loading && !farms.data?.length) return <EmptyState title="No farm yet" text="Reports appear once you add a farm and a crop." />

  const a = crop?.area_acres
  const pl: { label: string; total: string; perAcre: string; cls?: string }[] = crop
    ? [
        { label: 'Total revenue', total: money(crop.revenue), perAcre: money(crop.revenue_per_acre) },
        { label: 'Total expense', total: money(crop.expense), perAcre: money(crop.expense_per_acre) },
        { label: 'Net profit / loss', total: money(crop.profit), perAcre: money(crop.profit_per_acre), cls: tone(crop.profit) },
        { label: 'ROI', total: num(crop.roi_pct, '%'), perAcre: '' },
        { label: 'Cost-benefit ratio (revenue ÷ expense)', total: num(crop.cost_benefit_ratio), perAcre: '' },
        { label: 'Net yield', total: num(crop.net_yield_qtl, ' qtl'), perAcre: crop.net_yield_qtl == null ? '—' : num(perAcre(crop.net_yield_qtl, a), ' qtl') },
        { label: 'Average sale price', total: crop.produce_price_per_qtl == null ? '—' : `${money(crop.produce_price_per_qtl)} / qtl`, perAcre: '' },
        { label: 'Profit per quintal', total: money(crop.profit_per_qtl), perAcre: '' },
        { label: 'Break-even yield', total: '', perAcre: num(crop.breakeven_yield_qtl_per_acre, ' qtl') },
        { label: 'Break-even price', total: crop.breakeven_price_per_qtl == null ? '—' : `${money(crop.breakeven_price_per_qtl)} / qtl`, perAcre: '' },
      ]
    : []

  const cropLabel = (c: CropProfit) => `${c.crop_name}${c.variety ? ` (${c.variety})` : ''} · ${c.season} ${c.season_year}`

  return (
    <div className="space-y-4">
      <ErrorText>{farms.error ?? crops.error ?? stages.error ?? cats.error ?? years.error}</ErrorText>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end print:hidden">
        {(farms.data?.length ?? 0) > 1 && (
          <Field label="Farm">
            <Select value={farmId} onChange={(e) => { setFarmPick(e.target.value); setCropPick('') }}>
              {farms.data!.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Crop" className={(farms.data?.length ?? 0) > 1 ? '' : 'md:col-span-2'}>
          <Select value={cropId} onChange={(e) => setCropPick(e.target.value)} disabled={!crops.data?.length}>
            {(crops.data ?? []).map((c) => <option key={c.crop_id} value={c.crop_id}>{cropLabel(c)}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Button tone="secondary" onClick={exportEntries}><Download className="h-4 w-4" />Entries CSV</Button>
          <Button tone="secondary" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button>
        </div>
      </div>

      <p className="hidden text-lg font-semibold print:block">{farm?.name} · {crop ? cropLabel(crop) : ''}</p>

      {!crop ? (
        <EmptyState title="No crops yet" text="Add a crop to see its profit report." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Crop P&L (owner's Excel summary) */}
          <section className={`${card} lg:col-span-2`}>
            <SectionHead
              title={`Profit / loss · ${cropLabel(crop)} · ${formatAcres(crop.area_acres)}`}
              onCsv={() => downloadCSV(`${crop.crop_name}-${crop.season}-${crop.season_year}-profit.csv`, ['Metric', 'Total', 'Per acre'], pl.map((r) => [r.label, r.total, r.perAcre]))}
            />
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-stone-500">
                <tr><th className="py-2 font-medium">Metric</th><th className="py-2 text-right font-medium">Total</th><th className="py-2 text-right font-medium">Per acre</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pl.map((r) => (
                  <tr key={r.label}>
                    <td className="py-2 pr-2">{r.label}</td>
                    <td className={`whitespace-nowrap py-2 text-right font-medium ${r.cls ?? ''}`}>{r.total}</td>
                    <td className={`whitespace-nowrap py-2 pl-2 text-right ${r.cls ?? 'text-stone-600'}`}>{r.perAcre}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-stone-500">Cash basis: own labour and farm-made inputs are not costed. Break-even yield = expense per acre ÷ average sale price; it appears after a produce sale (per quintal) is entered.</p>
          </section>

          {/* Stage summary */}
          <section className={card}>
            <SectionHead
              title="Expense by stage"
              onCsv={() => downloadCSV(`${crop.crop_name}-stages.csv`, ['Stage', 'Expense', 'Per acre', '% of total'], (stages.data ?? []).map((s) => [s.stage_name, s.expense_net, s.expense_per_acre, s.share_pct]))}
            />
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-stone-500"><tr><th className="py-2 font-medium">Stage</th><th className="py-2 text-right font-medium">Expense</th><th className="py-2 text-right font-medium">Per acre</th><th className="py-2 text-right font-medium">%</th></tr></thead>
              <tbody className="divide-y divide-stone-100">
                {(stages.data ?? []).map((s) => (
                  <tr key={s.crop_stage_id} className={Number(s.expense_net) ? '' : 'text-stone-400'}>
                    <td className="py-2 pr-2">{s.stage_name}</td>
                    <td className="whitespace-nowrap py-2 text-right font-medium">{money(s.expense_net)}</td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right">{money(s.expense_per_acre)}</td>
                    <td className="whitespace-nowrap py-2 pl-2 text-right">{num(s.share_pct ?? 0, '%')}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-2">Total</td>
                  <td className="whitespace-nowrap py-2 text-right">{money(crop.expense)}</td>
                  <td className="whitespace-nowrap py-2 pl-2 text-right">{money(crop.expense_per_acre)}</td>
                  <td className="py-2 pl-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* Category summary */}
          <section className={card}>
            <SectionHead
              title="By category"
              onCsv={() => downloadCSV(`${crop.crop_name}-categories.csv`, ['Type', 'Category', 'Net', 'Per acre', '% of type'], (cats.data ?? []).map((c) => [c.entry_type, c.category_name, c.net_total, c.net_per_acre, c.share_pct]))}
            />
            {!cats.data?.length ? (
              <p className="text-sm text-stone-500">No entries yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-stone-500"><tr><th className="py-2 font-medium">Category</th><th className="py-2 text-right font-medium">Net</th><th className="py-2 text-right font-medium">Per acre</th><th className="hidden py-2 text-right font-medium sm:table-cell">%</th></tr></thead>
                <tbody className="divide-y divide-stone-100">
                  {cats.data.map((c) => (
                    <tr key={`${c.entry_type}-${c.category_id}`}>
                      <td className="py-2 pr-2"><span className="block sm:inline">{c.category_name}</span><span className={`ml-0 mt-0.5 inline-block rounded-full sm:ml-2 sm:mt-0 px-1.5 text-[10px] uppercase ${c.entry_type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{c.entry_type}</span></td>
                      <td className="whitespace-nowrap py-2 text-right font-medium">{money(c.net_total)}</td>
                      <td className="whitespace-nowrap py-2 pl-2 text-right">{money(c.net_per_acre)}</td>
                      <td className="hidden whitespace-nowrap py-2 pl-2 text-right sm:table-cell">{num(c.share_pct, '%')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      {/* All crops compared, per acre */}
      {!!crops.data?.length && (
        <section className={card}>
          <SectionHead
            title="Crops compared (per acre)"
            onCsv={() => downloadCSV('crops-compared.csv', ['Crop', 'Season', 'Acres', 'Expense / acre', 'Revenue / acre', 'Profit / acre', 'ROI %', 'Net yield qtl'], crops.data!.map((c) => [cropLabel(c), `${c.season} ${c.season_year}`, c.area_acres, c.expense_per_acre, c.revenue_per_acre, c.profit_per_acre, c.roi_pct, c.net_yield_qtl]))}
          />
          <ul className="divide-y divide-stone-100 md:hidden">
            {crops.data.map((c) => (
              <li key={c.crop_id} className="py-3 text-sm">
                <p className="font-medium">{c.crop_name}{c.variety ? ` · ${c.variety}` : ''} <span className="font-normal text-stone-500">{c.season} {c.season_year} · {formatAcres(c.area_acres)}</span></p>
                <p className="mt-1 grid grid-cols-3 gap-2 text-xs text-stone-600">
                  <span>Exp/ac<br /><strong className="text-stone-900">{money(c.expense_per_acre)}</strong></span>
                  <span>Rev/ac<br /><strong className="text-stone-900">{money(c.revenue_per_acre)}</strong></span>
                  <span>Profit/ac<br /><strong className={tone(c.profit_per_acre)}>{money(c.profit_per_acre)}</strong></span>
                </p>
              </li>
            ))}
          </ul>
          <table className="hidden w-full text-sm md:table">
            <thead className="text-left text-xs text-stone-500">
              <tr><th className="py-2 font-medium">Crop</th><th className="py-2 font-medium">Season</th><th className="py-2 text-right font-medium">Acres</th><th className="py-2 text-right font-medium">Expense / ac</th><th className="py-2 text-right font-medium">Revenue / ac</th><th className="py-2 text-right font-medium">Profit / ac</th><th className="py-2 text-right font-medium">ROI</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {crops.data.map((c) => (
                <tr key={c.crop_id}>
                  <td className="py-2 pr-2 font-medium">{c.crop_name}{c.variety ? <span className="font-normal text-stone-500"> · {c.variety}</span> : ''}</td>
                  <td className="whitespace-nowrap py-2">{c.season} {c.season_year}</td>
                  <td className="py-2 text-right">{num(c.area_acres)}</td>
                  <td className="whitespace-nowrap py-2 text-right">{money(c.expense_per_acre)}</td>
                  <td className="whitespace-nowrap py-2 text-right">{money(c.revenue_per_acre)}</td>
                  <td className={`whitespace-nowrap py-2 text-right font-semibold ${tone(c.profit_per_acre)}`}>{money(c.profit_per_acre)}</td>
                  <td className="whitespace-nowrap py-2 text-right">{num(c.roi_pct, '%')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Overall profit by year */}
      <section className={card}>
        <SectionHead
          title={`Overall profit by year · ${farm?.name ?? ''}`}
          onCsv={() => downloadCSV('overall-profit.csv', ['Year', 'Crops net', 'Farm net', 'Machinery net', 'Overall profit', 'Per acre'], (years.data ?? []).map((y) => [y.year, y.crop_net, y.farm_net, y.machinery_net, y.overall_profit, y.overall_per_acre]))}
        />
        {!years.data?.length ? (
          <p className="text-sm text-stone-500">No entries yet.</p>
        ) : (
          <>
          <ul className="divide-y divide-stone-100 md:hidden">
            {years.data.map((y) => (
              <li key={y.year} className="py-3 text-sm">
                <p className="flex justify-between font-medium"><span>{y.year}</span><span className={tone(y.overall_profit)}>{money(y.overall_profit)} <span className="text-xs font-normal text-stone-500">· {money(y.overall_per_acre)}/ac</span></span></p>
                <p className="mt-1 grid grid-cols-3 gap-2 text-xs text-stone-600">
                  <span>Crops<br /><strong className={tone(y.crop_net)}>{money(y.crop_net)}</strong></span>
                  <span>Farm<br /><strong className={tone(y.farm_net)}>{money(y.farm_net)}</strong></span>
                  <span>Machinery<br /><strong className={tone(y.machinery_net)}>{money(y.machinery_net)}</strong></span>
                </p>
              </li>
            ))}
          </ul>
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-stone-500">
                <tr><th className="py-2 font-medium">Year</th><th className="py-2 text-right font-medium">Crops</th><th className="py-2 text-right font-medium">Farm</th><th className="py-2 text-right font-medium">Machinery</th><th className="py-2 text-right font-medium">Overall</th><th className="py-2 text-right font-medium">Per acre</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {years.data.map((y) => (
                  <tr key={y.year}>
                    <td className="py-2 font-medium">{y.year}</td>
                    <td className={`whitespace-nowrap py-2 text-right ${tone(y.crop_net)}`}>{money(y.crop_net)}</td>
                    <td className={`whitespace-nowrap py-2 text-right ${tone(y.farm_net)}`}>{money(y.farm_net)}</td>
                    <td className={`whitespace-nowrap py-2 text-right ${tone(y.machinery_net)}`}>{money(y.machinery_net)}</td>
                    <td className={`whitespace-nowrap py-2 text-right font-semibold ${tone(y.overall_profit)}`}>{money(y.overall_profit)}</td>
                    <td className={`whitespace-nowrap py-2 text-right ${tone(y.overall_per_acre)}`}>{money(y.overall_per_acre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
        <p className="mt-2 text-xs text-stone-500">Crops count in their season year; farm and machinery entries in the year they happened. Per acre uses the farm's {formatAcres(farm?.area_acres)}.</p>
      </section>
    </div>
  )
}
