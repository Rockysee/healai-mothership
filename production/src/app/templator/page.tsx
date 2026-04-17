import Link from "next/link";

const templates = [
  {
    name: "Care Launch Sprint",
    cadence: "7 days",
    steps: [
      "Define scope and measurable care outcomes",
      "Prepare Guardian alert policy and escalation table",
      "Publish MedPod operating window and route assumptions",
    ],
  },
  {
    name: "Incident Response Loop",
    cadence: "24 hours",
    steps: [
      "Capture incident trigger and affected cohort",
      "Issue parent-safe summary with next actions",
      "Track acknowledgement and remediation closure",
    ],
  },
  {
    name: "Weekly Trust Pulse",
    cadence: "Every Friday",
    steps: [
      "Share weekly summaries and parity insights",
      "Review missed acknowledgements and stale dispatch items",
      "Queue next-week experiments with owner and due date",
    ],
  },
];

export default function TemplatorPage() {
  return (
    <main className="min-h-dvh bg-[#07080b] text-white px-5 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs tracking-[0.18em] text-green-300 mb-3">TEMPLATOR</p>
        <h1 className="text-4xl md:text-5xl font-black leading-tight mb-4">Operational Pattern Library</h1>
        <p className="text-white/70 max-w-3xl leading-relaxed mb-8">
          Reusable templates for translating strategy into daily execution. Each template keeps
          decision context, timing, and accountability visible across the stack.
        </p>

        <section className="grid gap-4 md:grid-cols-3 mb-8">
          {templates.map((template) => (
            <article key={template.name} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-bold mb-1">{template.name}</h2>
              <p className="text-xs uppercase tracking-[0.12em] text-green-300 mb-3">{template.cadence}</p>
              <ul className="space-y-2 text-sm text-white/75 leading-relaxed">
                {template.steps.map((step) => (
                  <li key={step}>• {step}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-5 mb-8">
          <h3 className="text-lg font-semibold mb-2">CDO Roundtrip</h3>
          <p className="text-sm text-white/80 mb-4">
            Validate narrative and success metrics in CDO view before assigning any template to production teams.
          </p>
          <Link
            href="/cdo"
            className="inline-flex items-center rounded-lg bg-amber-300 px-4 py-2 text-sm font-semibold text-black"
          >
            Open CDO View
          </Link>
        </section>

        <Link href="/" className="text-sm text-white/70 hover:text-white">
          Back to Landing
        </Link>
      </div>
    </main>
  );
}
