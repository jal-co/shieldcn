"use client"

import { cn } from "@/lib/utils"

/**
 * Text that reveals a flowing animated gradient on hover.
 */
export function GradientText({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("gradient-flow-hover inline-block", className)}
      {...props}
    >
      {children}
      <style>{`
        @keyframes gradient-flow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .gradient-flow-hover {
          background-image: linear-gradient(
            90deg,
            #f97316, #ec4899, #8b5cf6, #3b82f6,
            #06b6d4, #22c55e, #f97316, #ec4899,
            #8b5cf6, #3b82f6, #06b6d4, #22c55e, #f97316
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          animation: gradient-flow 3s linear infinite;
          transition: -webkit-text-fill-color 0.2s;
        }
        .gradient-flow-hover:hover,
        *:hover > .gradient-flow-hover {
          -webkit-text-fill-color: transparent;
        }
      `}</style>
    </span>
  )
}
