import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Flame, LayoutDashboard, CalendarDays, ShoppingCart, BarChart3, Users, ClipboardList, ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/daily-log", label: "Daily Log", icon: CalendarDays },
  { to: "/vendors", label: "Vendors", icon: Users },
  { to: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/balance", label: "Balance Report", icon: BarChart3 },
];

export default function AppSidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen bg-coal text-coal-foreground flex flex-col transition-all duration-300 ease-in-out",
          "lg:relative lg:z-auto",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-[72px]" : "translate-x-0 w-[260px]"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center gap-3 border-b border-sidebar-border transition-all", collapsed ? "px-4 py-5 justify-center" : "px-5 py-5")}>
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-heading font-bold text-sm text-coal-foreground leading-tight">Coal Consumption</h1>
              <p className="text-[11px] text-coal-foreground/50">Tracking App</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => { if (window.innerWidth < 1024) onToggle(); }}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                  collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-coal-foreground/60 hover:bg-sidebar-accent hover:text-coal-foreground"
                )}
                title={collapsed ? link.label : undefined}
              >
                <link.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-[18px] h-[18px]")} />
                {!collapsed && <span>{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Collapse button (desktop only) */}
        <div className="hidden lg:flex border-t border-sidebar-border p-3">
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-2 rounded-lg text-sm text-coal-foreground/60 hover:text-coal-foreground hover:bg-sidebar-accent transition-colors w-full",
              collapsed ? "justify-center px-0 py-2" : "px-3 py-2"
            )}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", collapsed && "rotate-180")} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
