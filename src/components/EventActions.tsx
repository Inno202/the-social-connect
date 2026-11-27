import { CalendarPlus, Navigation, Share2 } from 'lucide-react';
import type { MsbEvent } from '../lib/types';
import { downloadIcs, googleCalendarLink, whatsappLink } from '../lib/calendar';
import { mapLink } from '../lib/place';
import { longDate } from '../lib/format';
import { toast } from './ui';

/** Add to calendar, directions and sharing for an event that has not happened yet. */
export function EventActions({ event }: { event: MsbEvent }) {
  const url = typeof window === 'undefined' ? '' : window.location.href.split('#')[0].split('?')[0];
  const map = mapLink(event);
  const text = `${event.title}, ${longDate(event.startsAt)}${event.venue ? ` at ${event.venue}` : ''}. ${url}`;

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: `${event.title}, ${longDate(event.startsAt)}`, url }); } catch { /* closed by the user */ }
      return;
    }
    try { await navigator.clipboard.writeText(url); toast('Link copied.'); } catch { toast('Copy the link from the address bar to share it.', 'error'); }
  }

  return (
    <section aria-label="Plan and share" className="space-y-3">
      <div className="even-row [--even-min:9rem]">
        <button type="button" className="btn btn-outline" onClick={() => downloadIcs(event, url)}>
          <CalendarPlus className="size-5" aria-hidden /> Add to calendar
        </button>
        {map && (
          <a href={map} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
            <Navigation className="size-5" aria-hidden /> Directions
          </a>
        )}
        <a href={whatsappLink(text)} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.2c-.1-.1-.3-.2-.5-.3Z" /></svg>
          WhatsApp
        </a>
        <button type="button" className="btn btn-outline" onClick={share}>
          <Share2 className="size-5" aria-hidden /> Share
        </button>
      </div>
      <p className="text-sm text-ink-soft text-center">
        Use Google Calendar?{' '}
        <a href={googleCalendarLink(event, url)} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-[44px] items-center">Add it there</a>
      </p>
    </section>
  );
}
