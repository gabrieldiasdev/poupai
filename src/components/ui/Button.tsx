import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-subtle',
  ghost: 'text-ink hover:bg-subtle',
  danger: 'text-expense hover:bg-subtle',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md'
  block?: boolean
}

export function Button({ variant = 'primary', size = 'md', block, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        size === 'md' ? 'h-11 px-4' : 'h-8 px-3 text-sm',
        variants[variant],
        block && 'w-full',
        className,
      )}
      {...props}
    />
  )
}
