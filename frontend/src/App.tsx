import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Bot, LayoutDashboard, History, Github, Zap } from "lucide-react";
import clsx from "clsx";
import Dashboard from "./pages/Dashboard";
import ReviewHistory from "./pages/ReviewHistory";
import ReviewDetail from "./pages/ReviewDetail";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

const NAV = [
  { to: "/",        label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/reviews", label: "Reviews",   icon: History,         end: false },
];

function Sidebar() {
  return (
    <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0d0d14]">
      {/* Logo */}
      <div className="px-5 pt-7 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
                          flex items-center justify-center shadow-lg shadow-violet-900/40">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none tracking-tight">AI Review</p>
            <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Powered by Claude</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-violet-600/20 text-violet-300 border border-violet-500/20"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx("w-4 h-4", isActive ? "text-violet-400" : "text-gray-600")} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 pb-6 pt-4 border-t border-white/[0.04] space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-gray-600 mono">/webhook/github</span>
        </div>
        <a
          href="https://docs.github.com/en/developers/webhooks-and-events/webhooks/about-webhooks"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
        >
          <Github className="w-3 h-3" />
          Webhook docs
        </a>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {/* Ambient background gradients */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-900/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-900/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-blue-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto px-8 py-8">
              <Routes>
                <Route path="/"           element={<Dashboard />} />
                <Route path="/reviews"    element={<ReviewHistory />} />
                <Route path="/reviews/:id" element={<ReviewDetail />} />
                <Route path="*"           element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
