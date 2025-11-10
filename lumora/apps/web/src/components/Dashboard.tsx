import React from 'react';
import { TrendingUp, Calendar, Target, Award, BarChart3, Heart } from 'lucide-react';

export function Dashboard() {
  // Sample data for demonstration
  const weeklyMoods = [
    { day: 'Mon', mood: 3, activities: 2 },
    { day: 'Tue', mood: 4, activities: 3 },
    { day: 'Wed', mood: 2, activities: 1 },
    { day: 'Thu', mood: 4, activities: 4 },
    { day: 'Fri', mood: 5, activities: 3 },
    { day: 'Sat', mood: 4, activities: 5 },
    { day: 'Sun', mood: 3, activities: 2 }
  ];

  const stats = {
    averageMood: 3.6,
    totalSessions: 28,
    weekStreak: 7,
    completedActivities: 142
  };

  const achievements = [
    { title: '7-Day Streak', description: 'Tracked mood for 7 consecutive days', earned: true },
    { title: 'Mindful Explorer', description: 'Completed 5 mindfulness exercises', earned: true },
    { title: 'Mood Master', description: 'Maintained average mood above 3.5 for a week', earned: true },
    { title: 'Resource Reader', description: 'Read 10 mental health articles', earned: false },
  ];

  const getMoodColor = (mood: number) => {
    if (mood >= 4.5) return 'bg-green-500';
    if (mood >= 3.5) return 'bg-blue-500';
    if (mood >= 2.5) return 'bg-yellow-500';
    if (mood >= 1.5) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const maxActivities = Math.max(...weeklyMoods.map(d => d.activities));

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-800">Your Mental Health Journey</h1>
          </div>
          <p className="text-gray-600">
            Track your progress and celebrate your achievements in mental wellness.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Mood</p>
              <p className="text-2xl font-bold text-gray-800">{stats.averageMood}/5</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Streak</p>
              <p className="text-2xl font-bold text-gray-800">{stats.weekStreak} days</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-800">{stats.totalSessions}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <Heart className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Activities Done</p>
              <p className="text-2xl font-bold text-gray-800">{stats.completedActivities}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Mood Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6">This Week&rsquo;s Mood</h2>
        <div className="space-y-5">
          {weeklyMoods.map((day, index) => (
            <div key={index} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center justify-between w-full sm:w-12">
                <div className="text-sm font-medium text-gray-600">{day.day}</div>
                <div className="text-sm font-semibold text-gray-700 sm:hidden">{day.mood}/5</div>
              </div>
              <div className="flex-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full">
                <div className="flex-1 bg-gray-200 rounded-full h-3 relative overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${getMoodColor(day.mood)} transition-all duration-500`}
                    style={{ width: `${(day.mood / 5) * 100}%` }}
                  />
                </div>
                <div className="hidden sm:block text-sm font-medium text-gray-700 w-10">{day.mood}/5</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1">
                  {Array.from({ length: maxActivities }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < day.activities ? 'bg-purple-500' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">{day.activities} activities</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
            <Award className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Achievements</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement, index) => (
            <div
              key={index}
              className={`
                p-4 rounded-xl border-2 transition-all duration-200
                ${achievement.earned 
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300' 
                  : 'bg-gray-50 border-gray-200'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${achievement.earned 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white' 
                    : 'bg-gray-300 text-gray-600'
                  }
                `}>
                  🏆
                </div>
                <div>
                  <h3 className={`font-semibold ${achievement.earned ? 'text-orange-800' : 'text-gray-600'}`}>
                    {achievement.title}
                  </h3>
                  <p className={`text-sm ${achievement.earned ? 'text-orange-600' : 'text-gray-500'}`}>
                  {achievement.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-200 p-5 sm:p-6 text-center">
        <p className="text-lg italic text-gray-700 mb-2">
          &ldquo;The greatest revolution of our generation is the discovery that human beings, by changing the inner attitudes of their minds, can change the outer aspects of their lives.&rdquo;
        </p>
        <p className="text-sm text-gray-600">— William James</p>
      </div>
    </div>
  );
}
