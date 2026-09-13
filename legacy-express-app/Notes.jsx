import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getNotes();
      setNotes(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await api.createNote(draft.trim());
      setDraft("");
      await load();
    } catch (e2) {
      setError(e2.message);
    }
  }

  async function toggleComplete(note) {
    try {
      await api.updateNote(note.id, { completed: note.completed ? 0 : 1 });
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteNote(id);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  const pending = notes.filter((n) => !n.completed);
  const completed = notes.filter((n) => n.completed);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">{pending.length} open reminders</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form className="add-note-row" onSubmit={handleAdd}>
        <input
          placeholder="e.g. Buy weedkiller, call Dorothy, teach Enrique…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </form>

      <div className="card" style={{ padding: 0 }}>
        {!loading && notes.length === 0 && <div className="empty-state">No notes yet — add a reminder above.</div>}
        {pending.map((n) => (
          <NoteRow key={n.id} note={n} onToggle={toggleComplete} onDelete={handleDelete} />
        ))}
        {completed.length > 0 && (
          <>
            <div style={{ padding: "10px 14px", fontSize: 11, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Completed
            </div>
            {completed.map((n) => (
              <NoteRow key={n.id} note={n} onToggle={toggleComplete} onDelete={handleDelete} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function NoteRow({ note, onToggle, onDelete }) {
  return (
    <div className={`note-item${note.completed ? " done" : ""}`}>
      <button className={`note-check${note.completed ? " checked" : ""}`} onClick={() => onToggle(note)}>
        {note.completed ? "✓" : ""}
      </button>
      <div style={{ flex: 1 }}>
        <div className="note-text">{note.content}</div>
        <div className="note-date">{new Date(note.created_at).toLocaleString()}</div>
      </div>
      <button className="btn btn-sm btn-ghost" onClick={() => onDelete(note.id)}>
        Delete
      </button>
    </div>
  );
}
