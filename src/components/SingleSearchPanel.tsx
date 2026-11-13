/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  LIBRARY_NODES,
  LIBRARY_BOOKS,
  SearchResult,
  StepSnapshot,
} from '../types';
import {
  Compass,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Search,
} from 'lucide-react';

interface SingleSearchPanelProps {
  algorithm: 'BFS' | 'DFS' | 'A*';
  setAlgorithm: (algo: 'BFS' | 'DFS' | 'A*') => void;
  startNode: string;
  setStartNode: (node: string) => void;
  goalNode: string;
  setGoalNode: (node: string) => void;
  costMode: 'distance' | 'time';
  setCostMode: (mode: 'distance' | 'time') => void;
  hasPermission: boolean;
  setHasPermission: (perm: boolean) => void;
  closedSections: Set<string>;
  onToggleClosed: (nodeId: string) => void;
  crowdedAisles: Set<string>;
  searchResult: SearchResult | null;
  onRunSearch: () => void;
  activeStep: number;
  setActiveStep: React.Dispatch<React.SetStateAction<number>>;
}

export const SingleSearchPanel: React.FC<SingleSearchPanelProps> = ({
  algorithm,
  setAlgorithm,
  startNode,
  setStartNode,
  setGoalNode,
  costMode,
  setCostMode,
  hasPermission,
  setHasPermission,
  searchResult,
  onRunSearch,
  activeStep,
  setActiveStep,
}) => {
  const [selectedBookId, setSelectedBookId] = useState<string>('BK-101');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(600); // ms per step
  const [searchQuery, setSearchQuery] = useState<string>('');

  // When book selection changes, update goal node automatically
  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    const book = LIBRARY_BOOKS.find((b) => b.id === bookId);
    if (book) {
      setGoalNode(book.shelf);
    }
  };

  const selectedBook = LIBRARY_BOOKS.find((b) => b.id === selectedBookId);

  // Playback timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && searchResult && searchResult.snapshots.length > 0) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= searchResult.snapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, searchResult, playbackSpeed, setActiveStep]);

  const currentSnapshot: StepSnapshot | null =
    searchResult && searchResult.snapshots.length > 0
      ? searchResult.snapshots[Math.min(activeStep, searchResult.snapshots.length - 1)]
      : null;

  // Filtered books for search
  const filteredBooks = LIBRARY_BOOKS.filter(
    (b) =>
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.shelf.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.callNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Control Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Algorithm & Cost Setup (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Search Parameters & Agent State
            </h3>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold tracking-wider">
              REAL-TIME DISPATCH
            </span>
          </div>

          {/* Algorithm Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 font-sans">
              Search Algorithm:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['A*', 'BFS', 'DFS'] as const).map((algo) => (
                <button
                  key={algo}
                  onClick={() => setAlgorithm(algo)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold font-mono border transition-all cursor-pointer ${
                    algorithm === algo
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 border-emerald-700 dark:border-emerald-400 shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20'
                      : 'bg-slate-50 hover:bg-slate-100 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700/80'
                  }`}
                >
                  {algo}
                  <div className="text-[9px] font-sans font-normal opacity-90">
                    {algo === 'A*' ? 'Heuristic Admissible' : algo === 'BFS' ? 'Hop-Optimal' : 'Deep Exploration'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Start Location & Cost Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 font-sans">
                Start Node:
              </label>
              <select
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
                className="w-full bg-white dark:bg-[#080C14] border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-200 font-mono focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-none transition-colors"
              >
                {Object.values(LIBRARY_NODES).map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 font-sans">
                Cost Metric:
              </label>
              <div className="flex rounded-xl bg-slate-100 dark:bg-[#080C14] p-1 border border-slate-200 dark:border-slate-700/80">
                <button
                  onClick={() => setCostMode('distance')}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    costMode === 'distance'
                      ? 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Distance (m)
                </button>
                <button
                  onClick={() => setCostMode('time')}
                  className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                    costMode === 'time'
                      ? 'bg-emerald-600/15 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Time (sec)
                </button>
              </div>
            </div>
          </div>

          {/* Environmental Constraints */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <span className="block text-xs font-medium text-slate-600 dark:text-slate-400 font-sans">
              Access & Security Clearance:
            </span>
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={hasPermission}
                onChange={(e) => setHasPermission(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 dark:text-emerald-500 focus:ring-emerald-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 accent-emerald-600 dark:accent-emerald-500"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Special Collections Clearance
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                  Grants passage into the Rare Manuscripts vault & Special Collections wing.
                </span>
              </div>
            </label>
          </div>

          {/* Execute Button */}
          <button
            onClick={onRunSearch}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-emerald-500 dark:via-emerald-400 dark:to-teal-400 dark:hover:brightness-110 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-emerald-600/25 dark:shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-white dark:text-slate-950" />
            <span>Compute Optimal Path</span>
          </button>
        </div>

        {/* Right Column: Book Catalog Selector (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 flex flex-col justify-between shadow-md dark:shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Target Book Selection & Shelf Mapping
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                {filteredBooks.length} titles available
              </span>
            </div>

            {/* Book Search Bar */}
            <div className="mt-3">
              <input
                type="text"
                placeholder="Search catalog by title, author, call number, or shelf..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#080C14] border border-slate-300 dark:border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Book Cards Grid */}
            <div className="mt-3 max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredBooks.map((book) => {
                const isSelected = selectedBookId === book.id;
                return (
                  <div
                    key={book.id}
                    onClick={() => handleSelectBook(book.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-[#042F2E]/40 border-emerald-500 dark:border-emerald-500/80 shadow-sm dark:shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-[#080C14] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">{book.title}</span>
                        <span className="font-mono text-[10px] text-slate-600 dark:text-slate-400 shrink-0">
                          {book.callNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                        {book.author} · <span className="text-emerald-700 dark:text-emerald-400 font-medium">{LIBRARY_NODES[book.shelf]?.name || book.shelf}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className={`text-[11px] font-mono flex items-center gap-1.5 font-medium ${book.available ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${book.available ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                        {book.available ? 'In Stacks' : 'Checked Out'}
                      </span>
                      {book.restricted && (
                        <span className="text-[10px] font-mono flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                          <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          Rare
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Book Summary Bar */}
          {selectedBook && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs mt-3">
              <div>
                <span className="text-slate-600 dark:text-slate-400">Target Shelf: </span>
                <strong className="text-slate-900 dark:text-slate-100 font-mono">
                  {LIBRARY_NODES[selectedBook.shelf]?.name} ({selectedBook.shelf})
                </strong>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400">Priority: </span>
                <span className="font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                  {selectedBook.priority === 1 ? 'High (P1)' : selectedBook.priority === 2 ? 'Medium (P2)' : 'Standard (P3)'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Result Metric Cards */}
      {searchResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Search Status</div>
              <div className="flex items-center gap-1.5 mt-1">
                {searchResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">Route Found</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span className="font-bold text-sm text-rose-700 dark:text-rose-400">Unreachable</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Total Path Cost</div>
              <div className="text-base sm:text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                {searchResult.totalCost.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                  {costMode === 'distance' ? 'meters' : 'seconds'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Corridor Hops</div>
              <div className="text-base sm:text-lg font-bold font-mono text-teal-700 dark:text-teal-300 mt-1">
                {searchResult.pathLengthEdges}{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">edges</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Nodes Expanded</div>
              <div className="text-base sm:text-lg font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
                {searchResult.nodesExpanded}{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">states</span>
              </div>
            </div>
          </div>

          {/* Route Narrative Message */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
            <span>{searchResult.message}</span>
            {searchResult.path.length > 0 && (
              <span className="text-emerald-700 dark:text-emerald-400 truncate max-w-md hidden md:inline font-semibold">
                {searchResult.path.join(' → ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Step-by-Step Playback Scrubber & Table */}
      {searchResult && searchResult.snapshots.length > 0 && (
        <div className="bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-md dark:shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                Frontier & Expansion State Scrubber
              </h4>
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                Step {activeStep + 1} of {searchResult.snapshots.length}
              </span>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                disabled={activeStep === 0}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] disabled:opacity-35 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
                title="Previous Step"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20 transition-all cursor-pointer"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play Simulation'}</span>
              </button>

              <button
                onClick={() => setActiveStep(Math.min(searchResult.snapshots.length - 1, activeStep + 1))}
                disabled={activeStep >= searchResult.snapshots.length - 1}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] disabled:opacity-35 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
                title="Next Step"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setActiveStep(0);
                }}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
                title="Reset Scrubber"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono"
              >
                <option value={1000}>1.0x (Slow)</option>
                <option value={600}>1.5x (Normal)</option>
                <option value={250}>3.0x (Fast)</option>
              </select>
            </div>
          </div>

          {/* Slider Scrubber */}
          <div className="pt-2">
            <input
              type="range"
              min={0}
              max={searchResult.snapshots.length - 1}
              value={activeStep}
              onChange={(e) => {
                setIsPlaying(false);
                setActiveStep(Number(e.target.value));
              }}
              className="w-full accent-emerald-600 dark:accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Current Step Action Note */}
          {currentSnapshot && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800 text-xs font-sans text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold shrink-0">
                [Step {currentSnapshot.stepNumber}]
              </span>
              <span>{currentSnapshot.actionNote}</span>
            </div>
          )}

          {/* Open & Closed List Tables */}
          {currentSnapshot && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Open List / Priority Queue Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080C14] overflow-hidden shadow-inner">
                <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-[#0A0E17] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
                    Open List / Frontier ({currentSnapshot.openList.length})
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">Awaiting Expansion</span>
                </div>
                <div className="max-h-48 overflow-y-auto font-mono text-[11px] no-scrollbar">
                  {currentSnapshot.openList.length === 0 ? (
                    <div className="p-3 text-slate-600 dark:text-slate-500 text-center font-sans">Open list is empty</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/80 dark:bg-[#0A0E17]/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase">
                        <tr>
                          <th className="px-3 py-1.5 font-medium">Node</th>
                          <th className="px-2 py-1.5 font-medium">g(n)</th>
                          <th className="px-2 py-1.5 font-medium">h(n)</th>
                          <th className="px-2 py-1.5 font-medium">f(n)</th>
                          <th className="px-2 py-1.5 font-medium">Parent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                        {currentSnapshot.openList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-200/40 dark:hover:bg-[#131B2E]/50 transition-colors">
                            <td className="px-3 py-1 text-slate-900 dark:text-slate-200 font-medium">{item.node}</td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{item.g.toFixed(1)}</td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{item.h.toFixed(1)}</td>
                            <td className="px-2 py-1 text-emerald-700 dark:text-emerald-400 font-bold">{item.f.toFixed(1)}</td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-500">{item.parent || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Closed List / Explored Set Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080C14] overflow-hidden shadow-inner">
                <div className="px-3.5 py-2.5 bg-slate-100 dark:bg-[#0A0E17] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-400 font-mono">
                    Closed List / Explored ({currentSnapshot.closedList.length})
                  </span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">State Evaluated</span>
                </div>
                <div className="max-h-48 overflow-y-auto font-mono text-[11px] no-scrollbar">
                  {currentSnapshot.closedList.length === 0 ? (
                    <div className="p-3 text-slate-600 dark:text-slate-500 text-center font-sans">Closed list is empty</div>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/80 dark:bg-[#0A0E17]/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase">
                        <tr>
                          <th className="px-3 py-1.5 font-medium">Node</th>
                          <th className="px-2 py-1.5 font-medium">g(n)</th>
                          <th className="px-2 py-1.5 font-medium">h(n)</th>
                          <th className="px-2 py-1.5 font-medium">f(n)</th>
                          <th className="px-2 py-1.5 font-medium">Parent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                        {currentSnapshot.closedList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-200/40 dark:hover:bg-[#131B2E]/50 transition-colors">
                            <td className="px-3 py-1 text-slate-900 dark:text-slate-200 font-medium">{item.node}</td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{item.g.toFixed(1)}</td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-400">{item.h.toFixed(1)}</td>
                            <td className="px-2 py-1 text-amber-700 dark:text-amber-400 font-bold">{item.f.toFixed(1)}</td>
                            <td className="px-2 py-1 text-slate-600 dark:text-slate-500">{item.parent || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
