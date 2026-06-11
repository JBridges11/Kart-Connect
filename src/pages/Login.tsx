import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input } from '@/components/ui'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError(err.message)
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-2 mb-8">
        <Zap size={28} className="text-accent-primary fill-accent-primary" />
        <span className="font-heading text-3xl font-bold tracking-widest text-text-primary uppercase">
          Kart Connect
        </span>
      </div>

      <div className="bg-bg-card border border-border-color rounded-card p-6">
        <h2 className="font-heading text-xl font-bold tracking-wide uppercase text-text-primary mb-5">
          Sign In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-sm text-accent-secondary bg-accent-secondary/10 border border-accent-secondary/20 rounded-card px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-text-muted mt-4">
        No account?{' '}
        <Link to="/register" className="text-accent-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
