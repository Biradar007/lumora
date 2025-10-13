'use client';

import React, { useState } from 'react';
import { Calendar, TrendingUp, Smile, Meh, Frown, RotateCcw } from 'lucide-react';

interface MoodEntry {
  date: string;
  mood: number;
  note: string;
  activities: string[];
}

const moodEmojis = ['😢', '😕', '😐', '🙂', '😊'];
const moodLabels = ['Very Low', 'Low', 'Neutral', 'Good', 'Excellent'];
const moodColors = ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-500'];

const activities = [
  'Exercise', 'Meditation', 'Social Time', 'Work', 'Sleep', 'Nature', 'Reading', 'Music'
];

export function MoodTracker() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  
  // Sample mood data for demonstration
  const [moodEntries] = useState<MoodEntry[]>([
    { date: '2024-01-15', mood: 4, note: 'Great day with friends', activities: ['Social Time', 'Exercise'] },
    { date: '2024-01-14', mood: 3, note: 'Productive work day', activities: ['Work', 'Reading'] },
    { date: '2024-01-13', mood: 2, note: 'Feeling a bit overwhelmed', activities: ['Work', 'Music'] },
    { date: '2024-01-12', mood: 4, note: 'Relaxing weekend', activities: ['Nature', 'Meditation'] },
    { date: '2024-01-11', mood: 3, note: 'Regular day', activities: ['Work', 'Sleep'] },
  ]);

  const handleActivityToggle = (activity: string) => {
    setSelectedActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity)
        : [...prev, activity]
    );
  };

  const handleSubmit = () => {
    if (selectedMood !== null) {
      // Here you would save the mood entry
      console.log({ mood: selectedMood, note, activities: selectedActivities });
      setSelectedMood(null);
      setNote('');
      setSelectedActivities([]);
    }
  };

  const averageMood = moodEntries.reduce((sum, entry) => sum + entry.mood, 0) / moodEntries.length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Today's Mood Entry */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center">
            <Smile className="h-5 w-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">How are you feeling today?</h2>
        </div>

        {/* Mood Selection */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Select your mood:</p>
          <div className="flex justify-between max-w-md">
            {moodEmojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => setSelectedMood(index)}
                className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200
                  ${selectedMood === index 
                    ? 'bg-blue-100 ring-2 ring-blue-500 scale-110' 
                    : 'hover:bg-gray-100 hover:scale-105'
                  }
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
          {selectedMood !== null && (
            <p className={`text-sm font-medium mt-2 ${moodColors[selectedMood]}`}>
              {moodLabels[selectedMood]}
            </p>
          )}
        </div>

        {/* Activities */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">What activities did you do today?</p>
          <div className="flex flex-wrap gap-2">
            {activities.map((activity) => (
              <button
                key={activity}
                onClick={() => handleActivityToggle(activity)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-200
                  ${selectedActivities.includes(activity)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {activity}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a note (optional):
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What made your day special? Any thoughts or feelings you'd like to remember..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={selectedMood === null}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save Today's Mood
        </button>
      </div>

      {/* Mood History */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Your Mood Journey</h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">7-day average</p>
            <p className={`text-2xl font-bold ${moodColors[Math.round(averageMood)]}`}>
              {moodEmojis[Math.round(averageMood)]} {moodLabels[Math.round(averageMood)]}
            </p>
          </div>
        </div>

        {/* Mood Chart */}
        <div className="space-y-3">
          {moodEntries.map((entry, index) => (
            <div key={index} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="w-16 text-sm text-gray-600">
                {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className="text-2xl">{moodEmojis[entry.mood]}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{entry.note}</p>
                <div className="flex gap-1 mt-1">
                  {entry.activities.map((activity) => (
                    <span key={activity} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
              <div className={`text-sm font-medium ${moodColors[entry.mood]}`}>
                {moodLabels[entry.mood]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
