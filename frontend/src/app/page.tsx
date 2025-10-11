"use client";

import { useState } from "react";
import {
  API_BASE_URL,
  generateLesson,
  evaluateAnswers,
  chat,
  getProgress,
  setProgress,
  type Lesson,
} from "@/lib/api";

export default function Home() {
  const [category, setCategory] = useState("Credit & Debt");
  const [level, setLevel] = useState(1);
  const [numQuestions, setNumQuestions] = useState(3);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [evalResult, setEvalResult] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [handle, setHandle] = useState("alex");
  const [progress, setProgressState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await generateLesson({
        category,
        level,
        num_questions: numQuestions,
      });
      setLesson(res.lesson);
      setEvalResult(null);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onEvaluate() {
    if (!lesson) return;
    setLoading(true);
    setError(null);
    try {
      // naive: use first question and the single input answer
      const first = lesson.questions[0];
      const res = await evaluateAnswers({
        lesson,
        answers: [{ question_id: first.id, user_answer: answer }],
      });
      setEvalResult(res);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onChat() {
    setLoading(true);
    setError(null);
    try {
      const res = await chat({ message });
      setAnswer(res.answer);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onGetProgress() {
    setLoading(true);
    setError(null);
    try {
      const res = await getProgress(handle);
      setProgressState(res);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onSetProgress() {
    setLoading(true);
    setError(null);
    try {
      const res = await setProgress(handle, { xp: 25, streak: 2 });
      setProgressState(res);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto space-y-6 bg-white text-gray-900 dark:bg-neutral-900 dark:text-neutral-100">
      <h1 className="text-2xl font-bold">Finance Learning API Tester</h1>
      <p className="text-sm text-gray-600 dark:text-gray-300">Backend: {API_BASE_URL}</p>

      <section className="space-y-3 border p-4 rounded bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm">
        <h2 className="font-semibold">Generate Lesson</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className="border px-2 py-1 rounded bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 border-gray-300 dark:border-neutral-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
          />
          <input
            className="border px-2 py-1 rounded w-24 bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 border-gray-300 dark:border-neutral-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="number"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            placeholder="Level"
          />
          <input
            className="border px-2 py-1 rounded w-24 bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 border-gray-300 dark:border-neutral-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="number"
            value={numQuestions}
            onChange={(e) => setNumQuestions(Number(e.target.value))}
            placeholder="# Questions"
          />
          <button className="border px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 border-transparent disabled:opacity-50" onClick={onGenerate} disabled={loading}>
            Generate
          </button>
        </div>
        {lesson && (
          <pre className="text-xs whitespace-pre-wrap bg-neutral-900 text-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 p-3 rounded overflow-auto">
{JSON.stringify(lesson, null, 2)}
          </pre>
        )}
      </section>

      <section className="space-y-3 border p-4 rounded bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm">
        <h2 className="font-semibold">Evaluate (first question only)</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className="border px-2 py-1 rounded bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 border-gray-300 dark:border-neutral-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your answer (e.g., A or text)"
          />
          <button className="border px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 border-transparent disabled:opacity-50" onClick={onEvaluate} disabled={loading || !lesson}>
            Evaluate
          </button>
        </div>
        {evalResult && (
          <pre className="text-xs whitespace-pre-wrap bg-neutral-900 text-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 p-3 rounded overflow-auto">
{JSON.stringify(evalResult, null, 2)}
          </pre>
        )}
      </section>

      <section className="space-y-3 border p-4 rounded bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm">
        <h2 className="font-semibold">Finance Chat</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className="border px-2 py-1 rounded flex-1 bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 border-gray-300 dark:border-neutral-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a question (e.g., What is compound interest?)"
          />
          <button className="border px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 border-transparent disabled:opacity-50" onClick={onChat} disabled={loading}>
            Send
          </button>
        </div>
        {!!answer && (
          <pre className="text-xs whitespace-pre-wrap bg-amber-50 text-amber-900 dark:bg-neutral-800 dark:text-neutral-100 p-3 rounded overflow-auto">
{answer}
          </pre>
        )}
      </section>

      <section className="space-y-3 border p-4 rounded bg-white dark:bg-neutral-800 border-gray-200 dark:border-neutral-700 shadow-sm">
        <h2 className="font-semibold">Progress</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            className="border px-2 py-1 rounded bg-white text-gray-900 dark:bg-neutral-700 dark:text-neutral-100 border-gray-300 dark:border-neutral-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="Handle"
          />
          <button className="border px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 border-transparent disabled:opacity-50" onClick={onGetProgress} disabled={loading}>
            Get
          </button>
          <button className="border px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 border-transparent disabled:opacity-50" onClick={onSetProgress} disabled={loading}>
            Set xp=25, streak=2
          </button>
        </div>
        {progress && (
          <pre className="text-xs whitespace-pre-wrap bg-neutral-900 text-neutral-100 dark:bg-neutral-800 dark:text-neutral-100 p-3 rounded overflow-auto">
{JSON.stringify(progress, null, 2)}
          </pre>
        )}
      </section>

      {error && (
        <div className="text-sm border p-2 rounded bg-red-50 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-700">{error}</div>
      )}
    </div>
  );
}
