import { todayStr, DEFAULT_LISTS } from '../utils'
import AddTaskForm from './AddTaskForm'
import TaskCard from './TaskCard'

// ── Sort / filter config ──────────────────────────────────────────────────────

const SORT_OPTIONS = ['default', 'priority', 'due', 'alpha']
const SORT_LABELS  = { default: '⇅ Sort', priority: '🔴 Priority', due: '📅 Due Date', alpha: '🔤 A–Z' }
const FILTERS      = [
  { id: 'all',    label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'done',   label: 'Completed' },
  { id: 'urgent', label: '🔴 Urgent' },
  { id: 'today',  label: 'Due Today' },
  { id: 'high',   label: 'High Priority' },
]

// ── Pure helper functions ─────────────────────────────────────────────────────

function getTasksForList(tasks, listId) {
  if (listId === 'all')     return tasks
  if (listId === 'today')   return tasks.filter(t => t.due === todayStr())
  if (listId === 'starred') return tasks.filter(t => t.priority === 'high')
  return tasks.filter(t => t.listId === listId)
}

function applyFilter(tasks, filter) {
  switch (filter) {
    case 'active': return tasks.filter(t => !t.done)
    case 'done':   return tasks.filter(t => t.done)
    case 'urgent': return tasks.filter(t => !t.done && t.due && t.due <= todayStr())
    case 'today':  return tasks.filter(t => t.due === todayStr())
    case 'high':   return tasks.filter(t => t.priority === 'high')
    default:       return tasks
  }
}

function sortTasks(tasks, sort) {
  const sorted = [...tasks]
  if (sort === 'priority') {
    const order = { high: 0, med: 1, low: 2, '': 3 }
    return sorted.sort((a, b) => (order[a.priority] ?? 3) - (order[b.priority] ?? 3))
  }
  if (sort === 'due') {
    return sorted.sort((a, b) => {
      if (!a.due && !b.due) return 0
      if (!a.due) return 1
      if (!b.due) return -1
      return a.due.localeCompare(b.due)
    })
  }
  if (sort === 'alpha') {
    return sorted.sort((a, b) => a.title.localeCompare(b.title))
  }
  // Default: incomplete tasks first, then by creation time
  return sorted.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.createdAt - b.createdAt
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Main({
  lists, tasks, activeList, filter, sort,
  onFilterChange, onSortChange,
  onAddTask, onToggleTask, onDeleteTask, onEditTask,
}) {
  const allLists  = [...DEFAULT_LISTS, ...lists]
  const list      = allLists.find(l => l.id === activeList) ?? DEFAULT_LISTS[0]
  const listTasks = getTasksForList(tasks, activeList)
  const visible   = applyFilter(sortTasks(listTasks, sort), filter)

  const doneCount  = listTasks.filter(t => t.done).length
  const totalCount = listTasks.length
  const pct        = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)

  function cycleSort() {
    const next = SORT_OPTIONS[(SORT_OPTIONS.indexOf(sort) + 1) % SORT_OPTIONS.length]
    onSortChange(next)
  }

  return (
    <main className="main">

      {/* Header */}
      <div className="main-header">
        <div className="main-title-group">
          <div className="main-list-icon" style={{ background: list.color + '22' }}>{list.icon}</div>
          <div className="main-title">{list.name}</div>
          <div className="main-subtitle">
            {totalCount === 0 ? 'No tasks' : `${totalCount - doneCount} remaining · ${doneCount} completed`}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={cycleSort}>
            {SORT_LABELS[sort] ?? SORT_LABELS.default}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-wrap">
        <div className="progress-label">
          <span>{doneCount} of {totalCount} completed</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Add task */}
      <AddTaskForm onAdd={onAddTask} />

      <button onClick={() => { throw new Error('Test error from Main component') }} >
        Test Sentry
      </button>

      {/* Filters */}
      <div className="filters">
        {FILTERS.map(({ id, label }) => (
          <div
            key={id}
            className={`filter-chip${filter === id ? ' active' : ''}`}
            onClick={() => onFilterChange(id)}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Task list */}
      <div className="task-list-scroll">
        {visible.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">{listTasks.length === 0 ? 'No tasks yet' : 'Nothing here'}</div>
            <div className="empty-state-sub">{listTasks.length === 0 ? 'Add a task above to get started.' : 'Try changing the filter.'}</div>
          </div>
        ) : (
          visible.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              activeListId={activeList}
              lists={lists}
              onToggle={() => onToggleTask(task.id)}
              onEdit={() => onEditTask(task)}
              onDelete={() => onDeleteTask(task.id)}
            />
          ))
        )}
      </div>

    </main>
  )
}
