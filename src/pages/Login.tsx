import { useState, FormEvent } from 'react';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { LogIn, Github } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      let loginEmail = email;
      if (!email.includes('@')) {
        loginEmail = `${email.trim().toLowerCase()}@sikat.id`;
      }
      await signInWithEmailAndPassword(auth, loginEmail, password);
    } catch (err: any) {
      setError('Username/Email atau password salah.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      setError('Gagal login dengan Google.');
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans antialiased text-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded flex items-center justify-center font-bold text-2xl text-white mx-auto mb-4 shadow-lg shadow-indigo-500/20">S</div>
          <h1 className="text-2xl font-bold tracking-tight text-indigo-950 uppercase">SIKAT</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Dinas Sosial Republik Indonesia</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl shadow-slate-200/50 p-8 border border-slate-200">
          <form onSubmit={handleEmailLogin} className="space-y-6">
            {error && (
              <div className="p-3 bg-rose-50 text-rose-600 text-[11px] font-bold rounded-md border border-rose-100 uppercase tracking-wider">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Username / Email Institusi</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-semibold"
                placeholder="cth: budi_dinsos"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Kata Sandi</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-md shadow-sm shadow-indigo-100 transition-all flex items-center justify-center gap-2 uppercase text-xs tracking-widest active:scale-[0.98]"
            >
              <LogIn size={16} />
              {loading ? 'MENGECEK...' : 'MASUK KE SISTEM'}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-[10px]">
                <span className="px-4 bg-white text-slate-300 font-bold tracking-widest uppercase">Pilihan Akses Lain</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              className="mt-6 w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-200 rounded-md text-slate-600 font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-all active:scale-[0.98]"
            >
              <img 
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                className="w-5 h-5" 
                alt="Google" 
                referrerPolicy="no-referrer"
              />
              SINKRONISASI GOOGLE
            </button>
          </div>
        </div>
        
        <p className="text-center mt-12 text-slate-400 text-[10px] uppercase font-bold tracking-[0.2em]">
          &copy; 2026 DINAS SOSIAL &bull; MONITORING KEGIATAN V1.0
        </p>
      </div>
    </div>
  );
}
