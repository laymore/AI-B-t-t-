import { useState, useEffect, FormEvent } from 'react';
import { Calendar, User, Star, Zap, Info, Plus, X, Search, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BaziProfile } from '../types/bazi';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { calculateBazi } from '../lib/baziCalculator';
import { handleFirestoreError, OperationType } from '../lib/firebase';

export default function Dashboard({ user }: { user: FirebaseUser | null }) {
  const [profile, setProfile] = useState<BaziProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ'>('Nam');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Logic dọn dẹp và đồng bộ: Tìm kiếm tất cả profile của user
    const q = query(collection(db, 'profiles'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Lấy bản ghi đầu tiên làm chính
        const docData = snapshot.docs[0].data();
        let currentProfile = { id: snapshot.docs[0].id, ...docData } as BaziProfile;
        
        // Kiểm tra dữ liệu cũ (thiếu Thập Thần hoặc Ngũ Hành) thì tính toán lại
        if (currentProfile.pillars.day && !currentProfile.pillars.day.stemTenGod) {
          const recalculated = calculateBazi(new Date(currentProfile.birthDate));
          currentProfile = { ...currentProfile, ...recalculated };
        }
        
        setProfile(currentProfile);

        // Nếu có nhiều hơn 1 bản ghi (lỗi lặp từ trước), tự động xóa các bản cũ
        if (snapshot.docs.length > 1) {
          snapshot.docs.slice(1).forEach(async (d) => {
            try { await deleteDoc(d.ref); } catch(e) { 
              handleFirestoreError(e, OperationType.DELETE, `profiles/${d.id}`);
            }
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'profiles');
        setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !name || !birthDate || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const date = new Date(birthDate);
      const baziData = calculateBazi(date);

      // Lưu đè hoặc tạo mới theo ID là UID để đảm bảo tính duy nhất
      const profileData = {
        userId: user.uid,
        name,
        gender,
        birthDate: date.toISOString(),
        ...baziData,
        updatedAt: serverTimestamp()
      };

      // Sử dụng setDoc với ID cố định (UID) để không bao giờ bị lặp lại
      await setDoc(doc(db, 'profiles', user.uid), profileData);
      setIsFormOpen(false);
      setName('');
      setBirthDate('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${user.uid}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 h-full bg-transparent overflow-y-auto relative z-10" id="bazi-dashboard">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight uppercase font-sans">
            Lá Số <span className="text-blue-500 italic">Bát Tự</span>
          </h1>
          <p className="text-slate-400 mt-1 uppercase text-[10px] tracking-[0.2em] font-bold">Trường Phái Thiệu Vỹ Hoa</p>
        </div>
        
        <button 
          onClick={() => {
            if (profile) {
              setName(profile.name);
              const d = new Date(profile.birthDate);
              const offset = d.getTimezoneOffset() * 60000;
              const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
              setBirthDate(localISOTime);
              setGender(profile.gender);
            }
            setIsFormOpen(true);
          }}
          className="w-full md:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold px-6 md:px-8 py-3 rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 active:scale-95"
        >
          <Zap className="w-4 h-4 fill-white" /> {profile ? 'Cập Nhật Lá Số' : 'Lập Lá Số Mới'}
        </button>
      </div>

      <div id="main-profile-container" className="max-w-4xl mx-auto">
        {!profile ? (
          <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 border-2 border-dashed border-white/10 rounded-[3rem]">
            <Search className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 text-sm">Chưa có thông tin lá số. Hãy nhập thông tin ngay!</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between mb-10 relative z-10 gap-6">
              <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-slate-800/50 border border-white/10 flex items-center justify-center shadow-2xl">
                  <User className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{profile.name}</h3>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2">
                    <p className="text-sm text-slate-400 flex items-center gap-2 font-medium">
                      <Calendar className="w-4 h-4 text-slate-600" /> {new Date(profile.birthDate).toLocaleString('vi-VN', { hour12: false })}
                    </p>
                    <span className="text-slate-600">|</span>
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{profile.gender}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center md:items-end gap-3">
                <span className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest border-2 ${
                  profile.strength.includes('Vượng') ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-rose-500/10 border-rose-500/50 text-rose-400'
                }`}>
                  {profile.strength}
                </span>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter italic">Cố vấn bởi Bát Tự Studio</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {[
                { label: 'Giờ Sinh', data: profile.pillars.hour },
                { label: 'Ngày Sinh', data: profile.pillars.day },
                { label: 'Tháng Sinh', data: profile.pillars.month },
                { label: 'Năm Sinh', data: profile.pillars.year },
              ].map((pillar, pIdx) => (
                <div key={pIdx} className="bg-black/40 rounded-3xl p-6 border border-white/5 text-center flex flex-col items-center justify-center shadow-xl hover:border-blue-500/30 transition-all gap-1">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-3 font-black">{pillar.label}</span>
                  
                  <div className="flex flex-col items-center mb-2">
                    <p className="text-2xl md:text-3xl font-black text-white leading-none">{pillar.data.stem || '?'}</p>
                    <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">
                      {pillar.data.stemElement || 'N/A'} {pillar.label === 'Ngày Sinh' ? '(Chủ)' : `(${pillar.data.stemTenGod || '?'})`}
                    </p>
                  </div>

                  <div className="w-12 h-[1px] bg-white/5 mb-2" />

                  <div className="flex flex-col items-center">
                    <p className="text-2xl md:text-3xl font-black text-blue-400 leading-none">{pillar.data.branch || '?'}</p>
                    <p className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase mt-1">
                      {pillar.data.branchElement || 'N/A'} ({pillar.data.branchTenGod || '?'})
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-white/5 relative z-10">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] uppercase text-slate-500 tracking-widest mb-1 font-black italic">Nhật Chủ</p>
                <p className="text-xl font-bold text-white flex items-center gap-2">
                  {profile.dayMaster} <span className="text-xs font-normal text-slate-400">(Mệnh)</span>
                </p>
              </div>
              
              <div className="bg-white/5 p-5 rounded-2xl border border-white/5">
                <p className="text-[10px] uppercase text-slate-500 tracking-widest mb-1 font-black italic">Dụng Thần</p>
                <p className="text-xl font-bold text-emerald-400">Đang phân tích...</p>
              </div>

              <div className="bg-blue-600/10 p-5 rounded-2xl border border-blue-500/20 flex items-center justify-between group cursor-pointer hover:bg-blue-600/20 transition-all">
                <div>
                  <p className="text-[10px] uppercase text-blue-400 tracking-widest mb-1 font-black italic">Đại Vận</p>
                  <p className="text-sm font-bold text-white">Xem tại Cố Vấn AI</p>
                </div>
                <Info className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl md:text-3xl font-bold text-white mb-1 uppercase tracking-tight">Thông Tin Bát Tự</h2>
              <p className="text-slate-400 text-sm mb-6">Nhập thông tin để hệ thống lập lá số mới cho bạn.</p>

              <form onSubmit={handleCreate} className="space-y-4 md:space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Họ và Tên</label>
                  <input 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    type="text" 
                    placeholder="Nguyễn Thế Studio"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Giới Tính</label>
                    <select 
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-white focus:outline-none transition-all appearance-none font-medium"
                    >
                      <option className="bg-slate-900" value="Nam">Nam</option>
                      <option className="bg-slate-900" value="Nữ">Nữ</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Ngày Giờ Sinh (24h)</label>
                    <input 
                      required
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      type="datetime-local" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-3 md:p-4 text-white focus:outline-none transition-all block [color-scheme:dark] font-medium"
                    />
                  </div>
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit"
                  className="w-full py-4 bg-white text-blue-900 font-bold rounded-xl shadow-xl hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-blue-900" />} {profile ? 'Cập Nhật Hồ Sơ' : 'Lập Lá Số'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
