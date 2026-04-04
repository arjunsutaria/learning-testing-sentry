import * as Sentry from '@sentry/react'
import { useState, useEffect } from 'react'
import { uid, todayStr, DEFAULT_LISTS, LIST_EMOJIS, LIST_COLORS, randomPick } from './utils'
import Sidebar from './components/Sidebar'
import Main from './components/Main'
import EditModal from './components/EditModal'


// ── Default data shown on first load ─────────────────────────────────────────

function getDefaultState() {
  return {
    tasks: [
      { id: uid(), title: 'Welcome to Todos!',   note: 'Tap the circle to complete a task.',    done: false, priority: 'low',  due: '',         listId: 'personal', createdAt: Date.now() },
      { id: uid(), title: 'Add your first task', note: '',                                      done: false, priority: '',     due: todayStr(), listId: 'personal', createdAt: Date.now() - 1 },
      { id: uid(), title: 'Try editing a task',  note: 'Click the pencil icon when hovering.',  done: true,  priority: 'high', due: '',         listId: 'work',     createdAt: Date.now() - 2 },
    ],
    lists: [
      { id: 'personal', name: 'Personal', icon: '🏠', color: '#34c759' },
      { id: 'work',     name: 'Work',     icon: '💼', color: '#007aff' },
      { id: 'shopping', name: 'Shopping', icon: '🛒', color: '#ff9500' },
    ],
    activeList: 'all',
    filter: 'all',
    sort: 'default',
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('todos-state') || 'null')
    if (saved?.tasks && saved?.lists) return saved
  } catch (e) {}
  return getDefaultState()
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // Lazy initializer so loadState() only runs once, not on every render
  const [tasks, setTasks]           = useState(() => loadState().tasks)
  const [lists, setLists]           = useState(() => loadState().lists)
  const [activeList, setActiveList] = useState(() => loadState().activeList)
  const [filter, setFilter]         = useState(() => loadState().filter)
  const [sort, setSort]             = useState(() => loadState().sort)
  const [editingTask, setEditingTask] = useState(null)

  // Persist to localStorage whenever anything changes
  useEffect(() => {
    localStorage.setItem('todos-state', JSON.stringify({ tasks, lists, activeList, filter, sort }))
  }, [tasks, lists, activeList, filter, sort])

  // ── Task actions ────────────────────────────────────────────────────────────

  function addTask({ title, note, due, priority }) {
    if (!title.trim()) return
    // If a smart list (All / My Day / Important) is active, assign to the first real list
    const listId = DEFAULT_LISTS.some(l => l.id === activeList)
      ? (lists[0]?.id ?? 'personal')
      : activeList
    setTasks(prev => [
      { id: uid(), title: title.trim(), note: note.trim(), done: false, priority, due, listId, createdAt: Date.now() },
      ...prev,
    ])
  }

  function toggleTask(id) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  function deleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function saveTask(id, updates) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    setEditingTask(null)
  }

  // ── List actions ────────────────────────────────────────────────────────────

  function addList(name) {
    if (!name.trim()) return
    setLists(prev => [
      ...prev,
      { id: uid(), name: name.trim(), icon: randomPick(LIST_EMOJIS), color: randomPick(LIST_COLORS) },
    ])
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>

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
    </>
    </Sentry.ErrorBoundary>
  )
}
