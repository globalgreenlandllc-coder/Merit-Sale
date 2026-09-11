'use client';
import { useEffect, useState } from 'react';

/** Coarse device fingerprint for shared-device screening. Not identity; a signal only. */
export function Fingerprint() {
  const [fp, setFp] = useState('');
  useEffect(() => {
    const parts = [navigator.userAgent, navigator.language, (navigator.languages ?? []).join(','), String(screen.width), String(screen.height), String(screen.colorDepth), Intl.DateTimeFormat().resolvedOptions().timeZone, String(navigator.hardwareConcurrency ?? ''), String((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? '')].join('|');
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(parts)).then((buf) => setFp(Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32))).catch(() => setFp(''));
  }, []);
  return <input type="hidden" name="fingerprint" value={fp} readOnly />;
}
