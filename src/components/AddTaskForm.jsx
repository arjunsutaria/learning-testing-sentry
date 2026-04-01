import { useState } from 'react'

const EMPTY = { title: '', note: '', due: '', priority: '' }

export default function AddTaskForm({ onAdd }) {
  const [form, setForm]         = useState(EMPTY)
  const [expanded, setExpanded] = useState(false)

  const set = key => e => setForm(prev => ({ ...prev, [key]: e.target.value }))

  function confirm() {
    if (form.title.trim()) onAdd(form)
    cancel()
  }

  function cancel() {
    setForm(EMPTY)
    setExpanded(false)
  }

  return (
    <div className="add-task-form">
      <div className="add-task-top">
        <div className="add-circle">+</div>
        <input
          className="task-input"
          placeholder="Add a task…"
          value={form.title}
          onChange={set('title')}
          onFocus={() => setExpanded(true)}
          onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') cancel() }}
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
              value={form.note}
              onChange={set('note')}
              style={{ flex: 1, minWidth: '120px' }}
              maxLength={300}
            />
            <input
              className="meta-input"
              type="date"
              value={form.due}
              onChange={set('due')}
            />
            <select
              className="meta-input priority-select"
              value={form.priority}
              onChange={set('priority')}
            >
              <option value="">No priority</option>
              <option value="high">🔴 High</option>
              <option value="med">🟠 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
          <div className="add-task-actions">
            <button className="btn-sm btn-cancel" onClick={cancel}>Cancel</button>
            <button className="btn-sm btn-add"    onClick={confirm}>Add Task</button>
          </div>
        </>
      )}
    </div>
  )
}
