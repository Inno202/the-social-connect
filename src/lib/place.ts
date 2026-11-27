import type { MsbEvent } from './types';

/** Address line without repeating the town when the address already names it. */
export function addressLine(e: Pick<MsbEvent, 'address' | 'town'>) {
  if (!e.address) return e.town;
  return e.town && !e.address.toLowerCase().includes(e.town.toLowerCase()) ? `${e.address}, ${e.town}` : e.address;
}

export function mapLink(e: Pick<MsbEvent, 'mapQuery'>) {
  return e.mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.mapQuery)}` : '';
}
