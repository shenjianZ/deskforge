import { cn } from '@/lib/utils';

export function PageSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mx-auto w-full max-w-[1600px]", className)}>{children}</div>;
}
