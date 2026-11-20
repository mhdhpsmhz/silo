import type { ComponentProps } from 'react';
import { Textarea } from './textarea';

type SiloTextareaProps = ComponentProps<typeof Textarea>;

export function SiloTextarea({ className = '', ...props }: SiloTextareaProps) {
  return (
    <Textarea
      className={`rounded-lg border-silo-border bg-silo-bg text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0 ${className}`}
      {...props}
    />
  );
}
