import { resolve } from 'node:path';

/** Uploads live outside `public` (Next enumerates `public` once at start), under UPLOADS_DIR or ./uploads. */
export function uploadsRoot(): string {
  return resolve(process.env.UPLOADS_DIR ?? resolve(process.cwd(), 'uploads'));
}
