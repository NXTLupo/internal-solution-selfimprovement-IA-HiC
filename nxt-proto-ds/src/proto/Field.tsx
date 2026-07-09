import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Field caption tied to the input via htmlFor. */
  label: string;
  /** Input id; auto-generated when omitted. */
  fieldId?: string;
  /** Native input type (text, email, password, number, date...). */
  type?: string;
  placeholder?: string;
  /** Current value (controlled) or initial text. */
  value?: string;
  onValueChange?: (value: string) => void;
  /** Leading icon variant (a lucide-react component) rendered inside the box. */
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number | string }>;
  /** Search kind: prepends the grey magnifier (shorthand for icon={Search}). */
  search?: boolean;
  /** Invalid state: rust border + role=alert hint under the box. */
  error?: string;
  disabled?: boolean;
}

/** proto/Field (Figma 448:2) - the labeled input group: nano medium label over a
 * hairline rounded box with grey placeholder; the search variant leads with a quiet
 * magnifier, the invalid state carries a rust border + role=alert hint. */
export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  (
    { label, fieldId, type = 'text', placeholder, value, onValueChange, icon, search, error, disabled, className, ...props },
    ref
  ) => {
    const autoId = React.useId();
    const id = fieldId ?? autoId;
    const hintId = `${id}-hint`;
    const Icon = icon ?? (search ? Search : undefined);
    return (
      <div ref={ref} className={cn('flex w-full flex-col gap-1.5', className)} {...props}>
        <Label htmlFor={id}>{label}</Label>
        <div className="relative">
          {Icon && (
            <Icon
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-grey"
              strokeWidth={1.8}
            />
          )}
          <Input
            id={id}
            type={type}
            placeholder={placeholder}
            value={value}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? hintId : undefined}
            onChange={(e) => onValueChange?.(e.target.value)}
            className={cn(Icon && 'pl-8', error && 'border-rust')}
          />
        </div>
        {error && (
          <span id={hintId} role="alert" className="text-nano text-rust">
            {error}
          </span>
        )}
      </div>
    );
  }
);
Field.displayName = 'Field';
