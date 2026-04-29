import { useState, useEffect } from 'react';
import { db, auth, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import Sidebar from './components/Sidebar';
import ProjectGrid from './components/ProjectGrid';
import ChatInterface from './components/ChatInterface';
import CalendarView from './components/CalendarView';
import ProfileView from './components/ProfileView';
import { User as UserIcon, Bell, LogIn, LogOut, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#0f172a] text-slate-100 font-sans overflow-hidden relative">
      {/* Mesh Gradient Background Decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Sidebar for Desktop / Bottom Nav for Mobile */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 md:h-16 border-b border-white/10 bg-white/5 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 relative z-20">
          <div className="flex items-center gap-2 md:gap-4 flex-1">
            <span className="text-[9px] md:text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded border border-white/10">
              STU v1.2
            </span>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 uppercase tracking-tight">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {!user ? (
              <button 
                onClick={signInWithGoogle}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-xs md:text-sm font-bold transition-all shadow-lg"
              >
                <LogIn className="w-4 h-4" /> <span className="hidden sm:inline">Google</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 md:gap-4">
                <button className="p-1.5 text-slate-400 hover:text-white transition-colors relative">
                  <Bell className="w-4 md:w-5 h-4 md:h-5" />
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                </button>
                <div className="h-6 w-[1px] bg-white/10" />
                <div className="flex items-center gap-2 md:gap-3 group relative cursor-pointer" onClick={() => { if (user?.email === 'anph100387@gmail.com' && window.confirm('Đăng xuất Admin?')) logout() }}>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold leading-none">{user.displayName?.split(' ').pop()}</p>
                  </div>
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden group-hover:border-blue-500/50 transition-all shadow-lg">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon className="w-4 md:w-5 h-4 md:h-5 text-slate-300" />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative pb-16 md:pb-0" id="app-content-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {!user && activeTab !== 'profile' ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 md:p-12">
                   <div className="w-16 md:w-20 h-16 md:h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                     <LogIn className="w-8 md:w-10 h-8 md:h-10 text-blue-400" />
                   </div>
                   <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-white">Yêu cầu đăng nhập</h2>
                   <p className="text-slate-400 max-w-sm mt-2 text-sm">Vui lòng đăng nhập để lưu trữ hồ sơ Bát Tự và sử dụng cố vấn AI dựa trên lá số cá nhân.</p>
                   <button 
                     onClick={signInWithGoogle}
                     className="mt-8 px-6 md:px-8 py-3 bg-white text-blue-900 rounded-full font-bold shadow-xl hover:scale-105 transition-transform text-sm"
                   >
                     Đăng nhập bằng Google
                   </button>
                </div>
              ) : (
                <>
                  {activeTab === 'dashboard' && <ProjectGrid user={user} />}
                  {activeTab === 'chat' && <ChatInterface user={user} />}
                  {activeTab === 'calendar' && <CalendarView />}
                  {activeTab === 'profile' && <ProfileView user={user} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
