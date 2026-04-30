import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function Announcement({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="announcement"
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full bg-primary-foreground px-2.5 py-0.5 ring-1 ring-border",
        "has-data-[slot=announcement-badge]:pl-0.5",
        className
      )}
      {...props}
    />
  );
}

function AnnouncementContent({
  asChild,
  className,
  ...props
}: React.ComponentProps<"div"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div";

  return (
    <Comp
      data-slot="announcement-content"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-primary [&>svg]:shrink-0 [&>svg:not([class*='size-'])]:size-3 [&>svg:not([class*='text-'])]:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

function AnnouncementBadge({
  asChild,
  ...props
}: React.ComponentProps<typeof Badge> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : Badge;

  return <Comp variant="secondary" data-slot="announcement-badge" {...props} />;
}

export { Announcement, AnnouncementBadge, AnnouncementContent };
