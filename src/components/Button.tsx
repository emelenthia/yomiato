import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  children,
  className = '',
  variant = 'secondary',
  ref,
  ...props
}: ButtonProps) {
  const classes = ['button', `button-${variant}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button ref={ref} className={classes} {...props}>
      {children}
    </button>
  );
}
