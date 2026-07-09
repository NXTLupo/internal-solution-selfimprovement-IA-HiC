import * as React from 'react';
import { cn } from '../lib/utils';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

export interface CheckOption {
  /** Stable option value reported to onToggle. */
  value: string;
  /** Visible row label ("Email digests"). */
  label: string;
  /** Initial checked state. */
  checked?: boolean;
  disabled?: boolean;
}

export interface CheckGroupProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  /** Group caption rendered as the fieldset legend. */
  legend: string;
  /** The choices, top to bottom. */
  options: CheckOption[];
  /** Called with (value, checked) when a row toggles. */
  onToggle?: (value: string, checked: boolean) => void;
}

/** proto/CheckGroup (Figma 448:13) - grouped choices: hairline rounded fieldset with a
 * semibold nano legend and rows of accent-filled checkbox + quiet label; the fieldset +
 * legend pair carries the group semantics. */
export const CheckGroup = React.forwardRef<HTMLFieldSetElement, CheckGroupProps>(
  ({ legend, options, onToggle, className, ...props }, ref) => {
    const groupId = React.useId();
    return (
      <fieldset
        ref={ref}
        className={cn('flex flex-col gap-2.5 rounded-md border border-hairline bg-paper px-3 py-2.5', className)}
        {...props}
      >
        <legend className="px-1 font-title text-nano font-semibold text-ink">{legend}</legend>
        {options.map((opt) => {
          const id = `${groupId}-${opt.value}`;
          return (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={id}
                defaultChecked={opt.checked}
                disabled={opt.disabled}
                onCheckedChange={(checked) => onToggle?.(opt.value, checked === true)}
              />
              <Label htmlFor={id} className="text-micro font-normal">
                {opt.label}
              </Label>
            </div>
          );
        })}
      </fieldset>
    );
  }
);
CheckGroup.displayName = 'CheckGroup';
