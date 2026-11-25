import { asset } from '../lib/data';

/** The MSB Events logo (white lettering for dark backgrounds, black for light ones), transparent background. */
export function Logo({ className = 'h-10 w-auto', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  return (
    <img
      src={asset(tone === 'light' ? '/brand/msb-logo-white.png' : '/brand/msb-logo-black.png')}
      width={304}
      height={132}
      alt="MSB Events"
      className={className}
      decoding="async"
    />
  );
}
