/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LIBRARY_NODES,
  LIBRARY_BOOKS,
  SearchResult,
  MultiBookPlan,
} from './types';
import { runSearch, optimizeMultiBookTS, canonicalEdge } from './searchEngine';
import {
  auth,
  testFirestoreConnection,
  signInWithGoogle,
  signOutUser,
  saveRouteToFirestore,
  fetchUserSavedRoutes,
  deleteUserSavedRoute,
  SavedRouteDoc,
} from './firebase';
import { User, onAuthStateChanged } from 'firebase/auth';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { FloorplanCanvas } from './components/FloorplanCanvas';
import { SingleSearchPanel } from './components/SingleSearchPanel';
import { MultiBookPanel } from './components/MultiBookPanel';
import { AlgorithmLabPanel } from './components/AlgorithmLabPanel';
import { CloudManifestsPanel } from './components/CloudManifestsPanel';
import { TestConsolePanel } from './components/TestConsolePanel';
import { CodeExplorerPanel } from './components/CodeExplorerPanel';
import { ColorPaletteModal } from './components/ColorPaletteModal';
import { ThreeBackground, ScenePreset } from './components/ThreeBackground';
import { ThreeSceneControls } from './components/ThreeSceneControls';
import { VivaDossierPanel } from './components/VivaDossierPanel';

function AlexandriaCodexApp() {
  const { effectiveTheme } = useTheme();

  // Navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState<boolean>(false);

  // 3D Three.js Background Atmosphere State
  const [scenePreset, setScenePreset] = useState<ScenePreset>('atrium');
  const [is3DEnabled, setIs3DEnabled] = useState<boolean>(true);
  const [is3DInteractive, setIs3DInteractive] = useState<boolean>(false);
  const [sceneIntensity, setSceneIntensity] = useState<number>(1.0);

  // Search & Routing State
  const [startNode, setStartNode] = useState<string>('Entrance');
  const [goalNode, setGoalNode] = useState<string>('Computer_Science');
  const [checkoutNode, setCheckoutNode] = useState<string>('Self_Checkout');
  const [algorithm, setAlgorithm] = useState<'BFS' | 'DFS' | 'A*'>('A*');
  const [costMode, setCostMode] = useState<'distance' | 'time'>('distance');
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Environmental Dynamic Constraints
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const [crowdedAisles, setCrowdedAisles] = useState<Set<string>>(
    new Set([canonicalEdge('Entrance', 'Information_Desk')])
  );

  // Single Search Result & Scrubber
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [activeStep, setActiveStep] = useState<number>(0);

  // Multi-Book TSP State
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([
    'BK-101',
    'BK-104',
    'BK-113',
  ]);
  const [timeLimitSec, setTimeLimitSec] = useState<number | null>(600);
  const [multiBookPlan, setMultiBookPlan] = useState<MultiBookPlan | null>(null);

  // Firebase Auth & Cloud Persistence
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);
  const [savedRoutes, setSavedRoutes] = useState<SavedRouteDoc[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Notification helper
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  // Monitor Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const routes = await fetchUserSavedRoutes();
          setSavedRoutes(routes || []);
        } catch (err) {
          console.error('Error fetching user routes:', err);
        }
      }
    });

    testFirestoreConnection().then((connected) => {
      setFirestoreConnected(connected);
    });

    return () => unsubscribe();
  }, []);

  // Compute Single Search
  const handleRunSearch = useCallback(() => {
    const res = runSearch(
      algorithm,
      startNode,
      goalNode,
      closedSections,
      crowdedAisles,
      hasPermission,
      costMode
    );
    setSearchResult(res);
    setActiveStep(res.snapshots.length > 0 ? res.snapshots.length - 1 : 0);
  }, [algorithm, startNode, goalNode, closedSections, crowdedAisles, hasPermission, costMode]);

  // Run on mount or when parameters shift
  useEffect(() => {
    handleRunSearch();
  }, [handleRunSearch]);

  // Compute Multi-Book Optimization
  const handleOptimizeMultiBook = useCallback(() => {
    const plan = optimizeMultiBookTS(
      selectedBookIds,
      startNode,
      checkoutNode,
      closedSections,
      crowdedAisles,
      hasPermission,
      costMode,
      timeLimitSec
    );
    setMultiBookPlan(plan);
    if (plan.success) {
      showNotification(`Optimized tour computed: ${plan.totalDistanceMeters}m across ${plan.legs.length} legs.`, 'success');
    } else {
      showNotification(plan.message, 'error');
    }
  }, [selectedBookIds, startNode, checkoutNode, closedSections, crowdedAisles, hasPermission, costMode, timeLimitSec, showNotification]);

  // Generate initial multi-book plan
  useEffect(() => {
    handleOptimizeMultiBook();
  }, [handleOptimizeMultiBook]);

  // Environmental Toggles
  const handleToggleClosed = (nodeId: string) => {
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
        showNotification(`Re-opened wing '${LIBRARY_NODES[nodeId]?.name || nodeId}'.`, 'info');
      } else {
        next.add(nodeId);
        showNotification(`Wing '${LIBRARY_NODES[nodeId]?.name || nodeId}' closed for maintenance.`, 'info');
      }
      return next;
    });
  };

  const handleToggleCrowded = (edgeKey: string) => {
    setCrowdedAisles((prev) => {
      const next = new Set(prev);
      if (next.has(edgeKey)) {
        next.delete(edgeKey);
        showNotification('Corridor congestion cleared.', 'info');
      } else {
        next.add(edgeKey);
        showNotification('Corridor marked crowded (2.5× transit penalty applied).', 'info');
      }
      return next;
    });
  };

  // Node selection from floorplan
  const handleSelectNodeFromCanvas = (nodeId: string) => {
    setGoalNode(nodeId);
    showNotification(`Destination shelf set to '${LIBRARY_NODES[nodeId]?.name || nodeId}'.`, 'info');
  };

  // Cloud Save Itinerary
  const handleSaveRoute = async (name?: string) => {
    const routeName = name || `Route to ${LIBRARY_NODES[goalNode]?.name || goalNode} (${algorithm})`;
    const activePath =
      activeTab === 'multibook' && multiBookPlan?.fullPath
        ? multiBookPlan.fullPath
        : searchResult?.path || [];

    const totalCost =
      activeTab === 'multibook' && multiBookPlan
        ? multiBookPlan.totalCost
        : searchResult?.totalCost || 0;

    const totalDist =
      activeTab === 'multibook' && multiBookPlan
        ? multiBookPlan.totalDistanceMeters
        : searchResult?.totalCost || 0;

    const totalTime =
      activeTab === 'multibook' && multiBookPlan
        ? multiBookPlan.totalTimeSeconds
        : Math.round(totalDist / 1.2);

    const bookTitles =
      activeTab === 'multibook' && multiBookPlan
        ? multiBookPlan.collectedBooks.map((b) => b.title)
        : [LIBRARY_BOOKS.find((b) => b.shelf === goalNode)?.title || goalNode];

    try {
      const payload = {
        title: routeName,
        algorithm: activeTab === 'multibook' ? 'TSP 2-Opt' : algorithm,
        startNode,
        goalOrCheckoutNode: activeTab === 'multibook' ? checkoutNode : goalNode,
        path: activePath,
        totalCost,
        totalDistanceMeters: totalDist,
        totalTimeSeconds: totalTime,
        bookTitles,
      };

      const routeId = await saveRouteToFirestore(payload);
      const newDoc: SavedRouteDoc = {
        ...payload,
        id: routeId || `route_${Date.now()}`,
        userId: currentUser?.uid || 'guest-session',
        createdAt: new Date().toISOString(),
      };
      setSavedRoutes((prev) => [newDoc, ...prev]);
      showNotification(`Saved '${routeName}' to Firestore.`, 'success');
    } catch (err: any) {
      showNotification(`Failed to save route: ${err.message}`, 'error');
    }
  };

  // Load Saved Route into Floorplan
  const handleLoadRoute = (route: SavedRouteDoc) => {
    if (route.path.length > 0) {
      setStartNode(route.path[0]);
      setGoalNode(route.path[route.path.length - 1]);
    }
    setActiveTab('search');
    showNotification(`Loaded saved manifest '${route.title}' onto floorplan.`, 'success');
  };

  // Delete Saved Route
  const handleDeleteRoute = async (routeId: string) => {
    try {
      await deleteUserSavedRoute(routeId);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== routeId));
      showNotification('Route deleted from cloud.', 'info');
    } catch (err: any) {
      showNotification(`Failed to delete route: ${err.message}`, 'error');
    }
  };

  // Active path and waypoints displayed on floorplan
  const currentPathOnCanvas = useMemo(() => {
    if (activeTab === 'multibook' && multiBookPlan?.success) {
      return multiBookPlan.fullPath;
    }
    return searchResult?.path || [];
  }, [activeTab, multiBookPlan, searchResult]);

  const currentWaypointsOnCanvas = useMemo(() => {
    if (activeTab === 'multibook' && multiBookPlan?.success) {
      return multiBookPlan.orderedShelves;
    }
    return [goalNode];
  }, [activeTab, multiBookPlan, goalNode]);

  // Current active step agent position for scrubber
  const currentAgentNode = useMemo(() => {
    if (activeTab === 'search' && searchResult?.snapshots?.[activeStep]) {
      return searchResult.snapshots[activeStep].currentNode;
    }
    return undefined;
  }, [activeTab, searchResult, activeStep]);

  return (
    <div
      className={`relative min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 transition-colors duration-300 ${
        effectiveTheme === 'light'
          ? (is3DEnabled ? 'bg-[#F8FAFC]/90 text-slate-900' : 'bg-[#F8FAFC] text-slate-900')
          : (is3DEnabled ? 'bg-[#080C14]/85 text-slate-100' : 'bg-[#080C14] text-slate-100')
      }`}
    >
      {/* 3D Three.js Procedural Background Scene */}
      {is3DEnabled && (
        <ThreeBackground
          preset={scenePreset}
          interactive={is3DInteractive}
          intensity={sceneIntensity}
          theme={effectiveTheme}
        />
      )}

      {/* 3D Scene Controls Dock */}
      <ThreeSceneControls
        currentPreset={scenePreset}
        onPresetChange={setScenePreset}
        isEnabled={is3DEnabled}
        onToggleEnabled={() => setIs3DEnabled((prev) => !prev)}
        isInteractive={is3DInteractive}
        onToggleInteractive={() => setIs3DInteractive((prev) => !prev)}
        intensity={sceneIntensity}
        onIntensityChange={setSceneIntensity}
      />

      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-xs font-mono shadow-2xl backdrop-blur-md transition-all duration-300 ring-1 ${
            notification.type === 'success'
              ? 'bg-emerald-50/95 dark:bg-[#064E3B]/95 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/60 ring-emerald-500/20 shadow-emerald-500/10'
              : notification.type === 'error'
              ? 'bg-rose-50/95 dark:bg-[#450A0A]/95 text-rose-900 dark:text-rose-200 border-rose-300 dark:border-rose-500/60 ring-rose-500/20 shadow-rose-500/10'
              : 'bg-white/95 dark:bg-[#0D1321]/95 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700/80 ring-slate-900/5 dark:ring-slate-700/20 shadow-slate-900/10 dark:shadow-black/50'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Top Bar Navigation */}
      <div className="relative z-20">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onSignIn={signInWithGoogle}
          onSignOut={signOutUser}
          onQuickSave={() => handleSaveRoute()}
          hasActiveRoute={Boolean(currentPathOnCanvas.length > 0)}
          firestoreConnected={firestoreConnected}
        />
      </div>

      {/* Color Palette & Cartography Design Tokens Modal */}
      <ColorPaletteModal
        isOpen={isPaletteModalOpen}
        onClose={() => setIsPaletteModalOpen(false)}
      />

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-6">
        {/* Hero Section */}
        <HeroSection
          onStartSingleSearch={() => setActiveTab('search')}
          onStartMultiBook={() => setActiveTab('multibook')}
          onRunTestSuite={() => setActiveTab('tests')}
        />

        {/* Spatial Floorplan Map Canvas (Always available for spatial awareness) */}
        <FloorplanCanvas
          startNode={startNode}
          goalNode={goalNode}
          activePath={currentPathOnCanvas}
          currentAgentNode={currentAgentNode}
          closedSections={closedSections}
          crowdedAisles={crowdedAisles}
          hasPermission={hasPermission}
          onSelectNode={handleSelectNodeFromCanvas}
          onToggleClosed={handleToggleClosed}
          onToggleCrowded={handleToggleCrowded}
          waypoints={currentWaypointsOnCanvas}
        />

        {/* Dynamic Tab Panes */}
        <section className="pt-2">
          {activeTab === 'search' && (
            <SingleSearchPanel
              algorithm={algorithm}
              setAlgorithm={setAlgorithm}
              startNode={startNode}
              setStartNode={setStartNode}
              goalNode={goalNode}
              setGoalNode={setGoalNode}
              costMode={costMode}
              setCostMode={setCostMode}
              hasPermission={hasPermission}
              setHasPermission={setHasPermission}
              closedSections={closedSections}
              onToggleClosed={handleToggleClosed}
              crowdedAisles={crowdedAisles}
              searchResult={searchResult}
              onRunSearch={handleRunSearch}
              activeStep={activeStep}
              setActiveStep={setActiveStep}
            />
          )}

          {activeTab === 'multibook' && (
            <MultiBookPanel
              selectedBookIds={selectedBookIds}
              setSelectedBookIds={setSelectedBookIds}
              startNode={startNode}
              setStartNode={setStartNode}
              checkoutNode={checkoutNode}
              setCheckoutNode={setCheckoutNode}
              timeLimitSec={timeLimitSec}
              setTimeLimitSec={setTimeLimitSec}
              costMode={costMode}
              setCostMode={setCostMode}
              hasPermission={hasPermission}
              setHasPermission={setHasPermission}
              closedSections={closedSections}
              onToggleClosed={handleToggleClosed}
              multiBookPlan={multiBookPlan}
              onOptimize={handleOptimizeMultiBook}
              onSaveRoute={() => handleSaveRoute()}
            />
          )}

          {activeTab === 'benchmark' && (
            <AlgorithmLabPanel
              startNode={startNode}
              goalNode={goalNode}
              closedSections={closedSections}
              crowdedAisles={crowdedAisles}
              hasPermission={hasPermission}
              costMode={costMode}
            />
          )}

          {activeTab === 'cloud' && (
            <CloudManifestsPanel
              currentUser={currentUser}
              savedRoutes={savedRoutes}
              onSignIn={signInWithGoogle}
              onSignOut={signOutUser}
              onLoadRoute={handleLoadRoute}
              onDeleteRoute={handleDeleteRoute}
              onSaveCurrentRoute={(name) => handleSaveRoute(name)}
              hasActiveRoute={Boolean(currentPathOnCanvas.length > 0)}
            />
          )}

          {activeTab === 'tests' && <TestConsolePanel />}

          {activeTab === 'code' && <CodeExplorerPanel />}

          {activeTab === 'viva' && <VivaDossierPanel />}
        </section>
      </main>

      {/* Modern Scholarly Footer */}
      <footer className="relative z-10 mt-12 border-t border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-[#06090F]/90 backdrop-blur-sm px-4 lg:px-8 py-6 text-xs text-slate-600 dark:text-slate-400 transition-colors">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">THE ALEXANDRIA CODEX</span>
            <span className="text-slate-400 dark:text-slate-600">·</span>
            <span className="text-slate-700 dark:text-slate-300">Classical Graph Search & Autonomous Spatial Dispatch</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-600 dark:text-slate-400">
            <span>Graph: 14 Nodes, 20 Edges</span>
            <span>·</span>
            <span>Euclidean Heuristic h(n) ≤ h*(n)</span>
            <span>·</span>
            <button
              onClick={() => setIsPaletteModalOpen(true)}
              className="text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 underline underline-offset-2 transition-colors cursor-pointer font-semibold"
            >
              Color System Tokens
            </button>
            <span>·</span>
            <span>Python 3.10 / Streamlit / React 19</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AlexandriaCodexApp />
    </ThemeProvider>
  );
}
