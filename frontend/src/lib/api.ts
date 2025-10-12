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

// Get motivational quote
export async function getMotivationalQuote(): Promise<string> {
  try {
    const response = await fetch(`${API_BASE_URL}/motivational-quote`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.quote;
  } catch (error) {
    console.error('Motivational quote API error:', error);
    // Return a fallback quote if the API fails
    return 'Keep learning, keep growing! 🎯';
  }
}

// === Friends API ===

export interface FriendUser {
  id: number;
  username: string;
  display_name: string;
  xp: number;
  streak: number;
}

export interface FriendRequest {
  request_id: number;
  from_user?: FriendUser;
  to_user?: FriendUser;
  created_at: string;
}

export interface Friend extends FriendUser {
  friends_since: string;
}

// Search for users
export async function searchUsers(query: string, currentUserId: number): Promise<FriendUser[]> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/friends/search?query=${encodeURIComponent(query)}&current_user_id=${currentUserId}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.users;
  } catch (error) {
    console.error('Search users API error:', error);
    throw error;
  }
}

// Send friend request
export async function sendFriendRequest(fromUserId: number, toUserId: number): Promise<{ message: string; request_id: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from_user_id: fromUserId, to_user_id: toUserId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage = typeof errorData.detail === 'string' 
        ? errorData.detail 
        : JSON.stringify(errorData.detail) || `HTTP error! status: ${response.status}`;
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('Send friend request API error:', error);
    throw error;
  }
}

// Get friend requests
export async function getFriendRequests(userId: number): Promise<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/requests/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get friend requests API error:', error);
    throw error;
  }
}

// Accept friend request
export async function acceptFriendRequest(requestId: number): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/accept`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Accept friend request API error:', error);
    throw error;
  }
}

// Reject friend request
export async function rejectFriendRequest(requestId: number): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/requests/${requestId}/reject`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Reject friend request API error:', error);
    throw error;
  }
}

// Get friends list
export async function getFriends(userId: number): Promise<Friend[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.friends;
  } catch (error) {
    console.error('Get friends API error:', error);
    throw error;
  }
}

// Get friends count
export async function getFriendsCount(userId: number): Promise<number> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/${userId}/count`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.count;
  } catch (error) {
    console.error('Get friends count API error:', error);
    throw error;
  }
}

// Remove friend
export async function removeFriend(userId: number, friendId: number): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/friends/${userId}?friend_id=${friendId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Remove friend API error:', error);
    throw error;
  }
}

// === Daily XP History API ===

export interface DailyXPDataPoint {
  timestamp: string;
  xp: number;
}

export interface DailyXPHistory {
  handle: string;
  data: DailyXPDataPoint[];
  total_xp: number;
}

// Get daily XP history
export async function getDailyXPHistory(handle: string, days: number = 7): Promise<DailyXPHistory> {
  try {
    const response = await fetch(`${API_BASE_URL}/progress/${handle}/daily-xp?days=${days}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Get daily XP history API error:', error);
    throw error;
  }
}
