import { useState, useEffect } from 'react'
import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1'
})

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [mode, setMode] = useState('login') // 'login' | 'register'

  // auth fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // tasks
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState({})

  // Load tasks when token changes
  useEffect(() => {
    if (token) {
      loadTasks()
    }
  }, [token])

  const saveToken = (newToken) => {
    setToken(newToken)
    localStorage.setItem('token', newToken)
  }

  const clearToken = () => {
    setToken('')
    localStorage.removeItem('token')
  }

  const loadTasks = async () => {
    try {
      const r = await api.get('/tasks', { headers: { Authorization: `Bearer ${token}` } })
      const list = Array.isArray(r.data) ? r.data : (r.data?.tasks || [])
      setTasks(list.filter(Boolean))
    } catch (e) {
      console.error('Failed to load tasks:', e)
      setTasks([])
    }
  }

  const register = async () => {
    try {
      const r = await api.post('/auth/register', { username, email, password })
      saveToken(r.data.token)
    } catch (e) {
      alert(e.response?.data?.message || 'Registration failed')
    }
  }

  const login = async () => {
    try {
      const r = await api.post('/auth/login', { email, password })
      saveToken(r.data.token)
    } catch (e) {
      alert(e.response?.data?.message || 'Login failed')
    }
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    clearToken()
    setMode('login')
  }

  const addTask = async () => {
    try {
      const r = await api.post('/tasks', { title }, { headers: { Authorization: `Bearer ${token}` } })
      const newTask = r.data?.task || r.data
      if (newTask) {
        setTasks(prev => [...prev, newTask])
      }
      setTitle('')
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to add task')
    }
  }

  const toggleTask = async (task) => {
    try {
      setLoading(prev => ({ ...prev, [task.id]: true }))
      const r = await api.put(`/tasks/${task.id}`, { is_completed: !task.is_completed }, { headers: { Authorization: `Bearer ${token}` } })
      const updated = r.data?.task || r.data
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to update task')
    } finally {
      setLoading(prev => ({ ...prev, [task.id]: false }))
    }
  }

  const removeTask = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`, { headers: { Authorization: `Bearer ${token}` } })
      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to delete task')
    }
  }

  const inputCls = "border border-gray-300 bg-white text-gray-900 placeholder-gray-400 px-3 py-2 rounded"
  const btnBlue = "bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded"
  const btnGreen = "bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded"

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-start justify-center py-10">
      <div className="w-full max-w-xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-800">TaskManager</h1>
          {token && (
            <button onClick={logout} className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded">Logout</button>
          )}
        </div>

        {!token && (
          <div className="bg-white p-5 rounded shadow">
            <div className="flex gap-3 mb-4">
              <button className={`px-3 py-1 rounded ${mode==='login'?'bg-blue-600 text-white':'bg-gray-200 text-gray-800'}`} onClick={()=>setMode('login')}>Login</button>
              <button className={`px-3 py-1 rounded ${mode==='register'?'bg-blue-600 text-white':'bg-gray-200 text-gray-800'}`} onClick={()=>setMode('register')}>Register</button>
            </div>

            {mode === 'login' ? (
              <div className="flex flex-col gap-3">
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" className={inputCls} />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" className={inputCls} />
                <button onClick={login} className={btnBlue}>Login</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="username" className={inputCls} />
                <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" className={inputCls} />
                <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" className={inputCls} />
                <button onClick={register} className={btnGreen}>Create account</button>
              </div>
            )}
          </div>
        )}

        {token && (
          <div className="bg-white p-5 rounded shadow">
            <div className="flex gap-3 mb-4">
              <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="New task title" className={`${inputCls} flex-1`} />
              <button onClick={addTask} className={btnGreen}>Add</button>
            </div>
            <ul className="space-y-2">
              {(Array.isArray(tasks) ? tasks : []).filter(Boolean).map(t => (
                <li key={t.id ?? Math.random()} className={`border border-gray-200 rounded px-3 py-2 bg-white text-gray-800 flex items-center justify-between ${t?.is_completed ? 'opacity-70' : ''}`}>
                  <div className="flex items-center gap-3">
                    {loading[t.id] ? (
                      <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    ) : (
                      <input type="checkbox" checked={!!t?.is_completed} onChange={() => toggleTask(t)} />
                    )}
                    <span className={t?.is_completed ? 'line-through' : ''}>{t?.title ?? 'Untitled task'}</span>
                  </div>
                  <button disabled={!!loading[t.id]} onClick={() => removeTask(t.id)} className={`text-sm ${loading[t.id] ? 'opacity-50 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} text-white px-2 py-1 rounded`}>Delete</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
} 