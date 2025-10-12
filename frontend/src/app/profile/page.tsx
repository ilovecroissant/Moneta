"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Zap, Flame, Trophy, Users, TrendingUp, LogOut } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getDailyXPHistory, calculateLevel, getProgress, getFriendsCount, type DailyXPHistory, type DailyXPDataPoint } from '@/lib/api';

interface UserData {
  id: number;
  username: string;
  display_name?: string;
  email: string;
}

interface UserProgress {
  xp: number;
  streak: number;
  level: number;
  friends_count?: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    xp: 0,
    streak: 0,
    level: 1,
    friends_count: 0,
  });
  const [xpHistory, setXPHistory] = useState<DailyXPHistory | null>(null);
  const [days, setDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user data from localStorage
    const storedUser = localStorage.getItem('userData');
    
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);

      // Fetch user progress from backend
      fetchUserProgress(user.username, user.id);

      // Fetch XP history
      fetchXPHistory(user.username, days);
    } else {
      router.push('/');
    }
  }, [router, days]);

  const fetchUserProgress = async (username: string, userId: number) => {
    try {
      const progress = await getProgress(username);
      
      // Also fetch friends count
      let friendsCount = 0;
      try {
        friendsCount = await getFriendsCount(userId);
      } catch (error) {
        console.error('Failed to fetch friends count:', error);
      }
      
      setUserProgress({
        xp: progress.xp,
        streak: progress.streak,
        level: calculateLevel(progress.xp),
        friends_count: friendsCount,
      });
    } catch (error) {
      console.error('Failed to fetch user progress:', error);
    }
  };

  const fetchXPHistory = async (username: string, numDays: number) => {
    try {
      const history = await getDailyXPHistory(username, numDays);
      setXPHistory(history);
    } catch (error) {
      console.error('Failed to fetch XP history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = () => {
    if (!xpHistory) return [];
    
    return xpHistory.data.map((point: DailyXPDataPoint) => ({
      time: new Date(point.timestamp).toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: 'numeric',
        hour12: true 
      }),
      xp: point.xp,
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isGuest');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b-2 border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transform transition-all hover:scale-110 flex items-center justify-center"
                title="Back to Home"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600">
                Profile
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* User Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* XP Card */}
          <div className="duo-card p-6 anim-card-lift">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-8 h-8 text-amber-500" />
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Total XP</div>
            </div>
            <div className="text-4xl font-black text-amber-600">{userProgress.xp}</div>
            <div className="text-xs text-gray-500 mt-1">Level {userProgress.level}</div>
          </div>

          {/* Streak Card */}
          <div className="duo-card p-6 anim-card-lift">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="w-8 h-8 text-orange-500" />
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Streak</div>
            </div>
            <div className="text-4xl font-black text-orange-600">{userProgress.streak}</div>
            <div className="text-xs text-gray-500 mt-1">day{userProgress.streak !== 1 ? 's' : ''} active</div>
          </div>

          {/* Achievements Card */}
          <div className="duo-card p-6 anim-card-lift">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Achievements</div>
            </div>
            <div className="text-4xl font-black text-yellow-600">
              {Math.floor(userProgress.xp / 100)}
            </div>
            <div className="text-xs text-gray-500 mt-1">badges earned</div>
          </div>

          {/* Friends Card */}
          <button
            onClick={() => router.push('/friends')}
            className="duo-card p-6 anim-card-lift text-left hover:scale-105"
          >
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-purple-500" />
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Friends</div>
            </div>
            <div className="text-4xl font-black text-purple-600">{userProgress.friends_count || 0}</div>
            <div className="text-xs text-gray-500 mt-1">view friends →</div>
          </button>
        </div>

        {/* XP Chart */}
        <div className="duo-card p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200">
                XP Progress
              </h2>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setDays(1)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  days === 1
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                1 Day
              </button>
              <button
                onClick={() => setDays(7)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  days === 7
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setDays(30)}
                className={`px-4 py-2 rounded-xl font-bold transition-all ${
                  days === 30
                    ? 'bg-green-500 text-white shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                30 Days
              </button>
            </div>
          </div>

          {/* Chart */}
          {xpHistory && xpHistory.data.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      fontWeight: 700,
                    }}
                    labelStyle={{ color: '#374151', fontWeight: 800 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="xp" 
                    stroke="#58cc02" 
                    strokeWidth={3}
                    dot={{ fill: '#58cc02', strokeWidth: 2, r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="text-center mt-4 text-sm font-bold text-gray-600 dark:text-gray-400">
                Total XP in period: {xpHistory.total_xp}
              </div>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="font-bold">No XP data yet</p>
                <p className="text-sm">Complete lessons to see your progress!</p>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        <div className="duo-card p-8">
          <h2 className="text-2xl font-black text-gray-800 dark:text-gray-200 mb-6">
            Account Information
          </h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Username</div>
              <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                {userData?.username}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Display Name</div>
              <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                {userData?.display_name || 'Not set'}
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-gray-600 dark:text-gray-400">Email</div>
              <div className="text-lg font-black text-gray-800 dark:text-gray-200">
                {userData?.email}
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transform transition-all hover:scale-105 border-b-4 border-red-700 flex items-center justify-center gap-3"
              style={{ boxShadow: '0 4px 0 #b91c1c, 0 6px 12px rgba(220, 38, 38, 0.4)' }}
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
