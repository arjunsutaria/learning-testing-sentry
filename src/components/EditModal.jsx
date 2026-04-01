import { useState, useEffect } from 'react'

export default function EditModal({ task, onSave, onClose }) {
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [due, setDue] = useState(task.due)
  const [priority, setPriority] = useState(task.priority)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  function handleSave() {
    if (!title.trim()) return
    onSave(task.id, { title: title.trim(), note: note.trim(), due, priority })
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal">
        <div className="modal-title">Edit Task</div>
        <div className="field-group">
          <div className="field-label">Title</div>
          <input
            className="field-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={200}
            autoFocus
          />
        </div>
        <div className="field-group">
          <div className="field-label">Note</div>
          <input
            className="field-input"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note…"
            maxLength={300}
          />
        </div>
        <div className="field-group">
          <div className="field-label">Due Date</div>
          <input
            className="field-input"
            type="date"
            value={due}
            onChange={e => setDue(e.target.value)}
          />
        </div>
        <div className="field-group">
          <div className="field-label">Priority</div>
          <select className="field-input" value={priority} onChange={e => setPriority(e.target.value)}>
            <option value="">No priority</option>
            <option value="high">🔴 High</option>
            <option value="med">🟠 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
        <div className="modal-footer">
          <button className="btn-sm btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-sm btn-add" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
