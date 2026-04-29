import { useState } from 'react';
import { Solar, Lunar } from 'lunar-javascript';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export default function CalendarView() {
  const [date, setDate] = useState(new Date());

  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  const prevDay = () => setDate(new Date(date.getTime() - 86400000));
  const nextDay = () => setDate(new Date(date.getTime() + 86400000));

  // Map for Giờ Hoàng Đạo
  const getZodiacHours = (dayZhi: string) => {
    const hours: Record<string, string[]> = {
      '子': ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
      '午': ['Tý', 'Sửu', 'Mão', 'Ngọ', 'Thân', 'Dậu'],
      '丑': ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
      '未': ['Dần', 'Mão', 'Tỵ', 'Thân', 'Tuất', 'Hợi'],
      '寅': ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
      '申': ['Tý', 'Sửu', 'Thìn', 'Tỵ', 'Mùi', 'Tuất'],
      '卯': ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
      '酉': ['Dần', 'Thìn', 'Tỵ', 'Thân', 'Dậu', 'Hợi'],
      '辰': ['Dần', 'Thìn', 'Tỵ', 'Mùi', 'Dậu', 'Hợi'],
      '戌': ['Dần', 'Thìn', 'Tỵ', 'Mùi', 'Dậu', 'Hợi'],
      '巳': ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
      '亥': ['Sửu', 'Thìn', 'Ngọ', 'Mùi', 'Tuất', 'Hợi'],
    };
    return hours[dayZhi] || [];
  };

  const dayZhi = lunar.getDayZhi();
  const zodiacHours = getZodiacHours(dayZhi);

  return (
    <div className="p-8 h-full flex flex-col items-center justify-center bg-transparent overflow-y-auto relative z-10" id="calendar-view">
      <div className="w-full max-w-2xl backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
        {/* Animated Orbs */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-blue-500/20 transition-all duration-700" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-purple-500/20 transition-all duration-700" />

        <div className="flex items-center justify-between mb-12 relative z-10">
          <button onClick={prevDay} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <h2 className="text-sm font-bold text-blue-400 uppercase tracking-[0.3em] mb-2">Lịch Vạn Niên</h2>
            <p className="text-xl font-bold text-white font-mono uppercase tracking-widest">
              Tháng {date.getMonth() + 1} Năm {date.getFullYear()}
            </p>
          </div>

          <button onClick={nextDay} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-90">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
          {/* Solar Date */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-[0.4em] mb-4 font-black">Dương Lịch</span>
            <div className="text-9xl font-black text-white tracking-tighter shadow-text">
              {date.getDate()}
            </div>
            <p className="mt-4 text-xl font-bold text-slate-300">Thứ {date.getDay() === 0 ? 'Chủ Nhật' : date.getDay() + 1}</p>
          </div>

          <div className="w-[1px] h-32 bg-white/10 hidden md:block" />

          {/* Lunar Date */}
          <div className="flex-1 flex flex-col items-center">
            <span className="text-[10px] text-blue-400 uppercase tracking-[0.4em] mb-4 font-black">Âm Lịch</span>
            <div className="text-8xl font-black text-blue-500 tracking-tighter flex flex-col items-center">
              {lunar.getDay()}
              <span className="text-lg text-slate-500 font-bold mt-2 uppercase tracking-wide">Tháng {lunar.getMonth()}</span>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Ngày {lunar.getDayInGanZhi()}
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tháng {lunar.getMonthInGanZhi()}
              </span>
              <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Năm {lunar.getYearInGanZhi()}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col items-center relative z-10">
          <div className="flex items-center gap-2 mb-4">
             <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500" />
             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Giờ Hoàng Đạo</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 text-[10px] font-mono text-slate-300">
             {zodiacHours.map((zhi, i) => (
               <span key={i} className="px-2 py-1 bg-white/5 rounded border border-white/5 text-slate-200">{zhi}</span>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
