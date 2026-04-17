import Link from "next/link";

const tracks = [
  {
    title: "Narrative Arc",
    points: [
      "Problem framing for family-first digital care",
      "Signal-to-action loop across Assess, Guardian, and MedPod",
      "Design language rules for trust, urgency, and calm",
    ],
  },
  {
    title: "Operating Metrics",
    points: [
      "Guardian: alert acknowledgement and follow-through rate",
      "MedPod: dispatch latency, route confidence, and ETA drift",
      "Platform: weekly retention and completed care journeys",
    ],
  },
  {
    title: "Release Gates",
    points: [
      "Consent defaults validated for minors and guardians",
      "Offline fallback for registration and CRM continuity",
      "Map provider abstraction verified (OSM primary, Google optional)",
    ],
  },
];

export default function CDOPage() {
  return (
    <main className="min-h-dvh bg-[#090a0d] text-white px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs tracking-[0.18em] text-amber-300 mb-3">CDO VIEW</p>
        <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">Design Command Brief</h1>
        <p className="text-white/70 max-w-3xl leading-relaxed mb-8">
          This route packages the current product direction into a decision-ready brief: story,
          signals, and release gates. Use it as the source of truth before interface or roadmap changes.
        </p>

        <section className="grid gap-4 md:grid-cols-3 mb-8">
          {tracks.map((track) => (
            <article key={track.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-bold mb-3">{track.title}</h2>
              <ul className="space-y-2 text-sm text-white/75 leading-relaxed">
                {track.points.map((point) => (
                  <li key={point}>• {point}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-5 mb-8">
          <h3 className="text-lg font-semibold mb-2">Templator Pairing</h3>
          <p className="text-sm text-white/80 mb-4">
            After review, move to templator to instantiate rollout patterns for launch week,
            incident response, and parent communication cadence.
          </p>
          <Link
            href="/templator"
            className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Open Templator
          </Link>
        </section>

        <Link href="/" className="text-sm text-white/70 hover:text-white">
          Back to Landing
        </Link>
      </div>
    </main>
  );
}
