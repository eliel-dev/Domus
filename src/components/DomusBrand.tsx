import React from 'react';

interface DomusIconProps {
  className?: string;
}

export const DomusIcon: React.FC<DomusIconProps> = ({
  className = 'h-5 w-5',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-hidden="true"
  >
    <path
      d="M2.5 10.5L12 3L21.5 10.5L19.6 12.8L12 6.8L4.4 12.8L2.5 10.5Z"
      fill="currentColor"
    />
    <rect x="5" y="13.5" width="3.2" height="7" rx="1" fill="currentColor" />
    <rect
      x="10.4"
      y="11"
      width="3.2"
      height="9.5"
      rx="1"
      className="fill-red-600 dark:fill-red-500"
    />
    <rect x="15.8" y="13.5" width="3.2" height="7" rx="1" fill="currentColor" />
  </svg>
);

type BrandSize = 'sm' | 'md' | 'lg' | 'xl';

interface DomusBrandProps {
  size?: BrandSize;
  className?: string;
}

const sizeStyles: Record<
  BrandSize,
  { wrapper: string; icon: string; wordmark: string }
> = {
  sm: {
    wrapper: 'gap-2',
    icon: 'h-5 w-5',
    wordmark: 'text-lg sm:text-xl',
  },
  md: {
    wrapper: 'gap-2.5',
    icon: 'h-7 w-7',
    wordmark: 'text-3xl',
  },
  lg: {
    wrapper: 'gap-2.5 sm:gap-3',
    icon: 'h-7 w-7 sm:h-9 sm:w-9',
    wordmark: 'text-3xl sm:text-4xl',
  },
  xl: {
    wrapper: 'gap-3.5',
    icon: 'h-9 w-9 xl:h-11 xl:w-11',
    wordmark: 'text-4xl xl:text-5xl',
  },
};

export const DomusBrand: React.FC<DomusBrandProps> = ({
  size = 'sm',
  className = '',
}) => {
  const styles = sizeStyles[size];
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap shrink-0 text-zinc-900 dark:text-white ${styles.wrapper} ${className}`}
    >
      <DomusIcon className={styles.icon} />
      <span
        className={`font-display font-extrabold tracking-tight leading-none ${styles.wordmark}`}
      >
        Domus
      </span>
    </span>
  );
};
