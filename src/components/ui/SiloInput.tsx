import type { ComponentProps } from 'react';
import { Input } from './input';

type SiloInputProps = ComponentProps<typeof Input>;

export function SiloInput({ className = '', ...props }: SiloInputProps) {
  return (
    <Input
      className={`h-10 rounded-lg border-silo-border bg-silo-bg text-sm text-silo-text placeholder:text-silo-subtle focus-visible:border-silo-text focus-visible:ring-0 ${className}`}
      {...props}
    />
  );
}
