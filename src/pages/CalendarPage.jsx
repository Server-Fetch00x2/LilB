import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [noteDates, setNoteDates] = useState({});
  const [dayNotes, setDayNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const { authFetch } = useAuth();
  const navigate = useNavigate();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchNotesForMonth = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const res = await authFetch(`/api/notes?sort=latest`);
      const notes = await res.json();
      
      const dateMap = {};
      notes.forEach(note => {
        const noteDate = note.createdAt.split('T')[0];
        if (!dateMap[noteDate]) dateMap[noteDate] = [];
        dateMap[noteDate].push(note);
      });
      setNoteDates(dateMap);
    } catch (err) {
      console.error('Error fetching calendar notes:', err);
    }
  }, [year, month, authFetch]);

  useEffect(() => {
    fetchNotesForMonth();
  }, [fetchNotesForMonth]);

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const calendarDays = [];
  // Previous month days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, otherMonth: true });
  }
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    calendarDays.push({
      day: i,
      dateStr,
      hasNotes: !!noteDates[dateStr],
      noteCount: noteDates[dateStr]?.length || 0,
      isToday: dateStr === new Date().toISOString().split('T')[0]
    });
  }
  // Next month days
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, otherMonth: true });
  }

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setDayNotes(noteDates[dateStr] || []);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <div className="page-header">
        <h2>Calendar 📅</h2>
      </div>
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="calendar-container">
            <div className="calendar-header">
              <h3>{MONTHS[month]} {year}</h3>
              <div className="calendar-nav">
                <button onClick={prevMonth}>‹</button>
                <button onClick={nextMonth}>›</button>
              </div>
            </div>

            <div className="calendar-weekdays">
              {DAYS.map(d => <div key={d} className="calendar-weekday">{d}</div>)}
            </div>

            <div className="calendar-days">
              {calendarDays.map((d, i) => (
                <button
                  key={i}
                  className={`calendar-day ${d.otherMonth ? 'other-month' : ''} ${d.isToday ? 'today' : ''} ${d.hasNotes ? 'has-notes' : ''} ${d.dateStr === selectedDate ? 'selected' : ''}`}
                  onClick={() => !d.otherMonth && handleDayClick(d.dateStr)}
                  disabled={d.otherMonth}
                >
                  {d.day}
                </button>
              ))}
            </div>
          </div>

          {/* Selected day notes */}
          <div>
            {selectedDate ? (
              <>
                <h3 style={{ fontFamily: 'var(--font-handwriting)', fontSize: '1.4rem', marginBottom: '16px' }}>
                  {formatDate(selectedDate)} 💫
                </h3>
                {dayNotes.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <div className="icon">📝</div>
                    <h3>No entries</h3>
                    <p>Nothing written on this day</p>
                    <button
                      className="btn btn-primary mt-md"
                      onClick={() => navigate('/note/new')}
                      style={{ width: 'auto', padding: '10px 24px' }}
                    >
                      ✨ Write Something
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {dayNotes.map(note => (
                      <div
                        key={note.id}
                        className="note-card"
                        onClick={() => navigate(`/note/${note.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="note-card-header">
                          {note.mood && <span className="note-card-mood">{note.mood}</span>}
                          <span className="note-card-category">{note.category}</span>
                        </div>
                        <h3>{note.title || 'Untitled'}</h3>
                        <p className="note-card-content">{note.content}</p>
                        {note.tags && note.tags.length > 0 && (
                          <div className="note-card-tags">
                            {note.tags.map(t => <span key={t} className="note-tag">#{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <div className="icon">🗓️</div>
                <h3>Select a day</h3>
                <p>Click on a date to see your entries</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
