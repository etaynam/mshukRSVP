import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Home } from 'lucide-react';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError('שגיאה בהתחברות. אנא בדקו את פרטי ההתחברות.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Link 
        to="/" 
        className="fixed top-4 right-4 text-emerald-500/70 hover:text-emerald-400 transition-colors"
        title="חזרה לדף הראשי"
      >
        <Home className="w-6 h-6" />
      </Link>

      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl text-center text-white mb-8">התחברות למערכת ניהול</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="אימייל"
              className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50"
            />
          </div>
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="סיסמה"
              className="w-full px-4 py-3 bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-300/50"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            התחבר
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;