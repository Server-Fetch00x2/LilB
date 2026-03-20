import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MoodChart from '../components/MoodChart';

const CATEGORIES = ['All', 'Daily', 'Thoughts', 'Secrets', 'Memories', 'Important'];

export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest');
  const [category, setCategory] = useState('All');
  const [selectedTag, setSelectedTag] = useState('');
  const [allTags, setAllTags] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const { authFetch, user } = useAuth();
  const navigate = useNavigate();

  const fetchNotes = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (sortBy) params.set('sort', sortBy);
      if (category && category !== 'All') params.set('category', category);
      if (selectedTag) params.set('tag', selectedTag);
      if (showArchived) params.set('archived', 'true');

      const res = await authFetch(`/api/notes?${params}`);
      const data = await res.json();
      setNotes(data);
    } catch (err) {
      console.error('Error fetching notes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await authFetch('/api/notes/meta/tags');
      const data = await res.json();
      setAllTags(data);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  useEffect(() => {
    fetchNotes();
    fetchTags();
  }, [search, sortBy, category, selectedTag, showArchived]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const pinnedCount = notes.filter(n => n.isPinned === 1).length;
  const archivedCount = notes.filter(n => n.isArchived === 1).length;
  const totalCount = notes.length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="greeting-section">
          <h1>Good Evening, {user?.username?.split(' ')[0] || 'Deepak'} 🌸</h1>
          <p className="quote">Write it on your heart that every day is the best day. 💕</p>
        </div>
      </header>

      <section className="stats-row">
        <div className="stats-card">
          <div className="stats-icon" style={{ fontSize: '2rem' }}>📝</div>
          <div className="stats-value">{totalCount}</div>
          <div className="stats-label">Total Notes</div>
        </div>
        <div className="stats-card">
          <div className="stats-icon" style={{ fontSize: '2rem' }}>📌</div>
          <div className="stats-value">{pinnedCount}</div>
          <div className="stats-label">Pinned</div>
        </div>
        <div className="stats-card">
          <div className="stats-icon" style={{ fontSize: '2rem' }}>📦</div>
          <div className="stats-value">{archivedCount}</div>
          <div className="stats-label">Archived</div>
        </div>
        <div className="stats-card new-note-stats" onClick={() => navigate('/note/new')}>
          <div className="stats-icon-circle" style={{ background: 'var(--gradient-accent)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </div>
          <div className="stats-label">New Note</div>
        </div>
      </section>

      <section className="recent-notes-section">
        <div className="section-header">
          <h3>📖 Recent Notes</h3>
          <button className="view-all-link" onClick={() => navigate('/')}>
            Refresh list ↻
          </button>
        </div>

        {/* Tags filter */}
        {allTags.length > 0 && (
          <div className="tag-filter mb-lg">
            <span
              className={`tag-chip ${!selectedTag ? 'active' : ''}`}
              onClick={() => setSelectedTag('')}
            >
              All Tags
            </span>
            {allTags.map(t => (
              <span
                key={t.tag}
                className={`tag-chip ${selectedTag === t.tag ? 'active' : ''}`}
                onClick={() => setSelectedTag(selectedTag === t.tag ? '' : t.tag)}
              >
                #{t.tag} ({t.count})
              </span>
            ))}
          </div>
        )}

        {/* Mood Chart */}
        {!showArchived && <MoodChart />}

        {/* Notes Grid */}
        {loading ? (
          <div className="loading-page" style={{ minHeight: '200px' }}>
            <div className="spinner"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📖</div>
            <h3>No entries yet!</h3>
            <p>Start writing your thoughts and memories 💫</p>
          </div>
        ) : (
          <div className="notes-grid">
            {notes.map((note, idx) => (
              <div
                key={note.id}
                className={`note-card ${note.isPinned ? 'pinned' : ''}`}
                onClick={() => navigate(`/note/${note.id}`)}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                {note.isPinned === 1 && <span className="pin-indicator">📌 Pinned</span>}
                <div className="note-card-header">
                  {note.mood && <span className="note-card-mood">{note.mood}</span>}
                  <span className="note-card-date">{formatDate(note.createdAt)}</span>
                </div>
                <h3>
                  {note.isLocked === 1 && <span style={{ marginRight: '8px' }}>🔒</span>}
                  {note.title || 'Untitled'}
                </h3>
                
                {note.images && note.images.length > 0 && (
                  <div className="note-card-images">
                    {note.images.slice(0, 3).map(img => (
                      <img key={img.id} src={`/uploads/${img.filename}`} alt="" />
                    ))}
                  </div>
                )}
                
                <p className="note-card-content">{note.isLocked ? 'This memory is locked 🔒' : note.content}</p>
                
                <div className="note-card-footer">
                  <div className="note-card-tags">
                    {(Array.isArray(note.tags) ? note.tags : (note.tags ? note.tags.split(',') : [])).slice(0, 3).filter(Boolean).map(tag => (
                      <span key={tag} className="note-tag">#{tag}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {note.category && <span className="note-card-category">{note.category}</span>}
                    {note.isArchived === 1 && <span title="Archived">📂</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
