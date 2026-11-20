import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

interface SiloSelectOption {
  value: string;
  label: string;
}

interface SiloSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SiloSelectOption[];
  placeholder: string;
  ariaLabel: string;
  className?: string;
}

const EMPTY_VALUE = '__silo_empty__';

export function SiloSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
}: SiloSelectProps) {
  const selectedValue = value || EMPTY_VALUE;
  const selectedLabel = options.find(
    (option) => (option.value || EMPTY_VALUE) === selectedValue
  )?.label;

  return (
    <Select
      value={selectedValue}
      onValueChange={(nextValue) => onChange(!nextValue || nextValue === EMPTY_VALUE ? '' : nextValue)}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={`h-10 w-full rounded-lg border-silo-border bg-silo-bg px-3 text-sm text-silo-text hover:bg-silo-bg dark:bg-silo-bg ${className ?? ''}`}
      >
        <SelectValue placeholder={placeholder}>
          {selectedLabel ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="border-silo-border bg-silo-surface text-silo-text">
        {options.map((option) => (
          <SelectItem
            key={option.value || EMPTY_VALUE}
            value={option.value || EMPTY_VALUE}
            className="focus:bg-silo-elevated focus:text-silo-text"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
