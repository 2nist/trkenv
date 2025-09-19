/* eslint-disable */
import React from 'react';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

const sizeCls = (s?: ButtonProps['size']) =>
  s === 'sm' ? 'px-2 py-1 text-xs' : s === 'lg' ? 'px-4 py-2 text-base' : 'px-3 py-2 text-sm';

export const Button: React.FC<ButtonProps> = ({ variant = 'outline', size = 'md', className = '', children, ...rest }) => {
  const base = 'rounded-md transition-colors inline-flex items-center justify-center';
  const sizes = sizeCls(size);
  const themed =
    variant === 'primary'
      ? 'bg-[var(--accent-10)] text-white hover:bg-[var(--accent-9)] border border-[color:var(--border,#2a2d33)]'
      : variant === 'ghost'
      ? 'bg-transparent text-[var(--text)] hover:bg-[var(--surface)]'
      : 'bg-[var(--panel)] text-[var(--text)] hover:bg-[var(--surface)] border border-[color:var(--border,#2a2d33)]';
  return (
    <button className={[base, sizes, themed, className].join(' ')} {...rest}>
      {children}
    </button>
  );
};

export type CardProps = {
  variant?: 'elevated' | 'outlined' | 'plain';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  className?: string;
  children?: React.ReactNode;
};

export const Card: React.FC<CardProps> = ({ variant = 'plain', padding = 'md', className = '', children }) => {
  const pads = { none: '', sm: 'p-2', md: 'p-4', lg: 'p-6' } as const;
  const variants = {
    plain: 'bg-[var(--surface)]',
    outlined: 'bg-[var(--surface)] border border-[color:var(--border,#2a2d33)]',
    elevated: 'bg-[var(--surface)] shadow',
  } as const;
  return <div className={[variants[variant], pads[padding], 'rounded', className].join(' ')}>{children}</div>;
};

export type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
  children?: React.ReactNode;
};

export const Heading: React.FC<HeadingProps> = ({ level = 2, className = '', children }) => {
  const Tag: any = `h${level}`;
  const sizes: Record<number, string> = {
    1: 'text-2xl',
    2: 'text-xl',
    3: 'text-lg',
    4: 'text-base',
    5: 'text-sm',
    6: 'text-xs',
  };
  return <Tag className={[sizes[level], 'font-semibold', className].join(' ')}>{children}</Tag>;
};

export type TextProps = {
  variant?: 'small' | 'base' | 'large';
  className?: string;
  children?: React.ReactNode;
};

export const Text: React.FC<TextProps> = ({ variant = 'base', className = '', children }) => {
  const sizes = { small: 'text-xs', base: 'text-sm', large: 'text-base' } as const;
  return <p className={[sizes[variant], className].join(' ')}>{children}</p>;
};

export default { Button, Card, Heading, Text };
