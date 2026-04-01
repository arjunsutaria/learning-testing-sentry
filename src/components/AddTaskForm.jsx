import { useState } from 'react'

export default function AddTaskForm({ onAdd }) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState('')

  function confirm() {
    if (title.trim()) {
      onAdd(title, note, due, priority)
    }
    cancel()
  }

  function cancel() {
    setTitle('')
    setNote('')
    setDue('')
    setPriority('')
    setExpanded(false)
  }

  return (
    <div className="add-task-form">
      <div className="add-task-top">
        <div className="add-circle">+</div>
        <input
          className="task-input"
          placeholder="Add a task…"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onFocus={() => setExpanded(true)}
          onKeyDown={e => {
            if (e.key === 'Enter') confirm()
            if (e.key === 'Escape') cancel()
          }}
          maxLength={200}
          autoComplete="off"
        />
      </div>

      {expanded && (
        <>
          <div className="add-task-meta">
            <input
              className="meta-input"
              type="text"
              placeholder="Add a note…"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ flex: 1, minWidth: '120px' }}
              maxLength={300}
            />
            <input
              className="meta-input"
              type="date"
              value={due}
              onChange={e => setDue(e.target.value)}
            />
            <select
              className="meta-input priority-select"
              value={priority}
              onChange={e => setPriority(e.target.value)}
            >
              <option value="">No priority</option>
              <option value="high">🔴 High</option>
              <option value="med">🟠 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <div className="add-task-actions">
            <button className="btn-sm btn-cancel" onClick={cancel}>Cancel</button>
            <button className="btn-sm btn-add" onClick={confirm}>Add Task</button>
          </div>
        </>
      )}
    </div>
  )
}
