export default function PublicLinkDisabled({
  t,
}: {
  t: { title: string; body: string; cta: string };
}) {
  return (
    <main className="min-h-screen bg-[#fbf9f8] flex items-center justify-center px-6">
      <section className="max-w-lg w-full bg-white border border-stone-200 rounded-2xl p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-900">{t.title}</h1>
        <p className="text-stone-600 mt-3">{t.body}</p>
        <a
          href="/en/register"
          className="inline-block mt-6 px-5 py-2.5 bg-amber-900 text-white rounded-lg font-semibold"
        >
          {t.cta}
        </a>
      </section>
    </main>
  );
}
