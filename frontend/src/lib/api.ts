const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ChoiceOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: 'mcq' | 'fill' | 'free';
  prompt: string;
  options?: ChoiceOption[];
  correct_answer?: string;
  hint?: string;
  explanation?: string;
}

export interface Lesson {
  title: string;
  category: string;
  level: number;
  questions: Question[];
}

export type { Lesson as ApiLesson };

export interface EvaluateResponse {
  score: number;
  correct_count: number;
  total: number;
  details: Array<{
    question_id: string;
    correct: boolean;
    correct_answer?: string;
    explanation?: string;
  }>;
  recommendation: string;
}

export interface FreeCheckResponse {
  correct: boolean;
  feedback?: string;
}

export interface ProgressResponse {
  xp: number;
  streak: number;
  unlocked: string[];
  completed_lessons: number[];
  daily_xp: number;
  unlocked_achievements: string[];
  perfect_scores: number;
}

// Chat API
export async function chat(params: { message: string; context?: string }): Promise<{ answer: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: params.message,
        context: params.context || null 
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data; // Returns { answer: string }
  } catch (error) {
    console.error('Chat API error:', error);
    throw error;
  }
}

// Generate Lesson API
export async function generateLesson(params: {
  category: string;
  level: number;
  num_questions: number;
  difficulty: string;
}): Promise<{ lesson: Lesson; cached: boolean }> {
  try {
    const response = await fetch(`${API_BASE_URL}/lessons/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        category: params.category,
        level: params.level,
        num_questions: params.num_questions,
        difficulty: params.difficulty,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Generate lesson API error:', error);
    throw error;
  }
}

// Evaluate Answers API
export async function evaluateAnswers(params: {
  lesson: Lesson;
  answers: Array<{ question_id: string; user_answer: string }>;
}): Promise<EvaluateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/lessons/evaluate_answers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lesson: params.lesson,
        answers: params.answers,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Evaluate answers API error:', error);
    throw error;
  }
}

// Check Free Response API
export async function checkFree(params: { 
  question: any; 
  user_answer: string 
}): Promise<FreeCheckResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/lessons/check_free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: params.question,
        user_answer: params.user_answer,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Check free API error:', error);
    throw error;
  }
}

// Get Progress from backend
export async function getProgress(handle: string): Promise<ProgressResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${handle}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ProgressResponse;
  } catch (error) {
    console.error('Get progress API error:', error);
    // Return default if backend fails
    return { xp: 0, streak: 0, unlocked: [], completed_lessons: [], daily_xp: 0, unlocked_achievements: [], perfect_scores: 0 };
  }
}

// Set Progress to backend
export async function setProgress(handle: string, update: { 
  xp?: number; 
  streak?: number; 
  completed_lessons?: number[];
  unlocked_achievements?: string[];
  perfect_scores?: number;
}): Promise<ProgressResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${handle}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as ProgressResponse;
  } catch (error) {
    console.error('Set progress API error:', error);
    throw error;
  }
}

// Calculate level from XP
export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

// Calculate XP needed for next level
export function xpForNextLevel(level: number): number {
  return level * 100;
}

// Get XP progress percentage for current level
export function getLevelProgress(xp: number): number {
  const level = calculateLevel(xp);
  const currentLevelXP = (level - 1) * 100;
  const xpInCurrentLevel = xp - currentLevelXP;
  const xpNeededForLevel = 100;
  return (xpInCurrentLevel / xpNeededForLevel) * 100;
}
