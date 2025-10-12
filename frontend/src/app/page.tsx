"use client";

import React, { useState, useEffect, useMemo, memo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Star, Flame, MessageCircle, Lock, CheckCircle, BookOpen, Send, X, Zap, Target } from 'lucide-react';
import {
  chat as chatApi,
  generateLesson,
  evaluateAnswers,
  getProgress,
  setProgress,
  type Lesson as ApiLesson,
  type EvaluateResponse,
} from '@/lib/api';
import { checkFree, type FreeCheckResponse } from '@/lib/api';

const CATEGORY_MAP: Record<string, string> = {
  'Budgeting Basics': 'Budgeting & Saving Basics',
  'Credit & Debt': 'Credit & Debt',
  'Investing & Risk': 'Investing & Risk',
};

// Memoized question component to prevent re-renders
const QuestionInput = memo(({ question, value, onChange, onLiveChange, onRegisterRef }: { 
  question: any; 
  value: string; 
  onChange: (val: string) => void;
  onLiveChange?: (val: string) => void;
  onRegisterRef?: (el: HTMLTextAreaElement | null) => void;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const freeRef = React.useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  if (question.type === 'mcq') {
    return (
      <div className="space-y-3">
        {(question.options || []).map((opt: any) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
            className={`w-full text-left p-5 rounded-2xl border-2 font-semibold text-lg transition-colors ${
              value === opt.id
                ? 'border-sky-500 bg-sky-50 text-gray-900 shadow-lg'
                : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400 hover:bg-gray-50'
            }`}
          >
            {opt.text}
          </button>
        ))}
      </div>
    );
  }

  if (question.type === 'fill') {
    return (
      <input
        type="text"
        value={localValue}
        onChange={(e) => { const v = e.target.value; setLocalValue(v); onLiveChange && onLiveChange(v); }}
        onBlur={handleBlur}
        placeholder="Type your answer"
        className="w-full border-2 border-gray-300 rounded-2xl px-4 py-4 font-semibold text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
        autoComplete="off"
        spellCheck={false}
      />
    );
  }

  if (question.type === 'free') {
    return (
      <textarea
        ref={(el) => { freeRef.current = el; onRegisterRef && onRegisterRef(el); }}
        key={`free-${question.id || 'q'}`}
        defaultValue={value}
        onInput={(e) => {
          const val = (e.target as HTMLTextAreaElement).value;
          onLiveChange && onLiveChange(val);
        }}
        onBlur={() => {
          const val = freeRef.current?.value || '';
          onChange(val);
        }}
        placeholder="Explain in your own words..."
        className="w-full border-2 border-gray-300 rounded-2xl px-4 py-4 font-semibold text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
        rows={4}
        autoComplete="off"
        spellCheck={false}
      />
    );
  }

  return null;
});

QuestionInput.displayName = 'QuestionInput';

const MonetaPlatform = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: "Hi! I'm your Finance Coach! Ask me anything about money, saving, investing, or any lesson topic. 💰" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Lesson + quiz state (driven by backend)
  const [generatedLesson, setGeneratedLesson] = useState<ApiLesson | null>(null);
  const [loadingLesson, setLoadingLesson] = useState(false);

  // Auth check on mount
  useEffect(() => {
    setIsMounted(true);
    const authToken = localStorage.getItem('authToken');
    const isGuestMode = localStorage.getItem('isGuest') === 'true';
    const savedUserData = localStorage.getItem('userData');
    
    if (!authToken && !isGuestMode) {
      router.push('/login');
      return;
    }
    
    setIsAuthenticated(true);
    setIsGuest(isGuestMode);
    if (savedUserData) {
      setUserData(JSON.parse(savedUserData));
    }
  }, [router]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({}); // key: question_id → answer (e.g., 'A' for mcq)
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const liveAnswersRef = useRef<Record<string, string>>({});
  const freeTextareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const [questionCorrectMap, setQuestionCorrectMap] = useState<Record<string, boolean>>({});
  const [showQuestionConfetti, setShowQuestionConfetti] = useState(false);
  const [globalConfetti, setGlobalConfetti] = useState<{ x: number; y: number; color: string }[]>([]);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);
  const [questionEvaluatedMap, setQuestionEvaluatedMap] = useState<Record<string, boolean>>({});

  // Get user handle from authenticated user data
  const handleId = userData?.username || 'demo';

  // User progress data (xp/streak from backend; daily fields are UI-only)
  const [userProgress, setUserProgress] = useState({
    xp: 0,
    level: 1,
    streak: 0,
    completedLessons: [0],
    dailyGoal: 50,
    dailyProgress: 0,
  });
  const [progressUnlocked, setProgressUnlocked] = useState<string[]>([]);
  const [lastStreakDate, setLastStreakDate] = useState<string | null>(null);

  // Increment streak once per calendar day upon successful quiz completion
  const maybeIncrementStreakForToday = async (newXp: number, nodeXp: number) => {
    try {
      const today = new Date();
      const key = today.toISOString().slice(0, 10); // YYYY-MM-DD
      if (lastStreakDate === key) {
        await setProgress(handleId, { xp: newXp });
        return { streak: userProgress.streak, lastDate: lastStreakDate };
      }
      const updatedStreak = userProgress.streak + 1;
      await setProgress(handleId, { xp: newXp, streak: updatedStreak });
      try { localStorage.setItem('moneta_last_streak_date', key); } catch (_) {}
      setLastStreakDate(key);
      return { streak: updatedStreak, lastDate: key };
    } catch (_) {
      return { streak: userProgress.streak, lastDate: lastStreakDate };
    }
  };

  useEffect(() => {
    // Skip loading progress for guest users
    if (!userData?.username || isGuest) return;
    
    (async () => {
      try {
        const p = await getProgress(handleId);
        setUserProgress((prev) => ({
          ...prev,
          xp: p.xp,
          streak: p.streak,
        }));
        setProgressUnlocked(p.unlocked || []);
      } catch (e) {
        // best-effort: keep defaults when backend not available
      }
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('moneta_last_streak_date') : null;
        if (saved) setLastStreakDate(saved);
      } catch (_) {}
    })();
  }, [userData?.username]); // Re-run when user changes

  // Lessons path (visual nodes). Content is generated via backend when opened
  const lessons = [
    {
      id: 0,
      category: 'Budgeting Basics',
      title: 'What is a Budget?',
      icon: '🏦',
      color: 'from-green-400 to-green-500',
      xp: 50,
      difficulty: 1,
      locked: false,
      position: { x: 35, y: 10 },
      // questions generated dynamically
    },
    {
      id: 1,
      category: 'Budgeting Basics',
      title: 'Tracking Expenses',
      icon: '📊',
      color: 'from-green-400 to-green-500',
      xp: 50,
      difficulty: 1,
      locked: false,
      position: { x: 55, y: 25 }
    },
    {
      id: 2,
      category: 'Budgeting Basics',
      title: 'Emergency Fund',
      icon: '🛡️',
      color: 'from-green-400 to-green-500',
      xp: 75,
      difficulty: 1,
      locked: false,
      position: { x: 75, y: 40 }
    },
    {
      id: 3,
      category: 'Credit & Debt',
      title: 'Credit Scores 101',
      icon: '💳',
      color: 'from-blue-400 to-blue-500',
      xp: 100,
      difficulty: 2,
      locked: false,
      position: { x: 92, y: 55 }
    },
    {
      id: 4,
      category: 'Credit & Debt',
      title: 'Good vs Bad Debt',
      icon: '⚖️',
      color: 'from-blue-400 to-blue-500',
      xp: 100,
      difficulty: 2,
      locked: false,
      position: { x: 75, y: 65 }
    },
    {
      id: 5,
      category: 'Credit & Debt',
      title: 'Credit Cards',
      icon: '💰',
      color: 'from-blue-400 to-blue-500',
      xp: 100,
      difficulty: 2,
      locked: false,
      position: { x: 55, y: 75 }
    },
    {
      id: 6,
      category: 'Investing & Risk',
      title: 'What is Investing?',
      icon: '📈',
      color: 'from-purple-400 to-purple-500',
      xp: 150,
      difficulty: 3,
      locked: true,
      position: { x: 35, y: 85 }
    },
    {
      id: 7,
      category: 'Investing & Risk',
      title: 'Compound Interest',
      icon: '🚀',
      color: 'from-purple-400 to-purple-500',
      xp: 150,
      difficulty: 3,
      locked: true,
      position: { x: 55, y: 92 }
    }
  ];

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const message = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', text: message }]);
    setChatInput('');
    setLoadingChat(true);
    try {
      const res = await chatApi({ message, context: generatedLesson?.title });
      setChatMessages((prev) => [...prev, { role: 'ai', text: res.answer }]);
    } catch (e) {
      setChatMessages((prev) => [...prev, { role: 'ai', text: 'Sorry, I had trouble answering that. Try again in a bit.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isGuest');
    router.push('/login');
  };

  const openLesson = async (lessonId: number) => {
    const node = lessons.find((l) => l.id === lessonId);
    if (!node || node.locked) return;
    setSelectedLesson(lessonId);
    setGeneratedLesson(null);
    setUserAnswers({});
    setEvaluation(null);
    setCurrentQuestionIdx(0);
    setQuestionCorrectMap({});
    setLoadingLesson(true);
    try {
      const category = CATEGORY_MAP[node.category] || node.category;
      const lvl = node.difficulty || 1;
      const diffLabel = lvl === 1 ? 'beginner-friendly' : lvl === 2 ? 'intermediate' : 'advanced';
      const res = await generateLesson({
        category,
        level: lvl,
        num_questions: 5,
        difficulty: `${diffLabel}; subtopic: ${node.title}`,
      });
      setGeneratedLesson(res.lesson);
    } catch (e) {
      // fallback when lesson fails to generate
      setGeneratedLesson(null);
    } finally {
      setLoadingLesson(false);
    }
  };

  const setAnswer = (questionId: string, value: string) => {
    setUserAnswers((prev) => ({ ...prev, [questionId]: value }));
    liveAnswersRef.current[questionId] = value;
    // Don't clear evaluated/correct state here; CHECK will update them
  };

  const submitQuiz = async () => {
    if (!generatedLesson) return;
    setIsSubmitting(true);
    try {
      const resp = await evaluateAnswers({
        lesson: generatedLesson,
        answers: generatedLesson.questions.map((q) => ({
          question_id: q.id,
          user_answer: userAnswers[q.id] || '',
        })),
      });
      setEvaluation(resp);

      // Award XP if passed
      const node = lessons.find((l) => l.id === selectedLesson);
      if (node && resp.score >= 0.6) {
        const newXp = userProgress.xp + node.xp;
        const { streak: maybeNewStreak } = await maybeIncrementStreakForToday(newXp, node.xp);
        setUserProgress((prev) => ({
        ...prev,
          xp: newXp,
          streak: maybeNewStreak,
          completedLessons: prev.completedLessons.includes(node.id)
            ? prev.completedLessons
            : [...prev.completedLessons, node.id],
          dailyProgress: prev.dailyProgress + node.xp,
      }));
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
      }
    } catch (e) {
      // ignore for MVP
    } finally {
      setIsSubmitting(false);
    }
  };

  const DashboardView = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h2 className="text-4xl font-black text-gray-800 mb-2">
          Keep it up! 🎯
        </h2>
        <p className="text-gray-600 text-lg">You're on a {userProgress.streak} day streak!</p>
      </div>

      {/* Daily Goal Progress */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-gray-800">Daily Goal</span>
          </div>
          <span className="text-sm font-bold text-gray-600">
            {userProgress.dailyProgress}/{userProgress.dailyGoal} XP
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((userProgress.dailyProgress / userProgress.dailyGoal) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl p-6 text-white shadow-lg">
          <Flame className="w-10 h-10 mb-3" />
          <div className="text-3xl font-black mb-1">{userProgress.streak}</div>
          <div className="text-amber-100 text-sm font-semibold">Day Streak</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl p-6 text-white shadow-lg">
          <Zap className="w-10 h-10 mb-3" />
          <div className="text-3xl font-black mb-1">{userProgress.xp}</div>
          <div className="text-blue-100 text-sm font-semibold">Total XP</div>
        </div>
      </div>

      {/* Micro Simulation */}
      <MicroSimulation />

      {/* Achievements */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
        <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-amber-500" />
          Achievements
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border-2 border-emerald-200">
            <div className="text-4xl mb-2">🏦</div>
            <div className="text-xs font-bold text-emerald-700">Budget<br/>Master</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200">
            <div className="text-4xl mb-2">💳</div>
            <div className="text-xs font-bold text-blue-700">Credit<br/>Expert</div>
          </div>
          <div className="text-center p-4 bg-gray-100 rounded-2xl border-2 border-gray-200">
            <div className="text-4xl mb-2 opacity-40">📈</div>
            <div className="text-xs font-bold text-gray-400">Investor<br/>Pro</div>
          </div>
        </div>
      </div>

      {/* Learning Path - Duolingo Style */}
      <div className="relative min-h-screen pb-20">
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 50%, #dbeafe 100%)'
        }}>
          {/* Decorative circles */}
          <div className="absolute top-10 right-10 w-20 h-20 bg-yellow-200 rounded-full opacity-30 blur-xl"></div>
          <div className="absolute top-40 left-10 w-32 h-32 bg-green-200 rounded-full opacity-20 blur-xl"></div>
          <div className="absolute bottom-40 right-20 w-24 h-24 bg-blue-200 rounded-full opacity-25 blur-xl"></div>
        </div>

        {/* Vertical Path Line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-green-300 via-blue-300 to-purple-300 opacity-30 transform -translate-x-1/2"></div>

        <div className="relative">
          {lessons.map((lesson, index) => {
            const isCompleted = userProgress.completedLessons.includes(lesson.id);
            const token = `${CATEGORY_MAP[lesson.category] || lesson.category}:1`;
            const categoryUnlocked = progressUnlocked.includes(token);
            const isLocked = lesson.difficulty > 1 || !categoryUnlocked;
            const isNext = !isCompleted && !isLocked && 
                          (index === 0 || userProgress.completedLessons.includes(lessons[index - 1].id));
            
            return (
              <div
                key={lesson.id}
                className="relative mb-8"
                style={{
                  marginLeft: `${lesson.position.x}%`,
                  transform: `translateX(-50%)`
                }}
              >
                {/* Connecting line to next lesson */}
                {index < lessons.length - 1 && (
                  <div className="absolute top-20 left-1/2 w-1 h-16 bg-gradient-to-b from-gray-300 to-transparent transform -translate-x-1/2"></div>
                )}

                <button
                  onClick={() => !isLocked && openLesson(lesson.id)}
                  type="button"
                  disabled={isLocked}
                  className={`relative group transition-all duration-300 ${
                    isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'
                  }`}
                >
                  {/* Lesson Circle */}
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center text-4xl shadow-lg border-4 transition-all ${
                    isLocked
                      ? 'bg-gray-300 border-gray-400'
                      : isCompleted
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600 anim-pop-in'
                      : isNext
                      ? 'bg-gradient-to-br ' + lesson.color + ' border-white anim-bounce anim-pulse-ring'
                      : 'bg-white border-gray-300'
                  }`}>
                    {isLocked ? (
                      <Lock className="w-8 h-8 text-gray-500" />
                    ) : isCompleted ? (
                      <CheckCircle className="w-10 h-10 text-white" />
                    ) : (
                      <span>{lesson.icon}</span>
                    )}
                    
                    {/* Glow effect for next lesson */}
                    {isNext && (
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 to-green-500 opacity-30 blur-md animate-pulse"></div>
                    )}
                  </div>

                  {/* Stars for completed lessons */}
                  {isCompleted && (
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-amber-400 rounded-full p-1 border-2 border-white shadow-md">
                        <Star className="w-4 h-4 text-white fill-white" />
                      </div>
                    </div>
                  )}

                  {/* Lesson Info Tooltip */}
                  <div className={`absolute top-full mt-4 left-1/2 transform -translate-x-1/2 transition-all ${
                    isLocked ? 'opacity-60' : ''
                  }`}>
                    <div className="bg-white rounded-2xl p-4 shadow-xl border-2 border-gray-100 min-w-48 text-center">
                      <div className="font-black text-gray-800 text-sm mb-1">
                        {lesson.title}
                      </div>
                      <div className="flex items-center justify-center gap-2 text-xs">
                        <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                          {lesson.xp} XP
                        </span>
                        {isLocked && (
                          <span className="text-gray-500 font-semibold">🔒 Locked</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Trophy */}
        <div className="text-center pt-10">
          <div className="inline-block bg-gradient-to-br from-amber-400 to-amber-500 rounded-full p-6 shadow-xl">
            <Trophy className="w-16 h-16 text-white" />
          </div>
          <div className="mt-4 font-black text-2xl text-gray-700">
            Complete all lessons!
          </div>
        </div>
      </div>
    </div>
  );

  const LessonView = () => {
    const node = lessons.find((l) => l.id === selectedLesson);
    if (!node) return null;
    const [checkMessage, setCheckMessage] = useState<string | null>(null);
    const [checkingFree, setCheckingFree] = useState(false);

    const totalQuestions = generatedLesson?.questions.length || 0;
    const answeredCount = useMemo(() => {
      if (!generatedLesson) return 0;
      return generatedLesson.questions.filter((q) => (userAnswers[q.id] || '').trim() !== '').length;
    }, [generatedLesson, userAnswers]);

    const progressWidth = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="bg-white rounded-full h-4 mb-6 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-gray-100">
          {!evaluation ? (
            <>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{node.icon}</div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">{generatedLesson?.title || node.title}</h2>
                <p className="text-gray-600 font-semibold">{generatedLesson?.category || node.category}</p>
              </div>

              {loadingLesson ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold">Generating lesson...</p>
                </div>
              ) : generatedLesson ? (
                <div className="space-y-8">
                  {(() => {
                    const q = generatedLesson.questions[currentQuestionIdx];
                    const qKey = (q as any)?.id || `q-${currentQuestionIdx}`;
                    if (!q) return null;
                    return (
                      <div key={`${qKey}-${currentQuestionIdx}`} className={`space-y-4 relative ${questionEvaluatedMap[qKey] && !questionCorrectMap[qKey] ? 'anim-red-flash' : ''}`}>
                        {showQuestionConfetti && (
                          <div className="absolute inset-0 pointer-events-none flex items-start justify-end p-4">
                            <div className="confetti"></div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-gray-800 leading-snug">{q.prompt}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-500">{currentQuestionIdx + 1}/{totalQuestions}</span>
                            {questionEvaluatedMap[qKey] && (
                              questionCorrectMap[qKey]
                                ? <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-black">Correct</span>
                                : <span className="px-2 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black flex items-center gap-1"><span className="x-pop">❌</span> Incorrect</span>
                            )}
                          </div>
                        </div>

                        <QuestionInput 
                          question={q}
                          value={userAnswers[qKey] || ''}
                          onChange={(val) => {
                            setAnswer(qKey, val);
                            setQuestionEvaluatedMap((prev) => ({ ...prev, [qKey]: false }));
                            setQuestionCorrectMap((prev) => ({ ...prev, [qKey]: false }));
                            setCheckMessage(null);
                          }}
                          onLiveChange={(val) => { liveAnswersRef.current[qKey] = val; }}
                          onRegisterRef={(el) => { freeTextareaRefs.current[qKey] = el; }}
                        />

                        {q.hint && (
                          <div className="text-sm text-gray-500 font-semibold">Hint: {q.hint}</div>
                        )}

                        {checkMessage && (
                          <div className={`text-sm font-bold ${checkMessage.startsWith('✅') ? 'text-green-700' : checkMessage.startsWith('❌') ? 'text-rose-700' : 'text-gray-600'}`}>{checkMessage}</div>
                        )}

                        <div className="flex gap-3 pt-2">
                          {!questionCorrectMap[qKey] && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckMessage('Checking…');
                               // Capture current index to guard against async updates
                               const idxAtClick = currentQuestionIdx;
                               // Evaluate current question only
                               const uaRaw = (freeTextareaRefs.current[qKey]?.value ?? liveAnswersRef.current[qKey] ?? userAnswers[qKey] ?? '').trim();
                                const caRaw = (q.correct_answer || '').trim();
                                const ua = uaRaw.toUpperCase();
                                const ca = caRaw.toUpperCase();
                                const advanceIfSame = () =>
                                  setCurrentQuestionIdx((prev) => (prev === idxAtClick && prev < totalQuestions - 1 ? prev + 1 : prev));
                                let isCorrect = false;
                                const proceed = (ok: boolean, message?: string) => {
                                  setQuestionEvaluatedMap((prev) => ({ ...prev, [qKey]: true }));
                                  setQuestionCorrectMap((prev) => ({ ...prev, [qKey]: ok }));
                                  if (ok) {
                                    setCheckMessage(message || '✅ Correct!');
                                    setShowQuestionConfetti(true);
                                    setTimeout(() => setShowQuestionConfetti(false), 1000);
                                    // play sound and spawn confetti dots
                                    try {
                                      if (correctAudioRef.current) {
                                        correctAudioRef.current.currentTime = 0;
                                        correctAudioRef.current.play().catch(() => {});
                                      }
                                    } catch {}
                                    const dots = Array.from({ length: 24 }).map(() => ({
                                      x: Math.random() * window.innerWidth,
                                      y: Math.random() * window.innerHeight * 0.4,
                                      color: Math.random() > 0.5 ? '#22c55e' : '#f59e0b',
                                    }));
                                    setGlobalConfetti(dots);
                                    setTimeout(() => setGlobalConfetti([]), 1000);
                                  } else {
                                    setCheckMessage(message || '❌ Not quite. Try again!');
                                    try {
                                      if (wrongAudioRef.current) {
                                        wrongAudioRef.current.currentTime = 0;
                                        wrongAudioRef.current.play().catch(() => {});
                                      }
                                    } catch {}
                                  }
                                };

                                if (q.type === 'mcq') {
                                  isCorrect = ua !== '' && ca !== '' && ua === ca;
                                  proceed(isCorrect);
                                } else if (q.type === 'fill') {
                                  const normUa = uaRaw.toLowerCase();
                                  const normCa = caRaw.toLowerCase();
                                  isCorrect = normCa !== '' && (normUa === normCa || normUa.includes(normCa) || normCa.includes(normUa));
                                  proceed(isCorrect);
                                } else {
                                  // free text -> LLM check
                                  if (!uaRaw) {
                                    setCheckMessage('❌ Please enter an answer.');
                                    setQuestionEvaluatedMap((prev) => ({ ...prev, [qKey]: true }));
                                    setQuestionCorrectMap((prev) => ({ ...prev, [qKey]: false }));
                                    return;
                                  }
                                  setCheckingFree(true);
                                  checkFree({ question: q, user_answer: uaRaw })
                                    .then((res: FreeCheckResponse) => {
                                      proceed(!!res.correct, res.correct ? '✅ Nice!' : res.feedback || '❌ Try elaborating.');
                                    })
                                    .catch(() => proceed(false, '❌ Could not check answer. Try again.'))
                                    .finally(() => setCheckingFree(false));
                                }
                              }}
                              className={`flex-1 text-white font-black py-4 rounded-2xl transition-colors shadow-md disabled:opacity-50 ${
                                checkMessage && checkMessage.startsWith('❌') ? 'bg-rose-500 hover:bg-rose-600' : 'bg-sky-600 hover:bg-sky-700'
                              }`}
                              disabled={checkingFree}
                            >
                              {checkingFree ? 'CHECKING…' : 'CHECK'}
                            </button>
                          )}

                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              const idxAtClick = currentQuestionIdx;
                              // Only allow next if this question is marked correct via CHECK
                              if (questionCorrectMap[qKey]) {
                                setCheckMessage(null);
                                setCurrentQuestionIdx((prev) => (prev === idxAtClick && prev < totalQuestions - 1 ? prev + 1 : prev));
                              } else {
                                setCheckMessage('❌ Please check your answer first.');
                              }
                            }}
                            disabled={currentQuestionIdx >= totalQuestions - 1 || checkingFree || !questionCorrectMap[qKey]}
                            className={`${questionCorrectMap[qKey] ? 'w-full bg-green-600 text-white text-xl py-5' : 'px-6 bg-gray-100 text-gray-700'} font-bold rounded-2xl border-2 border-gray-200 hover:bg-gray-200 disabled:opacity-50`}
                          >
                            NEXT
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {currentQuestionIdx === totalQuestions - 1 && (
                  <button
                    onClick={submitQuiz}
                      disabled={!generatedLesson || answeredCount < totalQuestions || isSubmitting}
                      type="button"
                      className="mt-6 w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-black text-xl py-5 rounded-2xl hover:from-green-600 hover:to-green-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed confetti"
                  >
                      {isSubmitting ? 'CHECKING...' : 'FINISH' }
                  </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen className="w-20 h-20 mx-auto mb-4 opacity-30" />
                  <p className="font-semibold">Content coming soon!</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              {generatedLesson?.questions.map((q, qIndex) => {
                const detail = evaluation.details.find((d) => d.question_id === q.id);
                const isCorrect = !!detail?.correct;
                const userAns = userAnswers[q.id] || '';
                const correctAns = detail?.correct_answer || '';
                const correctText = q.type === 'mcq'
                  ? (q.options || []).find((o) => o.id === correctAns)?.text || correctAns
                  : correctAns;
                const userText = q.type === 'mcq'
                  ? (q.options || []).find((o) => o.id === userAns)?.text || userAns
                  : userAns;

                return (
                  <div key={`${q.id}-${qIndex}`} className="mb-8 text-left">
                    <div className={`p-6 rounded-2xl ${isCorrect ? 'bg-green-50 border-2 border-green-400' : 'bg-red-50 border-2 border-red-400'}`}>
                    <div className="flex items-start gap-3 mb-3">
                        {isCorrect ? (
                        <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                      ) : (
                        <X className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div>
                          <p className="font-bold text-gray-800 text-lg mb-2">{q.prompt}</p>
                          {!isCorrect && (
                          <div className="space-y-2">
                              <p className="text-red-700 font-semibold">Your answer: {userText || '—'}</p>
                              <p className="text-green-700 font-semibold">Correct answer: {correctText || '—'}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-lg ml-11">
                        <p className="text-blue-800 font-semibold text-sm">💡 {detail?.explanation || q.explanation}</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl p-8 text-white shadow-xl mt-8">
                <div className="text-7xl mb-4">🎉</div>
                <h3 className="text-3xl font-black mb-2">Awesome!</h3>
                <p className="text-xl font-bold mb-6">+{lessons.find((l) => l.id === selectedLesson)?.xp || 0} XP</p>
                <button
                  onClick={() => {
                    setSelectedLesson(null);
                    setGeneratedLesson(null);
                    setUserAnswers({});
                    setEvaluation(null);
                  }}
                  type="button"
                  className="bg-white text-amber-600 font-black px-8 py-4 rounded-2xl hover:bg-amber-50 transition-all shadow-lg text-lg"
                >
                  CONTINUE
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Exit Button */}
        <button
          onClick={() => {
            setSelectedLesson(null);
            setGeneratedLesson(null);
            setUserAnswers({});
            setEvaluation(null);
          }}
          type="button"
          className="mt-6 w-full py-4 text-gray-600 hover:text-gray-800 font-bold text-lg"
        >
          EXIT
        </button>
      </div>
    );
  };

  // Show loading state while checking authentication
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💰</div>
          <div className="text-2xl font-bold text-gray-700">Loading Moneta...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Audio elements */}
      <audio ref={correctAudioRef} src="/success.mp3" preload="auto" />
      <audio ref={wrongAudioRef} src="/wrong.mp3" preload="auto" />

      {/* Full-screen confetti overlay */}
      {globalConfetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-40">
          {globalConfetti.map((c, idx) => (
            <div key={idx} className="confetti-dot" style={{ left: c.x, top: c.y, backgroundColor: c.color }} />
          ))}
        </div>
      )}

      {/* Header - Duolingo Style */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600">
                💰 Moneta
              </div>
              {userData && (
                <div className="text-sm font-semibold text-gray-600">
                  Welcome, {userData.display_name || userData.username}!
                </div>
              )}
              {isMounted && isGuest && (
                <div className="text-sm font-semibold text-gray-500">
                  (Guest Mode - Progress won&apos;t save)
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-xl border-2 border-orange-200">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-black text-orange-700">{userProgress.streak}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-100 px-4 py-2 rounded-xl border-2 border-amber-200">
                <Zap className="w-5 h-5 text-amber-600" />
                <span className="font-black text-amber-700">{userProgress.xp}</span>
              </div>
              <button
                onClick={handleLogout}
                className="ml-2 px-4 py-2 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {selectedLesson !== null ? <LessonView /> : <DashboardView />}
      </main>

      {/* AI Coach Floating Button - Duolingo Style */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        type="button"
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-2xl hover:shadow-blue-300 transition-all hover:scale-110 flex items-center justify-center border-4 border-white"
      >
        <MessageCircle className="w-7 h-7" />
      </button>

      {/* Chat Window - Duolingo Style */}
      {chatOpen && (
        <div className="fixed bottom-28 right-8 w-96 bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-200">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-2xl">
                🤖
              </div>
              <h3 className="font-black text-lg">Finance Coach</h3>
            </div>
            <button 
              onClick={() => setChatOpen(false)} 
              type="button"
              className="hover:bg-white/20 rounded-full p-2 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="h-96 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-blue-50 to-white">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-4 rounded-2xl font-semibold shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-sm' 
                    : 'bg-white text-gray-800 rounded-bl-sm border-2 border-gray-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex justify-start">
                <div className="max-w-[75%] p-4 rounded-2xl font-semibold shadow-md bg-white text-gray-800 rounded-bl-sm border-2 border-gray-100 flex items-center gap-1">
                  <span className="sr-only">Typing</span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full anim-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full anim-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full anim-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t-2 border-gray-100 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask me anything..."
                className="flex-1 border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-semibold text-gray-900 placeholder-gray-400 bg-white"
              />
              <button
                onClick={handleSendMessage}
                disabled={loadingChat}
                type="button"
                className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-all shadow-md disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="text-9xl animate-bounce">🎉</div>
        </div>
      )}
    </div>
  );
};

// Simple micro-simulation widget
const MicroSimulation = () => {
  const [amount, setAmount] = React.useState<number>(50);
  const [years, setYears] = React.useState<number>(5);
  const [rate, setRate] = React.useState<number>(8);

  const monthlyRate = rate / 100 / 12;
  const months = years * 12;
  const future = amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-gray-100">
      <h3 className="text-xl font-black text-gray-800 mb-4">What if you save monthly?</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Monthly Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value) || 0)}
            className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-gray-900"
            min={0}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Years</label>
          <input
            type="number"
            value={years}
            onChange={(e) => setYears(Number(e.target.value) || 0)}
            className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-gray-900"
            min={0}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 mb-1">Annual Return %</label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 0)}
            className="w-full border-2 border-gray-300 rounded-xl px-3 py-2 text-gray-900"
            min={0}
          />
        </div>
      </div>
      <div className="bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 font-bold text-blue-800">
        If you save ${amount}/mo for {years} years at {rate}%: ≈ ${future.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
    </div>
  );
};

export default MonetaPlatform;
