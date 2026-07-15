import { cn } from '@/lib/utils';

type BrandLogoProps = {
  variant?: 'dark' | 'light' | 'mark';
  className?: string;
  imageClassName?: string;
};

const logoSrc = {
  dark: '/mel-dark.png',
  light: '/mel-light.png',
  mark: '/mel-logo.svg',
};

const BrandLogo = ({ variant = 'dark', className, imageClassName }: BrandLogoProps) => {
  const isMark = variant === 'mark';

  return (
    <div className={cn('inline-flex items-center justify-center', className)}>
      <img
        src={logoSrc[variant]}
        alt={isMark ? '' : 'mel'}
        className={cn(
          isMark ? 'h-8 w-8 object-contain' : 'h-10 w-auto object-contain',
          imageClassName
        )}
      />
    </div>
  );
};

export default BrandLogo;
