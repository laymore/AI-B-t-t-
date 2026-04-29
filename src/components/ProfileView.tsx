import { motion } from 'motion/react';
import { User as UserCircle, Mail, CreditCard, Sparkles, LogOut, ShieldCheck, Zap, History, BarChart3, RotateCcw } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { db, logout, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';
import { useState, useEffect } from 'react';

interface UserData {
  credits: number;
  lastFreeUsed?: any;
  deviceId?: string;
}

interface GlobalStats {
  dailyTokens: number;
  totalSales?: number;
  uniqueVIPs?: number;
  totalRevenue?: number;
  lastResetDate: string;
}

export default function ProfileView({ user }: { user: FirebaseUser | null }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  const isAdmin = user?.email === 'anph100387@gmail.com';

  useEffect(() => {
    if (!user) return;
    const userDocRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserData(doc.data() as UserData);
      }
    });

    const statsDocRef = doc(db, 'system', 'stats');
    const unsubStats = onSnapshot(statsDocRef, (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data() as GlobalStats);
      }
    });

    return () => {
      unsub();
      unsubStats();
    };
  }, [user]);

  const handleRecharge = async () => {
    if (!user) return;
    setIsLoadingCredits(true);
    const userDocRef = doc(db, 'users', user.uid);
    const statsDocRef = doc(db, 'system', 'stats');
    try {
      const isFirstTime = !userData?.credits || userData.credits === 0;

      await updateDoc(userDocRef, {
        credits: increment(50)
      });
      
      // Update global revenue stats
      await updateDoc(statsDocRef, {
        totalSales: increment(1),
        totalRevenue: increment(50000),
        ...(isFirstTime ? { uniqueVIPs: increment(1) } : {})
      });

      alert('Đã nạp thành công 50 lượt VIP (Demo mode)');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsLoadingCredits(false);
    }
  };

  const handleResetStats = async () => {
    if (!isAdmin) return;
    const statsDocRef = doc(db, 'system', 'stats');
    try {
      await updateDoc(statsDocRef, { dailyTokens: 0 });
      alert('Đã reset thống kê hệ thống');
    } catch (err) {
       handleFirestoreError(err, OperationType.WRITE, 'system/stats');
    }
  };

  if (!user) return null;

  return (
    <div className="h-full overflow-y-auto px-4 md:px-12 py-10 pb-32">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Profile Section */}
        <div className="flex flex-col md:flex-row items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-xl transition-all hover:bg-white/[0.08]">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 p-1 shadow-2xl">
            <div className="w-full h-full rounded-full bg-[#0f172a] flex items-center justify-center overflow-hidden border-4 border-[#0f172a]">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-12 h-12 text-slate-400" />
              )}
            </div>
          </div>
          <div className="text-center md:text-left flex-1">
            <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
              <h1 className="text-3xl font-black text-white tracking-tight">{user.displayName || 'Khách hàng'}</h1>
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[10px] uppercase font-black rounded border border-rose-500/30 w-fit">
                  <ShieldCheck className="w-3 h-3" /> Quản trị viên
                </span>
              )}
            </div>
            <p className="flex items-center justify-center md:justify-start gap-2 text-slate-400 font-mono text-xs">
              <Mail className="w-3 h-3 text-slate-600" /> {user.email}
            </p>
            <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-3">
               <button 
                onClick={() => logout()}
                className="px-4 py-2 bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/10 hover:border-rose-500/30 rounded-full text-xs font-bold transition-all flex items-center gap-2"
               >
                 <LogOut className="w-4 h-4" /> Đăng xuất
               </button>
            </div>
          </div>
        </div>

        {/* Global Admin Stats */}
        {isAdmin && (
          <div className="bg-rose-600/5 border border-rose-500/20 p-8 rounded-[3rem] backdrop-blur-xl">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center border border-rose-500/30 shadow-lg">
                    <BarChart3 className="w-6 h-6 text-rose-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Hệ Thống (Admin)</h3>
                </div>
                <button 
                  onClick={handleResetStats}
                  className="p-2 hover:bg-rose-500/20 rounded-full text-rose-400 transition-all active:rotate-180 duration-500"
                  title="Reset daily stats"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
             </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-5 bg-black/20 rounded-2xl border border-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Token sử dụng hôm nay</p>
                   <div className="flex items-end gap-2">
                     <span className={`text-3xl font-black ${(globalStats?.dailyTokens || 0) > 800000 ? 'text-rose-400' : 'text-white'}`}>
                       {globalStats?.dailyTokens?.toLocaleString() || 0}
                     </span>
                     <span className="text-slate-600 font-mono text-sm mb-1">/ 1,000,000</span>
                   </div>
                   <div className="mt-3 w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${(globalStats?.dailyTokens || 0) > 800000 ? 'bg-rose-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (globalStats?.dailyTokens || 0) / 10000)}%` }}
                      />
                   </div>
                </div>
                <div className="p-5 bg-black/20 rounded-2xl border border-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Doanh thu nạp VIP</p>
                   <div className="flex items-end gap-2">
                     <span className="text-3xl font-black text-emerald-400">
                       {(globalStats?.totalRevenue || 0).toLocaleString('vi-VN')}
                     </span>
                     <span className="text-slate-600 font-mono text-sm mb-1">VNĐ</span>
                   </div>
                   <p className="mt-2 text-[10px] text-slate-500 font-bold">
                     {globalStats?.uniqueVIPs || 0} users VIP • {globalStats?.totalSales || 0} lượt nạp
                   </p>
                </div>
                <div className="p-5 bg-black/20 rounded-2xl border border-white/5">
                   <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Ngày cập nhật</p>
                   <p className="text-xl font-bold text-white">{globalStats?.lastResetDate || 'N/A'}</p>
                </div>
             </div>

             {/* Profit Estimator Section */}
             <div className="mt-6 p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wider">Kinh tế hệ thống (Gemini 3 Flash)</h4>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div>
                     <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Chi phí AI/Ngày</p>
                     <p className="text-sm font-mono text-rose-400">~{((globalStats?.dailyTokens || 0) * 0.00025).toLocaleString('vi-VN')} VNĐ</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Doanh thu/Lượt VIP</p>
                     <p className="text-sm font-mono text-emerald-400">1,000 VNĐ</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Vốn AI/Lượt</p>
                     <p className="text-sm font-mono text-slate-400">~15 VNĐ</p>
                   </div>
                   <div>
                     <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Lợi nhuận gộp/50 lượt</p>
                     <p className="text-sm font-mono text-blue-400">~49,250 VNĐ</p>
                   </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                   <p className="text-[10px] text-slate-500 font-medium font-mono">
                     * Hệ thống hiện dùng 100% Gemini 3 Flash để đảm bảo tốc độ phản hồi nhanh nhất. 
                     Mô hình này tối ưu hóa chi phí và hiệu năng vượt trội.
                   </p>
                </div>
             </div>
          </div>
        )}

        {/* AI Usage Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 p-8 rounded-[3rem] backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24 text-blue-400" />
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/20">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Tài Khoản AI</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-end gap-3 font-mono">
                <span className="text-5xl font-black text-white">{userData?.credits || 0}</span>
                <span className="text-slate-400 text-sm mb-2 font-bold uppercase tracking-widest">Lượt VIP</span>
              </div>
              
              <p className="text-slate-400 text-sm leading-relaxed max-w-xs font-medium">
                Mỗi lượt VIP cho phép phân tích chuyên sâu (max 4k token output) và không bị giới hạn 1 lượt/tuần.
              </p>

              <button 
                onClick={handleRecharge}
                disabled={isLoadingCredits}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-3xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
              >
                {isLoadingCredits ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    NẠP 50 LƯỢT VIP (50K)
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-xl flex flex-col">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/20">
                <History className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Quyền Lợi Free</h3>
            </div>
            
            <div className="flex-1 space-y-4">
               <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Lượt miễn phí</p>
                 <p className="text-lg font-bold text-white">1 lượt/tuần</p>
               </div>
               <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                 <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Max Output</p>
                 <p className="text-lg font-bold text-white">1,024 tokens</p>
               </div>
               <div className="mt-auto pt-6 border-t border-white/5">
                 <p className="text-[10px] text-slate-500 font-medium italic">
                   Lượt miễn phí tự động cấp mỗi 7 ngày. Phù hợp cho luận giải tổng quát.
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
