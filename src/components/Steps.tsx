const STEPS = ['Tickets', 'Details', 'Pay', 'Success'] as const;
export type Step = (typeof STEPS)[number];

/** Progress bar: Tickets → Details → Pay → Success. */
export function Steps({ current }: { current: Step }) {
  const at = STEPS.indexOf(current);
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="grid grid-cols-4 gap-1.5">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === at ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full ${i <= at ? 'bg-ink' : 'bg-line'}`} />
            <span className={`mt-2 block text-xs font-semibold uppercase tracking-wider ${i === at ? 'text-ink' : 'text-ink-soft'}`}>{s}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
