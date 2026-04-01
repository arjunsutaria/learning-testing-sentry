import { useState } from 'react'
import { DEFAULT_LISTS } from '../App'

function todayStr() { return new Date().toISOString().slice(0, 10) }

function getCount(listId, tasks) {
  if (listId === 'all')     return tasks.filter(t => !t.done).length
  if (listId === 'today')   return tasks.filter(t => t.due === todayStr() && !t.done).length
  if (listId === 'starred') return tasks.filter(t => t.priority === 'high' && !t.done).length
  return tasks.filter(t => t.listId === listId && !t.done).length
}

export default function Sidebar({ lists, tasks, activeList, onSelectList, onAddList }) {
  const [showNewList, setShowNewList] = useState(false)
  const [newListName, setNewListName] = useState('')

  const allLists = [...DEFAULT_LISTS, ...lists]

  function confirmNewList() {
    onAddList(newListName)
    setNewListName('')
    setShowNewList(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') confirmNewList()
    if (e.key === 'Escape') {
      setNewListName('')
      setShowNewList(false)
    }
  }

  return (
    <nav className="sidebar">
      <div className="sidebar-header">Lists</div>
      <div className="sidebar-section-title">My Lists</div>

      <div>
        {allLists.map(list => {
          const count = getCount(list.id, tasks)
          const active = list.id === activeList
          return (
            <div
              key={list.id}
              className={`list-item${active ? ' active' : ''}`}
              onClick={() => onSelectList(list.id)}
            >
              <div
                className="list-icon"
                style={{
                  background: active ? 'rgba(255,255,255,0.2)' : list.color + '22',
                  color: list.color,
                }}
              >
                {list.icon}
              </div>
              <span className="list-label">{list.name}</span>
              {count > 0 && <span className="list-count">{count}</span>}
            </div>
          )
        })}
      </div>

      {showNewList ? (
        <div className="new-list-row">
          <input
            className="new-list-input"
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(confirmNewList, 150)}
            placeholder="List name…"
            maxLength={30}
            autoFocus
          />
        </div>
      ) : (
        <button className="add-list-btn" onClick={() => setShowNewList(true)}>
          <span style={{ fontSize: '18px', lineHeight: 1 }}>+</span> Add List
        </button>
      )}
    </nav>
  )
}
