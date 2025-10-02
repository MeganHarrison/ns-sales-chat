'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import {
  LayoutDashboard,
  BarChart3,
  LineChart,
  PieChart,
  Settings,
  Users,
  FileText,
  Calendar,
  ShoppingCart,
  Package
} from 'lucide-react';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/bar-chart', label: 'Bar Chart', icon: BarChart3 },
  { href: '/line-chart', label: 'Line Chart', icon: LineChart },
  { href: '/pie-chart', label: 'Pie Chart', icon: PieChart },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppSidebar() {
  const { isOpen } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={`${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } fixed left-0 top-0 z-30 h-full w-64 border-r bg-background transition-transform duration-300 ease-in-out lg:translate-x-0`}
    >
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-xl font-semibold">Nutrition Solutions</h2>
      </div>
      <nav className="space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              } flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}