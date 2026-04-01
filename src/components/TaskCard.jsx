function todayStr() { return new Date().toISOString().slice(0, 10) }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function getUrgency(task) {
  if (task.done || !task.due) return null
  const t = todayStr()
  if (task.due < t) return 'overdue'
  if (task.due === t) return 'today'
  if (task.due === tomorrowStr()) return 'tomorrow'
  const daysAway = Math.round((new Date(task.due + 'T00:00:00') - new Date(t + 'T00:00:00')) / 86400000)
  if (daysAway <= 7) return 'upcoming'
  return null
}

function getDueLabel(task) {
  if (!task.due) return null
  const t = todayStr()
  const urgency = getUrgency(task)

  if (urgency === 'overdue') {
    const days = Math.round((new Date(t + 'T00:00:00') - new Date(task.due + 'T00:00:00')) / 86400000)
    return days === 1 ? '1 day overdue' : `${days} days overdue`
  }
  if (urgency === 'today')    return 'Due today'
  if (urgency === 'tomorrow') return 'Due tomorrow'
  if (urgency === 'upcoming') {
    const days = Math.round((new Date(task.due + 'T00:00:00') - new Date(t + 'T00:00:00')) / 86400000)
    return `In ${days} days`
  }
  return new Date(task.due + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TaskCard({ task, activeListId, lists, onToggle, onEdit, onDelete }) {
  const urgency = getUrgency(task)
  const dueLabel = getDueLabel(task)
  const listObj = lists.find(l => l.id === task.listId)
  const showListTag = listObj && activeListId === 'all'

  const priorityDot =
    task.priority === 'high' ? <span className="priority-dot dot-high" /> :
    task.priority === 'med'  ? <span className="priority-dot dot-med" />  :
    task.priority === 'low'  ? <span className="priority-dot dot-low" />  : null

  const hasMeta = priorityDot || dueLabel || showListTag

  const urgencyIcon =
    urgency === 'overdue'  ? '🔴' :
    urgency === 'today'    ? '🟠' :
    urgency === 'tomorrow' ? '🟡' :
    urgency === 'upcoming' ? '🔵' : '📅'

  return (
    <div className={`task-card${task.done ? ' done' : ''}${urgency ? ` urgency-${urgency}` : ''} priority-${task.priority || 'none'}`}>
      <div className="task-checkbox-wrap">
        <div
          className={`task-checkbox${task.done ? ' checked' : ''}`}
          onClick={onToggle}
        />
      </div>
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.note && <div className="task-note">{task.note}</div>}
        {hasMeta && (
          <div className="task-meta">
            {urgency === 'overdue' && !task.done && <span className="pulse-dot" />}
            {priorityDot}
            {dueLabel && (
              <span className={`urgency-badge${urgency ? ` ${urgency}` : ''}`}>
                {urgencyIcon} {dueLabel}
              </span>
            )}
            {showListTag && (
              <span className="task-tag">{listObj.icon} {listObj.name}</span>
            )}
          </div>
        )}
      </div>
      <div className="task-actions">
        <button className="icon-btn" title="Edit" onClick={onEdit}>✏️</button>
        <button className="icon-btn delete" title="Delete" onClick={onDelete}>🗑</button>
      </div>
    </div>
  )
}
