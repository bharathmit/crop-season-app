export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center">
      <h2 className="mb-1 text-base font-semibold">{title}</h2>
      <p className="text-sm text-stone-500">Coming soon. See docs/progress.md.</p>
    </section>
  )
}
