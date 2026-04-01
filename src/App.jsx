import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Main from './components/Main'
import EditModal from './components/EditModal'

export const DEFAULT_LISTS = [
  { id: 'all',     name: 'All Tasks', icon: '📋', color: '#007aff', system: true },
  { id: 'today',   name: 'My Day',    icon: '☀️',  color: '#ff9500', system: true },
  { id: 'starred', name: 'Important', icon: '⭐', color: '#ff3b30', system: true },
]

const EMOJIS = ['📁','🎯','💡','🏃','📚','🎵','🍕','🌿','🔧','🎨']
const COLORS = ['#007aff','#34c759','#ff9500','#ff3b30','#af52de','#5856d6','#00c7be','#ff2d55']

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function todayStr() { return new Date().toISOString().slice(0, 10) }

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('todos-state') || 'null')
    if (s && s.tasks && s.lists) return s
  } catch (e) {}
  return {
    tasks: [
      { id: uid(), title: 'Welcome to Todos!', note: 'Tap the circle to complete a task.', done: false, priority: 'low', due: '', listId: 'personal', createdAt: Date.now() },
      { id: uid(), title: 'Add your first task', note: '', done: false, priority: '', due: todayStr(), listId: 'personal', createdAt: Date.now() - 1 },
      { id: uid(), title: 'Try editing a task', note: 'Click the pencil icon when hovering.', done: true, priority: 'high', due: '', listId: 'work', createdAt: Date.now() - 2 },
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

export default function App() {
  const initial = loadState()
  const [tasks, setTasks] = useState(initial.tasks)
  const [lists, setLists] = useState(initial.lists)
  const [activeList, setActiveList] = useState(initial.activeList)
  const [filter, setFilter] = useState(initial.filter)
  const [sort, setSort] = useState(initial.sort)
  const [editingTask, setEditingTask] = useState(null)

  useEffect(() => {
    localStorage.setItem('todos-state', JSON.stringify({ tasks, lists, activeList, filter, sort }))
  }, [tasks, lists, activeList, filter, sort])

  function addTask(title, note, due, priority) {
    if (!title.trim()) return
    const listId = DEFAULT_LISTS.find(l => l.id === activeList)
      ? (lists[0] ? lists[0].id : 'personal')
      : activeList
    setTasks(prev => [{
      id: uid(), title: title.trim(), note: note.trim(),
      done: false, priority, due, listId, createdAt: Date.now(),
    }, ...prev])
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

  function addList(name) {
    if (!name.trim()) return
    setLists(prev => [...prev, {
      id: uid(),
      name: name.trim(),
      icon: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }])
  }

  return (
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
  )
}
