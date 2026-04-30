import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const variantColorMap = {
  tip: "var(--muted-foreground)",
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--destructive)",
} as const;

function InlineHint({
  children,
  className,
  variant = "tip",
  asChild = false,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "tip" | "success" | "warning" | "error";
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "div";

  const hintColor = variantColorMap[variant];

  return (
    <div
      role="note"
      data-slot="inline-hint"
      data-variant={variant}
      className={cn(
        "flex max-w-screen-sm gap-3 rounded-xl border bg-muted px-3 py-2.5 lg:has-data-[slot=inline-hint-content]:min-w-80",
        className
      )}
      style={
        {
          ...style,
          "--hint-color": hintColor,
        } as React.CSSProperties
      }
      {...props}
    >
      <div
        role="none"
        className="w-1 shrink-0 self-stretch rounded-full bg-(--hint-color)"
      />
      <Comp
        data-slot="inline-hint-content"
        className={cn("min-w-0 flex-1 text-sm text-pretty", className)}
      >
        {children}
      </Comp>
    </div>
  );
}

export { InlineHint };
