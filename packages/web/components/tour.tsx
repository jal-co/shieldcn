"use client";

import { useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
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


// Only the ~5% of visitors who actually start the tour need this chunk (the
// spotlight/cursor/content overlay, and the "motion/react" animation engine
// it pulls in) — everyone else's /gen page load skips fetching it entirely.
const TourOverlay = dynamic(() => import("@/components/tour-overlay"), { ssr: false });

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

function getElementPosition(id: string) {
	const element = document.getElementById(id);
	if (!element) return null;
	const rect = element.getBoundingClientRect();
	return {
		top: rect.top,
		left: rect.left,
		width: rect.width,
		height: rect.height,
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
	const reduceMotion = useReducedMotion();
	// Latches true the first time a tour starts, so TourOverlay's dynamic
	// import fires once (fetching it lazily) and then stays mounted — letting
	// its own AnimatePresence track exit animations across steps and on close,
	// rather than being torn down and re-fetched every time.
	// Latch during render (React's "adjust state while rendering" pattern)
	// rather than in an effect — the value is derived purely from currentStep,
	// so a setState-in-effect would just add a cascading render.
	const [everStarted, setEverStarted] = useState(false);
	if (currentStep >= 0 && !everStarted) setEverStarted(true);

	const updateElementPosition = useCallback(() => {
		if (currentStep >= 0 && currentStep < steps.length) {
			const position = getElementPosition(steps[currentStep]?.selectorId ?? "");
			if (position) {
				setElementPosition(position);
			}
		}
	}, [currentStep, steps]);

	useEffect(() => {
		// Legitimate post-render layout measurement: the spotlight position comes
		// from the target's getBoundingClientRect(), which is only knowable after
		// the DOM has painted, so the initial measurement genuinely must run here
		// (the same fn is also the resize/scroll listener). This is a
		// measure-and-store effect, not the cascading-render pattern the rule
		// targets — hence the scoped disable rather than a suppression across the file.
		// eslint-disable-next-line react-hooks/set-state-in-effect
		updateElementPosition();
		window.addEventListener("resize", updateElementPosition);
		window.addEventListener("scroll", updateElementPosition);

		return () => {
			window.removeEventListener("resize", updateElementPosition);
			window.removeEventListener("scroll", updateElementPosition);
		};
	}, [updateElementPosition]);

	// Declared before nextStep, which calls it — a stable wrapper around the
	// raw setIsCompleted setter. (Previously declared further down, so nextStep
	// referenced it before its initialization: react-hooks/immutability.)
	const setIsTourCompleted = useCallback((completed: boolean) => {
		setIsCompleted(completed);
	}, []);

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
	}, [steps.length, onComplete, currentStep, setIsTourCompleted]);

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
				const clickX = e.clientX;
				const clickY = e.clientY;

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
			{everStarted && (
				<TourOverlay
					currentStep={currentStep}
					elementPosition={elementPosition}
					steps={steps}
					reduceMotion={reduceMotion}
					className={className}
					nextStep={nextStep}
					previousStep={previousStep}
					endTour={endTour}
				/>
			)}
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
