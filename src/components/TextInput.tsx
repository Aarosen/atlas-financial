import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export const TextInput = forwardRef<HTMLInputElement, { className?: string } & InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...rest },
  ref
) {
  const cn = ['input', className].filter(Boolean).join(' ');
  return <input ref={ref} className={cn} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, { className?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...rest },
  ref
) {
  const cn = ['input', className].filter(Boolean).join(' ');
  return <textarea ref={ref} className={cn} {...rest} />;
});
