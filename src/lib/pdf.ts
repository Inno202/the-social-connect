import { jsPDF } from 'jspdf';
import { qrDataUrl } from './qr';
import { posterSrc } from './data';
import { longDate, rands } from './format';
import type { Ticket } from './types';

/** Draws an image into a canvas cropped to the given aspect ratio and returns a JPEG data URL. */
async function coverJpeg(url: string, ratio: number, widthPx = 520): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) return null;
    const bmp = await createImageBitmap(await res.blob());
    const h = Math.round(widthPx / ratio);
    const c = document.createElement('canvas');
    c.width = widthPx;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const scale = Math.max(widthPx / bmp.width, h / bmp.height);
    const dw = bmp.width * scale;
    const dh = bmp.height * scale;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, widthPx, h);
    ctx.drawImage(bmp, (widthPx - dw) / 2, 0, dw, dh);
    return c.toDataURL('image/jpeg', 0.86);
  } catch {
    return null;
  }
}

/** Ticket PDF: poster on the left, details and holder in the middle, QR on the right. */
export async function ticketPdf(t: Ticket): Promise<Blob> {
  const W = 210;
  const H = 80;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [H, W] });
  const posterW = 64;

  const poster = t.poster ? await coverJpeg(posterSrc(t.poster, 'jpg'), posterW / H) : null;
  if (poster) doc.addImage(poster, 'JPEG', 0, 0, posterW, H);
  else {
    doc.setFillColor(11, 11, 12);
    doc.rect(0, 0, posterW, H, 'F');
    doc.setTextColor(163, 230, 53);
    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(26);
    doc.text('MSB', posterW / 2, H / 2, { align: 'center' });
  }

  // Middle: details and holder
  const x = posterW + 8;
  const mid = 146 - x - 6;
  doc.setTextColor(85, 85, 90);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('M S B   E V E N T S', x, 11);
  doc.setTextColor(11, 11, 12);
  doc.setFont('helvetica', 'bolditalic');
  doc.setFontSize(15);
  const title = doc.splitTextToSize(t.eventTitle.toUpperCase(), mid).slice(0, 2);
  doc.text(title, x, 19);
  let y = 19 + title.length * 6.2 + 2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(longDate(t.eventStartsAt), x, y);
  y += 5;
  if (t.venue) {
    doc.text(doc.splitTextToSize(t.venue, mid).slice(0, 1), x, y);
    y += 5;
  }
  y += 3;
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(85, 85, 90);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(11, 11, 12);
    doc.text(doc.splitTextToSize(value, mid).slice(0, 1), x, y + 4.5);
    y += 11;
  };
  row('Ticket', `${t.typeName}${t.seatLabel ? ` (${t.seatLabel})` : ''} · ${rands(t.price)}`);
  row('Holder', t.holderName);
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(85, 85, 90);
  doc.text(t.id, x, H - 6);

  // Right: QR on a black panel
  const qx = 146;
  doc.setFillColor(11, 11, 12);
  doc.rect(qx, 0, W - qx, H, 'F');
  const qr = await qrDataUrl(t.id, 480);
  const qs = 50;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qx + (W - qx - qs) / 2 - 2, 9, qs + 4, qs + 4, 2, 2, 'F');
  doc.addImage(qr, 'PNG', qx + (W - qx - qs) / 2, 11, qs, qs);
  doc.setTextColor(163, 230, 53);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('SCAN AT THE GATE', qx + (W - qx) / 2, 72, { align: 'center' });

  doc.setProperties({ title: `${t.eventTitle} ticket`, author: 'MSB Events' });
  return doc.output('blob');
}

export async function downloadTicket(t: Ticket) {
  const blob = await ticketPdf(t);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `msb-ticket-${t.eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${t.id.slice(-6)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
