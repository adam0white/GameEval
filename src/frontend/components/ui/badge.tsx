import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary uppercase tracking-wide',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-surface text-white',
        queued: 'border-transparent bg-gray-600 text-white',
        running: 'border-transparent bg-primary text-white',
        completed: 'border-transparent bg-success text-white',
        failed: 'border-transparent bg-error text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

