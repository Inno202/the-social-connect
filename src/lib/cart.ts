import { useSyncExternalStore } from 'react';
import type { CartLine } from './types';

const KEY = 'msb-cart-v1';
let lines: CartLine[] = load();
const listeners = new Set<() => void>();

function load(): CartLine[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((l) => typeof l?.eventId === 'string' && typeof l?.typeId === 'string' && Number.isInteger(l?.qty) && l.qty > 0 && l.qty <= 10)
      : [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage blocked: the cart still works for this visit */
  }
  listeners.forEach((l) => l());
}

export const MAX_PER_LINE = 10;

export const cart = {
  get: () => lines,
  set(eventId: string, typeId: string, qty: number) {
    const q = Math.max(0, Math.min(MAX_PER_LINE, Math.floor(qty)));
    const rest = lines.filter((l) => !(l.eventId === eventId && l.typeId === typeId));
    lines = q > 0 ? [...rest, { eventId, typeId, qty: q }] : rest;
    save();
  },
  qty(eventId: string, typeId: string) {
    return lines.find((l) => l.eventId === eventId && l.typeId === typeId)?.qty ?? 0;
  },
  removeEvent(eventId: string) {
    lines = lines.filter((l) => l.eventId !== eventId);
    save();
  },
  clear() {
    lines = [];
    save();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

const empty: CartLine[] = [];
export function useCart(): CartLine[] {
  return useSyncExternalStore(cart.subscribe, cart.get, () => empty);
}

export function lineTotal(price: number, qty: number) {
  return price * qty;
}
