"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Trophy, Star, Flame, MessageCircle, Lock, CheckCircle, BookOpen, Send, X, Zap, User } from 'lucide-react';
import {
  chat as chatApi,
  generateLesson,
  evaluateAnswers,
  getProgress,
  setProgress,
  type Lesson as ApiLesson,
  type Question,
  type ChoiceOption,
  type EvaluateResponse,
  calculateLevel,
} from '@/lib/api';
import { checkFree, type FreeCheckResponse } from '@/lib/api';

const CATEGORY_MAP: Record<string, string> = {
  'Budgeting Basics': 'Budgeting & Saving Basics',
  'Credit & Debt': 'Credit & Debt',
  'Investing & Risk': 'Investing & Risk',
};

interface UserData {
  user_id: number;
  username: string;
  email: string;
  xp: number;
  streak: number;
}

// Achievement definitions
interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'category' | 'streak' | 'performance';
  requirement: {
    type: 'complete_lessons' | 'streak_days' | 'perfect_score';
    value: number | number[];
  };
}

const ACHIEVEMENTS: Achievement[] = [
  // Category Achievements
  {
    id: 'budget_master',
    title: 'Budget Master',
    description: 'Complete all Budgeting Basics lessons',
    icon: '🏆',
    type: 'category',
    requirement: { type: 'complete_lessons', value: [0, 1, 2] }
  },
  {
    id: 'credit_expert',
    title: 'Credit Expert',
    description: 'Complete all Credit & Debt lessons',
    icon: '💎',
    type: 'category',
    requirement: { type: 'complete_lessons', value: [3, 4, 5] }
  },
  {
    id: 'investment_guru',
    title: 'Investment Guru',
    description: 'Complete all Investing & Risk lessons',
    icon: '📈',
    type: 'category',
    requirement: { type: 'complete_lessons', value: [6, 7] }
  },
  
  // Streak Achievements
  {
    id: 'streak_3',
    title: 'On Fire!',
    description: 'Maintain a 3-day streak',
    icon: '🔥',
    type: 'streak',
    requirement: { type: 'streak_days', value: 3 }
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '⚡',
    type: 'streak',
    requirement: { type: 'streak_days', value: 7 }
  },
  {
    id: 'streak_14',
    title: 'Fortnight Champion',
    description: 'Maintain a 14-day streak',
    icon: '🌟',
    type: 'streak',
    requirement: { type: 'streak_days', value: 14 }
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day streak',
    icon: '💫',
    type: 'streak',
    requirement: { type: 'streak_days', value: 30 }
  },
  {
    id: 'streak_60',
    title: 'Two Month Titan',
    description: 'Maintain a 60-day streak',
    icon: '🌠',
    type: 'streak',
    requirement: { type: 'streak_days', value: 60 }
  },
  {
    id: 'streak_100',
    title: 'Century Club',
    description: 'Maintain a 100-day streak',
    icon: '💯',
    type: 'streak',
    requirement: { type: 'streak_days', value: 100 }
  },
  {
    id: 'streak_365',
    title: 'Year Legend',
    description: 'Maintain a 365-day streak',
    icon: '👑',
    type: 'streak',
    requirement: { type: 'streak_days', value: 365 }
  },
  
  // Performance Achievements
  {
    id: 'flawless_lesson',
    title: 'Flawless Victory',
    description: 'Complete a lesson with 100% score',
    icon: '✨',
    type: 'performance',
    requirement: { type: 'perfect_score', value: 1 }
  },
  {
    id: 'flawless_5',
    title: 'Perfectionist',
    description: 'Complete 5 lessons with 100% score',
    icon: '🎯',
    type: 'performance',
    requirement: { type: 'perfect_score', value: 5 }
  }
];

// Question input component
const QuestionInput = ({ question, value, onChange, onLiveChange, onRegisterRef }: { 
  question: Question; 
  value: string; 
  onChange: (val: string) => void;
  onLiveChange?: (val: string) => void;
  onRegisterRef?: (el: HTMLTextAreaElement | null) => void;
}) => {
  const freeRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fillRef = React.useRef<HTMLInputElement | null>(null);

  if (question.type === 'mcq') {
    return (
      <div className="space-y-3">
        {(question.options || []).map((opt: ChoiceOption) => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            onMouseDown={(e) => e.preventDefault()}
            type="button"
            className={`w-full text-left p-5 rounded-2xl border-2 font-semibold text-lg transition-colors ${
              value === opt.id
                ? 'border-sky-500 bg-sky-50 dark:bg-sky-900 text-gray-900 dark:text-gray-100 shadow-lg'
                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
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
        ref={fillRef}
        type="text"
        defaultValue={value}
        onInput={(e) => {
          const val = (e.target as HTMLInputElement).value;
          onLiveChange && onLiveChange(val);
        }}
        onBlur={(e) => {
          const val = e.target.value;
          onChange(val);
        }}
        placeholder="Type your answer"
        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-4 font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
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
        className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-4 font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500"
        rows={4}
        autoComplete="off"
        spellCheck={false}
      />
    );
  }

  return null;
};

const MonetaPlatform = () => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
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
  const [isReviewMode, setIsReviewMode] = useState(false);

  // Auth check on mount
  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    const isGuestMode = localStorage.getItem('isGuest') === 'true';
    const savedUserData = localStorage.getItem('userData');
    
    // Redirect to login if not authenticated
    if (!authToken && !isGuestMode) {
      router.push('/login');
      return;
    }
    
    // Only set mounted if authenticated
    setIsMounted(true);
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
  const [firstAttemptWrong, setFirstAttemptWrong] = useState<Record<string, boolean>>({}); // Track questions wrong on first attempt
  const [showQuestionConfetti, setShowQuestionConfetti] = useState(false);
  const [globalConfetti, setGlobalConfetti] = useState<{ x: number; y: number; color: string }[]>([]);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);
  const [questionEvaluatedMap, setQuestionEvaluatedMap] = useState<Record<string, boolean>>({});

  // Get user handle from authenticated user data
  const handleId = userData?.username || 'demo';

  // User progress data (xp/streak from backend; daily xp from backend)
  const [userProgress, setUserProgress] = useState({
    xp: 0,
    level: 1,
    streak: 0,
    completedLessons: [] as number[],
    dailyGoal: 50,
    dailyProgress: 0,
    perfectScores: 0, // Track number of perfect scores
  });
  const [lastStreakDate, setLastStreakDate] = useState<string | null>(null);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [newStreakValue, setNewStreakValue] = useState(0);
  const [motivationalQuote, setMotivationalQuote] = useState('Keep it up! 🎯');
  
  // Achievements state
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [showAllAchievementsModal, setShowAllAchievementsModal] = useState(false);

  // Check if user has unlocked an achievement
  const checkAchievements = async (completedLessons: number[], streak: number, perfectScores: number) => {
    const newlyUnlocked: Achievement[] = [];
    
    ACHIEVEMENTS.forEach(achievement => {
      // Skip if already unlocked
      if (unlockedAchievements.includes(achievement.id)) return;
      
      let isUnlocked = false;
      
      if (achievement.requirement.type === 'complete_lessons') {
        const requiredLessons = achievement.requirement.value as number[];
        isUnlocked = requiredLessons.every(lessonId => completedLessons.includes(lessonId));
      } else if (achievement.requirement.type === 'streak_days') {
        isUnlocked = streak >= (achievement.requirement.value as number);
      } else if (achievement.requirement.type === 'perfect_score') {
        isUnlocked = perfectScores >= (achievement.requirement.value as number);
      }
      
      if (isUnlocked) {
        newlyUnlocked.push(achievement);
      }
    });
    
    // Show modal for newly unlocked achievements (one at a time)
    if (newlyUnlocked.length > 0) {
      const achievementIds = newlyUnlocked.map(a => a.id);
      const updatedAchievements = [...unlockedAchievements, ...achievementIds];
      setUnlockedAchievements(updatedAchievements);
      
      // Save to backend
      try {
        console.log('💾 Saving achievements to backend:', updatedAchievements);
        await setProgress(handleId, { 
          unlocked_achievements: updatedAchievements 
        });
        console.log('✅ Achievements saved to backend');
      } catch (err) {
        console.error('❌ Failed to save achievements:', err);
      }
      
      // Show the first new achievement
      setNewAchievement(newlyUnlocked[0]);
      setShowAchievementModal(true);
    }
  };

  // Check if we should increment streak for today (once per calendar day)
  const maybeIncrementStreakForToday = () => {
    const today = new Date();
    const key = today.toISOString().slice(0, 10); // YYYY-MM-DD
    
    // Already completed a lesson today, don't increment
    if (lastStreakDate === key) {
      return { shouldIncrement: false, streak: userProgress.streak, dateKey: key };
    }
    
    // New day! Increment streak
    const updatedStreak = userProgress.streak + 1;
    // Store per-user to prevent cross-user contamination
    const storageKey = `moneta_last_streak_date_${handleId}`;
    try { localStorage.setItem(storageKey, key); } catch (_) {}
    setLastStreakDate(key);
    return { shouldIncrement: true, streak: updatedStreak, dateKey: key };
  };

  useEffect(() => {
    // Skip loading progress for guest users
    if (!userData?.username || isGuest) return;
    
    (async () => {
      try {
        console.log('📥 Loading progress for user:', handleId);
        const p = await getProgress(handleId);
        console.log('📦 Received progress from backend:', p);
        
        const completedFromBackend = Array.isArray(p.completed_lessons) ? p.completed_lessons : [];
        let inferredCompleted: number[] = completedFromBackend;
        if (completedFromBackend.length === 0 && typeof p.xp === 'number' && p.xp > 0) {
          let remainingXp = p.xp;
          const calc: number[] = [];
          for (const l of lessons) {
            if (remainingXp >= l.xp) {
              calc.push(l.id);
              remainingXp -= l.xp;
            } else {
              break;
            }
          }
          inferredCompleted = calc;
          console.log('🔍 Inferred completed lessons from XP:', inferredCompleted);
        }

        // Load achievements from backend
        const achievementsFromBackend = Array.isArray(p.unlocked_achievements) ? p.unlocked_achievements : [];
        setUnlockedAchievements(achievementsFromBackend);
        console.log('🏆 Loaded achievements from backend:', achievementsFromBackend);

        const updatedProgress = {
          ...userProgress,
          xp: p.xp,
          level: calculateLevel(p.xp),
          streak: p.streak,
          completedLessons: inferredCompleted,
          dailyProgress: p.daily_xp || 0,
          perfectScores: p.perfect_scores || 0,
        };
        setUserProgress(updatedProgress);
        
        // If backend has no completed lessons but we inferred some, persist them
        if ((p.completed_lessons?.length || 0) === 0 && inferredCompleted.length > 0) {
          console.log('💾 Backend has no completed lessons, saving inferred ones:', inferredCompleted);
          try {
            const saved = await setProgress(handleId, { xp: p.xp, streak: p.streak, completed_lessons: inferredCompleted });
            console.log('✅ Saved inferred lessons:', saved);
          } catch (err) {
            console.error('❌ Failed to save inferred lessons:', err);
          }
        }
      } catch (e) {
        console.error('❌ Failed to load progress:', e);
        // best-effort: keep defaults when backend not available
      }
      try {
        // Use per-user localStorage key to prevent cross-user contamination
        const storageKey = `moneta_last_streak_date_${handleId}`;
        const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (saved) setLastStreakDate(saved);
        
        // Clean up old global key (migration)
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('moneta_last_streak_date');
          } catch (_) {}
        }
      } catch (_) {}
    })();
  }, [userData?.username, handleId]); // Re-run when user changes

  // Rotate motivational quotes every 5 seconds (only when not in a lesson)
  // Using static quotes to avoid API quota issues
  useEffect(() => {
    // Don't update quotes while user is in a lesson to avoid disrupting their focus
    if (selectedLesson !== null) {
      return;
    }

    const staticQuotes = [
      "Save today, enjoy tomorrow! 💰",
      "Small savings add up to big dreams! ✨",
      "Your credit score opens doors! 🚪",
      "Budget smart, live better! 📊",
      "Invest in your future self! 🌟",
      "Every penny counts! 💵",
      "Build wealth, one step at a time! 🎯",
      "Smart spending leads to big savings! 🧠",
      "Your financial goals are within reach! 🎉",
      "Start saving now, thank yourself later! 🙏",
      "Track your spending, know your money! 📱",
      "Financial freedom starts with a plan! 🗺️",
      "Save first, spend what's left! 💎",
      "Compound interest is your best friend! 📈",
      "Budget today, freedom tomorrow! 🦅",
    ];

    const rotateQuote = () => {
      const randomQuote = staticQuotes[Math.floor(Math.random() * staticQuotes.length)];
      setMotivationalQuote(randomQuote);
    };

    // Set initial quote
    rotateQuote();

    // Set up interval to rotate quotes
    const interval = setInterval(rotateQuote, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [selectedLesson]); // Re-run when selectedLesson changes

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

  // Cumulative unlock XP per lesson: each lesson unlocks when total earned XP
  // reaches the sum of XP of all prior lessons
  const lessonUnlockXPById = useMemo(() => {
    let cumulative = 0;
    const map = new Map<number, number>();
    for (const l of lessons) {
      map.set(l.id, cumulative);
      cumulative += l.xp;
    }
    return map;
  }, [lessons]);

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
    if (!node) return;
    const unlockXp = lessonUnlockXPById.get(node.id) || 0;
    if (userProgress.xp < unlockXp) return;
    setSelectedLesson(lessonId);
    setGeneratedLesson(null);
    setUserAnswers({});
    setEvaluation(null);
    setCurrentQuestionIdx(0);
    setQuestionEvaluatedMap({});
    setQuestionCorrectMap({});
    setFirstAttemptWrong({});
    setLoadingLesson(true);
    setIsReviewMode(false);
    
    try {
      // Check if there are cached questions for this lesson (questions they got wrong)
      const cacheKey = `moneta_incorrect_questions_${handleId}_lesson_${lessonId}`;
      const cachedQuestionsStr = localStorage.getItem(cacheKey);
      
      if (cachedQuestionsStr) {
        try {
          const cachedLesson = JSON.parse(cachedQuestionsStr);
          console.log('📚 Using cached questions for review (previously incorrect)');
          setGeneratedLesson(cachedLesson);
          setIsReviewMode(true);
          setLoadingLesson(false);
          // Reset state maps to ensure clean slate for review mode
          setQuestionEvaluatedMap({});
          setQuestionCorrectMap({});
          setFirstAttemptWrong({});
          return;
        } catch (parseError) {
          console.error('Failed to parse cached questions:', parseError);
          localStorage.removeItem(cacheKey);
        }
      }
      
      // No cached questions, generate fresh ones
      console.log('🆕 Generating fresh questions (no cached incorrect questions found)');
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
        answers: generatedLesson.questions.map((q, idx) => {
          const key = q.id || `q-${idx}`;
          // Use liveAnswersRef as fallback to catch unsaved changes
          const answer = userAnswers[key] || liveAnswersRef.current[key] || '';
          return {
            question_id: q.id,
            user_answer: answer,
          };
        }),
      });
      setEvaluation(resp);

      // Handle question caching based on FIRST ATTEMPT correctness
      const node = lessons.find((l) => l.id === selectedLesson);
      if (node && generatedLesson) {
        const cacheKey = `moneta_incorrect_questions_${handleId}_lesson_${node.id}`;
        
        // Identify questions that were wrong on the FIRST attempt
        const incorrectQuestions = generatedLesson.questions.filter((q, idx) => {
          const qKey = q.id || `q-${idx}`;
          return firstAttemptWrong[qKey] === true;
        });

        if (incorrectQuestions.length > 0) {
          // Cache only the questions they got wrong on first attempt for future review
          const reviewLesson = {
            ...generatedLesson,
            questions: incorrectQuestions
          };
          localStorage.setItem(cacheKey, JSON.stringify(reviewLesson));
          console.log(`💾 Cached ${incorrectQuestions.length} questions from first attempts for review`);
        } else {
          // All answers correct on first try! Clear any cached questions
          localStorage.removeItem(cacheKey);
          console.log('✅ All answers correct on first attempt! Cleared cached questions.');
        }
      }

      // Award XP if passed
      if (node && resp.score >= 0.6) {
        const newXp = userProgress.xp + node.xp;
        const updatedCompleted = userProgress.completedLessons.includes(node.id)
          ? userProgress.completedLessons
          : [...userProgress.completedLessons, node.id];
        
        // Check if this is a perfect score (100%)
        const isPerfectScore = resp.score === 1.0;
        const newPerfectScores = isPerfectScore ? userProgress.perfectScores + 1 : userProgress.perfectScores;
        
        // Check if we should increment streak
        const streakResult = maybeIncrementStreakForToday();
        const finalStreak = streakResult.streak;
        
        // Persist xp/streak, completed lessons, and perfect scores to backend
        let savedDailyXp = userProgress.dailyProgress + node.xp;
        const progressUpdate = { 
          xp: newXp, 
          streak: finalStreak, 
          completed_lessons: updatedCompleted,
          perfect_scores: newPerfectScores
        };
        
        console.log('💾 Saving progress:', progressUpdate);
        try {
          const saved = await setProgress(handleId, progressUpdate);
          console.log('✅ Progress saved successfully:', saved);
          if (typeof saved?.daily_xp === 'number') savedDailyXp = saved.daily_xp;
        } catch (err) {
          console.error('❌ Failed to save progress:', err);
        }
        
        setUserProgress((prev) => ({
          ...prev,
          xp: newXp,
          level: calculateLevel(newXp),
          streak: finalStreak,
          completedLessons: updatedCompleted,
          dailyProgress: savedDailyXp,
          perfectScores: newPerfectScores,
        }));
        
        // Check for newly unlocked achievements
        checkAchievements(updatedCompleted, finalStreak, newPerfectScores);
        
        // Show celebration
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
        
        // Show streak modal if streak was incremented
        if (streakResult.shouldIncrement) {
          setNewStreakValue(finalStreak);
          setShowStreakModal(true);
        }
      }
    } catch (e) {
      // ignore for MVP
    } finally {
      setIsSubmitting(false);
    }
  };

  const DashboardView = () => (
    <div className="space-y-8 relative">
      {/* Hero Section */}
      <div className="text-center py-8">
        <h2 className="text-4xl font-black text-gray-800 dark:text-gray-100 mb-2 transition-opacity duration-500">
          {motivationalQuote}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 text-lg">You&apos;re on a {userProgress.streak} day streak!</p>
      </div>

      {/* Daily Goal Progress */}
      <div className="duo-card p-6 anim-card-lift">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-800 dark:text-gray-100">Daily Goal</span>
          </div>
          <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
            {userProgress.dailyProgress}/{userProgress.dailyGoal} XP
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((userProgress.dailyProgress / userProgress.dailyGoal) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-amber-400 to-amber-500 p-6 text-white anim-card-lift rounded-3xl border-4 border-amber-300 shadow-lg" style={{ boxShadow: '0 6px 0 #f59e0b, 0 10px 20px rgba(245, 158, 11, 0.4)' }}>
          <Flame className="w-10 h-10 mb-3 streak-flame" />
          <div className="text-3xl font-black mb-1 drop-shadow-md">{userProgress.streak}</div>
          <div className="text-white text-sm font-bold drop-shadow-sm">Day Streak</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white anim-card-lift rounded-3xl border-4 border-blue-400 shadow-lg" style={{ boxShadow: '0 6px 0 #2563eb, 0 10px 20px rgba(37, 99, 235, 0.4)' }}>
          <Zap className="w-10 h-10 mb-3 anim-float-delayed" />
          <div className="text-3xl font-black mb-1 drop-shadow-md">{userProgress.xp}</div>
          <div className="text-white text-sm font-bold drop-shadow-sm">Total XP</div>
        </div>
      </div>

      {/* Micro Simulation (removed) */}

      {/* Achievements */}
      <div className="duo-card p-6 anim-card-lift">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            Achievements ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </h3>
          <button
            onClick={() => setShowAllAchievementsModal(true)}
            className="text-sm font-bold text-sky-600 hover:text-sky-700 underline transition-colors"
          >
            See All
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.slice(0, 6).map(achievement => {
            const isUnlocked = unlockedAchievements.includes(achievement.id);
            return (
              <div 
                key={achievement.id}
                className={`text-center p-4 rounded-2xl border-2 transition-all ${
                  isUnlocked 
                    ? 'duo-card bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-200 anim-card-lift' 
                    : 'bg-gray-100 border-gray-200 opacity-60'
                }`}
              >
                <div className={`text-4xl mb-2 ${!isUnlocked && 'opacity-40 grayscale'}`}>
                  {achievement.icon}
                </div>
                <div className={`text-xs font-bold ${isUnlocked ? 'text-amber-700' : 'text-gray-400'}`}>
                  {achievement.title.split(' ').map((word, i) => (
                    <React.Fragment key={i}>
                      {word}
                      {i < achievement.title.split(' ').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {unlockedAchievements.length > 0 && (
          <div className="mt-4 text-center text-xs text-gray-600">
            <button 
              onClick={() => {
                alert(`Unlocked Achievements:\n\n${ACHIEVEMENTS.filter(a => unlockedAchievements.includes(a.id)).map(a => `${a.icon} ${a.title} - ${a.description}`).join('\n')}`);
              }}
              className="text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              
            </button>
          </div>
        )}
      </div>

      {/* Learning Path - Duolingo Style */}
      <div className="relative min-h-screen pb-20">
        <div className="relative">
          {(() => {
            const firstAccessibleIndex = lessons.findIndex((l) => {
              const completed = userProgress.completedLessons.includes(l.id);
              const unlockXp = lessonUnlockXPById.get(l.id) || 0;
              const meetsXp = userProgress.xp >= unlockXp;
              return !completed && meetsXp;
            });
            return lessons.map((lesson, index) => {
              const isCompleted = userProgress.completedLessons.includes(lesson.id);
              const requiredLevel = lesson.difficulty || 1; // still used for display/LLM level
              const unlockXp = lessonUnlockXPById.get(lesson.id) || 0;
              const meetsXp = userProgress.xp >= unlockXp;
              const isPrimaryNext = !isCompleted && meetsXp && index === firstAccessibleIndex;
              const isLocked = !isCompleted && !meetsXp;
              const isNext = isPrimaryNext;
              const neededXP = Math.max(0, unlockXp - userProgress.xp);
              
              return (
                <div
                  key={lesson.id}
                  className="relative mb-8"
                  style={{
                    marginLeft: `${lesson.position.x}%`,
                    transform: `translateX(-50%)`
                  }}
                >
                  <button
                    onClick={() => !isLocked && openLesson(lesson.id)}
                    type="button"
                    disabled={isLocked}
                    className={`lesson-node transform-3d ${
                      isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {/* Lesson Circle */}
                    <div className={`lesson-icon-3d relative w-20 h-20 rounded-full flex items-center justify-center text-4xl border-4 transition-all overflow-visible ${
                      isLocked
                        ? 'bg-gray-300 border-gray-400 lesson-icon-locked'
                        : isCompleted
                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600 lesson-icon-completed'
                        : isNext
                        ? 'bg-gradient-to-br ' + lesson.color + ' border-white lesson-icon-active anim-float'
                        : 'bg-white border-gray-300 lesson-icon-available'
                    }`}>
                      {/* Shine overlay */}
                      {!isLocked && <div className="lesson-shine"></div>}
                      
                      {/* Icon content */}
                      {isLocked ? (
                        <Lock className="w-8 h-8 text-gray-500 lesson-character" />
                      ) : isCompleted ? (
                        <CheckCircle className="w-10 h-10 text-white lesson-character" />
                      ) : (
                        <span className="lesson-character">{lesson.icon}</span>
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
                            {isCompleted ? 'Complete' : isLocked ? `Needs ${neededXP} XP` : 'Ready'}
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
            });
          })()}
        </div>
      </div>
    </div>
  );

  const LessonView = () => {
    // Hooks must be called before any early returns
    const [checkMessage, setCheckMessage] = useState<string | null>(null);
    const [checkingFree, setCheckingFree] = useState(false);
    const [showCheckAnimation, setShowCheckAnimation] = useState(false);
    
    const answeredCount = useMemo(() => {
      if (!generatedLesson) return 0;
      return generatedLesson.questions.filter((q, idx) => {
        const key = q.id || `q-${idx}`;
        return (userAnswers[key] || '').trim() !== '';
      }).length;
    }, [generatedLesson, userAnswers]);
    
    const node = lessons.find((l) => l.id === selectedLesson);
    if (!node) return null;

    const totalQuestions = generatedLesson?.questions.length || 0;

    const progressWidth = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-700 rounded-full h-4 mb-6 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
            style={{ width: `${progressWidth}%` }}
          />
        </div>

        <div className="duo-card p-8">
          {!evaluation ? (
            <>
              <div className="text-center mb-8">
                <div className="inline-block relative">
                  <div 
                    className="lesson-icon-3d lesson-icon-active w-32 h-32 rounded-full flex items-center justify-center text-6xl border-6 border-white bg-gradient-to-br from-green-400 to-green-500 mb-4"
                    style={{ 
                      boxShadow: '0 8px 0 #22c55e, 0 12px 30px rgba(34, 197, 94, 0.4), 0 0 40px rgba(88, 204, 2, 0.3), inset 0 -4px 8px rgba(0, 0, 0, 0.2), inset 0 4px 8px rgba(255, 255, 255, 0.4)' 
                    }}
                  >
                    <div className="lesson-shine"></div>
                    <span className="lesson-character anim-float">{node.icon}</span>
                  </div>
                </div>
                <h2 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">{generatedLesson?.title || node.title}</h2>
                <p className="text-gray-600 dark:text-gray-300 font-semibold">{generatedLesson?.category || node.category}</p>
                
                {/* Review Mode Banner */}
                {isReviewMode && (
                  <div className="mt-4 bg-orange-100 dark:bg-orange-900 border-2 border-orange-400 dark:border-orange-600 rounded-xl px-4 py-3 flex items-center gap-3 anim-pop-in">
                    <span className="text-2xl">🔄</span>
                    <div className="text-left">
                      <div className="font-black text-orange-800 dark:text-orange-200">Review Mode</div>
                      <div className="text-sm text-orange-700 dark:text-orange-300">
                        These are questions you missed previously. Master them to get fresh questions!
                      </div>
                    </div>
                  </div>
                )}
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
                    const qKey = q.id || `q-${currentQuestionIdx}`;
                    if (!q) return null;
                    return (
                      <div key={`${qKey}-${currentQuestionIdx}`} className={`space-y-4 relative ${showCheckAnimation ? 'anim-bounce-in' : ''}`}>
                        {showQuestionConfetti && (
                          <div className="absolute inset-0 pointer-events-none flex items-start justify-end p-4">
                            <div className="confetti"></div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 leading-snug">{q.prompt}</h3>
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
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                // Prevent multiple clicks while already checking
                                if (checkingFree) return;
                                
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
                                  // Track if this is the first attempt and it's wrong
                                  if (!ok && !questionCorrectMap[qKey] && !firstAttemptWrong[qKey]) {
                                    setFirstAttemptWrong((prev) => ({ ...prev, [qKey]: true }));
                                  }
                                  
                                  // Batch all state updates together
                                  setQuestionEvaluatedMap((prev) => ({ ...prev, [qKey]: true }));
                                  setQuestionCorrectMap((prev) => ({ ...prev, [qKey]: ok }));
                                  setCheckMessage(message || (ok ? '✅ Correct!' : '❌ Not quite. Try again!'));
                                  
                                  // Trigger bounce animation once
                                  setShowCheckAnimation(true);
                                  setTimeout(() => setShowCheckAnimation(false), 600);
                                  
                                  if (ok) {
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
                                    return;
                                  }
                                  setCheckingFree(true);
                                  checkFree({ question: q, user_answer: uaRaw })
                                    .then((res: FreeCheckResponse) => {
                                      // Record the answer after the check completes to avoid pre-check re-render quirks
                                      setAnswer(qKey, uaRaw);
                                      proceed(!!res.correct, res.correct ? '✅ Nice!' : res.feedback || '❌ Try elaborating.');
                                    })
                                    .catch((error) => {
                                      setAnswer(qKey, uaRaw);
                                      const errorMsg = error?.message || '';
                                      if (errorMsg.includes('quota') || errorMsg.includes('429')) {
                                        proceed(false, '⏳ API limit reached. Please wait a moment and try again.');
                                      } else {
                                        proceed(false, '❌ Could not check answer. Try again.');
                                      }
                                    })
                                    .finally(() => {
                                      setCheckingFree(false);
                                    });
                                }
                              }}
                              className={`duo-btn flex-1 py-4 disabled:opacity-50 ${
                                checkMessage && checkMessage.startsWith('❌') ? 'bg-red-500 border-red-700' : ''
                              }`}
                              style={checkMessage && checkMessage.startsWith('❌') ? {
                                background: 'var(--duolingo-red)',
                                borderBottom: '4px solid #cc3030',
                                boxShadow: '0 4px 0 #cc3030'
                              } : {}}
                              disabled={checkingFree}
                            >
                              {checkingFree ? 'CHECKING…' : 'CHECK'}
                            </button>
                          )}

                          {questionCorrectMap[qKey] && currentQuestionIdx < totalQuestions - 1 && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                const idxAtClick = currentQuestionIdx;
                                setCheckMessage(null);
                                setCurrentQuestionIdx((prev) => (prev === idxAtClick && prev < totalQuestions - 1 ? prev + 1 : prev));
                              }}
                              className="duo-btn w-full text-xl py-5"
                            >
                              NEXT
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {currentQuestionIdx === totalQuestions - 1 && (() => {
                    // Check if all questions are marked correct
                    const allCorrect = generatedLesson?.questions.every((q, idx) => {
                      const key = q.id || `q-${idx}`;
                      return questionCorrectMap[key];
                    }) || false;
                    const canFinish = allCorrect || answeredCount >= totalQuestions;
                    return (
                      <button
                        onClick={submitQuiz}
                        disabled={!generatedLesson || !canFinish || isSubmitting || checkingFree}
                        type="button"
                        className="duo-btn btn-shimmer mt-6 w-full text-xl py-6 disabled:opacity-50 disabled:cursor-not-allowed confetti"
                      >
                        {isSubmitting ? 'CHECKING...' : 'FINISH' }
                      </button>
                    );
                  })()}
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
                const qKey = q.id || `q-${qIndex}`;
                const detail = evaluation.details.find((d) => d.question_id === q.id);
                const isCorrect = !!detail?.correct;
                const userAns = userAnswers[qKey] || '';
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
                <p className="text-xl font-bold mb-6">
                  Level {lessons.find((l) => l.id === selectedLesson)?.difficulty || 1}
                </p>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900">
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
      <header className="bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600">
                💰 Moneta
              </div>
              {isMounted && isGuest && (
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    (Guest Mode - Progress won&apos;t save)
                  </div>
                  <button
                    onClick={() => router.push('/login')}
                    className="bg-gradient-to-r from-green-500 to-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:from-green-600 hover:to-blue-700 transition-all border-b-4 border-blue-700 shadow-md"
                    style={{ boxShadow: '0 4px 0 #1d4ed8, 0 6px 12px rgba(37, 99, 235, 0.3)' }}
                  >
                    Create Account
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900 px-4 py-2 rounded-xl border-3 border-orange-300 dark:border-orange-700 shadow-md transform transition-all hover:scale-105" style={{ boxShadow: '0 4px 0 #fb923c, 0 6px 12px rgba(251, 146, 60, 0.3)' }}>
                <Flame className="w-5 h-5 text-orange-500 drop-shadow-sm" />
                <span className="font-black text-orange-700 dark:text-orange-100">{userProgress.streak}</span>
              </div>
              <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900 px-4 py-2 rounded-xl border-3 border-amber-300 dark:border-amber-700 shadow-md transform transition-all hover:scale-105" style={{ boxShadow: '0 4px 0 #fbbf24, 0 6px 12px rgba(251, 191, 36, 0.3)' }}>
                <Zap className="w-5 h-5 text-amber-600 drop-shadow-sm" />
                <span className="font-black text-amber-700 dark:text-amber-100">{userProgress.xp}</span>
              </div>
              <button
                onClick={() => router.push('/profile')}
                className="ml-2 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold rounded-full hover:from-blue-600 hover:to-purple-700 transform transition-all hover:scale-110 border-b-4 border-purple-700 flex items-center justify-center"
                style={{ boxShadow: '0 4px 0 #6b21a8, 0 6px 12px rgba(147, 51, 234, 0.4)' }}
                title="View Profile"
              >
                <User className="w-5 h-5" />
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
        <div className="fixed bottom-28 right-8 w-96 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white dark:bg-gray-200 rounded-full flex items-center justify-center text-2xl">
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
          
          <div className="h-96 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-4 rounded-2xl font-semibold shadow-md ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-sm' 
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm border-2 border-gray-100 dark:border-gray-600'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex justify-start">
                <div className="max-w-[75%] p-4 rounded-2xl font-semibold shadow-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm border-2 border-gray-100 dark:border-gray-600 flex items-center gap-1">
                  <span className="sr-only">Typing</span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full anim-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full anim-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-gray-400 rounded-full anim-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
          </div>
          
          <div className="border-t-2 border-gray-100 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
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
                className="flex-1 border-2 border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700"
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

      {/* Streak Celebration Modal */}
      {showStreakModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-3xl p-12 shadow-2xl max-w-md mx-4 text-center">
            {/* Animated Fire Emoji */}
            <div className="text-8xl mb-6 anim-fire-pulse">
              🔥
            </div>
            
            {/* Streak Text */}
            <h2 className="text-5xl font-black text-white mb-3">
              {newStreakValue} Day Streak!
            </h2>
            <p className="text-xl text-white/90 mb-8 font-semibold">
              Keep up the momentum!
            </p>
            
            {/* Commitment Button */}
            <button
              onClick={() => setShowStreakModal(false)}
              className="bg-white text-gray-900 font-black text-2xl py-4 px-12 rounded-2xl hover:scale-105 transition-transform shadow-xl"
            >
              I&apos;m Committed! 💪
            </button>
          </div>
        </div>
      )}

      {/* Achievement Unlocked Modal */}
      {showAchievementModal && newAchievement && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 rounded-3xl p-12 shadow-2xl max-w-md mx-4 text-center">
            {/* Trophy Icon - removed bounce animation */}
            <div className="text-8xl mb-6">
              {newAchievement.icon}
            </div>
            
            {/* Achievement Title */}
            <h2 className="text-4xl font-black text-white mb-3">
              Achievement Unlocked!
            </h2>
            <h3 className="text-3xl font-bold text-white/95 mb-2">
              {newAchievement.title}
            </h3>
            <p className="text-lg text-white/90 mb-8 font-semibold">
              {newAchievement.description}
            </p>
            
            {/* Close Button */}
            <button
              onClick={() => setShowAchievementModal(false)}
              className="bg-white text-gray-900 font-black text-2xl py-4 px-12 rounded-2xl hover:scale-105 transition-transform shadow-xl"
            >
              Awesome! 🎉
            </button>
          </div>
        </div>
      )}

      {/* All Achievements Modal */}
      {showAllAchievementsModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="w-8 h-8 text-white" />
                <h2 className="text-3xl font-black text-white">
                  All Achievements
                </h2>
              </div>
              <button
                onClick={() => setShowAllAchievementsModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="px-6 pt-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-gray-700">
                  Progress: {unlockedAchievements.length} / {ACHIEVEMENTS.length}
                </span>
                <span className="text-sm font-bold text-amber-600">
                  {Math.round((unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Achievements Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-3 gap-4">
                {ACHIEVEMENTS.map(achievement => {
                  const isUnlocked = unlockedAchievements.includes(achievement.id);
                  return (
                    <div 
                      key={achievement.id}
                      className={`relative p-5 rounded-2xl border-2 transition-all ${
                        isUnlocked 
                          ? 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300' 
                          : 'bg-gray-50 border-gray-200 opacity-70'
                      }`}
                    >
                      {/* Unlocked Badge */}
                      {isUnlocked && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                      )}

                      {/* Icon */}
                      <div className={`text-5xl mb-3 text-center ${!isUnlocked && 'opacity-40 grayscale'}`}>
                        {achievement.icon}
                      </div>

                      {/* Title */}
                      <div className={`text-sm font-black text-center mb-2 ${
                        isUnlocked ? 'text-amber-700' : 'text-gray-500'
                      }`}>
                        {achievement.title}
                      </div>

                      {/* Description */}
                      <div className={`text-xs text-center ${
                        isUnlocked ? 'text-gray-700' : 'text-gray-400'
                      }`}>
                        {achievement.description}
                      </div>

                      {/* Lock Overlay */}
                      {!isUnlocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10 rounded-2xl">
                          <Lock className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-gray-100 p-6 bg-gray-50">
              <button
                onClick={() => setShowAllAchievementsModal(false)}
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black text-lg py-4 rounded-2xl hover:scale-[1.02] transition-transform shadow-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MicroSimulation removed

export default MonetaPlatform;
