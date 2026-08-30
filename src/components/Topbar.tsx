import type { ReactNode } from "react";

interface TopbarProps {
  eyebrow: string;
  title: string;
  mobileMenuButton: ReactNode;
}

export function Topbar({ eyebrow, title, mobileMenuButton }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar__title">
        {mobileMenuButton}
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
      </div>
    </header>
  );
}
