/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Compass,
  BookOpen,
  Route,
  GitCompare,
  Terminal,
  FileCode,
  Cloud,
  Save,
  LogIn,
  LogOut,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ThemeSwitcher } from './ThemeSwitcher';

export type ActiveTab = 'search' | 'multibook' | 'benchmark' | 'cloud' | 'tests' | 'code' | 'viva';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onQuickSave: () => void;
  hasActiveRoute: boolean;
  firestoreConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onSignIn,
  onSignOut,
  onQuickSave,
  hasActiveRoute,
  firestoreConnected,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'search', label: 'Single Search', icon: Compass },
    { id: 'multibook', label: 'Multi-Book TSP', icon: Route },
    { id: 'benchmark', label: 'Algorithm Lab', icon: GitCompare },
    { id: 'cloud', label: 'Cloud Manifests', icon: Cloud },
    { id: 'tests', label: 'Test Suite', icon: Terminal },
    { id: 'code', label: 'Python Source', icon: FileCode },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 dark:bg-[#070A0F]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 lg:px-8 py-3 shadow-xs dark:shadow-none transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-amber-500/10 dark:from-emerald-500/20 dark:via-teal-500/10 dark:to-amber-500/10 border border-emerald-600/30 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-inner">
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-display font-bold tracking-tight text-slate-900 dark:text-slate-100 text-sm md:text-base">
                THE ALEXANDRIA CODEX
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-semibold">
                v2.4
              </span>
            </div>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 tracking-wide font-sans hidden sm:block">
              Autonomous Spatial Navigation & Classical Graph Search
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 dark:bg-[#0D1321] p-1 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-[#131B2E]'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? 'text-white dark:text-slate-950'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Action & Authentication Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Save CTA */}
          {hasActiveRoute && (
            <button
              onClick={onQuickSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 transition-colors shadow-md shadow-amber-600/15 dark:shadow-amber-500/10 cursor-pointer"
              title="Save current route to Firestore"
            >
              <Save className="w-3.5 h-3.5 text-white dark:text-slate-950" />
              <span className="hidden sm:inline">Save Manifest</span>
            </button>
          )}

          {/* Theme Switcher Button */}
          <ThemeSwitcher />

          {/* Cloud Status */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
              firestoreConnected
                ? 'bg-slate-100 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/40 text-amber-800 dark:text-amber-300'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                firestoreConnected
                  ? 'bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_6px_#34d399]'
                  : 'bg-amber-600 dark:bg-amber-400'
              }`}
            />
            <span
              className={`text-[10px] ${
                firestoreConnected
                  ? 'text-slate-600 dark:text-slate-400'
                  : 'text-amber-800 dark:text-amber-300'
              }`}
            >
              Firestore
            </span>
          </div>

          {/* Google Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200 dark:border-slate-800">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-7 h-7 rounded-full border border-emerald-600/40 dark:border-emerald-500/40 object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs flex items-center justify-center font-bold">
                  {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <button
                onClick={onSignOut}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                title={`Sign out (${currentUser.displayName || currentUser.email})`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 shadow-xs dark:shadow-none transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-slate-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar */}
      <div className="flex lg:hidden overflow-x-auto gap-1 pt-2 pb-0.5 mt-2 border-t border-slate-200 dark:border-slate-800/50 no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
