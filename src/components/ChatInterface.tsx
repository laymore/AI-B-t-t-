import { useState, useRef, useEffect } from 'react';
import { Send, User as UserIcon, Bot, Loader2, Sparkles, UserCircle, CreditCard, Clock, ShieldCheck, AlertCircle, LogOut, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithGemini } from '../lib/gemini';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType, logout } from '../lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, setDoc, serverTimestamp, getDoc, runTransaction, increment, orderBy, limit, addDoc } from 'firebase/firestore';
import { BaziProfile } from '../types/bazi';

type Message = {
  role: 'user' | 'model';
  text: string;
};

interface UserData {
  credits: number;
  lastFreeUsed?: any;
  deviceId?: string;
}

interface GlobalStats {
  dailyTokens: number;
  lastResetDate: string;
}

export default function ChatInterface({ user }: { user: FirebaseUser | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');

  const initialSuggestions = [
    "Vận hạn năm nay của tôi thế nào?",
    "Sự nghiệp của tôi có khởi sắc không?",
    "Dụng thần của tôi là gì và dùng sao cho đúng?",
    "Tình duyên của tôi trong 3 năm tới?",
    "Tôi có hợp kinh doanh bất động sản không?"
  ];

  const extractSuggestions = (text: string) => {
    const lines = text.split('\n');
    const suggestionLines = lines.filter(l => l.trim().startsWith('? '));
    if (suggestionLines.length > 0) {
      return suggestionLines.map(s => s.replace(/^\? /, '').trim()).slice(0, 3);
    }
    return [];
  };
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<BaziProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<BaziProfile | null>(null);
  const [userData, setUserData] = useState<UserData>({ credits: 0 });
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [isVipModalOpen, setIsVipModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.email === 'anph100387@gmail.com';
  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;

  // Device ID management
  const getDeviceId = () => {
    let id = localStorage.getItem('bazi_device_id');
    if (!id) {
      id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('bazi_device_id', id);
    }
    return id;
  };

  useEffect(() => {
    if (!user) return;

    const deviceId = getDeviceId();

    // Listen to user metadata (credits, etc)
    const userDocRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserData;
        setUserData(data);
        
        // Multi-account detection: if user has no deviceId, set it. 
        // If it has one and it's different FROM THIS DEVICE, we don't block here but we might later.
        if (!data.deviceId) {
          setDoc(userDocRef, { deviceId }, { merge: true });
        }
      } else {
        // Initialize user if not exists
        setDoc(userDocRef, { credits: 0, deviceId }, { merge: true }).catch(err => {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        });
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    });

    // Listen to global stats
    const statsDocRef = doc(db, 'system', 'stats');
    const unsubStats = onSnapshot(statsDocRef, (doc) => {
      if (doc.exists()) {
        setGlobalStats(doc.data() as GlobalStats);
      }
    });

    const fetchProfiles = async () => {
      try {
        const q = query(collection(db, 'profiles'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BaziProfile));
        setProfiles(data);
        if (data.length > 0) setSelectedProfile(data[0]);
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'profiles');
      }
    };

    const fetchChatHistory = async () => {
      try {
        const q = query(
          collection(db, 'chats'), 
          where('userId', '==', user.uid),
          orderBy('timestamp', 'asc'),
          limit(20)
        );
        const querySnapshot = await getDocs(q);
        const historyData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            role: data.role,
            text: data.parts[0].text
          } as Message;
        });
        setMessages(historyData);
      } catch (err) {
        // Soft fail for chat history to not block usage
        console.warn("Could not fetch chat history", err);
      }
    };

    fetchProfiles();
    fetchChatHistory();
    return () => {
      unsubUser();
      unsubStats();
    };
  }, [user]);

  const canAskFree = () => {
    if (isAdmin) return true;
    if (!userData.lastFreeUsed) return true;
    const lastDate = userData.lastFreeUsed.toDate();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return lastDate < oneWeekAgo;
  };

  const handleSend = async (retryText?: string) => {
    const currentInput = retryText || input;
    if (!currentInput.trim() || isLoading) return;
    
    setErrorMsg(null);
    setError(null);

    // 0. Check global limit
    const today = new Date().toISOString().split('T')[0];
    if (globalStats && globalStats.lastResetDate === today && globalStats.dailyTokens >= 1000000) {
      setErrorMsg("Máy chủ Bát Tự đã đạt giới hạn 1M token hôm nay. Xin vui lòng quay lại vào ngày mai.");
      return;
    }

    // 1. Check word count
    const wordsCount = currentInput.trim().split(/\s+/).length;
    if (wordsCount > 50) {
      setErrorMsg("Câu hỏi không được quá 50 từ.");
      return;
    }

    // 2. Check limits (Credits or Free weekly)
    const isFreeTurn = canAskFree();
    if (!isAdmin && !isFreeTurn && userData.credits <= 0) {
      setIsVipModalOpen(true);
      return;
    }

    // 3. Multi-account prevention (Simple check)
    const deviceId = getDeviceId();
    if (!isAdmin && userData.deviceId && userData.deviceId !== deviceId) {
      const usedUids = JSON.parse(localStorage.getItem('bazi_used_uids') || '[]');
      if (!usedUids.includes(user?.uid) && usedUids.length >= 2) {
        setErrorMsg("Thiết bị này đã sử dụng nhiều tài khoản. Vui lòng sử dụng tài khoản cũ để tiếp tục dùng lượt free.");
        return;
      }
      if (!usedUids.includes(user?.uid)) {
        usedUids.push(user?.uid);
        localStorage.setItem('bazi_used_uids', JSON.stringify(usedUids));
      }
    }

    if (!retryText) {
      const userMessage: Message = { role: 'user', text: input };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
    }
    
    setIsLoading(true);

    try {
      let baziContext = "";
      if (selectedProfile) {
        baziContext = `Hồ sơ khách hàng: ${selectedProfile.name}, Giới tính: ${selectedProfile.gender}, Ngày sinh: ${selectedProfile.birthDate}. 
        Lá số Bát Tự (Thiệu Vỹ Hoa):
        - Năm: ${selectedProfile.pillars.year.stem}(${selectedProfile.pillars.year.stemElement}-${selectedProfile.pillars.year.stemTenGod}) ${selectedProfile.pillars.year.branch}(${selectedProfile.pillars.year.branchElement}-${selectedProfile.pillars.year.branchTenGod})
        - Tháng: ${selectedProfile.pillars.month.stem}(${selectedProfile.pillars.month.stemElement}-${selectedProfile.pillars.month.stemTenGod}) ${selectedProfile.pillars.month.branch}(${selectedProfile.pillars.month.branchElement}-${selectedProfile.pillars.month.branchTenGod})
        - Ngày: ${selectedProfile.pillars.day.stem}(${selectedProfile.pillars.day.stemElement}-Nhật Chủ) ${selectedProfile.pillars.day.branch}(${selectedProfile.pillars.day.branchElement}-${selectedProfile.pillars.day.branchTenGod})
        - Giờ: ${selectedProfile.pillars.hour.stem}(${selectedProfile.pillars.hour.stemElement}-${selectedProfile.pillars.hour.stemTenGod}) ${selectedProfile.pillars.hour.branch}(${selectedProfile.pillars.hour.branchElement}-${selectedProfile.pillars.hour.branchTenGod})
        Nhật Chủ: ${selectedProfile.dayMaster}, Thân: ${selectedProfile.strength}.`;
      }

      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const promptWithContext = selectedProfile 
        ? `Dựa trên thông tin Bát Tự sau: ${baziContext}. Câu hỏi của người dùng: ${currentInput}`
        : currentInput;

      // Select model: VIP use Pro, Free use Flash
      const isPro = userData.credits > 0 || isAdmin;
      const maxTokens = isAdmin ? 8192 : (isPro ? 4096 : 1024);
    const responseText = await chatWithGemini(promptWithContext, history, maxTokens, isPro);
      
      // Parse suggestions from AI response if any
      const newSuggestions = extractSuggestions(responseText);
      const cleanResponse = responseText.split('\n?')[0].split('\nGợi ý:')[0].trim();
      
      setSuggestions(newSuggestions);
      
      // Update Firestore limits and Global stats in a transaction
      if (user) {
        const statsRef = doc(db, 'system', 'stats');
        const userDocRef = doc(db, 'users', user.uid);
        const chatsRef = collection(db, 'chats');
        
        // Save to DB (Async, don't block UI)
        addDoc(chatsRef, {
          userId: user.uid,
          role: 'user',
          parts: [{ text: currentInput }],
          timestamp: serverTimestamp(),
          contextType: selectedProfile ? 'bazi' : 'general'
        }).catch(err => console.error("Error saving user chat:", err));

        addDoc(chatsRef, {
          userId: user.uid,
          role: 'model',
          parts: [{ text: cleanResponse }],
          timestamp: serverTimestamp(),
          contextType: selectedProfile ? 'bazi' : 'general'
        }).catch(err => console.error("Error saving model chat:", err));
        
        try {
          await runTransaction(db, async (transaction) => {
            // 0. Read all required docs first
            const statsDoc = await transaction.get(statsRef);
            const todayStr = new Date().toISOString().split('T')[0];
            const estimatedTokensUsed = Math.ceil((promptWithContext.length + cleanResponse.length) / 2.5);

            // 1. Update user logic
            if (!isAdmin) {
              if (isFreeTurn) {
                transaction.set(userDocRef, { lastFreeUsed: serverTimestamp(), deviceId: getDeviceId() }, { merge: true });
              } else {
                transaction.set(userDocRef, { credits: userData.credits - 1 }, { merge: true });
              }
            }

            // 2. Update global tokens (estimated)
            if (!statsDoc.exists() || statsDoc.data()?.lastResetDate !== todayStr) {
              transaction.set(statsRef, { dailyTokens: estimatedTokensUsed, lastResetDate: todayStr }, { merge: true });
            } else {
              transaction.update(statsRef, { dailyTokens: increment(estimatedTokensUsed) });
            }
          });
        } catch (err) {
          console.error("Transaction failed: ", err);
        }
      }

      setMessages((prev) => [...prev, { role: 'model', text: cleanResponse }]);
    } catch (err: any) {
      setError("Quá trình luận giải bị gián đoạn. Bạn vui lòng thử lại nhé.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyCredits = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Simulate payment success and add 50 credits
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, { 
        credits: (userData.credits || 0) + 50 
      }, { merge: true });
      setIsVipModalOpen(false);
      alert("Nâng cấp VIP thành công! Bạn có thêm 50 lượt hỏi.");
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden" id="chat-container">
      <div className="p-6 border-b border-white/10 backdrop-blur-md bg-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-white font-bold tracking-tight">Cố Vấn Bát Tự AI</h2>
              <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase font-black tracking-tighter">
                {isAdmin ? 'Admin Mode (Unlimited)' : 'Knowledge Base V1.2'}
              </span>
              {isAdmin && (
                <button 
                  onClick={() => logout()}
                  className="p-1 px-2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/40 transition-all text-[8px] font-black uppercase flex items-center gap-1"
                >
                  <LogOut className="w-2.5 h-2.5" /> Thoát Admin
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Ưu tiên học thuyết Thiệu Vỹ Hoa</p>
          </div>
        </div>

        {profiles.length > 0 && (
          <div className="flex items-center gap-4">
            {/* VIP Status */}
            <div className="hidden sm:flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl cursor-pointer hover:bg-blue-500/20 transition-all" onClick={() => setIsVipModalOpen(true)}>
               <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{userData.credits > 0 ? `${userData.credits} lượt` : 'Nâng cấp VIP'}</span>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
               <UserCircle className="w-4 h-4 text-blue-400" />
               <select 
                 value={selectedProfile?.id}
                 onChange={(e) => setSelectedProfile(profiles.find(p => p.id === e.target.value) || null)}
                 className="bg-transparent text-xs text-slate-300 focus:outline-none cursor-pointer font-bold"
               >
                 {profiles.map(p => <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>)}
               </select>
            </div>
          </div>
        )}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 relative z-10"
        id="messages-list"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in duration-700">
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-2xl mx-auto">
                <Bot className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg uppercase tracking-tight">Cố Vấn Mệnh Lý Đã Sẵn Sàng</h3>
                <p className="text-sm text-slate-400 max-w-sm mt-1 leading-relaxed mx-auto">
                  {selectedProfile 
                    ? `Tôi đang tập trung luận giải cho lá số của ${selectedProfile.name}. Hãy chọn một chủ đề để bắt đầu:`
                    : 'Hãy chọn một lá số hoặc nhập thông tin cụ thể để tôi bắt đầu luận giải.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl px-4">
               {initialSuggestions.map((s, i) => (
                 <button
                   key={i}
                   onClick={() => setInput(s)}
                   className="p-4 text-left text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-blue-500/30 rounded-2xl transition-all group active:scale-95"
                 >
                   <div className="flex items-center gap-3">
                     <Sparkles className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                     {s}
                   </div>
                 </button>
               ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={idx}
              className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg ${
                m.role === 'user' ? 'bg-white/10 border border-white/10' : 'bg-gradient-to-br from-blue-500 to-purple-500 shadow-blue-500/20'
              }`}>
                {m.role === 'user' ? <UserIcon className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`max-w-[80%] p-5 rounded-[2rem] text-[15px] shadow-xl backdrop-blur-md whitespace-pre-wrap ${
                m.role === 'user' ? 'bg-white/10 text-white border border-white/10' : 'bg-black/20 text-slate-200 border border-white/5'
              }`}>
                {m.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="flex gap-4"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center animate-pulse">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-black/20 backdrop-blur-md p-5 rounded-[2rem] border border-white/5 shadow-xl">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-3xl mx-4"
          >
            <p className="text-xs font-bold text-rose-400 text-center">{error}</p>
            <button
               onClick={() => {
                 const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
                 if (lastUserMsg) handleSend(lastUserMsg.text);
               }}
               className="flex items-center gap-2 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 shadow-lg shadow-rose-500/20"
            >
              <RotateCcw className="w-3 h-3" />
              Thử lại ngay
            </button>
          </motion.div>
        )}

        {suggestions.length > 0 && !isLoading && !error && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 pl-12"
          >
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => setInput(s)}
                className="px-4 py-2 text-[11px] font-black text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-full transition-all active:scale-95 uppercase tracking-wider"
              >
                {s}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      <div className="p-4 md:p-8 pt-0 relative z-10">
        <div className="relative group">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={selectedProfile ? `Hỏi về lá số ${selectedProfile.name}...` : "Hỏi về vận thế, bát tự..."}
            className={`w-full backdrop-blur-xl bg-white/5 border ${errorMsg ? 'border-rose-500/50' : 'border-white/10'} rounded-[2rem] p-5 pr-16 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[70px] max-h-[200px] resize-none shadow-2xl`}
            rows={1}
            id="chat-input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || wordCount > 50}
            className="absolute right-4 bottom-4 p-2.5 bg-white text-blue-900 rounded-2xl hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl active:scale-95"
            id="send-message-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-3 px-4">
          <p className="text-[9px] text-slate-600 font-mono uppercase tracking-[0.15em] font-bold">
            {isAdmin ? "Kích hoạt quyền Admin" : (canAskFree() ? "1 lượt miễn phí tuần này" : (userData.credits > 0 ? `${userData.credits} lượt VIP` : "Đã hết lượt miễn phí"))}
          </p>
          <div className="flex items-center gap-4">
             {errorMsg && <p className="text-[10px] text-rose-400 font-bold animate-pulse flex items-center gap-1"><AlertCircle className="w-3 h-3"/> {errorMsg}</p>}
             <span className={`text-[10px] font-mono font-bold ${wordCount > 50 ? 'text-rose-500' : 'text-slate-500'}`}>
               {wordCount}/50 từ
             </span>
          </div>
        </div>
      </div>

      {/* VIP Modal */}
      <AnimatePresence>
        {isVipModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsVipModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden"
            >
              {/* Decoration */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] rounded-full -mr-16 -mt-16" />
              
              <div className="relative z-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white uppercase tracking-tight">Nâng Cấp VIP</h2>
                <p className="text-slate-400 text-sm mt-2">Duy trì hệ thống và nhận lời khuyên sâu sắc hơn.</p>
                
                <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-6 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-slate-300 font-medium">Gói 50 lượt hỏi</span>
                    <span className="text-xl font-black text-white">50.000 VNĐ</span>
                  </div>
                  <ul className="space-y-2 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400"/> Phân tích sâu theo Thiệu Vỹ Hoa</li>
                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400"/> Không giới hạn thời gian sử dụng</li>
                    <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-blue-400"/> Ưu tiên xử lý từ máy chủ VIP</li>
                  </ul>
                </div>

                <button 
                  onClick={handleBuyCredits}
                  disabled={isLoading}
                  className="w-full mt-8 py-4 bg-white text-blue-900 font-black rounded-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" /> Thanh toán qua Google
                </button>
                <p className="text-[10px] text-slate-600 mt-4 uppercase tracking-widest font-bold">An toàn • Bảo mật • Tức thì</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
