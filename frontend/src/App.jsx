import { useEffect, useState } from 'react'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1' })

export default function App() {
  const [token, setToken] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'

  // auth fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // tasks
  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (token) {
      api.get('/tasks', { headers: { Authorization: `Bearer ${token}` } }).then(r => setTasks(r.data.tasks))
    }
  }, [token])

  const login = async () => {
    const r = await api.post('/auth/login', { email, password })
    setToken(r.data.token)
  }

  const register = async () => {
    const r = await api.post('/auth/register', { username, email, password })
    setToken(r.data.token)
  }

  const logout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    setToken('')
    setMode('login')
  }

  const addTask = async () => {
    const r = await api.post('/tasks', { title }, { headers: { Authorization: `Bearer ${token}` } })
    setTasks(prev => [...prev, r.data])
    setTitle('')
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
              {tasks.map(t => (
                <li key={t.id} className="border border-gray-200 rounded px-3 py-2 bg-white text-gray-800">{t.title}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
} 