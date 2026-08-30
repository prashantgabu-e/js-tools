import { Landmark, MessageSquareMore, Rows3, WalletCards } from "lucide-react";
import { PAGE_COPY, ROUTE_HASHES } from "../constants";
import type { AppView } from "../types";

interface SidebarProps {
  activeView: AppView;
  isOpen: boolean;
  onNavigate: () => void;
}

const navItems: Array<{ view: AppView; icon: typeof MessageSquareMore }> = [
  { view: "sms-analyzer", icon: MessageSquareMore },
  { view: "finance", icon: WalletCards },
  { view: "bulk-finance", icon: Rows3 }
];

export function Sidebar({ activeView, isOpen, onNavigate }: SidebarProps) {
  return (
    <aside className={`sidebar${isOpen ? " is-open" : ""}`} id="sidebar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <Landmark className="icon" />
        </span>
        <div>
          <h1 className="brand__title">Vanilla JS Tools</h1>
          <p>Utility Hub</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navItems.map(({ view, icon: Icon }) => (
          <a
            key={view}
            className={`nav-link${activeView === view ? " active" : ""}`}
            href={ROUTE_HASHES[view]}
            onClick={onNavigate}
          >
            <Icon className="icon" aria-hidden="true" />
            <span>{PAGE_COPY[view].navLabel}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}
