import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface BaseProps {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, className, id, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className={cn('space-y-1.5', className)}>
        <label htmlFor={fieldId} className="label-engraved block">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-err` : undefined}
          className="field"
          {...rest}
        />
        {error && (
          <p id={`${fieldId}-err`} className="text-sm text-oxblood">
            {error}
          </p>
        )}
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export const TextAreaField = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, className, id, rows = 3, ...rest }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <div className={cn('space-y-1.5', className)}>
        <label htmlFor={fieldId} className="label-engraved block">
          {label}
        </label>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          aria-invalid={!!error}
          className="field resize-y"
          {...rest}
        />
        {error && <p className="text-sm text-oxblood">{error}</p>}
      </div>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';
