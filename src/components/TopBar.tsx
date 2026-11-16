import { LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppView = 'receiving' | 'history' | 'import';

interface TopBarProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
}

export function TopBar({ activeView, onNavigate }: TopBarProps) {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth();

  return (
    <header className="bg-white border-b border-slate-200 md:sticky md:top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
        <button
          type="button"
          onClick={() => onNavigate('receiving')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded"
        >
          Amanmart GR
        </button>

        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6"
        >
          <button
            type="button"
            onClick={() => onNavigate('receiving')}
            className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              activeView === 'receiving'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Receiving
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              activeView === 'history'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            History
          </button>
          <button
            type="button"
            onClick={() => onNavigate('import')}
            className={`py-2 text-sm font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${
              activeView === 'import'
                ? 'border-emerald-700 text-slate-900'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Catalog Import
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {loading ? (
            <span className="text-sm text-slate-500 whitespace-nowrap shrink-0">
              Checking account...
            </span>
          ) : user ? (
            <button
              type="button"
              onClick={signOutUser}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Operator Sign-In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
