"use client";

/**
 * shieldcn
 * components/tour-overlay
 *
 * The motion-heavy spotlight/cursor/content overlay for the guided tour,
 * split out of tour.tsx so it can be `next/dynamic`-imported — most /gen
 * visitors never start the tour, so there's no reason to ship this chunk
 * (and the "motion/react" animation engine it pulls in) on every page load.
 */

import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { TourStep } from "@/components/tour";

const HIGHLIGHT_PAD = 8;
const PADDING = 16;
const CONTENT_WIDTH = 300;
const CONTENT_HEIGHT = 200;

function calculateContentPosition(
	elementPos: { top: number; left: number; width: number; height: number },
	position: "top" | "bottom" | "left" | "right" = "bottom",
) {
	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;

	let left = elementPos.left;
	let top = elementPos.top;

	switch (position) {
		case "top":
			top = elementPos.top - CONTENT_HEIGHT - PADDING;
			left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2;
			break;
		case "bottom":
			top = elementPos.top + elementPos.height + PADDING;
			left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2;
			break;
		case "left":
			left = elementPos.left - CONTENT_WIDTH - PADDING;
			top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
			break;
		case "right":
			left = elementPos.left + elementPos.width + PADDING;
			top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2;
			break;
	}

	return {
		top: Math.max(
			PADDING,
			Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING),
		),
		left: Math.max(
			PADDING,
			Math.min(left, viewportWidth - CONTENT_WIDTH - PADDING),
		),
		width: CONTENT_WIDTH,
		height: CONTENT_HEIGHT,
	};
}

export interface TourOverlayProps {
	currentStep: number;
	elementPosition: { top: number; left: number; width: number; height: number } | null;
	steps: TourStep[];
	reduceMotion: boolean | null;
	className?: string;
	nextStep: () => void;
	previousStep: () => void;
	endTour: () => void;
}

export default function TourOverlay({
	currentStep,
	elementPosition,
	steps,
	reduceMotion,
	className,
	nextStep,
	previousStep,
	endTour,
}: TourOverlayProps) {
	return (
		<AnimatePresence>
			{currentStep >= 0 && elementPosition && (
				<>
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={reduceMotion ? { duration: 0 } : undefined}
						className="fixed inset-0 z-50 overflow-hidden bg-black/50"
						style={{
							clipPath: `polygon(
                  0% 0%,
                  0% 100%,
                  100% 100%,
                  100% 0%,
                  ${elementPosition.left - HIGHLIGHT_PAD}px 0%,
                  ${elementPosition.left - HIGHLIGHT_PAD}px ${elementPosition.top - HIGHLIGHT_PAD}px,
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width) + HIGHLIGHT_PAD}px ${elementPosition.top - HIGHLIGHT_PAD}px,
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width) + HIGHLIGHT_PAD}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height) + HIGHLIGHT_PAD}px,
                  ${elementPosition.left - HIGHLIGHT_PAD}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height) + HIGHLIGHT_PAD}px,
                  ${elementPosition.left - HIGHLIGHT_PAD}px 0%
                )`,
						}}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={reduceMotion ? { duration: 0 } : undefined}
						style={{
							position: "fixed",
							top: elementPosition.top - HIGHLIGHT_PAD,
							left: elementPosition.left - HIGHLIGHT_PAD,
							width: (steps[currentStep]?.width || elementPosition.width) + HIGHLIGHT_PAD * 2,
							height: (steps[currentStep]?.height || elementPosition.height) + HIGHLIGHT_PAD * 2,
						}}
						className={cn(
							"z-[100] border-2 border-muted-foreground",
							className,
						)}
					/>

					{/* Pulsing dot cursor */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{
							opacity: 1,
							top: elementPosition.top + (steps[currentStep]?.height || elementPosition.height) / 2,
							left: elementPosition.left + (steps[currentStep]?.width || elementPosition.width) / 2,
						}}
						exit={{ opacity: 0 }}
						transition={reduceMotion ? { duration: 0 } : {
							type: "spring",
							stiffness: 120,
							damping: 20,
							opacity: { duration: 0.2 },
						}}
						style={{ position: "fixed", transform: "translate(-50%, -50%)" }}
						className="z-[101] pointer-events-none"
					>
						<span className="relative flex size-3">
							<span className={cn("absolute inline-flex size-full rounded-full bg-primary opacity-75", !reduceMotion && "animate-ping")} />
							<span className="relative inline-flex size-3 rounded-full bg-primary" />
						</span>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 10, top: 50, right: 50 }}
						animate={{
							opacity: 1,
							y: 0,
							top: calculateContentPosition(
								elementPosition,
								steps[currentStep]?.position,
							).top,
							left: calculateContentPosition(
								elementPosition,
								steps[currentStep]?.position,
							).left,
						}}
						transition={reduceMotion ? { duration: 0 } : {
							duration: 0.8,
							ease: [0.16, 1, 0.3, 1],
							opacity: { duration: 0.4 },
						}}
						exit={{ opacity: 0, y: 10 }}
						style={{
							position: "fixed",
							width: calculateContentPosition(
								elementPosition,
								steps[currentStep]?.position,
							).width,
						}}
						className="bg-background relative z-[100] rounded-lg border p-4 shadow-lg"
					>
						<div className="text-muted-foreground absolute right-4 top-4 text-xs">
							{currentStep + 1} / {steps.length}
						</div>
						<AnimatePresence mode="wait">
							<div>
								<motion.div
									key={`tour-content-${currentStep}`}
									initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
									animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
									exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
									className="overflow-hidden"
									transition={reduceMotion ? { duration: 0 } : {
										duration: 0.2,
										height: {
											duration: 0.4,
										},
									}}
								>
									{steps[currentStep]?.content}
								</motion.div>
								<div className="mt-4 flex items-center justify-between">
									{currentStep > 0 ? (
										<button
											onClick={previousStep}
											className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
										>
											<kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">←</kbd>
											Prev
										</button>
									) : (
										<button
											onClick={endTour}
											className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
										>
											<kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>
										</button>
									)}
									<button
										onClick={nextStep}
										className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/90"
									>
										{currentStep === steps.length - 1 ? "Finish" : "Next"}
										<kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">→</kbd>
									</button>
								</div>
							</div>
						</AnimatePresence>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
