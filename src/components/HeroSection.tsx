/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Compass, Route, Terminal, ArrowRight, ShieldCheck, Cpu } from 'lucide-react';
import heroImage from '../assets/images/library_blueprint_hero_1793290625640.jpg';

interface HeroSectionProps {
  onStartSingleSearch: () => void;
  onStartMultiBook: () => void;
  onRunTestSuite: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartSingleSearch,
  onStartMultiBook,
  onRunTestSuite,
}) => {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1321] mb-6 shadow-lg dark:shadow-2xl transition-colors">
      {/* Background Architectural Blueprint with Theme-Adaptive Scrim */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Architectural Library Floorplan Blueprint"
          className="w-full h-full object-cover object-center opacity-15 dark:opacity-25 filter saturate-75 mix-blend-multiply dark:mix-blend-luminosity scale-105 transform hover:scale-100 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/94 to-white/70 dark:from-[#070A0F] dark:via-[#070A0F]/90 dark:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/35 to-transparent dark:from-[#070A0F] dark:via-transparent dark:to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(5,150,105,0.10),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.18),rgba(255,255,255,0))]" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 px-6 py-8 md:px-10 md:py-12 max-w-5xl">
        {/* Editorial Subtitle with Scholarly Metadata */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3 text-xs font-mono text-emerald-700 dark:text-emerald-400">
          <span className="flex items-center gap-1.5 uppercase tracking-widest text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <Cpu className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Autonomous Cartography Agent
          </span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <span className="text-slate-700 dark:text-slate-300 font-sans font-medium">
            Euclidean Admissible Search & TSP 2-Opt
          </span>
          <span className="text-slate-400 dark:text-slate-600">·</span>
          <span className="text-amber-700 dark:text-amber-300/90 flex items-center gap-1 font-sans font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Restricted Archives Clearance
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-[1.15] mb-4 max-w-3xl">
          Algorithmic Precision for <br />
          <span className="bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600 dark:from-emerald-300 dark:via-teal-200 dark:to-amber-200 bg-clip-text text-transparent">
            Infinite Archives & Modern Stacks.
          </span>
        </h1>

        {/* Value Proposition Description */}
        <p className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-sans leading-relaxed max-w-2xl mb-6">
          Navigate 14 specialized research wings, optimize complex multi-item collection tours using
          state-space heuristics, and visually dissect BFS, DFS, and A* state frontiers across non-uniform walking distances and dynamic aisle congestion.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onStartSingleSearch}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs md:text-sm transition-all shadow-lg shadow-emerald-600/20 dark:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer"
          >
            <Compass className="w-4 h-4 text-white dark:text-slate-950" />
            <span>Single Book Search</span>
            <ArrowRight className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            onClick={onStartMultiBook}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 shadow-xs dark:shadow-none font-medium text-xs md:text-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <Route className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Multi-Book TSP Optimizer</span>
          </button>

          <button
            onClick={onRunTestSuite}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-[#080C14] dark:hover:bg-[#131B2E] text-slate-800 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white border border-slate-300 dark:border-slate-800 text-xs md:text-sm transition-all font-mono cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Run Python Tests (10/10)</span>
          </button>
        </div>

        {/* Key Quantitative Architecture Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-200 dark:border-slate-800/80 text-left">
          <div>
            <div className="text-lg md:text-xl font-bold font-mono text-slate-900 dark:text-slate-100">14 Wings</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Geocoded 2D Nodes</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400">20 Corridors</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Dynamic Congestion Weights</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold font-mono text-teal-700 dark:text-teal-300">20 Volumes</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Rare & STEM Catalogues</div>
          </div>
          <div>
            <div className="text-lg md:text-xl font-bold font-mono text-amber-700 dark:text-amber-400">h(n) ≤ h*(n)</div>
            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Proven Admissible Heuristic</div>
          </div>
        </div>
      </div>
    </section>
  );
};
