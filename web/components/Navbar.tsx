import React from 'react';
import Link from 'next/link';

export const Navbar: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold shadow-md shadow-indigo-500/20">
              EC
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-zinc-50 tracking-tight">
                Scheduled Notifications
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                POC
              </span>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Dashboard
            </Link>
            <Link
              href="/create"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Schedule Notification
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              SMTP
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Telegram
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Push (Mock)
            </span>
          </div>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-all"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Schedule
          </Link>
        </div>
      </div>
    </header>
  );
};

