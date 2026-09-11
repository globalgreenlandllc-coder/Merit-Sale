import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/Plate';
import { Notice } from '@/components/ui/Notice';
import { PracticeSet } from '@/components/site/PracticeSet';

export const metadata = { title: 'Practice problems' };

export default function PracticePage() {
  return (
    <Container className="py-16">
      <SectionHeading label="Practice problems" title="What the test feels like." lede="Every item is self-contained: all the information you need is in the problem. Answers are produced, not picked. These samples are scored by the same code that scores a live round. They are never taken from a live or sealed form." />
      <Notice className="mt-8 max-w-3xl" tone="info">In a live round the answer key is sealed and its hash is published before the round opens. Here the check runs in your browser against the sample keys so you can see how strict the matching is: case-insensitive, whitespace-tolerant, and exact.</Notice>
      <PracticeSet />
    </Container>
  );
}
