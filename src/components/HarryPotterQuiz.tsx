"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import confetti from "canvas-confetti";

const STORAGE_KEY = "valentine_quiz";

const QUESTIONS: {
  question: string;
  options: string[];
  correct: number;
  points: number;
}[] = [
  {
    question: "Как звали мать Северуса Снейпа?",
    options: ["Эйлин Прин", "Тина Прин", "Мерида Прин", "Селена Прин"],
    correct: 0,
    points: 10,
  },
  {
    question: "Какой полное заклинание Patronus у Гарри Поттера?",
    options: [
      "Expecto Patronum (олень)",
      "Expecto Patronum (волк)",
      "Expecto Patronum (заяц)",
      "Expecto Patronum (лебедь)",
    ],
    correct: 0,
    points: 15,
  },
  {
    question: "Кто был директором Хогвартса до Дамблдора?",
    options: [
      "Филиус Флитвик",
      "Армандо Диппет",
      "Долорес Амбридж",
      "Гораций Слизнорт",
    ],
    correct: 1,
    points: 20,
  },
  {
    question: "Какой предмет держал Гарри в руке при выборе шляпой?",
    options: ["Палочка", "Очки", "Ничего особенного", "Медальон"],
    correct: 2,
    points: 25,
  },
  {
    question: "Сколько крестражей всего создал Волдеморт?",
    options: ["5", "6", "7", "8"],
    correct: 2,
    points: 15,
  },
  {
    question: "Какой был первый крестраж, уничтоженный Гарри?",
    options: ["Дневник", "Медальон", "Чаша", "Кольцо"],
    correct: 0,
    points: 20,
  },
  {
    question: "Как звали кошку Гермионы?",
    options: ["Миссис Норрис", "Клык", "Живоглот", "Когтевран"],
    correct: 2,
    points: 10,
  },
  {
    question: "В каком возрасте Сириус Блэк сбежал из дома?",
    options: ["14", "15", "16", "17"],
    correct: 2,
    points: 25,
  },
  {
    question: "Какой ингредиент НЕ входит в зелье оборотня?",
    options: ["Волчий корень", "Белладонна", "Серебряная пыль", "Кровь вампира"],
    correct: 3,
    points: 30,
  },
  {
    question: "Сколько ступенек ведут в башню Дамблдора?",
    options: ["117", "142", "156", "Меняется каждый день"],
    correct: 3,
    points: 35,
  },
];

const SECONDS_PER_QUESTION = 20;

const PRIZES = [
  { id: "dinner", name: "Романтический ужин", minScore: 0, emoji: "🍷" },
  { id: "pilates", name: "Абонемент на пилатес", minScore: 50, emoji: "🧘" },
  { id: "pandora", name: "Украшение Pandora", minScore: 100, emoji: "💎" },
  { id: "travel", name: "Путешествие", minScore: 140, emoji: "✈️" },
  {
    id: "tablet",
    name: "Планшет Apple",
    minScore: 170,
    emoji: "📱",
    isMain: true,
  },
];

type QuizState = {
  step: "idle" | "quiz" | "result";
  currentQuestion: number;
  score: number;
  answers: number[];
  selectedPrize: string | null;
  confirmedPrize: string | null;
};

const defaultState: Omit<QuizState, "step"> & { step?: QuizState["step"] } = {
  step: "idle",
  currentQuestion: 0,
  score: 0,
  answers: [],
  selectedPrize: null,
  confirmedPrize: null,
};

function loadState(): QuizState {
  if (typeof window === "undefined")
    return { ...defaultState, step: "idle" } as QuizState;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultState, step: "idle" } as QuizState;
    const parsed = JSON.parse(stored) as Partial<QuizState>;
    return {
      ...defaultState,
      ...parsed,
      selectedPrize: parsed.selectedPrize ?? null,
      confirmedPrize: parsed.confirmedPrize ?? null,
      step: parsed.step === "result" ? "result" : parsed.step === "quiz" ? "quiz" : "idle",
    } as QuizState;
  } catch {
    return { ...defaultState, step: "idle" } as QuizState;
  }
}

function saveState(state: QuizState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    //
  }
}

export default function HarryPotterQuiz() {
  const [state, setState] = useState<QuizState>(loadState);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // таймер на ответ — сбрасывается при новом вопросе, не тикает во время обработки
  useEffect(() => {
    if (state.step !== "quiz") return;
    const tid0 = setTimeout(() => setTimeLeft(SECONDS_PER_QUESTION), 0);
    if (isProcessing) return () => clearTimeout(tid0);
    const id = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      clearTimeout(tid0);
      clearInterval(id);
    };
  }, [state.step, state.currentQuestion, isProcessing]);

  // истечение времени = неправильный ответ
  useEffect(() => {
    if (state.step !== "quiz" || isProcessing || timeLeft > 0) return;
    const t0 = setTimeout(() => {
      setIsProcessing(true);
      setWrongFlash(true);
    }, 0);
    const t1 = setTimeout(() => {
      setWrongFlash(false);
      setState((s) => {
        const next = s.currentQuestion + 1;
        const newAnswers = [...s.answers, -1];
        if (next >= QUESTIONS.length) {
          return { ...s, step: "result", currentQuestion: next, score: s.score, answers: newAnswers };
        }
        return { ...s, currentQuestion: next, score: s.score, answers: newAnswers };
      });
      setIsProcessing(false);
    }, 600);
    return () => {
      clearTimeout(t0);
      clearTimeout(t1);
    };
  }, [timeLeft, state.step, isProcessing]);

  const startQuiz = useCallback(() => {
    setState({
      ...defaultState,
      step: "quiz",
      answers: [],
    });
  }, []);

  const selectPrize = useCallback((prizeId: string) => {
    setState((prev) => ({ ...prev, selectedPrize: prizeId }));
  }, []);

  const confirmPrize = useCallback(() => {
    if (!state.selectedPrize) return;
    confetti({ particleCount: 100, spread: 100 });
    setState((prev) => ({ ...prev, confirmedPrize: prev.selectedPrize }));
  }, [state.selectedPrize]);

  const answerQuestion = useCallback(
    (choice: number) => {
      if (isProcessing) return;
      const q = QUESTIONS[state.currentQuestion];
      const isCorrect = choice === q.correct;
      const newScore = state.score + (isCorrect ? q.points : 0);
      const newAnswers = [...state.answers, choice];
      const next = state.currentQuestion + 1;

      setIsProcessing(true);

      if (isCorrect) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } else {
        setWrongFlash(true);
      }

      const delay = isCorrect ? 800 : 600;
      const updateState = () => {
        setWrongFlash(false);
        if (next >= QUESTIONS.length) {
          setState({
            ...state,
            step: "result",
            currentQuestion: next,
            score: newScore,
            answers: newAnswers,
          });
        } else {
          setState({
            ...state,
            currentQuestion: next,
            score: newScore,
            answers: newAnswers,
          });
        }
        setIsProcessing(false);
      };

      setTimeout(updateState, delay);
    },
    [state, isProcessing]
  );

  if (state.step === "idle") {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Подарок ждет тебя 
        </p>
        <button
          type="button"
          onClick={startQuiz}
          className="rounded-full bg-amber-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700"
        >
          Начать 🪄
        </button>
      </div>
    );
  }

  if (state.step === "quiz") {
    const q = QUESTIONS[state.currentQuestion];
    return (
      <div
        ref={containerRef}
        className={`flex w-full flex-col gap-4 rounded-2xl p-4 transition-colors ${
          wrongFlash ? "quiz-wrong-flash" : ""
        }`}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500">
              Вопрос {state.currentQuestion + 1} / {QUESTIONS.length}
            </span>
            <span className="font-medium text-amber-600">Очки: {state.score}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${(timeLeft / SECONDS_PER_QUESTION) * 100}%`,
                  backgroundColor: timeLeft <= 5 ? "#dc2626" : undefined,
                }}
              />
            </div>
            <span
              className={`shrink-0 text-xs font-medium tabular-nums ${
                timeLeft <= 5 ? "text-red-600" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {timeLeft} с
            </span>
          </div>
        </div>
        <p className="font-medium text-zinc-800 dark:text-zinc-200">{q.question}</p>
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => answerQuestion(i)}
              disabled={isProcessing}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-left text-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:pointer-events-none disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-amber-600 dark:hover:bg-amber-950/30"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // result - certificate view
  if (state.confirmedPrize) {
    const prize = PRIZES.find((p) => p.id === state.confirmedPrize)!;
    return (
      <div className="flex w-full flex-col gap-6">
        <div
          className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-b from-amber-50/80 to-white p-8 shadow-lg dark:border-amber-600 dark:from-amber-950/30 dark:to-zinc-900"
          style={{
            boxShadow: "0 4px 20px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          {/* decorative corners */}
          <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-amber-500/60" />
          <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-amber-500/60" />
          <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-amber-500/60" />
          <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-amber-500/60" />

          <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400">
            Сертификат на получение приза
          </p>
          <div className="mb-6 text-center text-4xl">{prize.emoji}</div>
          <h3 className="mb-4 text-center text-xl font-bold text-zinc-800 dark:text-zinc-100">
            {prize.name}
          </h3>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Предъявитель данного сертификата имеет право на получение приза
            <br />
            «{prize.name}» в рамках романтического квиза.
          </p>
          <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-500">
            С любовью 💕 • {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    );
  }

  // result - prize selection
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="rounded-2xl bg-amber-50 p-4 text-center dark:bg-zinc-800/50">
        <p className="text-2xl font-bold text-amber-600">{state.score}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">очков</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Выбери приз (хватает очков):
        </p>
        <ul className="space-y-2">
          {PRIZES.map((prize) => {
            const unlocked = state.score >= prize.minScore;
            const selected = state.selectedPrize === prize.id;
            return (
              <li key={prize.id}>
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => unlocked && selectPrize(prize.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
                    !unlocked
                      ? "cursor-not-allowed bg-zinc-50 opacity-60 dark:bg-zinc-900/50"
                      : selected
                        ? prize.isMain
                          ? "border-2 border-amber-500 bg-amber-100 ring-2 ring-amber-400 dark:bg-amber-900/50 dark:ring-amber-600"
                          : "border-2 border-amber-400 bg-amber-50 ring-2 ring-amber-300 dark:border-amber-600 dark:bg-amber-950/30 dark:ring-amber-700"
                        : prize.isMain && unlocked
                          ? "border-2 border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/30"
                          : "border border-transparent bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-700/50"
                  }`}
                >
                  <span className="text-xl">{prize.emoji}</span>
                  <span className="flex-1 text-sm font-medium">{prize.name}</span>
                  {prize.isMain && unlocked && (
                    <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                      ГЛАВНЫЙ ПРИЗ
                    </span>
                  )}
                  {selected && (
                    <span className="text-amber-600 dark:text-amber-400">✓ Выбрано</span>
                  )}
                  {!unlocked && (
                    <span className="text-xs text-zinc-500">
                      от {prize.minScore} очков
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {state.selectedPrize && (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl bg-amber-100 p-3 text-center text-sm font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            🎁 Твой приз: {PRIZES.find((p) => p.id === state.selectedPrize)?.name}
          </p>
          <button
            type="button"
            onClick={confirmPrize}
            className="rounded-full bg-amber-600 px-6 py-3 text-sm font-medium text-white shadow-md transition hover:bg-amber-700"
          >
            Подтвердить ✓
          </button>
        </div>
      )}
    </div>
  );
}
