import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'brass' | 'danger' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

const base = 'inline-flex items-center justify-center gap-2 font-sans font-medium tracking-[0.01em] rounded-sm transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap select-none';
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-parchment hover:bg-ink-3 active:bg-ink',
  secondary: 'bg-transparent text-ink border hair-strong hover:border-ink hover:bg-linen/50',
  ghost: 'bg-transparent text-ink hover:bg-linen/60',
  brass: 'bg-brass text-ink hover:bg-brass-2',
  danger: 'bg-clay text-paper hover:brightness-110',
  inverse: 'bg-parchment text-ink hover:bg-paper',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-[14px]',
  lg: 'h-13 px-7 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra = '') {
  return `${base} ${variants[variant]} ${sizes[size]} ${extra}`;
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({ href, variant = 'primary', size = 'md', className = '', children, ...rest }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode } & Omit<ComponentProps<typeof Link>, 'href'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
