"use client";

import { useState, useCallback } from "react";
import HeartCards from "./HeartCards";

type Props = {
  answer: "yes" | "no" | null;
  onAnswerChange: (answer: "yes" | "no" | null) => void;
  heartReady?: boolean;
  onHeartReady?: () => void;
};

export default function ValentineForm({
  answer,
  onAnswerChange,
  heartReady = false,
  onHeartReady,
}: Props) {
  const [noPosition, setNoPosition] = useState({ x: 0, y: 0 });
  const [noHoverCount, setNoHoverCount] = useState(0);

  const handleYes = useCallback(() => onAnswerChange("yes"), [onAnswerChange]);

  const handleNoMove = useCallback(() => {
    setNoHoverCount((c) => c + 1);
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 60;
    setNoPosition((prev) => ({
      x: prev.x + Math.cos(angle) * dist,
      y: prev.y + Math.sin(angle) * dist,
    }));
  }, []);

  if (answer === "yes") {
    return (
      <div className="relative flex flex-col items-center gap-6 text-center transition-opacity duration-500">
        {!heartReady && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-2xl bg-white/95 dark:bg-zinc-900/95">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-rose-300 border-t-rose-600 dark:border-rose-600 dark:border-t-rose-400" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Подождите немного…
            </p>
            <span className="text-2xl animate-pulse">💕</span>
          </div>
        )}
        {heartReady && (
          <>
            <p className="text-2xl font-medium text-rose-600 dark:text-rose-400">
              Ура! 💕
            </p>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              Ты лучшая валентинка!
            </p>
          </>
        )}
        <div className="relative h-[320px] w-full md:hidden">
          <div className="h-full w-full overflow-hidden rounded-2xl bg-zinc-200/50 dark:bg-zinc-800/50">
            <HeartCards onReady={onHeartReady} />
          </div>
        </div>
        {heartReady && (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Наши моменты вместе
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8">
      <p className="text-center text-xl font-medium text-zinc-800 dark:text-zinc-200 sm:text-2xl">
        Настюшка, ты будешь моей валентинкой?
      </p>
      <div className="relative flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleYes}
          className="rounded-full bg-rose-500 px-8 py-3 text-lg font-medium text-white shadow-lg transition hover:bg-rose-600 hover:scale-105 active:scale-100"
        >
          Да
        </button>
        <button
          type="button"
          onMouseEnter={handleNoMove}
          onFocus={handleNoMove}
          style={{
            transform: `translate(${noPosition.x}px, ${noPosition.y}px)`,
          }}
          className="relative rounded-full border-2 border-zinc-300 bg-zinc-100 px-8 py-3 text-lg font-medium text-zinc-600 transition dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-500"
        >
          Нет
          {noHoverCount > 2 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-400 text-xs text-white">
              ?
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
