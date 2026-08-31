import { NavLink } from "react-router-dom";
import {
  Archive,
  Bell,
  Building2,
  CalendarClock,
  FileText,
  GitBranch,
  Hash,
  History,
  LayoutDashboard,
  LayoutTemplate,
  PackageCheck,
  PenLine,
  ShieldCheck,
  Tags,
  Users2,
} from "lucide-react";

/**
 * Grouped rather than one flat list. Once past a handful of entries a flat nav stops being
 * scannable, and these fall naturally into "my work", "worklists" and "configuration" — the
 * last of which most users will never open.
 */
const NAV_GROUPS: {
  heading: string | null;
  items: { to: string; label: string; icon: typeof FileText }[];
}[] = [
  {
    heading: null,
    items: [
      { to: "/", label: "Overview", icon: LayoutDashboard },
      { to: "/documents", label: "Documents", icon: FileText },
      { to: "/my-signatures", label: "My signatures", icon: PenLine },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    heading: "Worklists",
    items: [
      { to: "/reports/review-due", label: "Reviews due", icon: CalendarClock },
      { to: "/reports/pending-retrieval", label: "Copies to retrieve", icon: PackageCheck },
      { to: "/reports/disposition-due", label: "Disposition due", icon: Archive },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { to: "/admin/organisation", label: "Organisation", icon: Building2 },
      { to: "/admin/templates", label: "Templates", icon: LayoutTemplate },
      { to: "/admin/users", label: "Users", icon: Users2 },
      { to: "/admin/roles", label: "Roles", icon: ShieldCheck },
      { to: "/admin/workflows", label: "Review routes", icon: GitBranch },
      { to: "/admin/metadata", label: "Metadata fields", icon: Tags },
      { to: "/admin/numbering", label: "Numbering", icon: Hash },
      { to: "/admin/policies", label: "Review & retention", icon: CalendarClock },
      { to: "/admin/notification-rules", label: "Notification rules", icon: Bell },
      { to: "/admin/jobs", label: "Scheduled jobs", icon: History },
    ],
  },
];

export function Sidebar() {
  return (
    <nav className="flex h-full w-60 flex-none flex-col overflow-y-auto bg-ink-950 px-4 py-6 text-white">
      <div className="mb-8 flex items-baseline gap-2 px-2">
        <span className="font-display text-lg font-bold tracking-tight">DMS</span>
      </div>

      {NAV_GROUPS.map((group, index) => (
        <div key={group.heading ?? "primary"} className={index > 0 ? "mt-6" : undefined}>
          {group.heading && (
            <h2 className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/35">
              {group.heading}
            </h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`
                  }
                >
                  <Icon className="h-[17px] w-[17px] flex-none" aria-hidden="true" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
