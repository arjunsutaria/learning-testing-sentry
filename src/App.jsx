import * as Sentry from '@sentry/react'
import { useState, useEffect } from 'react'
import { DEFAULT_LISTS, LIST_EMOJIS, LIST_COLORS, randomPick } from './utils'
import { api } from './api'
import Sidebar from './components/Sidebar'
import Main from './components/Main'
import EditModal from './components/EditModal'
import DebugPanel from './components/DebugPanel'

// Simulated frontend users — matches the pool in server/middleware.js
const USERS = [
  { id: 'user_001', email: 'alice@acme.com',     username: 'Alice Chen',   plan: 'enterprise' },
  { id: 'user_002', email: 'bob@startup.io',     username: 'Bob Martinez', plan: 'pro' },
  { id: 'user_003', email: 'carol@freelance.co', username: 'Carol White',  plan: 'free' },
]

export default function App() {
  const [tasks, setTasks]             = useState([])
  const [lists, setLists]             = useState([])
  const [activeList, setActiveList]   = useState('all')
  const [filter, setFilter]           = useState('all')
  const [sort, setSort]               = useState('default')
  const [editingTask, setEditingTask] = useState(null)
  const [loading, setLoading]         = useState(true)

  // ── Load data + set user context on mount ──────────────────────────────────
  useEffect(() => {
    const user = USERS[Math.floor(Date.now() / 60000) % USERS.length]

    // Identifies this user on all events from this session
    Sentry.setUser({ id: user.id, email: user.email, username: user.username })
    Sentry.setTag('user.plan', user.plan)

    Sentry.addBreadcrumb({
      category: 'app',
      message:  `App mounted — user: ${user.email} plan: ${user.plan}`,
      level:    'info',
    })

    Promise.all([api.getTasks(), api.getLists()])
      .then(([fetchedTasks, fetchedLists]) => {
        setTasks(fetchedTasks)
        setLists(fetchedLists)
        Sentry.addBreadcrumb({
          category: 'app',
          message:  `Loaded ${fetchedTasks.length} tasks, ${fetchedLists.length} lists`,
          level:    'info',
        })
      })
      .catch(err => Sentry.captureException(err))
      .finally(() => setLoading(false))
  }, [])

  // ── Task actions ────────────────────────────────────────────────────────────

  async function addTask({ title, note, due, priority }) {
    if (!title.trim()) return
    const listId = DEFAULT_LISTS.some(l => l.id === activeList)
      ? (lists[0]?.id ?? 'personal')
      : activeList
    Sentry.setTag('task.priority', priority || 'none')
    Sentry.setTag('task.list_id',  listId)
    Sentry.addBreadcrumb({
      category: 'task',
      message:  `Adding task: "${title}"`,
      level:    'info',
      data:     { priority, listId },
    })
    try {
      const task = await api.createTask({ title: title.trim(), note: note.trim(), due, priority, listId, done: false })
      setTasks(prev => [task, ...prev])
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  async function toggleTask(id) {
    const task = tasks.find(t => t.id === id)
    Sentry.addBreadcrumb({
      category: 'task',
      message:  `Toggling task "${task?.title}" → ${!task?.done}`,
      level:    'info',
      data:     { taskId: id, newState: !task?.done },
    })
    try {
      const updated = await api.updateTask(id, { done: !task.done })
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  async function deleteTask(id) {
    const task = tasks.find(t => t.id === id)
    Sentry.addBreadcrumb({
      category: 'task',
      message:  `Deleting task "${task?.title}"`,
      level:    'warning',
      data:     { taskId: id, priority: task?.priority, listId: task?.listId },
    })
    try {
      await api.deleteTask(id)
      setTasks(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  async function saveTask(id, updates) {
    Sentry.addBreadcrumb({
      category: 'task',
      message:  `Saving edits to task ${id}`,
      level:    'info',
      data:     updates,
    })
    try {
      const updated = await api.updateTask(id, updates)
      setTasks(prev => prev.map(t => t.id === id ? updated : t))
      setEditingTask(null)
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  // ── List actions ────────────────────────────────────────────────────────────

  async function addList(name) {
    if (!name.trim()) return
    Sentry.addBreadcrumb({ category: 'list', message: `Creating list: "${name}"`, level: 'info' })
    try {
      const list = await api.createList({
        name: name.trim(),
        icon:  randomPick(LIST_EMOJIS),
        color: randomPick(LIST_COLORS),
      })
      setLists(prev => [...prev, list])
    } catch (err) {
      Sentry.captureException(err)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div style={{ padding: '40px', fontFamily: 'system-ui' }}>Loading...</div>

  return (
    <Sentry.ErrorBoundary fallback={<p>Something went wrong. Refresh to try again.</p>}>
      <>
        <Sidebar
          lists={lists}
          tasks={tasks}
          activeList={activeList}
          onSelectList={setActiveList}
          onAddList={addList}
        />
        <Main
          lists={lists}
          tasks={tasks}
          activeList={activeList}
          filter={filter}
          sort={sort}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onAddTask={addTask}
          onToggleTask={toggleTask}
          onDeleteTask={deleteTask}
          onEditTask={setEditingTask}
        />
        {editingTask && (
          <EditModal
            task={editingTask}
            onSave={saveTask}
            onClose={() => setEditingTask(null)}
          />
        )}
        <DebugPanel />
      </>
    </Sentry.ErrorBoundary>
  )
}
