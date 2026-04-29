import { LayoutDashboard, MessageSquare, BookOpen, Calendar, Settings, HelpCircle, ChevronLeft, UserCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';

type SidebarProps = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Lá Số Cá Nhân' },
  { id: 'chat', icon: MessageSquare, label: 'Cố Vấn AI' },
  { id: 'calendar', icon: Calendar, label: 'Lịch Vạn Niên' },
  { id: 'profile', icon: UserCircle, label: 'Cá Nhân' },
];

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 74 : 260 }}
        className="hidden md:flex backdrop-blur-xl bg-white/5 border-r border-white/10 flex-col items-stretch overflow-hidden relative z-30"
        id="main-sidebar-desktop"
      >
        <div className="p-6 flex items-center justify-between">
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                <span className="font-bold text-white text-sm">S</span>
              </div>
              <span className="text-xl font-bold tracking-tight text-white uppercase">Studio</span>
            </motion.div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-slate-400 hover:text-white"
            id="sidebar-toggle-desktop"
          >
            <ChevronLeft className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="px-3 pt-6 flex-1">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-white/10 text-white shadow-lg shadow-black/5'
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                }`}
                id={`nav-${item.id}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-white/5 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-white transition-colors">
            <HelpCircle className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Hỗ trợ</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0f172ae6] backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-4 z-40">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center gap-1 p-2 transition-all ${
              activeTab === item.id ? 'text-blue-400' : 'text-slate-500'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">
              {item.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </nav>
    </>
  );
}
