/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  LIBRARY_NODES,
  LIBRARY_BOOKS,
  MultiBookPlan,
} from '../types';
import {
  Route,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShoppingBag,
  Trash2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Save,
} from 'lucide-react';

interface MultiBookPanelProps {
  selectedBookIds: string[];
  setSelectedBookIds: (ids: string[]) => void;
  startNode: string;
  setStartNode: (node: string) => void;
  checkoutNode: string;
  setCheckoutNode: (node: string) => void;
  timeLimitSec: number | null;
  setTimeLimitSec: (sec: number | null) => void;
  costMode: 'distance' | 'time';
  setCostMode: (mode: 'distance' | 'time') => void;
  hasPermission: boolean;
  setHasPermission: (perm: boolean) => void;
  closedSections: Set<string>;
  onToggleClosed: (nodeId: string) => void;
  multiBookPlan: MultiBookPlan | null;
  onOptimize: () => void;
  onSaveRoute: () => void;
}

export const MultiBookPanel: React.FC<MultiBookPanelProps> = ({
  selectedBookIds,
  setSelectedBookIds,
  startNode,
  setStartNode,
  checkoutNode,
  setCheckoutNode,
  timeLimitSec,
  setTimeLimitSec,
  hasPermission,
  setHasPermission,
  closedSections,
  onToggleClosed,
  multiBookPlan,
  onOptimize,
  onSaveRoute,
}) => {
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  // Toggle single book selection
  const handleToggleBook = (bookId: string) => {
    if (selectedBookIds.includes(bookId)) {
      setSelectedBookIds(selectedBookIds.filter((id) => id !== bookId));
    } else {
      setSelectedBookIds([...selectedBookIds, bookId]);
    }
  };

  // Presets
  const applyPreset = (presetName: 'ai' | 'stem' | 'humanities' | 'all-available') => {
    if (presetName === 'ai') {
      setSelectedBookIds(['BK-101', 'BK-102', 'BK-106']);
    } else if (presetName === 'stem') {
      setSelectedBookIds(['BK-104', 'BK-105', 'BK-106', 'BK-107']);
    } else if (presetName === 'humanities') {
      setSelectedBookIds(['BK-108', 'BK-109', 'BK-110', 'BK-112', 'BK-113']);
    } else if (presetName === 'all-available') {
      setSelectedBookIds(LIBRARY_BOOKS.filter((b) => b.available).map((b) => b.id));
    }
  };

  const departments = ['ALL', 'Computer Science', 'STEM', 'World Literature', 'History & Philosophy', 'Special Collections'];

  const filteredBooks = LIBRARY_BOOKS.filter((b) => {
    if (departmentFilter === 'ALL') return true;
    if (departmentFilter === 'Computer Science') return b.department.includes('Computer Science');
    if (departmentFilter === 'STEM') return b.department.includes('STEM') || b.department.includes('Mathematics');
    if (departmentFilter === 'World Literature') return b.department.includes('World Literature');
    if (departmentFilter === 'History & Philosophy') return b.department.includes('Philosophy') || b.department.includes('Historical');
    if (departmentFilter === 'Special Collections') return b.restricted;
    return true;
  });

  // Full path node items for multi-book route
  const fullPathNodes = useMemo(() => {
    if (!multiBookPlan || !multiBookPlan.fullPath || multiBookPlan.fullPath.length === 0) return [];
    return multiBookPlan.fullPath.map((nodeId, idx) => {
      const node = LIBRARY_NODES[nodeId] || { name: nodeId, department: 'General' };
      const isStart = idx === 0;
      const isCheckout = nodeId === checkoutNode && idx === multiBookPlan.fullPath.length - 1;
      const shelfBooks = multiBookPlan.collectedBooks.filter((b) => b.shelf === nodeId);
      return {
        idx,
        nodeId,
        name: node.name,
        department: node.department,
        isStart,
        isCheckout,
        isShelf: shelfBooks.length > 0,
        books: shelfBooks,
        role: isStart
          ? 'Start Origin'
          : isCheckout
          ? 'Final Checkout'
          : shelfBooks.length > 0
          ? `Shelf Pickup (${shelfBooks.length} titles)`
          : 'Transit Corridor',
      };
    });
  }, [multiBookPlan, checkoutNode]);

  const handleRemoveNodeFromMultiPath = (nodeId: string) => {
    if (nodeId === startNode) return;

    const booksAtThisShelf = LIBRARY_BOOKS.filter((b) => b.shelf === nodeId).map((b) => b.id);
    const booksToRemove = selectedBookIds.filter((id) => booksAtThisShelf.includes(id));

    if (booksToRemove.length > 0) {
      setSelectedBookIds(selectedBookIds.filter((id) => !booksToRemove.includes(id)));
    } else {
      onToggleClosed(nodeId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration & Catalog Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Optimizer Parameters & Presets (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-md dark:shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
              <Route className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              TSP Tour & Constraint Deck
            </h3>
            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold tracking-wider">
              2-OPT HEURISTIC
            </span>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5 font-sans">
              Curated Research Presets:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => applyPreset('ai')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
              >
                AI & Algorithms (3)
              </button>
              <button
                onClick={() => applyPreset('stem')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
              >
                Physics & Math (4)
              </button>
              <button
                onClick={() => applyPreset('humanities')}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
              >
                Literature & Ethics (5)
              </button>
              <button
                onClick={() => setSelectedBookIds([])}
                className="px-2 py-1 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          {/* Start and Checkout Nodes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 font-sans">
                Start Node:
              </label>
              <select
                value={startNode}
                onChange={(e) => setStartNode(e.target.value)}
                className="w-full bg-white dark:bg-[#080C14] border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-slate-200 font-mono focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-none transition-colors"
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
                Checkout / Exit:
              </label>
              <select
                value={checkoutNode}
                onChange={(e) => setCheckoutNode(e.target.value)}
                className="w-full bg-white dark:bg-[#080C14] border border-slate-300 dark:border-slate-700/80 rounded-xl px-2.5 py-2 text-xs text-slate-900 dark:text-slate-200 font-mono focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-none transition-colors"
              >
                {Object.values(LIBRARY_NODES).map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Time Budget Slider (with priority pruning) */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                Time Budget Limit:
              </span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                {timeLimitSec ? `${timeLimitSec} seconds (${Math.round(timeLimitSec / 60)} min)` : 'Unlimited'}
              </span>
            </div>
            <input
              type="range"
              min={180}
              max={1500}
              step={60}
              value={timeLimitSec || 1500}
              onChange={(e) => {
                const val = Number(e.target.value);
                setTimeLimitSec(val >= 1500 ? null : val);
              }}
              className="w-full accent-emerald-600 dark:accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-600 dark:text-slate-500 font-mono">
              <span>3 min</span>
              <span>10 min</span>
              <span>25 min (No limit)</span>
            </div>
          </div>

          {/* Archive Clearance Checkbox */}
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
                Permits collecting rare Newton & Shakespeare manuscripts.
              </span>
            </div>
          </label>

          {/* Execute TSP Optimization */}
          <button
            onClick={onOptimize}
            disabled={selectedBookIds.length === 0}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-gradient-to-r dark:from-emerald-500 dark:via-emerald-400 dark:to-teal-400 dark:hover:brightness-110 disabled:opacity-40 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider font-mono shadow-lg shadow-emerald-600/25 dark:shadow-emerald-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Route className="w-4 h-4 text-white dark:text-slate-950" />
            <span>Generate Optimal Itinerary ({selectedBookIds.length} books)</span>
          </button>
        </div>

        {/* Right: Multi-Book Shelf Selector (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 flex flex-col justify-between shadow-md dark:shadow-xl">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Multi-Book Cart & Catalog
              </h3>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-mono font-semibold">
                {selectedBookIds.length} of {LIBRARY_BOOKS.length} selected
              </span>
            </div>

            {/* Department Filter Chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setDepartmentFilter(dept)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                    departmentFilter === dept
                      ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold'
                      : 'bg-slate-100 dark:bg-[#080C14] text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            {/* Book Catalog Grid */}
            <div className="mt-3 max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar">
              {filteredBooks.map((book) => {
                const isSelected = selectedBookIds.includes(book.id);
                return (
                  <div
                    key={book.id}
                    onClick={() => handleToggleBook(book.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-[#042F2E]/40 border-emerald-500 dark:border-emerald-500/80 shadow-sm dark:shadow-md ring-1 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-[#080C14] border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-400 text-white dark:text-slate-950'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>

                      <div className="min-w-0">
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
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#131B2E] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700/60 font-semibold">
                        P{book.priority}
                      </span>
                      <span className={`text-[11px] font-mono flex items-center gap-1.5 font-medium ${book.available ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${book.available ? 'bg-emerald-600 dark:bg-emerald-400' : 'bg-rose-600 dark:bg-rose-400'}`} />
                        {book.available ? 'In Stacks' : 'Checked Out'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Optimization Plan Breakdown */}
      {multiBookPlan && (
        <div className="space-y-5">
          {/* Metrics Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Total Tour Distance</div>
              <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 mt-1">
                {multiBookPlan.totalDistanceMeters}{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">meters</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Walking Transit Time</div>
              <div className="text-lg font-bold font-mono text-teal-700 dark:text-teal-300 mt-1">
                {multiBookPlan.totalTransitSeconds}{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">seconds</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Pickup & Sorting</div>
              <div className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400 mt-1">
                {multiBookPlan.totalPickupSeconds}{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                  sec ({multiBookPlan.collectedBooks.length} × 45s)
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 shadow-sm dark:shadow-md">
              <div className="text-xs text-slate-600 dark:text-slate-400 font-sans">Estimated Mission Total</div>
              <div className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1">
                {Math.round(multiBookPlan.totalTimeSeconds / 60)} min{' '}
                <span className="text-xs font-normal text-slate-600 dark:text-slate-400">
                  ({multiBookPlan.totalTimeSeconds}s)
                </span>
              </div>
            </div>
          </div>

          {/* Skipped / Pruned Items Notice (if any) */}
          {multiBookPlan.skippedBooks.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider font-mono">
                <AlertTriangle className="w-4 h-4" />
                <span>Pruned or Inaccessible Catalog Items ({multiBookPlan.skippedBooks.length})</span>
              </div>
              <div className="divide-y divide-amber-200 dark:divide-amber-900/30 text-xs">
                {multiBookPlan.skippedBooks.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-slate-900 dark:text-slate-200 font-semibold">{item.book.title}</span>
                    <span className="text-amber-800 dark:text-amber-300 font-mono text-[11px]">{item.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full Tour Route Node Sequence Table with "Remove from Path" Column */}
          {fullPathNodes.length > 0 && (
            <div className="bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-md dark:shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <Route className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Multi-Book Route Traversal & Nodes Manifest
                  </h4>
                  <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                    ({fullPathNodes.length} Waypoint Nodes · {multiBookPlan.totalDistanceMeters}m Tour)
                  </span>
                </div>

                {closedSections.size > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-mono text-[11px]">Excluded Detours:</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(closedSections).map((cId) => (
                        <button
                          key={cId}
                          onClick={() => onToggleClosed(cId)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-[10px] font-mono hover:bg-rose-100 dark:hover:bg-rose-900 transition-colors cursor-pointer"
                          title="Click to re-open this section"
                        >
                          <span>{LIBRARY_NODES[cId]?.name || cId}</span>
                          <span className="text-rose-600 dark:text-rose-400 font-bold">✕</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080C14]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-[#0A0E17] text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Step</th>
                      <th className="px-4 py-2.5 font-medium">Node Name</th>
                      <th className="px-3 py-2.5 font-medium">Node ID</th>
                      <th className="px-3 py-2.5 font-medium">Department</th>
                      <th className="px-3 py-2.5 font-medium">Role / Target</th>
                      <th className="px-4 py-2.5 font-medium text-right text-rose-700 dark:text-rose-400">Remove from Path</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                    {fullPathNodes.map((item) => (
                      <tr key={`${item.nodeId}-${item.idx}`} className="hover:bg-slate-100/70 dark:hover:bg-[#131B2E]/50 transition-colors">
                        <td className="px-4 py-2 text-slate-600 dark:text-slate-400 font-bold">#{item.idx + 1}</td>
                        <td className="px-4 py-2 font-semibold text-slate-900 dark:text-slate-200">
                          {item.name}
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{item.nodeId}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{item.department}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.isStart
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                                : item.isCheckout
                                ? 'bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50'
                                : item.isShelf
                                ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            {item.role}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveNodeFromMultiPath(item.nodeId)}
                            disabled={item.isStart || item.isCheckout}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-mono font-medium transition-all shadow-xs ${
                              item.isStart || item.isCheckout
                                ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800'
                                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/70 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 hover:border-rose-300 dark:hover:border-rose-700 cursor-pointer'
                            }`}
                            title={
                              item.isStart || item.isCheckout
                                ? 'Cannot remove origin or final checkout node'
                                : `Remove '${item.name}' from path and re-optimize`
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Remove from Path</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Turn-by-Turn Leg Itinerary Breakdown */}
          <div className="bg-white dark:bg-[#0D1321] p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-md dark:shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800/80">
              <h4 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Turn-by-Turn Dispatch Manifest ({multiBookPlan.legs.length} Legs)
              </h4>
              <button
                onClick={onSaveRoute}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5 text-white dark:text-slate-950" />
                <span>Save Route to Cloud</span>
              </button>
            </div>

            <div className="space-y-3">
              {multiBookPlan.legs.map((leg) => {
                const isFinalCheckout = leg.toNode === checkoutNode;
                return (
                  <div
                    key={leg.legIndex}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 space-y-2.5 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="w-6 h-6 rounded-md bg-white dark:bg-[#131B2E] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/60 flex items-center justify-center font-bold text-[11px]">
                          {leg.legIndex}
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">{LIBRARY_NODES[leg.fromNode]?.name || leg.fromNode}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-slate-900 dark:text-slate-100 font-bold">
                          {LIBRARY_NODES[leg.toNode]?.name || leg.toNode}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono text-slate-600 dark:text-slate-400">
                        <span>{leg.distanceMeters.toFixed(1)}m</span>
                        <span>·</span>
                        <span>{Math.round(leg.durationSeconds)}s walk</span>
                      </div>
                    </div>

                    {/* Corridor Traversal Sequence */}
                    <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400 flex items-center gap-1 overflow-x-auto no-scrollbar">
                      <span className="text-slate-500 dark:text-slate-500">Path:</span>
                      {leg.path.map((p, pIdx) => (
                        <React.Fragment key={pIdx}>
                          <span className={p === leg.toNode ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                            {p}
                          </span>
                          {pIdx < leg.path.length - 1 && <span className="text-slate-400 dark:text-slate-600">→</span>}
                        </React.Fragment>
                      ))}
                    </div>

                    {/* Books retrieved at this location */}
                    {leg.booksCollected.length > 0 && (
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-sans font-semibold">
                          Collect at this shelf:
                        </span>
                        {leg.booksCollected.map((b) => (
                          <span
                            key={b.id}
                            className="px-2 py-0.5 rounded bg-white dark:bg-[#131B2E] border border-slate-300 dark:border-slate-700/60 text-[11px] text-slate-800 dark:text-slate-200"
                          >
                            {b.title} <strong className="text-emerald-700 dark:text-emerald-400 font-mono">({b.callNumber})</strong>
                          </span>
                        ))}
                      </div>
                    )}

                    {isFinalCheckout && (
                      <div className="pt-1 text-[11px] text-teal-700 dark:text-teal-400 font-sans font-medium">
                        ✓ Final destination: Automated RFID check-out and receipt generation.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
