"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  Users,
  Sparkles,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/transacoes", label: "Transações", icon: ArrowRightLeft },
  { href: "/orcamentos", label: "Orçamentos", icon: Wallet },
  { href: "/espacos", label: "Meus espaços", icon: Users },
  { href: "/assistente", label: "Assistente", icon: Sparkles },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];
export function Navigation() {
  const pathname = usePathname();
  return (
    <nav className="navigation" aria-label="Navegação principal">
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          href={href}
          key={href}
          className={cn("nav-link", pathname === href && "active")}
          aria-current={pathname === href ? "page" : undefined}
        >
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
