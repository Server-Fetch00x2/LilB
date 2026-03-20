import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MOODS = ['😊', '😢', '😡', '😴', '❤️', '😍', '🥺', '😎', '🤔', '💪'];
const CATEGORIES = ['Normal', 'Heading 1', 'Heading 2', 'Heading 3'];

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const isNew = !id || id === 'new';

  const [note, setNote] = useState({
    title: '',
    content: '',
    mood: '😊',
    category: 'Normal',
    isPinned: 0,
    isArchived: 0,
    isLocked: 0,
    tags: [],
    images: []
  });

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [handwriting, setHandwriting] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockPasswordInput, setLockPasswordInput] = useState('');
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [isLockedByPass, setIsLockedByPass] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [selectionTick, setSelectionTick] = useState(0);

  const editorRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const hydrationKeyRef = useRef(null);

  useEffect(() => {
    if (!isNew) {
      fetchNote();
    }
  }, [id]);

  const fetchNote = async () => {
    try {
      const res = await authFetch(`/api/notes/${id}`);
      if (!res.ok) throw new Error('Note not found');
      const data = await res.json();
      
      // If locked and has password, show unlock screen
      if (data.isLocked && data.lockPassword) {
        setIsLockedByPass(true);
      }

      setNote({
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',') : [])
      });
      const normalized = {
        ...data,
        tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(',') : []),
      };
      setLastSaved(JSON.stringify(normalized));
      
      if (editorRef.current && (isNew || editorRef.current.innerHTML !== data.content)) {
        editorRef.current.innerHTML = data.content || '';
      }
      localStorage.setItem(`lb_note_draft_${data.id}`, JSON.stringify(normalized));
      
      setLoading(false);
    } catch (err) {
      console.error(err);
      navigate('/');
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;
    if (!isNew && note.id && hydrationKeyRef.current !== note.id) return;
    if (editorRef.current.innerHTML !== (note.content || '')) {
      editorRef.current.innerHTML = note.content || '';
    }
  }, [note.content, note.id, isNew]);

  useEffect(() => {
    if (loading) return;
    const storageKey = isNew ? 'lb_note_draft_new' : `lb_note_draft_${id}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    try {
      const draft = JSON.parse(raw);
      setNote(prev => ({ ...prev, ...draft }));
      hydrationKeyRef.current = draft.id || 'new';
      if (editorRef.current) editorRef.current.innerHTML = draft.content || '';
    } catch (error) {
      console.error('Failed to restore note draft:', error);
    }
  }, [loading, isNew, id]);

  // Autosave effect
  useEffect(() => {
    if (loading || saving) return;
    
    const currentContent = editorRef.current ? editorRef.current.innerHTML : note.content;
    
    // Auto-delete empty notes logic
    if (isNew && !note.title && !currentContent) return;

    const currentNoteState = {
      ...note,
      content: currentContent
    };

    if (JSON.stringify(currentNoteState) === lastSaved) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);

    autosaveTimerRef.current = setTimeout(() => {
      handleAutosave(currentNoteState);
    }, 700);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [note, loading, isNew, lastSaved, saving]);

  const handleAutosave = async (noteToSave) => {
    // Auto-delete if empty
    if (!noteToSave.title && !noteToSave.content) {
      if (!isNew) {
        try {
          await authFetch(`/api/notes/${id}`, { method: 'DELETE' });
          navigate('/', { replace: true });
        } catch (err) {
          console.error('Failed to auto-delete empty note:', err);
        }
      }
      return;
    }

    const draftKey = isNew ? 'lb_note_draft_new' : `lb_note_draft_${id}`;
    localStorage.setItem(draftKey, JSON.stringify(noteToSave));

    setSaving(true);
    try {
      const payload = {
        ...noteToSave,
        isPinned: noteToSave.isPinned ? 1 : 0,
        isArchived: noteToSave.isArchived ? 1 : 0,
        isLocked: noteToSave.isLocked ? 1 : 0,
        tags: noteToSave.tags
      };

      const url = isNew ? '/api/notes' : `/api/notes/${id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setLastSaved(JSON.stringify(noteToSave));
        localStorage.setItem(`lb_note_draft_${data.id || id || 'new'}`, JSON.stringify({
          ...noteToSave,
          id: data.id || id
        }));
        if (isNew) {
          localStorage.removeItem('lb_note_draft_new');
          navigate(`/note/${data.id}`, { replace: true });
        }
      }
    } catch (err) {
      console.error('Autosave failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const verifyUnlock = () => {
    if (unlockPasswordInput === note.lockPassword) {
      setIsLockedByPass(false);
    } else {
      alert('Incorrect password! 🔒');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this memory? 🥺')) return;
    try {
      await authFetch(`/api/notes/${id}`, { method: 'DELETE' });
      if (id) localStorage.removeItem(`lb_note_draft_${id}`);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = (field) => {
    setNote(prev => ({ ...prev, [field]: prev[field] ? 0 : 1 }));
  };

  const handleLockClick = () => {
    if (note.isLocked) {
      setNote(prev => ({ ...prev, isLocked: 0, lockPassword: null }));
    } else {
      setShowLockModal(true);
    }
  };

  const confirmLock = () => {
    if (!lockPasswordInput) return alert('Please enter a password');
    setNote(prev => ({ ...prev, isLocked: 1, lockPassword: lockPasswordInput }));
    setShowLockModal(false);
    setLockPasswordInput('');
  };

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!note.tags.includes(tagInput.trim())) {
        setNote(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setNote(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
  };

  const applyStyle = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    setSelectionTick(v => v + 1);
    if (editorRef.current) editorRef.current.focus();
  };

  const handleCategoryChange = (val) => {
    setNote(prev => ({ ...prev, category: val }));
    if (val === 'Normal') applyStyle('formatBlock', 'p');
    else if (val === 'Heading 1') applyStyle('formatBlock', 'h1');
    else if (val === 'Heading 2') applyStyle('formatBlock', 'h2');
    else if (val === 'Heading 3') applyStyle('formatBlock', 'h3');
  };

  const isCommandActive = (command) => {
    void selectionTick;
    try {
      return document.queryCommandState(command);
    } catch {
      return false;
    }
  };

  if (loading) return <div className="loading-screen">✨ Opening your diary...</div>;

  if (isLockedByPass) {
    return (
      <div className="editor-page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div className="unlock-card" style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '24px', textAlign: 'center', boxShadow: '0 10px 40px var(--shadow)', maxWidth: '400px', width: '90%', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔐</div>
          <h2 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>Locked Memory</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '30px', fontSize: '0.9rem' }}>This note is protected with a password.</p>
          <input 
            type="password" 
            placeholder="Enter password..." 
            className="tags-input-new" 
            style={{ border: '2px solid var(--border)', padding: '14px', borderRadius: '12px', marginBottom: '20px', width: '100%', outline: 'none', transition: 'all 0.3s' }}
            value={unlockPasswordInput}
            onChange={e => setUnlockPasswordInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyUnlock()}
          />
          <button className="btn btn-primary" onClick={verifyUnlock} style={{ width: '100%', padding: '14px' }}>Unlock Note</button>
          <button className="btn-ghost" onClick={() => navigate('/')} style={{ marginTop: '16px', fontSize: '0.85rem' }}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`editor-page-wrapper ${handwriting ? 'handwriting-mode' : ''}`}>
      {/* Header */}
      <div className="editor-header-new">
        <div className="back-link" onClick={() => navigate('/')}>
          <span className="icon">←</span> <span>Back to notes</span>
        </div>
        
        <div className="editor-actions-top">
          <button 
            className={`btn-action-new ${note.isPinned ? 'active' : ''}`}
            onClick={() => handleToggle('isPinned')}
            title="Pin this note"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={note.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span>Pin</span>
          </button>
          
          <button 
            className={`btn-action-new ${note.isArchived ? 'active' : ''}`}
            onClick={() => handleToggle('isArchived')}
            title="Archive this note"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={note.isArchived ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
            <span>Archive</span>
          </button>
          
          <button 
            className={`btn-action-new ${note.isLocked ? 'active' : ''}`}
            onClick={handleLockClick}
            title="Lock with password"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={note.isLocked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>{note.isLocked ? 'Locked' : 'Lock'}</span>
          </button>
          
          <button 
            className={`btn-action-new ${handwriting ? 'active' : ''}`}
            onClick={() => setHandwriting(!handwriting)}
            title="Toggle Handwriting Font"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l5 5"/><path d="M9.5 14.5L16 8"/></svg>
            <span>Magic</span>
          </button>
          
          {!isNew && (
            <button className="btn-action-new delete" onClick={handleDelete} title="Delete memory">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              <span>Delete</span>
            </button>
          )}

          <div className="autosave-status" style={{ fontSize: '0.8rem', color: saving ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
            {saving ? (
              <>
                <span className="spinner" style={{ width: '10px', height: '10px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                <span>Saving...</span>
              </>
            ) : (
              <span>✨ Saved</span>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <textarea
        className="editor-title-large"
        placeholder="Give your note a title..."
        value={note.title}
        rows="1"
        onChange={e => {
          setNote(prev => ({ ...prev, title: e.target.value }));
          // Auto-resize textarea
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onInput={e => {
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        ref={el => {
          if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          }
        }}
      />

      {/* Mood */}
      <div className="mood-section-new">
        <span className="section-label-new">How are you feeling?</span>
        <div className="mood-picker-new">
          {MOODS.map(m => (
            <button
              key={m}
              className={`mood-btn-new ${note.mood === m ? 'selected' : ''}`}
              onClick={() => setNote(prev => ({ ...prev, mood: m }))}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="tags-section-new">
        <span className="section-label-new">Tags</span>
        <div className="tags-input-new-container">
          {note.tags.map(t => (
            <span key={t} className="tag-pill" style={{ background: 'var(--bg-nav-active)', padding: '6px 14px', borderRadius: '12px', fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
              #{t} <span className="tag-remove" onClick={() => removeTag(t)} style={{ cursor: 'pointer', fontSize: '1rem', opacity: 0.6 }}>×</span>
            </span>
          ))}
          <input
            type="text"
            className="tags-input-new"
            placeholder="Add tags..."
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={addTag}
          />
        </div>
      </div>

      {/* Editor Box */}
      <div className="editor-container-new">
        <div className="toolbar-new">
          <div className="toolbar-group">
            <select 
              className="toolbar-select" 
              value={note.category} 
              onChange={e => handleCategoryChange(e.target.value)}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          
          <div className="toolbar-group">
            <button type="button" className={`toolbar-item-new ${isCommandActive('bold') ? 'active' : ''}`} title="Bold" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('bold')}><b>B</b></button>
            <button type="button" className={`toolbar-item-new ${isCommandActive('italic') ? 'active' : ''}`} title="Italic" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('italic')}><i>I</i></button>
            <button type="button" className={`toolbar-item-new ${isCommandActive('underline') ? 'active' : ''}`} title="Underline" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('underline')}><u>U</u></button>
          </div>
          
          <div className="toolbar-group">
            <button type="button" className={`toolbar-item-new ${isCommandActive('insertUnorderedList') ? 'active' : ''}`} title="Bullet List" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('insertUnorderedList')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            </button>
            <button type="button" className={`toolbar-item-new ${isCommandActive('formatBlock') && document.queryCommandValue('formatBlock') === 'blockquote' ? 'active' : ''}`} title="Quote" onMouseDown={(e) => e.preventDefault()} onClick={() => applyStyle('formatBlock', 'blockquote')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21c3 0 7-1 7-8V5H3v16zm11 0c3 0 7-1 7-8V5h-7v16z"/></svg>
            </button>
          </div>
        </div>

        <div
          ref={editorRef}
          className={`editor-content-new ${handwriting ? 'handwriting' : ''}`}
          contentEditable
          placeholder="Write your secrets here..."
          role="textbox"
          aria-multiline="true"
          spellCheck
          onDrop={(e) => { e.preventDefault(); }}
          onDragOver={(e) => { e.preventDefault(); }}
          onInput={(e) => setNote(prev => ({ ...prev, content: e.currentTarget.innerHTML }))}
          onBlur={(e) => setNote(prev => ({ ...prev, content: e.target.innerHTML }))}
          onKeyUp={() => setSelectionTick(v => v + 1)}
          onMouseUp={() => setSelectionTick(v => v + 1)}
          suppressContentEditableWarning={true}
        >
        </div>
      </div>

      {/* Lock Modal */}
      {showLockModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: '24px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 40px var(--shadow)', border: '1px solid var(--border)' }}>
            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>🔐 Secure this Memory</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Set a password to lock this note. You'll need it every time you open it.</p>
            <input 
              type="password" 
              placeholder="Create lock password..." 
              className="tags-input-new" 
              style={{ border: '2px solid var(--border)', padding: '14px', borderRadius: '12px', marginBottom: '24px', width: '100%', outline: 'none' }}
              value={lockPasswordInput}
              onChange={e => setLockPasswordInput(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowLockModal(false)} style={{ flex: 1 }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmLock} style={{ flex: 1 }}>Confirm Lock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
