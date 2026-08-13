import { CreditCard, Heart, Home, Settings, Shirt, Sparkles, UserRound, type LucideIcon } from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  activePaths?: string[];
};

export const primaryNavItems: NavigationItem[] = [
  { label: "Home", href: "/home", icon: Home, activePaths: ["/"] },
  { label: "Closet", href: "/wardrobe", icon: Shirt },
  { label: "Stylist", href: "/stylist", icon: Sparkles },
  { label: "Looks", href: "/looks", icon: Heart },
  { label: "Profile", href: "/profile", icon: UserRound }
];

export const accountNavItems: NavigationItem[] = [
  { label: "Credits", href: "/wallet", icon: CreditCard },
  { label: "Settings", href: "/profile/preferences", icon: Settings, activePaths: ["/settings", "/preferences"] }
];

export function isNavItemActive(pathname: string, item: NavigationItem) {
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    Boolean(item.activePaths?.some((path) => pathname === path || pathname.startsWith(`${path}/`)))
  );
}
