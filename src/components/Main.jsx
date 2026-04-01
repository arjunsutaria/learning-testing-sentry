import { DEFAULT_LISTS } from '../App'
import AddTaskForm from './AddTaskForm'
import TaskCard from './TaskCard'

const SORT_OPTIONS = ['default', 'priority', 'due', 'alpha']
const SORT_LABELS = { default: '⇅ Sort', priority: '🔴 Priority', due: '📅 Due Date', alpha: '🔤 A–Z' }
const FILTER_LABELS = { all: 'All', active: 'Active', done: 'Completed', urgent: '🔴 Urgent', today: 'Due Today', high: 'High Priority' }

function todayStr() { return new Date().toISOString().slice(0, 10) }

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
  if (sort === 'priority') {
    const order = { high: 0, med: 1, low: 2, '': 3 }
    return [...tasks].sort((a, b) => (order[a.priority] || 3) - (order[b.priority] || 3))
  }
  if (sort === 'due') {
    return [...tasks].sort((a, b) => {
      if (!a.due && !b.due) return 0
      if (!a.due) return 1
      if (!b.due) return -1
      return a.due.localeCompare(b.due)
    })
  }
  if (sort === 'alpha') {
    return [...tasks].sort((a, b) => a.title.localeCompare(b.title))
  }
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.createdAt - b.createdAt
  })
}

export default function Main({ lists, tasks, activeList, filter, sort, onFilterChange, onSortChange, onAddTask, onToggleTask, onDeleteTask, onEditTask }) {
  const allLists = [...DEFAULT_LISTS, ...lists]
  const list = allLists.find(l => l.id === activeList) || DEFAULT_LISTS[0]

  const listTasks = getTasksForList(tasks, activeList)
  const filteredTasks = applyFilter(sortTasks(listTasks, sort), filter)
  const done = listTasks.filter(t => t.done).length
  const total = listTasks.length
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)

  function cycleSort() {
    const idx = SORT_OPTIONS.indexOf(sort)
    onSortChange(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length])
  }

  return (
    <main className="main">
      <div className="main-header">
        <div className="main-title-group">
          <div className="main-list-icon" style={{ background: list.color + '22' }}>{list.icon}</div>
          <div className="main-title">{list.name}</div>
          <div className="main-subtitle">
            {total === 0 ? 'No tasks' : `${total - done} remaining · ${done} completed`}
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={cycleSort}>
            {SORT_LABELS[sort] || SORT_LABELS.default}
          </button>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-label">
          <span>{done} of {total} completed</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: pct + '%' }} />
        </div>
      </div>

      <AddTaskForm onAdd={onAddTask} />

      <div className="filters">
        {Object.keys(FILTER_LABELS).map(f => (
          <div
            key={f}
            className={`filter-chip${filter === f ? ' active' : ''}`}
            onClick={() => onFilterChange(f)}
          >
            {FILTER_LABELS[f]}
          </div>
        ))}
      </div>

      <div className="task-list-scroll">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-title">{listTasks.length === 0 ? 'No tasks yet' : 'Nothing here'}</div>
            <div className="empty-state-sub">{listTasks.length === 0 ? 'Add a task above to get started.' : 'Try changing the filter.'}</div>
          </div>
        ) : (
          filteredTasks.map(task => (
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
