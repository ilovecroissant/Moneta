"use client";

import React, { useState, useEffect } from 'react';
import { Trophy, Star, Flame, MessageCircle, Lock, CheckCircle, TrendingUp, DollarSign, CreditCard, PiggyBank, BookOpen, ChevronRight, Send, X, Award, BarChart3, Zap, Target } from 'lucide-react';

const FinLitPlatform = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Hi! I\'m your Finance Coach! Ask me anything about money, saving, investing, or any lesson topic. 💰' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // User progress data
  const [userProgress, setUserProgress] = useState({
    xp: 450,
    level: 3,
    streak: 7,
    completedLessons: [0, 1, 2, 3, 4, 5],
    dailyGoal: 50,
    dailyProgress: 30
  });

  // Lessons data structure with visual path
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
      questions: [
        {
          q: 'A budget helps you:',
          options: ['Track spending and saving', 'Get free money', 'Avoid taxes', 'Buy more stuff'],
          correct: 0,
          explanation: 'A budget is your money roadmap! It helps you see where your money goes and plan for your goals.'
        },
        {
          q: 'The 50/30/20 rule suggests spending ___% on needs.',
          options: ['20', '30', '50', '70'],
          correct: 2,
          explanation: 'The 50/30/20 rule means: 50% needs, 30% wants, 20% savings. It\'s a simple way to balance your money!'
        }
      ]
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
    
    const newMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
    
    setTimeout(() => {
      const aiResponse = { 
        role: 'ai', 
        text: 'Great question! A budget is like a game plan for your money. It helps you decide where you money goes before you spend it, so you can save for things you want and need. Think of it as leveling up your money skills! 🎯'
      };
      setChatMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleQuizAnswer = (questionIndex: number, answerIndex: number) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const submitQuiz = () => {
    setQuizSubmitted(true);
    const lesson = lessons.find(l => l.id === selectedLesson);
    const correctCount = lesson.questions.filter((q, i) => quizAnswers[i] === q.correct).length;
    
    if (correctCount >= Math.ceil(lesson.questions.length * 0.7)) {
      setUserProgress(prev => ({
        ...prev,
        xp: prev.xp + lesson.xp,
        completedLessons: [...prev.completedLessons, selectedLesson],
        dailyProgress: prev.dailyProgress + lesson.xp
      }));
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
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
            const isLocked = lesson.locked;
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
                  onClick={() => !isLocked && setSelectedLesson(lesson.id)}
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
                      ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600'
                      : isNext
                      ? 'bg-gradient-to-br ' + lesson.color + ' border-white animate-pulse'
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
                    isLocked ? 'opacity-60' : 'group-hover:scale-105'
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
    const lesson = lessons.find(l => l.id === selectedLesson);
    if (!lesson) return null;

    return (
      <div className="max-w-2xl mx-auto">
        {/* Progress Bar */}
        <div className="bg-white rounded-full h-4 mb-6 overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all duration-300"
            style={{ width: `${((Object.keys(quizAnswers).length) / (lesson.questions?.length || 1)) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-3xl p-8 shadow-2xl border-2 border-gray-100">
          {!quizSubmitted ? (
            <>
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{lesson.icon}</div>
                <h2 className="text-3xl font-black text-gray-800 mb-2">{lesson.title}</h2>
                <p className="text-gray-600 font-semibold">{lesson.category}</p>
              </div>

              {lesson.questions ? (
                <div className="space-y-8">
                  {lesson.questions.map((question, qIndex) => (
                    <div key={qIndex} className="space-y-4">
                      <h3 className="text-2xl font-bold text-gray-800 leading-snug">
                        {question.q}
                      </h3>
                      <div className="space-y-3">
                        {question.options.map((option, oIndex) => (
                          <button
                            key={oIndex}
                            onClick={() => handleQuizAnswer(qIndex, oIndex)}
                            className={`w-full text-left p-5 rounded-2xl border-3 font-semibold text-lg transition-all ${
                              quizAnswers[qIndex] === oIndex
                                ? 'border-sky-500 bg-sky-50 shadow-lg scale-105'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={submitQuiz}
                    disabled={Object.keys(quizAnswers).length < lesson.questions.length}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-black text-xl py-5 rounded-2xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-105"
                  >
                    CHECK
                  </button>
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
              {/* Results */}
              {lesson.questions.map((question, qIndex) => (
                <div key={qIndex} className="mb-8 text-left">
                  <div className={`p-6 rounded-2xl ${
                    quizAnswers[qIndex] === question.correct
                      ? 'bg-green-50 border-2 border-green-400'
                      : 'bg-red-50 border-2 border-red-400'
                  }`}>
                    <div className="flex items-start gap-3 mb-3">
                      {quizAnswers[qIndex] === question.correct ? (
                        <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0 mt-1" />
                      ) : (
                        <X className="w-8 h-8 text-red-500 flex-shrink-0 mt-1" />
                      )}
                      <div>
                        <p className="font-bold text-gray-800 text-lg mb-2">{question.q}</p>
                        {quizAnswers[qIndex] !== question.correct && (
                          <div className="space-y-2">
                            <p className="text-red-700 font-semibold">
                              Your answer: {question.options[quizAnswers[qIndex]]}
                            </p>
                            <p className="text-green-700 font-semibold">
                              Correct answer: {question.options[question.correct]}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="bg-blue-100 border-l-4 border-blue-500 p-4 rounded-lg ml-11">
                      <p className="text-blue-800 font-semibold text-sm">
                        💡 {question.explanation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gradient-to-br from-amber-400 to-amber-500 rounded-3xl p-8 text-white shadow-xl mt-8">
                <div className="text-7xl mb-4">🎉</div>
                <h3 className="text-3xl font-black mb-2">Awesome!</h3>
                <p className="text-xl font-bold mb-6">+{lesson.xp} XP</p>
                <button
                  onClick={() => {
                    setSelectedLesson(null);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
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
            setQuizAnswers({});
            setQuizSubmitted(false);
          }}
          className="mt-6 w-full py-4 text-gray-600 hover:text-gray-800 font-bold text-lg"
        >
          EXIT
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header - Duolingo Style */}
      <header className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600">
                💰 FinLit
              </div>
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
          </div>
          
          <div className="border-t-2 border-gray-100 p-4 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything..."
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 font-semibold"
              />
              <button
                onClick={handleSendMessage}
                className="bg-blue-500 text-white p-3 rounded-xl hover:bg-blue-600 transition-all shadow-md"
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

export default FinLitPlatform;
