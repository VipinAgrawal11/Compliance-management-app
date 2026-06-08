import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/Misc';

export function Login() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (session) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError(error);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-700 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500">
            <ShieldCheck size={30} className="text-navy-900" />
          </div>
          <h1 className="mt-3 text-2xl font-bold text-white">Compliance Manager</h1>
          <p className="text-sm text-navy-200">Audit firm compliance &amp; engagements</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@auditfirm.com"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" className="btn-gold w-full" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : <LogIn size={18} />}
            Sign In
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-navy-200">
          Works offline once installed. Your session is remembered on this device.
        </p>
      </div>
    </div>
  );
}
