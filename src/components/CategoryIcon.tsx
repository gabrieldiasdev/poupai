import {
  ArrowLeftRight,
  Briefcase,
  Bus,
  Car,
  Coins,
  Dumbbell,
  Ellipsis,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  PartyPopper,
  PawPrint,
  PiggyBank,
  Plane,
  Repeat,
  Shirt,
  ShoppingBag,
  Smartphone,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/** Icons a category can use, stored by name so the data doesn't depend on the icon library. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  house: House,
  bus: Bus,
  car: Car,
  party: PartyPopper,
  repeat: Repeat,
  health: HeartPulse,
  shopping: ShoppingBag,
  education: GraduationCap,
  shirt: Shirt,
  gym: Dumbbell,
  pet: PawPrint,
  phone: Smartphone,
  plane: Plane,
  briefcase: Briefcase,
  gift: Gift,
  coins: Coins,
  other: Ellipsis,
}

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = CATEGORY_ICONS[icon] ?? Ellipsis
  return <Icon className={cn('size-5', className)} aria-hidden />
}

/** The round badge shown next to an entry. Transfers and savings have fixed icons. */
export function EntryBadge({ icon, kind }: { icon: string; kind: 'category' | 'transfer' | 'saving' }) {
  const Icon = kind === 'transfer' ? ArrowLeftRight : kind === 'saving' ? PiggyBank : (CATEGORY_ICONS[icon] ?? Ellipsis)
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-subtle text-ink">
      <Icon className="size-4.5" aria-hidden />
    </span>
  )
}
