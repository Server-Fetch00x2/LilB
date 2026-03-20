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
  const [viewMode, setViewMode] = useState('active');
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
      if (viewMode === 'archive') params.set('archived', 'true');

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
  }, [search, sortBy, category, selectedTag, viewMode]);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const pinnedNotes = notes.filter(n => n.isPinned === 1);
  const regularNotes = notes.filter(n => n.isPinned !== 1);
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
          <h3>📖 {viewMode === 'archive' ? 'Archived Notes' : 'Recent Notes'}</h3>
          <div className="notes-view-toggle">
            <button
              className={`view-toggle-btn ${viewMode === 'active' ? 'active' : ''}`}
              onClick={() => setViewMode('active')}
            >
              Active
            </button>
            <button
              className={`view-toggle-btn ${viewMode === 'archive' ? 'active' : ''}`}
              onClick={() => setViewMode('archive')}
            >
              Archive
            </button>
          </div>
        </div>

        <div className="notes-controls-row">
          <input
            type="search"
            className="notes-search-input"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="notes-control-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="latest">Latest</option>
            <option value="oldest">Oldest</option>
            <option value="title_asc">Title A-Z</option>
            <option value="title_desc">Title Z-A</option>
          </select>
          <select className="notes-control-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
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
        {viewMode !== 'archive' && <MoodChart />}

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
          <>
            {viewMode !== 'archive' && pinnedNotes.length > 0 && (
              <div className="pinned-notes-section">
                <h4 className="subsection-title">📌 Pinned Notes</h4>
                <div className="notes-grid">
                  {pinnedNotes.map((note, idx) => (
                    <NoteCard key={note.id} note={note} idx={idx} navigate={navigate} formatDate={formatDate} />
                  ))}
                </div>
              </div>
            )}

            <div className="other-notes-section">
              {viewMode !== 'archive' && pinnedNotes.length > 0 && <h4 className="subsection-title">📝 Other Notes</h4>}
              <div className="notes-grid">
                {(viewMode === 'archive' ? notes : regularNotes).map((note, idx) => (
                  <NoteCard key={note.id} note={note} idx={idx} navigate={navigate} formatDate={formatDate} />
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function NoteCard({ note, idx, navigate, formatDate }) {
  return (
    <div
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
  );
}
