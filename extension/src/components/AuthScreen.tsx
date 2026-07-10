import { useState } from 'react';
import { useApp } from '../context/AppContext';

export function AuthScreen() {
  const { signIn, signUp, authError } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg text-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-semibold text-white mb-1">Connect to Supabase</h1>
        <p className="text-sm text-gray-400 mb-6">
          Sign in to load and sync your workspaces, folders, and tabs.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 bg-dark-elevated border border-dark-border rounded-lg px-3 text-sm text-gray-200 focus:outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 bg-dark-elevated border border-dark-border rounded-lg px-3 text-sm text-gray-200 focus:outline-none focus:border-primary"
              placeholder="At least 6 characters"
            />
          </div>

          {(localError || authError) && (
            <p className="text-sm text-red-400">{localError || authError}</p>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          onClick={() => setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'))}
          className="mt-4 text-sm text-primary hover:underline"
        >
          {mode === 'signin' ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
}
