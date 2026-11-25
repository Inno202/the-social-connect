/** Placeholder text logo until the MSB Events logo file is supplied: "MSB" with "EVENTS" spaced out underneath.
 *  Drawn as an image (SVG) so it scales as one piece and its small letters are not reading text. */
export function Logo({ className = 'h-10 w-auto', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const fill = tone === 'light' ? '#FFFFFF' : '#0B0B0C';
  return (
    <svg viewBox="0 0 92 56" className={className} role="img" aria-label="MSB Events">
      <text x="46" y="33" textAnchor="middle" fill={fill} fontFamily="'Barlow Condensed', Arial Narrow, sans-serif" fontWeight="800" fontStyle="italic" fontSize="38" letterSpacing="0.5">MSB</text>
      <text x="47.5" y="50" textAnchor="middle" fill={fill} fontFamily="Barlow, Arial, sans-serif" fontWeight="600" fontSize="10.5" letterSpacing="4.6">EVENTS</text>
    </svg>
  );
}
