import 'server-only';
import { env } from '@/lib/env';

/** Proctoring adapter for Rounds 3 and Final (Tier 2/3). Session refs only; media retention is vendor-side per policy. */
export interface ProctoringProvider {
  name: string;
  createSession(args: { attemptId: string; userId: string; roundLabel: string }): Promise<{ ref: string; launchUrl: string | null; idMatchRequired: boolean }>;
}

class MockProctoringProvider implements ProctoringProvider {
  name = 'mock';
  async createSession(args: Parameters<ProctoringProvider['createSession']>[0]) {
    return { ref: `mock_proctor_${args.attemptId.slice(-8)}`, launchUrl: null, idMatchRequired: true };
  }
}

export function getProctoringProvider(): ProctoringProvider {
  void env.proctoringProvider;
  return new MockProctoringProvider();
}
