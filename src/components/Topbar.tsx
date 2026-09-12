import type { ReactNode } from "react";

interface TopbarProps {
  eyebrow: string;
  title: string;
  mobileMenuButton: ReactNode;
  actions?: ReactNode;
}

export function Topbar({ eyebrow, title, mobileMenuButton, actions }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        {mobileMenuButton}
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
      {actions ? <div className="topbar__actions">{actions}</div> : null}
    </header>
  );
}
