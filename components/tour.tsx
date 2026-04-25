"use client";

import { AnimatePresence, motion } from "motion/react";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { Sparkles } from "lucide-react";

export interface TourStep {
	content: React.ReactNode;
	selectorId: string;
	width?: number;
	height?: number;
	onClickWithinArea?: () => void;
	position?: "top" | "bottom" | "left" | "right";
}

interface TourContextType {
	currentStep: number;
	totalSteps: number;
	nextStep: () => void;
	previousStep: () => void;
	endTour: () => void;
	isActive: boolean;
	startTour: () => void;
	setSteps: (steps: TourStep[]) => void;
	steps: TourStep[];
	isTourCompleted: boolean;
	setIsTourCompleted: (completed: boolean) => void;
}

interface TourProviderProps {
	children: React.ReactNode;
	onComplete?: () => void;
	className?: string;
	isTourCompleted?: boolean;
}

const TourContext = createContext<TourContextType | null>(null);

const PADDING = 16;
const HIGHLIGHT_PAD = 8;
const CONTENT_WIDTH = 300;
const CONTENT_HEIGHT = 200;

function getElementPosition(id: string) {
	const element = document.getElementById(id);
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return {
		top: rect.top + window.scrollY,
		left: rect.left + window.scrollX,
		width: rect.width,
		height: rect.height,
	};
}

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

	const scrollY = typeof window !== "undefined" ? window.scrollY : 0;

	return {
		top: Math.max(
			scrollY + PADDING,
			Math.min(top, scrollY + viewportHeight - CONTENT_HEIGHT - PADDING),
		),
		left: Math.max(
			PADDING,
			Math.min(left, viewportWidth - CONTENT_WIDTH - PADDING),
		),
		width: CONTENT_WIDTH,
		height: CONTENT_HEIGHT,
	};
}

export function TourProvider({
	children,
	onComplete,
	className,
	isTourCompleted = false,
}: TourProviderProps) {
	const [steps, setSteps] = useState<TourStep[]>([]);
	const [currentStep, setCurrentStep] = useState(-1);
	const [elementPosition, setElementPosition] = useState<{
		top: number;
		left: number;
		width: number;
		height: number;
	} | null>(null);
	const [isCompleted, setIsCompleted] = useState(isTourCompleted);

	const updateElementPosition = useCallback(() => {
		if (currentStep >= 0 && currentStep < steps.length) {
			const position = getElementPosition(steps[currentStep]?.selectorId ?? "");
			if (position) {
				setElementPosition(position);
			}
		}
	}, [currentStep, steps]);

	useEffect(() => {
		updateElementPosition();
		window.addEventListener("resize", updateElementPosition);
		window.addEventListener("scroll", updateElementPosition);

		return () => {
			window.removeEventListener("resize", updateElementPosition);
			window.removeEventListener("scroll", updateElementPosition);
		};
	}, [updateElementPosition]);

	const nextStep = useCallback(async () => {
		setCurrentStep((prev) => {
			if (prev >= steps.length - 1) {
				return -1;
			}
			return prev + 1;
		});

		if (currentStep === steps.length - 1) {
			setIsTourCompleted(true);
			onComplete?.();
		}
	}, [steps.length, onComplete, currentStep]);

	const previousStep = useCallback(() => {
		setCurrentStep((prev) => (prev > 0 ? prev - 1 : prev));
	}, []);

	const endTour = useCallback(() => {
		setCurrentStep(-1);
	}, []);

	const startTour = useCallback(() => {
		if (isTourCompleted) {
			return;
		}
		setCurrentStep(0);
	}, [isTourCompleted]);

	const handleClick = useCallback(
		(e: MouseEvent) => {
			if (
				currentStep >= 0 &&
				elementPosition &&
				steps[currentStep]?.onClickWithinArea
			) {
				const clickX = e.clientX + window.scrollX;
				const clickY = e.clientY + window.scrollY;

				const isWithinBounds =
					clickX >= elementPosition.left &&
					clickX <=
						elementPosition.left +
							(steps[currentStep]?.width || elementPosition.width) &&
					clickY >= elementPosition.top &&
					clickY <=
						elementPosition.top +
							(steps[currentStep]?.height || elementPosition.height);

				if (isWithinBounds) {
					steps[currentStep].onClickWithinArea?.();
				}
			}
		},
		[currentStep, elementPosition, steps],
	);

	useEffect(() => {
		window.addEventListener("click", handleClick);
		return () => {
			window.removeEventListener("click", handleClick);
		};
	}, [handleClick]);

	const setIsTourCompleted = useCallback((completed: boolean) => {
		setIsCompleted(completed);
	}, []);

	// Arrow key navigation
	useEffect(() => {
		if (currentStep < 0) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight" || e.key === "ArrowDown") {
				e.preventDefault();
				nextStep();
			} else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
				e.preventDefault();
				previousStep();
			} else if (e.key === "Escape") {
				e.preventDefault();
				endTour();
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [currentStep, nextStep, previousStep, endTour]);

	return (
		<TourContext.Provider
			value={{
				currentStep,
				totalSteps: steps.length,
				nextStep,
				previousStep,
				endTour,
				isActive: currentStep >= 0,
				startTour,
				setSteps,
				steps,
				isTourCompleted: isCompleted,
				setIsTourCompleted,
			}}
		>
			{children}
			<AnimatePresence>
				{currentStep >= 0 && elementPosition && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 z-50 overflow-hidden bg-black/50"
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
							style={{
								position: "absolute",
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
							transition={{
								type: "spring",
								stiffness: 120,
								damping: 20,
								opacity: { duration: 0.2 },
							}}
							style={{ position: "absolute", transform: "translate(-50%, -50%)" }}
							className="z-[101] pointer-events-none"
						>
							<span className="relative flex size-3">
								<span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
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
							transition={{
								duration: 0.8,
								ease: [0.16, 1, 0.3, 1],
								opacity: { duration: 0.4 },
							}}
							exit={{ opacity: 0, y: 10 }}
							style={{
								position: "absolute",
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
										transition={{
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
		</TourContext.Provider>
	);
}

export function useTour() {
	const context = useContext(TourContext);
	if (!context) {
		throw new Error("useTour must be used within a TourProvider");
	}
	return context;
}

export function TourAlertDialog({
	isOpen,
	setIsOpen,
}: { isOpen: boolean; setIsOpen: (isOpen: boolean) => void }) {
	const { startTour, steps, isTourCompleted, currentStep } = useTour();

	useEffect(() => {
		if (!isOpen || isTourCompleted || steps.length === 0 || currentStep > -1) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				startTour();
			} else if (e.key === "Escape") {
				e.preventDefault();
				setIsOpen(false);
			}
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isOpen, isTourCompleted, steps.length, currentStep, startTour, setIsOpen]);

	if (isTourCompleted || steps.length === 0 || currentStep > -1) {
		return null;
	}
	const handleSkip = async () => {
		setIsOpen(false);
	};

	return (
		<AlertDialog open={isOpen}>
			<AlertDialogContent className="max-w-md p-6">
				<AlertDialogHeader className="text-center">
					<AlertDialogTitle className="text-center text-lg font-semibold">
						Quick tour?
					</AlertDialogTitle>
					<AlertDialogDescription className="text-muted-foreground text-center text-sm">
						We&apos;ll walk you through the generator in 4 quick steps.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="mt-3 space-y-2">
					<Button onClick={startTour} className="w-full gap-2">
						Show me around
						<kbd className="inline-flex items-center rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd>
					</Button>
					<Button onClick={handleSkip} variant="ghost" className="w-full gap-2">
						Skip, I&apos;ll figure it out
						<kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">esc</kbd>
					</Button>
				</div>
			</AlertDialogContent>
		</AlertDialog>
	);
}
