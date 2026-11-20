import QRCode from 'qrcode';
import { EVENT_CONFIG } from '@/config/event';

export interface TicketPayload {
  ticketCode: string;
  registrationId: string;
  name: string;
  email: string;
  signature: string;
  timestamp: number;
}

/**
 * Creates HMAC-SHA256 signature using browser standard Web Crypto API.
 */
export async function signTicketPayload(
  rawText: string,
  secretKey: string
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secretKey || 'default-aws-invent-bhopal-key-2026'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawText));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies HMAC-SHA256 signature of a scanned payload.
 */
export async function verifyTicketSignature(
  rawText: string,
  signature: string,
  secretKey: string
): Promise<boolean> {
  const expectedSignature = await signTicketPayload(rawText, secretKey);
  return expectedSignature === signature;
}

/**
 * Generates high-resolution QR data URL.
 */
export async function generateQrDataUrl(qrContent: string): Promise<string> {
  return QRCode.toDataURL(qrContent, {
    width: 400,
    margin: 2,
    color: {
      dark: '#0B1220',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'H',
  });
}

/**
 * Generates and triggers download of an .ics calendar file for the event.
 */
export function downloadCalendarInvite() {
  const startDate = new Date(EVENT_CONFIG.date);
  // Default 9 hour event (9:00 AM to 6:00 PM IST)
  const endDate = new Date(startDate.getTime() + 9 * 60 * 60 * 1000);

  const formatDate = (date: Date) =>
    date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AWS User Group Bhopal//reInvent Watch and Build Party//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@awsugbhopal.com`,
    `DTSTAMP:${formatDate(new Date())}`,
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${EVENT_CONFIG.name}`,
    `DESCRIPTION:${EVENT_CONFIG.description}\\n\\nVenue: ${EVENT_CONFIG.fullAddress}\\nMap: ${EVENT_CONFIG.googleMapsUrl}`,
    `LOCATION:${EVENT_CONFIG.fullAddress}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'AWS-reInvent-Watch-Build-Party-2026.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
