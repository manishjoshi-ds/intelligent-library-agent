/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Cloud,
  Save,
  Trash2,
  Download,
  LogIn,
  LogOut,
  Compass,
  Database,
} from 'lucide-react';
import { SavedRouteDoc } from '../firebase';
import { User } from 'firebase/auth';

interface CloudManifestsPanelProps {
  currentUser: User | null;
  savedRoutes: SavedRouteDoc[];
  onSignIn: () => void;
  onSignOut: () => void;
  onLoadRoute: (route: SavedRouteDoc) => void;
  onDeleteRoute: (routeId: string) => void;
  onSaveCurrentRoute: (name: string) => void;
  hasActiveRoute: boolean;
}

export const CloudManifestsPanel: React.FC<CloudManifestsPanelProps> = ({
  currentUser,
  savedRoutes,
  onSignIn,
  onSignOut,
  onLoadRoute,
  onDeleteRoute,
  onSaveCurrentRoute,
  hasActiveRoute,
}) => {
  const [routeNameInput, setRouteNameInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = () => {
    if (!routeNameInput.trim()) return;
    setIsSaving(true);
    onSaveCurrentRoute(routeNameInput.trim());
    setRouteNameInput('');
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleExportJson = (route: SavedRouteDoc) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(route, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `route-manifest-${(route.title || 'route').toLowerCase().replace(/\s+/g, '-')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Account Status */}
      <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 space-y-4 shadow-md dark:shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-base">
                Cloud Route Manifests & Persistence
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Real-time Firebase Firestore synchronization for multi-agent routes and book collections.
              </p>
            </div>
          </div>

          <div>
            {currentUser ? (
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-[#080C14] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                    {currentUser.displayName || 'Authorized Researcher'}
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 dark:text-slate-400">{currentUser.email}</div>
                </div>
                <button
                  onClick={onSignOut}
                  className="p-1.5 rounded-lg bg-white hover:bg-rose-50 dark:bg-[#131B2E] dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-transparent transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 font-medium text-xs transition-colors cursor-pointer shadow-xs dark:shadow-none"
              >
                <LogIn className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Sign In with Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Save Current Route Sub-form */}
        {hasActiveRoute && (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <Save className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-200">Save Active Itinerary:</span>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <input
                type="text"
                placeholder="e.g., Quantum Computing & Physics Tour"
                value={routeNameInput}
                onChange={(e) => setRouteNameInput(e.target.value)}
                className="flex-1 bg-white dark:bg-[#0D1321] border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-500 focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <button
                onClick={handleSave}
                disabled={!routeNameInput.trim() || isSaving}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 disabled:opacity-40 text-white dark:text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save to Cloud'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Saved Routes List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono px-1">
          <span>Persisted Itineraries ({savedRoutes.length})</span>
          <span>Firestore Project: intelligent-library-agent</span>
        </div>

        {savedRoutes.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0D1321] space-y-3 shadow-sm dark:shadow-none">
            <Database className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-300">No Saved Manifests Yet</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto font-sans">
              Run a Single Search or Multi-Book TSP optimization, then click "Save Manifest" to store your itinerary in the cloud.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoutes.map((route) => (
              <div
                key={route.id}
                className="p-5 rounded-2xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-md dark:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800/80">
                    <span className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">{route.title}</span>
                    <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
                      {route.algorithm}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-600 dark:text-slate-500">Cost: </span>
                      <span className="text-slate-900 dark:text-slate-200 font-semibold">{route.totalCost.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 dark:text-slate-500">Books: </span>
                      <span className="text-teal-700 dark:text-teal-300 font-semibold">{(route.bookTitles || []).length} items</span>
                    </div>
                    <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                      {route.path.join(' → ')}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800/80">
                  <button
                    onClick={() => onLoadRoute(route)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-white dark:text-slate-950" />
                    <span>Load onto Floorplan</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleExportJson(route)}
                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700/60 transition-colors cursor-pointer"
                      title="Export JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {route.id && (
                      <button
                        onClick={() => onDeleteRoute(route.id!)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 dark:bg-[#131B2E] dark:hover:bg-rose-950/60 text-slate-600 dark:text-slate-400 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-300 dark:border-slate-700/60 hover:border-rose-300 dark:hover:border-rose-800/50 transition-colors cursor-pointer"
                        title="Delete Route"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
