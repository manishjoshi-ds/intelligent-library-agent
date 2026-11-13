/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Eye, EyeOff, Move3d, ChevronDown, ChevronUp, Layers, SunMedium } from 'lucide-react';
import { ScenePreset } from './ThreeBackground';

interface ThreeSceneControlsProps {
  currentPreset: ScenePreset;
  onPresetChange: (preset: ScenePreset) => void;
  isEnabled: boolean;
  onToggleEnabled: () => void;
  isInteractive: boolean;
  onToggleInteractive: () => void;
  intensity: number;
  onIntensityChange: (val: number) => void;
}

export const ThreeSceneControls: React.FC<ThreeSceneControlsProps> = ({
  currentPreset,
  onPresetChange,
  isEnabled,
  onToggleEnabled,
  isInteractive,
  onToggleInteractive,
  intensity,
  onIntensityChange,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const presets: { id: ScenePreset; label: string; icon: string; desc: string }[] = [
    {
      id: 'atrium',
      label: 'Grand Atrium',
      icon: '🏛️',
      desc: 'Neoclassical colonnade & towering multi-tier stacks',
    },
    {
      id: 'cyber',
      label: 'Cyber Stacks',
      icon: '⚡',
      desc: 'Holographic data repository with laser scanning beams',
    },
    {
      id: 'reading-room',
      label: 'Scholar’s Vault',
      icon: '📜',
      desc: 'Mahogany reading alcove with warm emerald banker lamps',
    },
    {
      id: 'constellation',
      label: 'Knowledge Graph',
      icon: '🌌',
      desc: 'Spatial 3D graph constellation of library coordinates',
    },
  ];

  return (
    <aside
      aria-label="3D Background Scene Controls"
      className="fixed bottom-4 left-4 z-40 flex flex-col font-sans transition-all duration-300"
    >
      {/* Expanded Control Card */}
      {isExpanded && (
        <div className="mb-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-[#090E18]/95 border border-slate-200 dark:border-slate-800/90 shadow-xl dark:shadow-2xl dark:shadow-black/80 backdrop-blur-md p-4 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 tracking-wide font-display text-[13px]">
                3D Background Atmosphere
              </span>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              title="Collapse"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Selector Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>Scene Preset</span>
              <span className="text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold">Procedural Three.js</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p) => {
                const isSelected = currentPreset === p.id && isEnabled;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      if (!isEnabled) onToggleEnabled();
                      onPresetChange(p.id);
                    }}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500/60 ring-1 ring-emerald-500/30 shadow-sm dark:shadow-md dark:shadow-emerald-500/10 text-slate-900 dark:text-slate-100'
                        : 'bg-slate-50 dark:bg-[#0E1526]/70 border-slate-200 dark:border-slate-800/70 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{p.icon}</span>
                      <span className={`font-medium ${isSelected ? 'text-emerald-800 dark:text-emerald-300 font-semibold' : 'text-slate-800 dark:text-slate-200'}`}>
                        {p.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-tight">
                      {p.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lighting & Options */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
            {/* Intensity slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <SunMedium className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Atmosphere Intensity
                </span>
                <span className="text-slate-800 dark:text-slate-300 font-semibold">{Math.round(intensity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.3"
                max="1.5"
                step="0.1"
                value={intensity}
                onChange={(e) => onIntensityChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:accent-emerald-500"
              />
            </div>

            {/* Quick Toggle Buttons */}
            <div className="flex items-center gap-2 pt-1">
              {/* Interactive Camera */}
              <button
                onClick={onToggleInteractive}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  isInteractive
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-400 dark:border-cyan-500/60 text-cyan-800 dark:text-cyan-300'
                    : 'bg-slate-100 dark:bg-slate-900/60 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200'
                }`}
                title="When active, click and drag on background to pan the 3D camera"
              >
                <Move3d className="w-3.5 h-3.5" />
                <span>{isInteractive ? 'Interactive Pan On' : 'Parallax Drift'}</span>
              </button>

              {/* Master Background Toggle */}
              <button
                onClick={onToggleEnabled}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  isEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/50 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-500'
                }`}
                title="Toggle 3D Background rendering"
              >
                {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{isEnabled ? 'Visible' : 'Hidden'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Dock Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/95 hover:bg-slate-50 dark:bg-[#080D18]/90 dark:hover:bg-[#0E1526] border border-slate-300 dark:border-slate-800/80 hover:border-emerald-600 dark:hover:border-emerald-500/40 shadow-lg shadow-slate-900/10 dark:shadow-black/60 backdrop-blur-md text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-slate-100 transition-all cursor-pointer group text-xs"
        title="Open 3D Background Atmosphere scenes"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
        <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 group-hover:rotate-12 transition-transform" />
        <span className="font-mono text-[11px] font-medium">
          3D Scene:{' '}
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {isEnabled
              ? presets.find((p) => p.id === currentPreset)?.label || 'Active'
              : 'Off'}
          </span>
        </span>
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500" />
        )}
      </button>
    </aside>
  );
};
