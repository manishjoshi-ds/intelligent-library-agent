/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { FileCode, Copy, Check } from 'lucide-react';

export const CodeExplorerPanel: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('library_agent/search.py');
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const availableFiles = [
    'library_agent/search.py',
    'library_agent/graph_model.py',
    'library_agent/multi_book.py',
    'library_agent/app.py',
    'library_agent/tests/test_search.py',
    'library_agent/data/library.json',
    'library_agent/README.md',
  ];

  useEffect(() => {
    const fetchCode = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/python-files');
        if (response.ok) {
          const data = await response.json();
          setFileContents(data);
        }
      } catch (err) {
        console.warn('Could not load files via API:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCode();
  }, []);

  const handleCopy = () => {
    const content = fileContents[selectedFile] || '';
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Selector Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0D1321] border border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shadow-md dark:shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-sm">
              Python 3.10 Standalone Engine Source
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-sans">
              Streamlit + NetworkX + Classical Search algorithms implementation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedFile}
            onChange={(e) => setSelectedFile(e.target.value)}
            className="bg-white dark:bg-[#080C14] text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 rounded-xl px-3 py-1.5 text-xs font-mono focus:border-emerald-600 dark:focus:border-emerald-500 focus:outline-none transition-colors"
          >
            {availableFiles.map((file) => (
              <option key={file} value={file}>
                {file}
              </option>
            ))}
          </select>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#131B2E] dark:hover:bg-[#1A253D] text-slate-800 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white text-xs font-mono border border-slate-300 dark:border-slate-700/80 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Stage */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-[#080C14] overflow-hidden shadow-lg dark:shadow-2xl">
        <div className="px-4 py-2.5 bg-slate-100 dark:bg-[#0A0E17] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono">
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">{selectedFile}</span>
          <span className="text-slate-600 dark:text-slate-500 text-[11px]">UTF-8 · Python 3.10+</span>
        </div>

        <pre className="p-5 font-mono text-xs text-slate-800 dark:text-slate-300 leading-relaxed overflow-x-auto whitespace-pre select-text max-h-[500px] no-scrollbar">
          {isLoading
            ? 'Loading source file...'
            : fileContents[selectedFile] ||
              `# Source for ${selectedFile} will load from local workspace.\n# Run "npm run dev" with tsx server to access the live API.`}
        </pre>
      </div>
    </div>
  );
};
