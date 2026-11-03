// Per-acre value used beside every money figure (CLAUDE.md › Per-acre everywhere).
export function perAcre(amount: number | null | undefined, acres: number | null | undefined): number | null {
  const a = Number(acres)
  if (!a || a <= 0 || amount == null || !Number.isFinite(Number(amount))) return null
  return Math.round((Number(amount) / a) * 100) / 100
}
