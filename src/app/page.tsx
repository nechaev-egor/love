"use client";

import { useState } from "react";
import ValentineForm from "@/components/ValentineForm";
import HeartCards from "@/components/HeartCards";

export default function Home() {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-rose-50 to-pink-100 font-sans dark:from-zinc-900 dark:to-zinc-800">
      {/* Desktop: WebGL in background */}
      {answer === "yes" && (
        <div className="fixed inset-0 z-0 hidden md:block">
          <div className="h-full w-full">
            <HeartCards fullScreen />
          </div>
        </div>
      )}

      <main className="relative z-10 w-full max-w-lg px-6 py-16">
        <div className="rounded-3xl bg-white/80 p-10 shadow-xl backdrop-blur dark:bg-zinc-900/80 dark:shadow-zinc-950/50">
          <ValentineForm answer={answer} onAnswerChange={setAnswer} />
        </div>
      </main>
    </div>
  );
}
