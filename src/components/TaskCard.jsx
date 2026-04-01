function todayStr() { return new Date().toISOString().slice(0, 10) }

function formatDate(d) {
  const t = todayStr()
  if (d === t) return 'Today'
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (d === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow'
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  if (d === yesterday.toISOString().slice(0, 10)) return 'Yesterday'
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function TaskCard({ task, activeListId, lists, onToggle, onEdit, onDelete }) {
  const dueCls = task.due
    ? (task.due < todayStr() && !task.done ? ' overdue' : task.due === todayStr() ? ' today' : '')
    : ''

  const listObj = lists.find(l => l.id === task.listId)
  const showListTag = listObj && activeListId === 'all'

  const priorityDot =
    task.priority === 'high' ? <span className="priority-dot dot-high" /> :
    task.priority === 'med'  ? <span className="priority-dot dot-med" />  :
    task.priority === 'low'  ? <span className="priority-dot dot-low" />  : null

  const hasMeta = priorityDot || task.due || showListTag

  return (
    <div className={`task-card${task.done ? ' done' : ''} priority-${task.priority || 'none'}`}>
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
            {priorityDot}
            {task.due && (
              <span className={`task-due${dueCls}`}>📅 {formatDate(task.due)}</span>
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
