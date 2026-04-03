import { NavLink, useLocation } from "react-router-dom";
import { Flame, LayoutDashboard, CalendarDays, ShoppingCart, BarChart3 } from "lucide-react";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/daily-log", label: "Daily Log", icon: CalendarDays },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/balance", label: "Balance Report", icon: BarChart3 },
];

export default function AppSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-coal text-coal-foreground flex flex-col">
      <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
          <Flame className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-base text-coal-foreground">Coal Consumption</h1>
          <p className="text-xs text-muted-foreground">Tracking App</p>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-coal-foreground/70 hover:bg-sidebar-accent hover:text-coal-foreground"
              }`}
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
