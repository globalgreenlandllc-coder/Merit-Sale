'use client';
import { useState } from 'react';

/** In-browser SHA-256 of a chosen file, compared against every published hash. The file never leaves the device. */
export function HashVerifier({ published, dark = false }: { published: { label: string; hash: string }[]; dark?: boolean }) {
  const [result, setResult] = useState<{ name: string; hash: string; match: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true); setError(null);
    try {
      if (!globalThis.crypto?.subtle) throw new Error('This browser cannot hash files here (a secure context is required).');
      const buf = await f.arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', buf);
      const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      setResult({ name: f.name, hash, match: published.find((p) => p.hash === hash)?.label ?? null });
    } catch (e) { setResult(null); setError(e instanceof Error ? e.message : 'Could not hash the file.'); }
    finally { setBusy(false); }
  };
  const t = dark ? { term: 'plate-dark', body: 'text-mist', hint: 'text-sage', line: 'hair-light', ok: 'text-brass-2', bad: 'text-clay-2', btn: 'border-brass-2/60 text-brass-2 hover:bg-brass/10' } : { term: 'plate', body: 'text-slate', hint: 'text-graphite', line: 'hair', ok: 'text-verify', bad: 'text-clay', btn: 'border-ink/30 text-ink hover:border-ink' };
  return (
    <div className={`grid gap-3 border-y ${t.line} py-4 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-6 ${drag ? 'outline outline-1 outline-dashed outline-brass' : ''}`} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files?.[0]); }}>
      <div className={`${t.term} pt-1`}>Verify a released package</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <label className={`inline-flex h-9 cursor-pointer items-center rounded-sm border px-3.5 font-mono text-[11px] uppercase tracking-[0.14em] transition ${t.btn}`}>{busy ? 'Hashing…' : 'Choose file'}<input type="file" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} /></label>
          <span className={`text-[13px] ${t.hint}`}>or drop it here · hashed in your browser, never uploaded · compared with {published.length} published hashes</span>
        </div>
        {error && <p className={`mt-2 text-[13px] ${t.bad}`} role="alert">{error}</p>}
        {result && (
          <div className="mt-3 space-y-1 text-[13px]" aria-live="polite">
            <div className={t.body}>{result.name}</div>
            <div className={`hash ${dark ? 'text-parchment' : 'text-ink'}`}>{result.hash}</div>
            <div className={result.match ? t.ok : t.bad}>{result.match ? `Matches the published commitment: ${result.match}` : 'Does not match any published hash. Either the file was altered or it is not a released package.'}</div>
            <div className={`font-mono text-[11px] ${t.hint}`}>terminal: shasum -a 256 {result.name.replace(/[^a-z0-9._-]/gi, '_')}</div>
          </div>
        )}
      </div>
    </div>
  );
}
