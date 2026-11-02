export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section>
      <h2 className="mb-2 text-xl font-semibold">{title}</h2>
      <p className="text-stone-600">Not built yet. See docs/progress.md.</p>
    </section>
  )
}
