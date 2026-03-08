import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  CalendarCheck,
  BarChart3,
  Settings,
  MessageSquare,
  History,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/leads', icon: Users, label: 'Leads' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/visits', icon: CalendarCheck, label: 'Visits' },
  { to: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/historical', icon: History, label: 'Historical' },
];

const AppSidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-[240px] flex flex-col border-r"
      style={{ background: 'hsl(var(--sidebar-bg))', borderColor: 'hsl(var(--sidebar-border))' }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-display font-bold text-sm">G</span>
        </div>
        <div>
          <h1 className="font-display font-bold text-sm" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>Gharpayy</h1>
          <p className="text-[10px]" style={{ color: 'hsl(var(--sidebar-fg))' }}>Lead Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
        <NavLink to="/settings" className={`sidebar-link ${location.pathname === '/settings' ? 'active' : ''}`}>
          <Settings size={18} />
          Settings
        </NavLink>
        <div className="mt-4 mx-3 p-3 rounded-lg" style={{ background: 'hsl(var(--sidebar-hover))' }}>
          <p className="text-xs font-medium" style={{ color: 'hsl(var(--sidebar-active-fg))' }}>Admin User</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'hsl(var(--sidebar-fg))' }}>admin@gharpayy.com</p>
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
