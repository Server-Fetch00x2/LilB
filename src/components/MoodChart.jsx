import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MOOD_CONFIG = {
  '😊': { color: '#FFD54F', label: 'Happy' },
  '😢': { color: '#81D4FA', label: 'Sad' },
  '😡': { color: '#EF5350', label: 'Angry' },
  '😴': { color: '#B39DDB', label: 'Sleepy' },
  '❤️': { color: '#F48FB1', label: 'Love' },
  '😍': { color: '#FF8A80', label: 'Excited' },
  '🥺': { color: '#A5D6A7', label: 'Aw' },
  '😎': { color: '#80CBC4', label: 'Cool' },
  '🤔': { color: '#FFCC80', label: 'Thinking' },
  '🌸': { color: '#F8BBD0', label: 'Peaceful' },
};

export default function MoodChart() {
  const [moodData, setMoodData] = useState([]);
  const { authFetch } = useAuth();

  useEffect(() => {
    fetchMoods();
  }, []);

  const fetchMoods = async () => {
    try {
      const now = new Date();
      const res = await authFetch(`/api/notes/moods/monthly?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
      const data = await res.json();
      setMoodData(data.moods || []);
    } catch (err) {
      console.error('Error fetching moods:', err);
    }
  };

  if (moodData.length === 0) return null;

  const maxCount = Math.max(...moodData.map(m => m.count), 1);

  return (
    <div className="mood-chart-container mb-lg">
      <h3>Mood This Month ✨</h3>
      <div className="mood-chart-bars">
        {moodData.map(m => {
          const config = MOOD_CONFIG[m.mood] || { color: '#E0E0E0', label: '' };
          const heightPercent = (m.count / maxCount) * 100;
          return (
            <div key={m.mood} className="mood-bar-item">
              <span className="mood-bar-count">{m.count}</span>
              <div
                className="mood-bar"
                style={{
                  height: `${heightPercent}%`,
                  background: `linear-gradient(to top, ${config.color}, ${config.color}88)`
                }}
              />
              <span className="mood-bar-label">{m.mood}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
