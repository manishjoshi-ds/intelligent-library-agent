/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
import { useTheme, ThemeMode } from '../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { themeMode, effectiveTheme, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const options: { mode: ThemeMode; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
    {
      mode: 'light',
      label: 'Light Mode',
      icon: Sun,
      description: 'Luminous scholarly parchment',
    },
    {
      mode: 'dark',
      label: 'Dark Mode',
      icon: Moon,
      description: 'Deep obsidian archive',
    },
    {
      mode: 'system',
      label: 'System Default',
      icon: Monitor,
      description: 'Sync with operating system',
    },
  ];

  // Determine current active button icon
  const CurrentIcon = effectiveTheme === 'light' ? Sun : Moon;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Theme Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer bg-white hover:bg-slate-50 dark:bg-slate-900/60 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 shadow-xs dark:shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-600/40 dark:focus:ring-emerald-500/40 select-none group"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`Current theme: ${themeMode === 'system' ? `System (${effectiveTheme})` : themeMode}. Click to switch.`}
      >
        <div
          className={`p-1 rounded-lg transition-transform duration-300 group-hover:scale-110 ${
            effectiveTheme === 'light'
              ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
          }`}
        >
          <CurrentIcon className="w-3.5 h-3.5" />
        </div>
        <span className="hidden sm:inline font-mono text-[11px] capitalize text-slate-700 dark:text-slate-300">
          {themeMode === 'system' ? 'System' : themeMode}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl backdrop-blur-xl p-1.5 z-50 text-xs font-sans ring-1 ring-slate-900/5 dark:ring-black/40 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Select Appearance</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{effectiveTheme}</span>
          </div>

          <div className="py-1 space-y-0.5">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = themeMode === opt.mode;

              return (
                <button
                  key={opt.mode}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setThemeMode(opt.mode);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-500/30 shadow-xs dark:shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-[#131B2E] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        opt.mode === 'light'
                          ? 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10'
                          : opt.mode === 'dark'
                          ? 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-500/10'
                          : 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs truncate font-medium">{opt.label}</span>
                      <span
                        className={`text-[10px] truncate font-mono ${
                          isSelected
                            ? 'text-emerald-700 dark:text-emerald-300/80'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {opt.description}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0 ml-2">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
