import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../ui/button';
import { Field, type FieldProps } from './Field';

export interface FormCardProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  /** Card title ("Sign in", "Create your account"). */
  title: string;
  /** The stacked field rows (each rendered via proto/Field). */
  fields: FieldProps[];
  /** Primary submit label on the accent button. */
  submitLabel?: string;
  /** Called on form submit (default prevented). */
  onSubmit?: () => void;
  /** Optional secondary path under the "or" divider ("Continue with SSO"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/** proto/FormCard (Figma 448:25) - the sign-in/up card: 300px paper card with a
 * hairline border, semibold title, stacked Field rows, full-width accent submit, and
 * an optional "or" divider + outline secondary action. Enter submits. */
export const FormCard = React.forwardRef<HTMLFormElement, FormCardProps>(
  ({ title, fields, submitLabel = 'Continue', onSubmit, secondaryLabel, onSecondary, className, ...props }, ref) => (
    <form
      ref={ref}
      aria-label={title}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
      className={cn('flex w-[300px] flex-col gap-4 rounded-lg border border-hairline bg-paper p-5', className)}
      {...props}
    >
      <h2 className="font-title text-label font-semibold text-ink">{title}</h2>
      {fields.map((field) => (
        <Field key={field.label} {...field} />
      ))}
      <Button type="submit" className="w-full rounded-md">
        {submitLabel}
      </Button>
      {secondaryLabel && (
        <>
          <div className="flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-hairline" />
            <span className="text-nano text-grey">or</span>
            <span className="h-px flex-1 bg-hairline" />
          </div>
          <Button type="button" variant="outline" onClick={onSecondary} className="w-full rounded-md">
            {secondaryLabel}
          </Button>
        </>
      )}
    </form>
  )
);
FormCard.displayName = 'FormCard';
