import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { PAGE_COPY, ROUTE_HASHES } from "./constants";
import { BulkFinancePage } from "./pages/BulkFinancePage";
import { FinancePage } from "./pages/FinancePage";
import { SmsAnalyzerPage } from "./pages/SmsAnalyzerPage";
import type { AppView } from "./types";

function getViewFromHash(hash: string): AppView {
  const normalizedHash = hash.replace(/^#\/?/, "");

  if (normalizedHash.startsWith("bulk-finance")) {
    return "bulk-finance";
  }

  if (normalizedHash.startsWith("finance")) {
    return "finance";
  }

  return "sms-analyzer";
}

function ensureDefaultHash() {
  if (!window.location.hash || window.location.hash === "#") {
    window.location.hash = ROUTE_HASHES["sms-analyzer"];
  }
}

export function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>(() =>
    typeof window === "undefined" ? "sms-analyzer" : getViewFromHash(window.location.hash)
  );

  useEffect(() => {
    ensureDefaultHash();

    const syncView = () => {
      setCurrentView(getViewFromHash(window.location.hash));
    };

    syncView();
    window.addEventListener("hashchange", syncView);

    return () => {
      window.removeEventListener("hashchange", syncView);
    };
  }, []);

  const copy = PAGE_COPY[currentView];
  const mobileMenuButton = (
    <button className="icon-btn mobile-menu" onClick={() => setIsSidebarOpen((current) => !current)} aria-label="Open navigation">
      <Menu className="icon" aria-hidden="true" />
    </button>
  );

  return (
    <div className="app-shell">
      <Sidebar activeView={currentView} isOpen={isSidebarOpen} onNavigate={() => setIsSidebarOpen(false)} />

      <main className="main">
        <Topbar eyebrow={copy.eyebrow} title={copy.title} mobileMenuButton={mobileMenuButton} />
        <div key={currentView}>
          {currentView === "sms-analyzer" ? <SmsAnalyzerPage /> : null}
          {currentView === "finance" ? <FinancePage iframeName="financeSubmitFrame" /> : null}
          {currentView === "bulk-finance" ? <BulkFinancePage iframeName="financeSubmitFrame" /> : null}
        </div>
        <iframe id="financeSubmitFrame" name="financeSubmitFrame" title="Finance submission handler" hidden />
      </main>
    </div>
  );
}
