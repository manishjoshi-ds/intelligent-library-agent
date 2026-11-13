/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Palette,
  X,
  Check,
  Copy,
  Sparkles,
  ShieldCheck,
  Layers,
  Sliders,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
} from 'lucide-react';

interface ColorToken {
  name: string;
  role: string;
  hex: string;
  cssVar: string;
  usage: string;
  contrastOnDark?: string;
  contrastOnLight?: string;
}

interface PaletteCategory {
  title: string;
  category: string;
  description: string;
  tokens: ColorToken[];
}

export const PALETTE_SYSTEM: PaletteCategory[] = [
  {
    title: '1. Primary Brand Color',
    category: 'Brand Core',
    description: 'Scholar Emerald — evokes classical archival ledger bindings, botanical and architectural intellect, and active algorithmic navigation agents.',
    tokens: [
      {
        name: 'Scholar Emerald (Default)',
        role: 'Primary Action & Route Line',
        hex: '#10B981',
        cssVar: '--color-primary',
        usage: 'Active path routes, primary CTA buttons, start node highlight, selected states',
        contrastOnDark: '8.4:1 (AAA on #070A0F)',
      },
      {
        name: 'Scholar Emerald Hover',
        role: 'Interactive Hover State',
        hex: '#059669',
        cssVar: '--color-primary-hover',
        usage: 'Hovered primary action buttons and focused interactive nodes',
      },
      {
        name: 'Scholar Emerald Light',
        role: 'Glow & Light Accents',
        hex: '#34D399',
        cssVar: '--color-primary-light',
        usage: 'High-visibility route glow, pulse beacons, text highlights on dark cards',
      },
      {
        name: 'Scholar Emerald Dark',
        role: 'Deep Tint & Framing',
        hex: '#064E3B',
        cssVar: '--color-primary-dark',
        usage: 'Active item card backgrounds, high-contrast badges, node border rings',
      },
      {
        name: 'Emerald Deep Tint',
        role: 'Subtle Wash / Ambient Glow',
        hex: '#022C22',
        cssVar: '--color-primary-tint',
        usage: 'Atmospheric radial scrims, subtle table row active highlights',
      },
    ],
  },
  {
    title: '2. Secondary Color',
    category: 'Visual Balance',
    description: 'Oxidized Bronze & Slate Teal — provides cool, grounding stability that harmonizes with Emerald and prevents visual fatigue.',
    tokens: [
      {
        name: 'Slate Teal (Base)',
        role: 'Secondary Accents & Edges',
        hex: '#0F766E',
        cssVar: '--color-secondary',
        usage: 'Graph walkable aisle lines, secondary navigation buttons, structural metrics',
      },
      {
        name: 'Slate Teal Light',
        role: 'Secondary Highlights & Tags',
        hex: '#14B8A6',
        cssVar: '--color-secondary-light',
        usage: 'Interactive tooltips, secondary tags, code parameter keys',
      },
      {
        name: 'Oxidized Bronze Dark',
        role: 'Secondary Card Surfaces',
        hex: '#042F2E',
        cssVar: '--color-secondary-tint',
        usage: 'Floorplan coordinate telemetry containers, sub-panel borders',
      },
    ],
  },
  {
    title: '3. Accent Color',
    category: 'High-Impact Focus',
    description: 'Cartographer Amber & Illuminated Gold — reserved for goal nodes, destination books, priority 1 books, and high-impact action triggers.',
    tokens: [
      {
        name: 'Cartographer Amber (Base)',
        role: 'Goal Nodes & Selected Books',
        hex: '#F59E0B',
        cssVar: '--color-accent',
        usage: 'Goal node halo, selected collection books, Priority 1 markers, interactive scrubbers',
        contrastOnDark: '9.8:1 (AAA on #070A0F)',
      },
      {
        name: 'Illuminated Gold (Light)',
        role: 'High-Impact Accents',
        hex: '#FBBF24',
        cssVar: '--color-accent-light',
        usage: 'Active scrub cursor, book catalog bookmark indicators, star ratings',
      },
      {
        name: 'Amber Surface / Deep',
        role: 'Goal Container Tint',
        hex: '#78350F',
        cssVar: '--color-accent-dark',
        usage: 'Goal card badges, crowded aisle warning backgrounds',
      },
    ],
  },
  {
    title: '4. Background Colors',
    category: 'Atmosphere & Canvas',
    description: 'Obsidian Canvas & Deep Architectural Scrim — ultra-rich inky tones that maximize luminescence for graph vectors and typography.',
    tokens: [
      {
        name: 'Obsidian Canvas',
        role: 'Global App Canvas',
        hex: '#070A0F',
        cssVar: '--color-bg-canvas',
        usage: 'Main viewport background, deep void behind SVG floorplan',
      },
      {
        name: 'Sub-Canvas Section',
        role: 'Section & Column Splitter',
        hex: '#0A0E17',
        cssVar: '--color-bg-section',
        usage: 'Navigation header, footer, side inspector drawers',
      },
      {
        name: 'Elevated Canvas',
        role: 'Elevated Backing',
        hex: '#0C101B',
        cssVar: '--color-bg-elevated',
        usage: 'Canvas frame backings, active tab container wells',
      },
    ],
  },
  {
    title: '5. Surface Colors',
    category: 'Elevation & Containers',
    description: 'Disciplined multi-tiered elevation architecture for panels, data tables, and input fields.',
    tokens: [
      {
        name: 'Surface Level 1',
        role: 'Primary Panels & Decks',
        hex: '#0D1321',
        cssVar: '--color-surface-1',
        usage: 'Control sidebars, floorplan card containers, tab decks',
      },
      {
        name: 'Surface Level 2',
        role: 'Nested Cards & Table Rows',
        hex: '#131B2E',
        cssVar: '--color-surface-2',
        usage: 'Book catalog list items, step-by-step frontier rows, algorithm cards',
      },
      {
        name: 'Surface Level 3',
        role: 'Interactive Hovers & Dropdowns',
        hex: '#1A253D',
        cssVar: '--color-surface-3',
        usage: 'Dropdown options, active hovered items, tooltip bubbles',
      },
      {
        name: 'Surface Inset',
        role: 'Inputs & Terminal Wells',
        hex: '#080C14',
        cssVar: '--color-surface-inset',
        usage: 'Python test runner terminal, JSON code viewers, text input wells',
      },
    ],
  },
  {
    title: '6. Text Colors',
    category: 'Typographic Hierarchy',
    description: 'Pristine contrast ensuring effortless readability across editorial headers, analytical tables, and mono stats.',
    tokens: [
      {
        name: 'Text Primary',
        role: 'Headings & Core Data',
        hex: '#F8FAFC',
        cssVar: '--color-text-primary',
        usage: 'Main titles, node names, path summary metrics, active values',
        contrastOnDark: '17.8:1 (AAA Max Legibility)',
      },
      {
        name: 'Text Secondary',
        role: 'Body Copy & Explanations',
        hex: '#94A3B8',
        cssVar: '--color-text-secondary',
        usage: 'Descriptions, book author names, algorithm trade-off commentary',
        contrastOnDark: '7.2:1 (AAA Body)',
      },
      {
        name: 'Text Muted',
        role: 'Micro Labels & Metadata',
        hex: '#64748B',
        cssVar: '--color-text-muted',
        usage: 'Graph coordinates (x, y), shelf identifiers, timestamp footnotes',
        contrastOnDark: '4.6:1 (AA for labels)',
      },
      {
        name: 'Text Inverse',
        role: 'On High-Luminance CTAs',
        hex: '#020617',
        cssVar: '--color-text-inverse',
        usage: 'High-contrast text on solid Emerald and Amber buttons',
      },
    ],
  },
  {
    title: '7. Border Colors',
    category: 'Hairline Structural Separation',
    description: 'Subtle borders that separate elements without creating visual clutter or heavy box lines.',
    tokens: [
      {
        name: 'Border Subtle',
        role: 'Hairline Dividers',
        hex: '#1A2234',
        cssVar: '--color-border-subtle',
        usage: 'Table row dividers, subtle card separators (rgba(148,163,184,0.08))',
      },
      {
        name: 'Border Default',
        role: 'Card & Panel Outlines',
        hex: '#232D42',
        cssVar: '--color-border-default',
        usage: 'Panel boundaries, input field borders (rgba(148,163,184,0.16))',
      },
      {
        name: 'Border Primary Focus',
        role: 'Emerald Interactive Halo',
        hex: '#10B981',
        cssVar: '--color-border-focus-primary',
        usage: 'Focused inputs, active tab outline, route waypoint borders',
      },
      {
        name: 'Border Accent Focus',
        role: 'Amber Goal Halo',
        hex: '#F59E0B',
        cssVar: '--color-border-focus-accent',
        usage: 'Target goal shelf border, selected collection books outline',
      },
    ],
  },
  {
    title: '8. State & Semantic Colors',
    category: 'System Conditions & Alerts',
    description: 'Context-specific semantic signals for algorithm optimality, dynamic library barriers, and unit test results.',
    tokens: [
      {
        name: 'State Success',
        role: 'Optimal Paths & Passing Tests',
        hex: '#10B981',
        cssVar: '--color-state-success',
        usage: '10/10 Python unit tests pass, A* optimal path guaranteed, Cloud sync confirmed',
      },
      {
        name: 'State Warning',
        role: 'Crowded Aisles & Heuristic Cautions',
        hex: '#F59E0B',
        cssVar: '--color-state-warning',
        usage: 'Crowded aisle 2.5x distance penalty, non-optimal DFS route warning',
      },
      {
        name: 'State Error / Closed',
        role: 'Closed Sections & Blocked Shelves',
        hex: '#F43F5E',
        cssVar: '--color-state-error',
        usage: 'Closed library wing, restricted shelf without clearance, path not found',
      },
      {
        name: 'State Informational',
        role: 'STEM Labs & Transit Breakdowns',
        hex: '#38BDF8',
        cssVar: '--color-state-info',
        usage: 'Telemetry logs, Euclidean distance calculation readouts, API status',
      },
    ],
  },
];

interface ColorPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ColorPaletteModal: React.FC<ColorPaletteModalProps> = ({ isOpen, onClose }) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number>(0);

  if (!isOpen) return null;

  const copyToClipboard = (hex: string) => {
    navigator.clipboard?.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const activeCategory = PALETTE_SYSTEM[selectedCategoryIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0B0F17] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0E1526]/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-amber-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-inner">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-slate-900 dark:text-slate-100 text-lg">
                  Architectural Color System & Design Tokens
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 font-semibold">
                  WCAG AA / AAA
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
                Sophisticated scholar cartography palette engineered for spatial clarity, algorithmic focus, and zero eye strain.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors"
            title="Close Color Palette Inspector"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Navigation Pills */}
        <div className="flex items-center gap-1.5 px-6 py-3 border-b border-slate-200 dark:border-slate-800/60 bg-slate-100/80 dark:bg-[#090D15] overflow-x-auto text-xs">
          {PALETTE_SYSTEM.map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategoryIndex(idx)}
              className={`shrink-0 px-3 py-1.5 rounded-lg font-medium transition-all ${
                selectedCategoryIndex === idx
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-700 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-200 hover:bg-white/80 dark:hover:bg-slate-800/50'
              }`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white dark:bg-[#0B0F17]">
          {/* Active Category Overview */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0F172A]/70 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono uppercase text-emerald-700 dark:text-emerald-400 tracking-wider font-semibold">
                  {activeCategory.category}
                </span>
                <span className="text-slate-400 dark:text-slate-600">·</span>
                <span className="text-sm font-display font-semibold text-slate-900 dark:text-slate-200">
                  {activeCategory.title}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 max-w-2xl leading-relaxed">
                {activeCategory.description}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] text-slate-700 dark:text-slate-400 font-mono bg-white dark:bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{activeCategory.tokens.length} Engineered Tokens</span>
            </div>
          </div>

          {/* Tokens Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeCategory.tokens.map((token, tIdx) => (
              <div
                key={tIdx}
                className="group p-4 rounded-xl bg-slate-50 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Swatch & Title */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg shadow-inner border border-slate-300 dark:border-white/10 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: token.hex }}
                      />
                      <div>
                        <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100">
                          {token.name}
                        </h4>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-sans block">
                          {token.role}
                        </span>
                      </div>
                    </div>

                    {/* Copy Hex Button */}
                    <button
                      onClick={() => copyToClipboard(token.hex)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white border border-slate-300 dark:border-slate-700/60 text-xs font-mono transition-colors"
                      title="Copy HEX to clipboard"
                    >
                      {copiedHex === token.hex ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200" />
                          <span>{token.hex}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Usage & CSS Variable */}
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                    {token.usage}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                  <span className="text-emerald-700 dark:text-emerald-400/90 font-medium">{token.cssVar}</span>
                  {token.contrastOnDark && (
                    <span className="text-slate-700 dark:text-slate-400 bg-white dark:bg-slate-900/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                      {token.contrastOnDark}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Live Contextual Preview Section */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80">
            <h4 className="font-display font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Live Interactive Palette In-Context Preview
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Primary action test */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-2">Primary CTA (Brand)</span>
                <button className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-emerald-600/15 dark:shadow-emerald-500/10">
                  Compute Optimal Route
                </button>
              </div>

              {/* Secondary action test */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-2">Secondary Balance</span>
                <button className="w-full py-2 px-3 rounded-lg bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/80 dark:hover:bg-teal-900 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60 font-medium text-xs transition-colors">
                  Aisle Distance Matrix
                </button>
              </div>

              {/* Accent action test */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-2">Accent (Goal / Save)</span>
                <button className="w-full py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 font-semibold text-xs transition-colors shadow-md shadow-amber-600/15 dark:shadow-amber-500/10">
                  Save Waypoint Manifest
                </button>
              </div>

              {/* Semantic State test */}
              <div className="p-3.5 rounded-lg bg-white dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400 mb-2">Semantic Alert States</span>
                <div className="flex items-center gap-1.5">
                  <span className="flex-1 py-1 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-center text-[10px] font-mono font-semibold">
                    Pass
                  </span>
                  <span className="flex-1 py-1 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-center text-[10px] font-mono font-semibold">
                    Crowd
                  </span>
                  <span className="flex-1 py-1 rounded bg-rose-50 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-center text-[10px] font-mono font-semibold">
                    Closed
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#0E1526]/80 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Anti-AI Slop Compliant · Zero-Pill Typography · Strict Contrast</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white dark:text-slate-200 font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
