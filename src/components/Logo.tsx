/** Placeholder text logo until the MSB Events logo file is supplied: "MSB" with "EVENTS" spaced out underneath. */
export function Logo({ className = '', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const color = tone === 'light' ? 'text-white' : 'text-ink';
  return (
    <span className={`inline-flex flex-col items-center leading-none select-none ${color} ${className}`} role="img" aria-label="MSB Events">
      <span className="font-display font-extrabold italic text-[1.9rem] tracking-[0.02em] leading-[0.85]" aria-hidden>MSB</span>
      <span className="text-[0.56rem] font-semibold tracking-[0.42em] mr-[-0.42em] mt-[3px]" aria-hidden>EVENTS</span>
    </span>
  );
}
