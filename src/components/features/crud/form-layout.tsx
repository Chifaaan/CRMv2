import { cn } from "@/lib/utils";

export function FormSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "text-muted-foreground mt-6 border-b border-border pb-2 text-xs font-semibold tracking-wide uppercase first:mt-0",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function FormRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", className)}
    >
      {children}
    </div>
  );
}

export function FormGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("min-w-0 space-y-1.5", className)}>{children}</div>;
}
