import { todayStr, tomorrowStr } from '../utils'

// ── Urgency helpers ───────────────────────────────────────────────────────────

const URGENCY_ICON = { overdue: '🔴', today: '🟠', tomorrow: '🟡', upcoming: '🔵' }

// Returns { urgency, label } describing how time-sensitive this task's due date is.
// urgency is null for completed tasks or tasks with no due date.
function getDueInfo(task) {
  if (!task.due) return null

  // Completed tasks just show a plain date, no urgency styling
  if (task.done) {
    const label = new Date(task.due + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return { urgency: null, label }
  }

  const today    = todayStr()
  const tomorrow = tomorrowStr()

  if (task.due < today) {
    const days = Math.round((new Date(today + 'T00:00:00') - new Date(task.due + 'T00:00:00')) / 86400000)
    return { urgency: 'overdue', label: days === 1 ? '1 day overdue' : `${days} days overdue` }
  }
  if (task.due === today)    return { urgency: 'today',    label: 'Due today' }
  if (task.due === tomorrow) return { urgency: 'tomorrow', label: 'Due tomorrow' }

  const daysAway = Math.round((new Date(task.due + 'T00:00:00') - new Date(today + 'T00:00:00')) / 86400000)
  if (daysAway <= 7) return { urgency: 'upcoming', label: `In ${daysAway} days` }

  const label = new Date(task.due + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return { urgency: null, label }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TaskCard({ task, activeListId, lists, onToggle, onEdit, onDelete }) {
  const dueInfo  = getDueInfo(task)
  const urgency  = dueInfo?.urgency ?? null
  const listObj  = lists.find(l => l.id === task.listId)
  const showList = listObj && activeListId === 'all'

  const priorityDot =
    task.priority === 'high' ? <span className="priority-dot dot-high" /> :
    task.priority === 'med'  ? <span className="priority-dot dot-med"  /> :
    task.priority === 'low'  ? <span className="priority-dot dot-low"  /> : null

  return (
    <div className={[
      'task-card',
      task.done      ? 'done'              : '',
      urgency        ? `urgency-${urgency}` : '',
      task.priority  ? `priority-${task.priority}` : 'priority-none',
    ].filter(Boolean).join(' ')}>

      {/* Checkbox */}
      <div className="task-checkbox-wrap">
        <div className={`task-checkbox${task.done ? ' checked' : ''}`} onClick={onToggle} />
      </div>

      {/* Body */}
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.note && <div className="task-note">{task.note}</div>}

        {(priorityDot || dueInfo || showList) && (
          <div className="task-meta">
            {urgency === 'overdue' && <span className="pulse-dot" />}
            {priorityDot}
            {dueInfo && (
              <span className={`urgency-badge${urgency ? ` ${urgency}` : ''}`}>
                {urgency ? URGENCY_ICON[urgency] : '📅'} {dueInfo.label}
              </span>
            )}
            {showList && <span className="task-tag">{listObj.icon} {listObj.name}</span>}
          </div>
        )}
      </div>

      {/* Actions (visible on hover) */}
      <div className="task-actions">
        <button className="icon-btn" title="Edit"   onClick={onEdit}>✏️</button>
        <button className="icon-btn delete" title="Delete" onClick={onDelete}>🗑</button>
      </div>

    </div>
  )
}
