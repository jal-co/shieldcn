import * as React from "react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AvatarStackProps extends React.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical";
  max?: number;
  size?: number;
  overlapRatio?: number;
  mask?: boolean;
}

export function AvatarStack({
  children,
  className,
  orientation = "horizontal",
  max, // Max visible avatars before "+N"
  size = 32, // Avatar size in pixels
  overlapRatio = 0.2, // 20% of avatar size
  mask = true,
  style,
  ...props
}: AvatarStackProps) {
  const avatarItems = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<React.ComponentProps<typeof Avatar>> =>
      React.isValidElement(child) && child.type === Avatar
  );

  const avatarsCount = avatarItems.length;
  const showOverflow = max && avatarsCount > max;
  const overflowCount = showOverflow ? avatarsCount - max : 0;
  const visibleAvatars = showOverflow ? avatarItems.slice(0, max) : avatarItems;

  const avatarClassName = cn(
    "object-cover object-center",
    mask && "bg-background ring-2 ring-background"
  );

  return (
    <div
      data-slot="avatar-stack"
      data-orientation={orientation}
      data-size={size}
      data-overlap-ratio={overlapRatio}
      data-mask={mask}
      data-max={max}
      className={cn(
        "group flex items-center",
        "data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:-space-x-(--overlap)",
        "data-[orientation=vertical]:flex-col data-[orientation=vertical]:-space-y-(--overlap)",
        className
      )}
      style={
        {
          ...style,
          "--overlap": `${overlapRatio * size}px`,
        } as React.CSSProperties
      }
      {...props}
    >
      {visibleAvatars.map((child, index) =>
        React.cloneElement(child, {
          key: index,
          className: cn(child.props.className, avatarClassName),
          style: { ...child.props.style, width: size, height: size },
        })
      )}

      {showOverflow && (
        <Avatar className={avatarClassName} style={{ width: size, height: size }}>
          <AvatarFallback className="text-xs font-medium text-muted-foreground">
            +{overflowCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
