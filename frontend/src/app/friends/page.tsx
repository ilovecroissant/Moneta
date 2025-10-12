"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, UserPlus, UserX, Check, X, Users, Mail } from 'lucide-react';
import {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  removeFriend,
  type FriendUser,
  type FriendRequest,
  type Friend,
} from '@/lib/api';

interface UserData {
  id: number;
  username: string;
  display_name?: string;
  email: string;
}

export default function FriendsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');

  useEffect(() => {
    const storedUser = localStorage.getItem('userData');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserData(user);
      loadFriends(user.id);
      loadFriendRequests(user.id);
    } else {
      router.push('/');
    }
  }, [router]);

  const loadFriends = async (userId: number) => {
    try {
      const friendsList = await getFriends(userId);
      setFriends(friendsList);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriendRequests = async (userId: number) => {
    try {
      const requests = await getFriendRequests(userId);
      setFriendRequests(requests.incoming || []);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() || !userData) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchUsers(searchQuery, userData.id);
      // Filter out current user
      setSearchResults(results.filter(u => u.id !== userData?.id));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'search') {
        handleSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  const handleSendRequest = async (toUserId: number) => {
    if (!userData) return;
    
    try {
      await sendFriendRequest(userData.id, toUserId);
      alert('Friend request sent! ✅');
      handleSearch(); // Refresh results
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send friend request';
      alert(`❌ ${errorMessage}`);
      console.error('Send friend request error:', error);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await acceptFriendRequest(requestId);
      if (userData) {
        loadFriendRequests(userData.id);
        loadFriends(userData.id);
      }
    } catch (error) {
      alert('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await rejectFriendRequest(requestId);
      if (userData) {
        loadFriendRequests(userData.id);
      }
    } catch (error) {
      alert('Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (friendId: number) => {
    if (!confirm('Are you sure you want to remove this friend?') || !userData) return;
    
    try {
      await removeFriend(userData.id, friendId);
      loadFriends(userData.id);
    } catch (error) {
      alert('Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 flex items-center justify-center">
        <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">Loading friends...</div>
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
                onClick={() => router.push('/profile')}
                className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transform transition-all hover:scale-110 flex items-center justify-center"
                title="Back to Profile"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-600">
                Friends
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'friends'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Users className="w-5 h-5 inline mr-2" />
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-3 rounded-xl font-bold transition-all relative ${
              activeTab === 'requests'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Mail className="w-5 h-5 inline mr-2" />
            Requests
            {friendRequests.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black rounded-full w-6 h-6 flex items-center justify-center">
                {friendRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-6 py-3 rounded-xl font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-purple-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Search className="w-5 h-5 inline mr-2" />
            Search
          </button>
        </div>

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {friends.length === 0 ? (
              <div className="duo-card p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                  No friends yet
                </p>
                <p className="text-sm text-gray-500">
                  Search for users and send friend requests to get started!
                </p>
              </div>
            ) : (
              friends.map((friend) => (
                <div key={friend.id} className="duo-card p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-2xl font-black text-white">
                      {friend.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xl font-black text-gray-800 dark:text-gray-200">
                        {friend.display_name || friend.username}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        @{friend.username}
                      </div>
                      <div className="flex gap-4 mt-1 text-xs font-bold text-gray-500">
                        <span>⚡ {friend.xp} XP</span>
                        <span>🔥 {friend.streak} day streak</span>
                        <span>Friends since {new Date(friend.friends_since).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all"
                  >
                    <UserX className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            {friendRequests.length === 0 ? (
              <div className="duo-card p-12 text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                  No pending requests
                </p>
                <p className="text-sm text-gray-500">
                  You&apos;ll see friend requests here when someone wants to connect!
                </p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <div key={request.request_id} className="duo-card p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-2xl font-black text-white">
                      {request.from_user?.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xl font-black text-gray-800 dark:text-gray-200">
                        {request.from_user?.display_name || request.from_user?.username}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        @{request.from_user?.username}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Sent {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.request_id)}
                      className="px-4 py-2 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all flex items-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.request_id)}
                      className="px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div>
            {/* Search Bar */}
            <div className="duo-card p-4 mb-6">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or email..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-4">
              {searchLoading ? (
                <div className="duo-card p-12 text-center">
                  <p className="text-gray-600 dark:text-gray-400">Searching...</p>
                </div>
              ) : searchResults.length === 0 && searchQuery ? (
                <div className="duo-card p-12 text-center">
                  <Search className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
                    No users found
                  </p>
                  <p className="text-sm text-gray-500">
                    Try searching with a different username or email
                  </p>
                </div>
              ) : (
                searchResults.map((user) => (
                  <div key={user.id} className="duo-card p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-2xl font-black text-white">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xl font-black text-gray-800 dark:text-gray-200">
                          {user.display_name || user.username}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="px-4 py-2 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-600 transition-all flex items-center gap-2"
                    >
                      <UserPlus className="w-5 h-5" />
                      Add Friend
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
