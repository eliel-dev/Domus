import React, { useEffect, useState } from 'react';
import { ArrowRight, ArrowLeft, X, HelpCircle } from 'lucide-react';

export interface TutorialStep {
  targetTourId: string;
  title: string;
  description: string;
}

interface TutorialOverlayProps {
  isOpen: boolean;
  steps: TutorialStep[];
  onClose: (markDismissed: boolean) => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  steps,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setStepIndex(0);
      return;
    }

    const updateRect = () => {
      const step = steps[stepIndex];
      if (!step) return;
      const el = document.querySelector(`[data-tour="${step.targetTourId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const box = el.getBoundingClientRect();
        setRect(box);
      } else {
        setRect(null);
      }
    };

    const timer = setTimeout(updateRect, 80);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [isOpen, stepIndex, steps]);

  if (!isOpen || steps.length === 0) return null;

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-step-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-[1px]"
        onClick={() => onClose(true)}
      />

      {/* Contextual Highlight Frame */}
      {rect && (
        <div
          className="pointer-events-none fixed z-50 rounded-2xl border-2 border-red-500 shadow-[0_0_0_9999px_rgba(7,8,11,0.58)] transition-all duration-200"
          style={{
            top: Math.max(4, rect.top - 6),
            left: Math.max(4, rect.left - 6),
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      {/* Tutorial Card */}
      <div className="animate-modal fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#12141A]/95 sm:bottom-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400">
            <HelpCircle className="h-4 w-4" aria-hidden="true" />
            <span>
              Guia rápido · Passo {stepIndex + 1} de {steps.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onClose(true)}
            aria-label="Dispensar guia"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <h3
          id="tutorial-step-title"
          className="mt-2 text-base font-bold text-zinc-900 dark:text-zinc-100"
        >
          {currentStep.title}
        </h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {currentStep.description}
        </p>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onClose(true)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            Não mostrar novamente
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => i - 1)}
                className="inline-flex min-h-[38px] items-center gap-1 rounded-full border border-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-white/12 dark:text-zinc-200 dark:hover:bg-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Anterior</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  onClose(true);
                } else {
                  setStepIndex((i) => i + 1);
                }
              }}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
            >
              <span>{isLast ? 'Concluir' : 'Próximo'}</span>
              {!isLast && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
