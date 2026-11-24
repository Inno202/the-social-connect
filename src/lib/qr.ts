import QRCode from 'qrcode';
import { qrPayload } from './scan';

export function qrDataUrl(ticketId: string, width = 360): Promise<string> {
  return QRCode.toDataURL(qrPayload(ticketId), { errorCorrectionLevel: 'M', margin: 2, width, color: { dark: '#0B0B0C', light: '#FFFFFF' } });
}
