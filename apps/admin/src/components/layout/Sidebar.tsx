"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Truck,
  Calculator,
  Ticket,
  BarChart3,
  MessageSquare,
  Megaphone,
  Settings,
  ShieldCheck,
  ScrollText,
  SlidersHorizontal,
  Layers,
  Store,
  KeyRound,
  GitBranch,
  RotateCcw,
  FileText,
  Wrench,
  Warehouse,
  MapPin,
  Zap,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { NAVIGATION, type IconName } from "@/lib/nav/navigation";
import { GapBadge } from "@/components/ui/GapBadge";
import { cn } from "@/lib/utils";

const ICONS: Record<IconName, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Truck,
  Calculator,
  Ticket,
  BarChart3,
  MessageSquare,
  Megaphone,
  Settings,
  ShieldCheck,
  ScrollText,
  SlidersHorizontal,
  Layers,
  Store,
  KeyRound,
  GitBranch,
  RotateCcw,
  FileText,
  Wrench,
  Warehouse,
  MapPin,
  Zap,
  Sparkles,
};

/** Sidebar — prototype 사이드바 이식. 3그룹 네비 + 활성 표시 + 갭B 배지 + 배지/예정.
 * 브랜드(쇼핑몰명·로고)는 쇼핑몰 설정(store)에서 연동. 클릭 시 대시보드 이동. */
export function Sidebar() {
  const pathname = usePathname();
  const [brand, setBrand] = useState<{ name: string; logo: string | null }>({ name: "쇼핑몰", logo: null });

  useEffect(() => {
    let alive = true;
    apiFetch<{ stores: { name: string; metadata?: { logo_url?: string } | null }[] }>(
      "/admin/stores?fields=name,metadata"
    )
      .then((d) => {
        const s = d.stores?.[0];
        if (alive && s) setBrand({ name: s.name || "쇼핑몰", logo: s.metadata?.logo_url ?? null });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <aside className="flex w-[248px] flex-col overflow-hidden border-r border-border bg-surface">
      <Link href="/dashboard" className="flex h-[60px] flex-shrink-0 items-center gap-3 border-b border-border px-5 transition-colors hover:bg-surface-2" title="대시보드로 이동">
        {brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.logo} alt={brand.name} className="h-[30px] w-[30px] flex-shrink-0 rounded-sm object-cover" />
        ) : (
          <span className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-sm bg-primary text-sm font-extrabold text-white">
            {brand.name.slice(0, 1)}
          </span>
        )}
        <span className="truncate text-[15px] font-extrabold leading-tight text-text">
          {brand.name}
          <small className="block text-[11px] font-normal tracking-wide text-text-3">쇼핑몰 관리</small>
        </span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 pb-6 pt-3">
        {NAVIGATION.map((group) => (
          <div key={group.section}>
            <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-bold tracking-wider text-text-3">{group.section}</div>
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "my-0.5 flex h-10 items-center gap-3 rounded-sm px-3 text-sm font-medium transition-colors",
                    active ? "bg-primary-weak font-bold text-primary" : "text-text-2 hover:bg-surface-2 hover:text-text"
                  )}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  {item.gap === "B" ? <GapBadge type="B" compact /> : null}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-primary px-1.5 text-[11px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                  {item.soon ? (
                    <span className="rounded-sm border border-border px-1.5 py-px text-[10px] font-semibold text-text-3">예정</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
