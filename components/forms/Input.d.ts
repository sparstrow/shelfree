import React from 'react';

/**
 * shadcn/ui Input, wrapped with Shelfree's label/prefix/suffix/error/hint options.
 * Styled with Tailwind; host page must load Tailwind + lib/tailwind-shadcn.js.
 * Any native <input> attribute (value, onChange, type, disabled, placeholder…) passes through.
 *
 * @startingPoint section="Components" subtitle="Input — shadcn field with label/error/hint" viewport="720x260"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  /** Icon/element inside the left edge. */
  prefix?: React.ReactNode;
  /** Icon/element inside the right edge. */
  suffix?: React.ReactNode;
  label?: string;
  /** Error message — red border + text below. */
  error?: string;
  /** Help text below when no error. */
  hint?: string;
  width?: string;
}
export declare function Input(props: InputProps): JSX.Element;

/** Compact search bar with a built-in search icon. Toolbar filter rows. */
export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  width?: string;
}
export declare function SearchInput(props: SearchInputProps): JSX.Element;

/** Native <select> with hidden appearance and a custom chevron. */
export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: Array<{ value: string; label: string }>;
  label?: string;
  width?: string;
  className?: string;
}
export declare function SelectField(props: SelectFieldProps): JSX.Element;
