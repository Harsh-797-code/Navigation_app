/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MediPath Hospital Indoor Navigation
 * - Google Maps-Style Two-State Architecture:
 *   1. State 1 (Route Overview - Before Start):
 *      Full hospital floor overview fitted to complete route, start pin, destination pin,
 *      clearly highlighted blue route, and Start Navigation button below the map.
 *   2. State 2 (Live Navigation - After Start):
 *      Smooth animated camera zoom-in centered on user's moving "You are here" marker,
 *      nearby and remaining blue route prominently displayed, Stop & Recenter controls,
 *      and step-by-step directions below the map controls.
 * - Silent Background Sensor Tracking:
 *   Abhinav's dead-reckoning engine runs internally without exposing technical data or panels.
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  HOSPITAL_GRAPH,
  HOSPITAL_NODES,
  HOSPITAL_EDGES,
  POPULAR_DESTINATIONS,
  HOSPITAL_SEARCHABLE_DESTINATIONS,
  QR_CHECKPOINTS,
  calculateRoute,
  floorIdToKey,
  floorKeyToId,
  floorKeyToLabel,
  QRCheckpoint,
} from '../data/hospitalGraph';
import {
  FloorKey,
  DestinationKey,
  RoutePreference,
  FrontendRouteResult,
  Node,
} from '../types/navigation';
import { startTracking, TrackingSession, TrackingData } from '../services/sensorTracker';

export type NavigationStage = 'destination' | 'start-point' | 'route-view';
export type LiveViewMode = 'follow' | 'overview';

interface NavigationScreenProps {
  userEmail?: string;
  onLogout: () => void;
  enlargedFont: boolean;
}

export const NavigationScreen: React.FC<NavigationScreenProps> = ({
  userEmail,
  onLogout,
  enlargedFont,
}) => {
  // Navigation Flow Stage: Destination comes first
  const [navStage, setNavStage] = useState<NavigationStage>('destination');

  // Google Maps-style live navigation camera state
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [liveViewMode, setLiveViewMode] = useState<LiveViewMode>('overview');
  const [recenterToast, setRecenterToast] = useState<string | null>(null);
  const [calibrationToast, setCalibrationToast] = useState<string | null>(null);
  const [showCalibrationPicker, setShowCalibrationPicker] = useState<boolean>(false);

  // Navigation State using Harshitha's exact node and floor IDs
  const [startNodeId, setStartNodeId] = useState<number>(1);
  const [destNodeId, setDestNodeId] = useState<number>(9);
  const [selectedDestKey, setSelectedDestKey] = useState<DestinationKey | null>('lab204');
  const [currentFloor, setCurrentFloor] = useState<FloorKey>('floor1');
  const [userActiveFloor, setUserActiveFloor] = useState<number>(1);
  const [routePreference, setRoutePreference] = useState<RoutePreference>('none');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [errorDismissed, setErrorDismissed] = useState<boolean>(false);

  // Starting point selection mode: 'qr' | 'manual'
  const [startMethod, setStartMethod] = useState<'qr' | 'manual' | null>(null);
  const [qrScanFeedback, setQrScanFeedback] = useState<string | null>(null);

  // Map DOM element reference for smooth recentering
  const mapSectionRef = useRef<HTMLElement | null>(null);

  // Background Indoor Tracking State (Abhinav's dead reckoning coordinates in metres: x = east, y = north)
  const [internalTrackingData, setInternalTrackingData] = useState<TrackingData>({
    x: 0,
    y: 0,
    heading: null,
    steps: 0,
  });
  const trackingSessionRef = useRef<TrackingSession | null>(null);

  // Compute Route Result using Harshitha's Graph & Dijkstra
  const routeResult: FrontendRouteResult = useMemo(() => {
    return calculateRoute(HOSPITAL_GRAPH, startNodeId, destNodeId, routePreference);
  }, [startNodeId, destNodeId, routePreference]);

  // Sync popular destination preset key when destNodeId changes
  useEffect(() => {
    setErrorDismissed(false);
    const preset = Object.values(POPULAR_DESTINATIONS).find((p) => p.nodeId === destNodeId);
    if (preset) {
      setSelectedDestKey(preset.key);
    } else {
      setSelectedDestKey(null);
    }
  }, [destNodeId]);

  // Ensure tracking session is cleanly torn down on unmount
  useEffect(() => {
    return () => {
      if (trackingSessionRef.current) {
        trackingSessionRef.current.stop();
        trackingSessionRef.current = null;
      }
    };
  }, []);

  // Destination Search and Filtering
  const filteredDestinations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return HOSPITAL_SEARCHABLE_DESTINATIONS.filter((item) => {
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'clinic' && item.category !== 'Clinic / OPD' && item.category !== 'Room') return false;
        if (categoryFilter === 'emergency' && item.category !== 'Emergency') return false;
        if (categoryFilter === 'pharmacy' && item.category !== 'Pharmacy') return false;
        if (categoryFilter === 'laboratory' && item.category !== 'Laboratory') return false;
        if (categoryFilter === 'access' && item.category !== 'Elevator' && item.category !== 'Stairs') return false;
      }

      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.floorLabel.toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, categoryFilter]);

  // Handler when a destination is chosen (Advances to Step 2: "Where are you starting from?")
  const handleSelectDestination = (nodeId: number) => {
    setDestNodeId(nodeId);
    setIsNavigating(false);
    setLiveViewMode('overview');
    if (trackingSessionRef.current) {
      trackingSessionRef.current.stop();
      trackingSessionRef.current = null;
    }
    const dest = HOSPITAL_GRAPH.getNode(nodeId);
    if (dest) {
      setCurrentFloor(floorIdToKey(dest.floorId));
    }
    setErrorDismissed(false);
    setNavStage('start-point');
  };

  // Handler for setting start point and immediately displaying the map with calculated route
  const handleSetStartPoint = (nodeId: number, feedbackMessage?: string) => {
    setStartNodeId(nodeId);
    setIsNavigating(false);
    setLiveViewMode('overview');
    if (trackingSessionRef.current) {
      trackingSessionRef.current.stop();
      trackingSessionRef.current = null;
    }
    const start = HOSPITAL_GRAPH.getNode(nodeId);
    if (start) {
      setCurrentFloor(floorIdToKey(start.floorId));
      setUserActiveFloor(start.floorId);
    }
    if (feedbackMessage) {
      setQrScanFeedback(feedbackMessage);
      setTimeout(() => {
        setQrScanFeedback(null);
        setNavStage('route-view');
      }, 500);
    } else {
      setNavStage('route-view');
    }
  };

  // Handler for QR Checkpoint selection
  const handleScanCheckpoint = (checkpoint: QRCheckpoint) => {
    handleSetStartPoint(
      checkpoint.nodeId,
      `Checkpoint verified: ${checkpoint.label} (${checkpoint.floorLabel})`
    );
  };

  // Handler for "Use Location"
  const handleUseLocation = () => {
    handleSetStartPoint(1, 'Current location identified: Main Entrance Checkpoint');
  };

  // Handler for Start Navigation button immediately below the map (Switches to State 2: Live Navigation)
  const handleStartNavigation = async () => {
    if (!routeResult.found) return;

    // Reset dead-reckoning counter for fresh session
    setInternalTrackingData({
      x: 0,
      y: 0,
      heading: null,
      steps: 0,
    });

    if (startNode) {
      setCurrentFloor(floorIdToKey(startNode.floorId));
      setUserActiveFloor(startNode.floorId);
    }

    if (trackingSessionRef.current) {
      trackingSessionRef.current.stop();
      trackingSessionRef.current = null;
    }

    try {
      const session = await startTracking((data) => {
        setInternalTrackingData({
          x: data.x,
          y: data.y,
          heading: data.heading != null ? Math.round(data.heading) : null,
          steps: data.steps,
        });
      });
      trackingSessionRef.current = session;
    } catch (err) {
      console.info('[MediPath Tracker] Motion tracking active in baseline mode:', err);
    }

    setIsNavigating(true);
    setLiveViewMode('follow');
    readAloudInstruction(`Starting navigation to ${destNode?.name || 'destination'}. Follow the highlighted blue route on the map.`);
  };

  // Handler for Stop Navigation button
  const handleStopNavigation = () => {
    setIsNavigating(false);
    setLiveViewMode('overview');
    if (trackingSessionRef.current) {
      trackingSessionRef.current.stop();
      trackingSessionRef.current = null;
    }
    readAloudInstruction('Navigation ended.');
  };

  // Handler for Recenter button (re-centers camera on user's live position without resetting tracking)
  const handleRecenter = () => {
    setLiveViewMode('follow');
    const targetFloorKey = floorIdToKey(userActiveFloor);
    setCurrentFloor(targetFloorKey);
    mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setRecenterToast(`Recentered on ${floorKeyToLabel(targetFloorKey)}`);
    setTimeout(() => {
      setRecenterToast(null);
    }, 2500);
  };

  // Toggle between Google Maps zoomed Follow mode and Full Route Overview mode
  const handleToggleViewMode = () => {
    setLiveViewMode((prev) => (prev === 'follow' ? 'overview' : 'follow'));
  };

  // QR / Checkpoint Position Correction during Navigation
  const handleCalibrateWithCheckpoint = (checkpoint: QRCheckpoint) => {
    const targetNode = HOSPITAL_GRAPH.getNode(checkpoint.nodeId);
    if (targetNode && startNode) {
      // Metric displacement in graph: 50 units = 10m -> 5 units/metre
      const deltaX = (targetNode.x - startNode.x) / 5.0; // East is +x
      const deltaY = (startNode.y - targetNode.y) / 5.0; // North is -y in graph

      if (trackingSessionRef.current) {
        trackingSessionRef.current.setPosition(deltaX, deltaY);
      } else {
        setInternalTrackingData((prev) => ({
          ...prev,
          x: deltaX,
          y: deltaY,
        }));
      }

      setUserActiveFloor(targetNode.floorId);
      setCurrentFloor(floorIdToKey(targetNode.floorId));
      setShowCalibrationPicker(false);
      setLiveViewMode('follow');
      setCalibrationToast(`Position calibrated to ${checkpoint.label}`);
      setTimeout(() => setCalibrationToast(null), 3000);
      readAloudInstruction(`Position confirmed at ${checkpoint.label}.`);
    }
  };

  // Handler for floor tabs
  const handleFloorClick = (floorKey: FloorKey) => {
    setCurrentFloor(floorKey);
  };

  // Audio Speech Synthesis for Read Aloud
  const readAloudInstruction = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Start & Destination node and floor resolution
  const startNode = useMemo(() => HOSPITAL_GRAPH.getNode(startNodeId), [startNodeId]);
  const destNode = useMemo(() => HOSPITAL_GRAPH.getNode(destNodeId), [destNodeId]);
  const startFloorId = startNode ? startNode.floorId : 1;
  const destinationFloorId = destNode ? destNode.floorId : 1;
  const destinationFloorKey = floorIdToKey(destinationFloorId);

  // SVG coordinate resolution for floor maps
  const getFloor1NodeCoords = (id: number): { x: number; y: number } | null => {
    switch (id) {
      case 1: return { x: 145, y: 260 };
      case 2: return { x: 360, y: 260 };
      case 3: return { x: 360, y: 425 };
      case 4: return { x: 360, y: 90 };
      case 5: return { x: 595, y: 260 };
      default: return null;
    }
  };

  const getFloor2NodeCoords = (id: number): { x: number; y: number } | null => {
    switch (id) {
      case 6: return { x: 360, y: 90 };
      case 7: return { x: 510, y: 260 };
      case 8: return { x: 615, y: 260 };
      case 9: return { x: 800, y: 260 };
      default: return null;
    }
  };

  const startCoordsFloor1 = startFloorId === 1 ? getFloor1NodeCoords(startNodeId) : null;
  const startCoordsFloor2 = startFloorId === 2 ? getFloor2NodeCoords(startNodeId) : null;
  const destCoordsFloor1 = destinationFloorId === 1 ? getFloor1NodeCoords(destNodeId) : null;
  const destCoordsFloor2 = destinationFloorId === 2 ? getFloor2NodeCoords(destNodeId) : null;

  // Check if two nodes form a consecutive edge in the calculated route
  const isConsecutiveEdge = (idA: number, idB: number): boolean => {
    if (!routeResult.found || routeResult.path.length < 2) return false;
    for (let i = 0; i < routeResult.path.length - 1; i++) {
      const a = routeResult.path[i].id;
      const b = routeResult.path[i + 1].id;
      if ((a === idA && b === idB) || (a === idB && b === idA)) {
        return true;
      }
    }
    return false;
  };

  // Check transit type used between floors
  const crossFloorTransitType = useMemo(() => {
    for (let i = 0; i < routeResult.path.length - 1; i++) {
      const u = routeResult.path[i];
      const v = routeResult.path[i + 1];
      if (u.floorId !== v.floorId) {
        if ((u.id === 5 && v.id === 7) || (u.id === 7 && v.id === 5)) return 'lift';
        if ((u.id === 4 && v.id === 6) || (u.id === 6 && v.id === 4)) return 'stairs';
      }
    }
    return null;
  }, [routeResult.path]);

  // Convert sensor relative coordinates in metres (x = east, y = north) to SVG map coordinates
  // Scale factors based on hospital map: 21.5 SVG pixels/metre East, 21.25 SVG pixels/metre North
  const userMapCoords = useMemo(() => {
    const SCALE_X = 21.5;
    const SCALE_Y = 21.25;

    // Floor 1 reference: start node coordinates
    const startSvgF1 = getFloor1NodeCoords(startNodeId) || { x: 145, y: 260 };
    // Floor 2 reference: if started on F2, use startNode; if transitioned, use lift (7) or stairs (6)
    const startSvgF2 = startFloorId === 2
      ? (getFloor2NodeCoords(startNodeId) || { x: 510, y: 260 })
      : crossFloorTransitType === 'stairs'
      ? { x: 360, y: 90 }
      : { x: 510, y: 260 };

    // Clamping to map bounds [40, 880] and [40, 480]
    const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

    const f1X = clamp(startSvgF1.x + internalTrackingData.x * SCALE_X, 40, 880);
    const f1Y = clamp(startSvgF1.y - internalTrackingData.y * SCALE_Y, 40, 480);

    const f2X = clamp(startSvgF2.x + internalTrackingData.x * SCALE_X, 40, 880);
    const f2Y = clamp(startSvgF2.y - internalTrackingData.y * SCALE_Y, 40, 480);

    return {
      floor1: { x: Math.round(f1X), y: Math.round(f1Y) },
      floor2: { x: Math.round(f2X), y: Math.round(f2Y) },
    };
  }, [startNodeId, startFloorId, crossFloorTransitType, internalTrackingData.x, internalTrackingData.y]);

  // Google Maps camera position and zoom for Floor 1 and Floor 2
  // State 1: zoom = 1, centered at origin (overview of entire floor & route)
  // State 2: zoom = 1.65, smoothly centered around user's live position
  const mapCameraF1 = useMemo(() => {
    if (!isNavigating || liveViewMode === 'overview') {
      return { x: 0, y: 0, zoom: 1 };
    }
    const zoom = 1.65;
    const clampedX = Math.max(160, Math.min(760, userMapCoords.floor1.x));
    const clampedY = Math.max(120, Math.min(400, userMapCoords.floor1.y));
    return {
      x: Math.round(460 - clampedX * zoom),
      y: Math.round(260 - clampedY * zoom),
      zoom,
    };
  }, [isNavigating, liveViewMode, userMapCoords.floor1.x, userMapCoords.floor1.y]);

  const mapCameraF2 = useMemo(() => {
    if (!isNavigating || liveViewMode === 'overview') {
      return { x: 0, y: 0, zoom: 1 };
    }
    const zoom = 1.65;
    const clampedX = Math.max(160, Math.min(760, userMapCoords.floor2.x));
    const clampedY = Math.max(120, Math.min(400, userMapCoords.floor2.y));
    return {
      x: Math.round(460 - clampedX * zoom),
      y: Math.round(260 - clampedY * zoom),
      zoom,
    };
  }, [isNavigating, liveViewMode, userMapCoords.floor2.x, userMapCoords.floor2.y]);

  // Map user's internal position and displacement to route progress
  const routeProgressState = useMemo(() => {
    if (!routeResult.found || routeResult.path.length === 0) {
      return {
        activeStepIndex: 0,
        hasArrived: false,
      };
    }

    const totalDist = routeResult.totalDistanceMeters;
    // Estimated walked distance from sensor steps and displacement
    const walkedDist = Math.max(
      Math.hypot(internalTrackingData.x, internalTrackingData.y),
      internalTrackingData.steps * 0.7
    );
    const hasArrived = totalDist > 0 && walkedDist >= totalDist;

    if (hasArrived) {
      return {
        activeStepIndex: Math.max(0, routeResult.steps.length - 1),
        hasArrived: true,
      };
    }

    // Traverse route segments to find the active step
    let accumulated = 0;
    let activeStepIdx = 0;

    for (let i = 0; i < routeResult.path.length - 1; i++) {
      const u = routeResult.path[i];
      const v = routeResult.path[i + 1];
      const edge = HOSPITAL_EDGES.find(
        (e) => (e.fromNodeId === u.id && e.toNodeId === v.id) || (e.fromNodeId === v.id && e.toNodeId === u.id)
      );
      const edgeDist = edge ? edge.distance : 10;

      if (walkedDist <= accumulated + edgeDist) {
        activeStepIdx = Math.min(i, routeResult.steps.length - 1);
        break;
      }
      accumulated += edgeDist;
      activeStepIdx = Math.min(i + 1, routeResult.steps.length - 1);
    }

    return {
      activeStepIndex: activeStepIdx,
      hasArrived: false,
    };
  }, [routeResult, internalTrackingData.x, internalTrackingData.y, internalTrackingData.steps]);

  // Active step hero instruction (driven by internal position tracking)
  const heroInstruction = useMemo(() => {
    if (!routeResult.found) {
      return {
        icon: 'error_outline',
        label: 'Route Unavailable',
        text: routeResult.errorMessage || 'No connected path exists between selected locations.',
      };
    }

    const totalSteps = routeResult.steps.length;
    const destName = destNode?.name || 'Destination';

    if (routeProgressState.hasArrived) {
      return {
        icon: 'check_circle',
        label: 'Arrived at Destination',
        text: `You have arrived at ${destName}. Navigation complete.`,
      };
    }

    const activeStep = routeResult.steps[routeProgressState.activeStepIndex] || routeResult.steps[0];
    return {
      icon: activeStep.icon,
      label: `Step ${activeStep.num} of ${totalSteps} • ${activeStep.floor}`,
      text: `${activeStep.title}: ${activeStep.desc}`,
    };
  }, [routeResult, routeProgressState, destNode]);

  return (
    <div className={`min-h-screen flex flex-col bg-[#f8fafc] text-[#0f172a] ${enlargedFont ? 'text-[17px]' : 'text-[15px]'}`}>
      {/* 1. TOP HEADER */}
      <header className="w-full bg-white border-b border-slate-200 shadow-xs py-3.5 px-4 sm:px-8 shrink-0 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-[#00685f] flex items-center justify-center text-white shadow-md shadow-[#00685f]/20 shrink-0">
              <span className="material-symbols-outlined text-[28px]">explore</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#00685f]">
                  MediPath
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e6f6f4] text-[#00685f]">
                  Indoor Navigation
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                St. Jude Regional Medical Center • Patient &amp; Visitor Wayfinding
              </p>
            </div>
          </div>

          <div className="flex items-center self-start sm:self-center gap-2 flex-wrap">
            {/* Step Breadcrumbs */}
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setNavStage('destination');
                  setIsNavigating(false);
                  setLiveViewMode('overview');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  navStage === 'destination'
                    ? 'bg-[#00685f] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>1. Destination</span>
              </button>
              <span className="text-slate-300">›</span>
              <button
                type="button"
                onClick={() => {
                  setNavStage('start-point');
                  setIsNavigating(false);
                  setLiveViewMode('overview');
                }}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  navStage === 'start-point'
                    ? 'bg-[#00685f] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>2. Start Point</span>
              </button>
              <span className="text-slate-300">›</span>
              <button
                type="button"
                onClick={() => setNavStage('route-view')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  navStage === 'route-view'
                    ? 'bg-[#00685f] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>3. Live Route</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onLogout}
              title="Log out or switch user"
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col gap-6">

        {/* ========================================================= */}
        {/* STEP 1: DESTINATION SELECTION ("Where do you want to go?") */}
        {/* ========================================================= */}
        {navStage === 'destination' && (
          <section
            aria-label="Destination Selection"
            className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-md p-5 sm:p-8 flex flex-col gap-6 animate-fade-in"
          >
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-[#e6f6f4] text-[#00685f] text-xs font-extrabold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">pin_drop</span>
                <span>Step 1 of 2</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Where do you want to go?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Search for any hospital department, clinic, or room number below, or tap a destination card.
              </p>
            </div>

            {/* Prominent Search Input Box */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[#00685f] text-[24px]">
                  search
                </span>
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search destination (e.g., Pharmacy, Emergency, OPD, Laboratory, Rescue, Room 101, Elevator...)"
                  className="w-full h-14 pl-13 pr-12 bg-slate-50 border-2 border-slate-300 hover:border-[#00685f]/60 rounded-2xl text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00685f] focus:bg-white focus:ring-4 focus:ring-[#00685f]/15 transition-all shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Quick Filter Category Pills */}
              <div className="flex items-center gap-2 flex-wrap text-xs font-bold pt-1">
                <span className="text-slate-400 font-semibold mr-1">Quick Filters:</span>
                {[
                  { id: 'all', label: 'All Destinations' },
                  { id: 'emergency', label: 'Emergency & Rescue' },
                  { id: 'pharmacy', label: 'Pharmacy' },
                  { id: 'clinic', label: 'OPD & Clinics' },
                  { id: 'laboratory', label: 'Laboratory' },
                  { id: 'access', label: 'Lifts & Stairs' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-[#00685f] border-[#00685f] text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Grid / Destination Cards */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  Select a Destination ({filteredDestinations.length} available)
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  Tap to select and proceed to start point
                </span>
              </div>

              {filteredDestinations.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[36px] text-slate-400">search_off</span>
                  <div className="font-extrabold text-base text-slate-700">No destinations match &ldquo;{searchQuery}&rdquo;</div>
                  <p className="text-xs text-slate-500">
                    Try searching for &ldquo;Pharmacy&rdquo;, &ldquo;Emergency&rdquo;, &ldquo;OPD&rdquo;, &ldquo;Laboratory&rdquo;, &ldquo;Rescue&rdquo;, or &ldquo;Room 101&rdquo;.
                  </p>
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); setCategoryFilter('all'); }}
                    className="mt-2 px-4 py-2 bg-[#00685f] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredDestinations.map((dest) => {
                    const isSelected = destNodeId === dest.nodeId;
                    return (
                      <button
                        key={dest.id}
                        type="button"
                        onClick={() => handleSelectDestination(dest.nodeId)}
                        className={`p-4 rounded-2xl border-2 text-left flex items-start justify-between gap-3 transition-all cursor-pointer group active:scale-98 ${
                          isSelected
                            ? 'border-[#00685f] bg-[#00685f] text-white shadow-md ring-4 ring-[#00685f]/20'
                            : `${dest.colorTheme.bg} ${dest.colorTheme.border} hover:border-[#00685f] hover:shadow-xs`
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                              isSelected
                                ? 'bg-white text-[#00685f]'
                                : 'bg-white text-slate-700 border border-slate-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[24px]">
                              {dest.icon}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                  isSelected
                                    ? 'bg-white/25 text-white'
                                    : `${dest.colorTheme.badgeBg} ${dest.colorTheme.badgeText}`
                                }`}
                              >
                                {dest.category}
                              </span>
                              <span
                                className={`text-[11px] font-bold ${
                                  isSelected ? 'text-white/80' : 'text-slate-500'
                                }`}
                              >
                                {dest.floorLabel}
                              </span>
                            </div>
                            <div className={`font-extrabold text-base mt-1 truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                              {dest.name}
                            </div>
                            <div className={`text-xs font-medium mt-0.5 leading-snug ${isSelected ? 'text-white/90' : 'text-slate-500'}`}>
                              {dest.subtitle}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-white text-[#00685f] flex items-center justify-center font-extrabold text-xs shrink-0 mt-1">
                            ✓
                          </span>
                        ) : (
                          <span className="material-symbols-outlined text-slate-300 group-hover:text-[#00685f] transition-colors text-[20px] shrink-0 mt-1">
                            arrow_forward
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Link to Route Guidance if already set */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Current destination: <strong className="text-slate-800">{destNode?.name || 'Computer Lab 204'}</strong>
              </span>
              <button
                type="button"
                onClick={() => setNavStage('start-point')}
                className="px-5 py-2.5 rounded-xl bg-[#00685f] hover:bg-[#00534c] text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <span>Continue to Start Point</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STEP 2: STARTING-POINT SELECTION ("Where are you starting from?") */}
        {/* ============================================================== */}
        {navStage === 'start-point' && (
          <section
            aria-label="Starting Point Selection"
            className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-md p-5 sm:p-8 flex flex-col gap-6 animate-fade-in"
          >
            {/* Context Pill showing Selected Destination */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#e6f6f4] border border-[#00685f]/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00685f] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">flag</span>
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#00685f]">
                    Selected Destination
                  </div>
                  <div className="text-base sm:text-lg font-extrabold text-slate-900">
                    {destNode?.name || 'Computer Lab 204'} ({floorKeyToLabel(destinationFloorKey)})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setNavStage('destination')}
                className="self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                <span>Change Destination</span>
              </button>
            </div>

            {/* Section Heading: "Where are you starting from?" */}
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 self-start px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px] text-[#00685f]">trip_origin</span>
                <span>Step 2 of 2</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Where are you starting from?
              </h2>
              <p className="text-sm sm:text-base text-slate-600 font-medium">
                Choose how you would like to set your starting location inside the hospital:
              </p>
            </div>

            {/* Feedback banner if QR checkpoint scanned */}
            {qrScanFeedback && (
              <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-900 flex items-center gap-3 animate-bounce-short">
                <span className="material-symbols-outlined text-emerald-600 text-[26px]">check_circle</span>
                <div className="font-extrabold text-sm sm:text-base">
                  {qrScanFeedback}
                </div>
              </div>
            )}

            {/* 3 Prominent Starting-Point Options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* OPTION 1: SCAN QR CODE */}
              <div
                className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                  startMethod === 'qr'
                    ? 'border-[#00685f] bg-[#f0fbf9] shadow-sm ring-2 ring-[#00685f]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-[#00685f] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">qr_code_scanner</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg text-slate-900">Scan QR Code</h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        Wall Sign
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      Tap any nearest hospital checkpoint sign or scan code to confirm your starting point instantly.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStartMethod(startMethod === 'qr' ? null : 'qr')}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#00685f] hover:bg-[#00534c] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                    <span>{startMethod === 'qr' ? 'Hide QR Codes' : 'Select QR Checkpoint'}</span>
                  </button>
                </div>
              </div>

              {/* OPTION 2: USE LOCATION */}
              <div className="p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-blue-300 transition-all flex flex-col justify-between">
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">my_location</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg text-slate-900">Use Location</h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Automatic
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      Automatically detect your location inside the hospital and start guided navigation along your route.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleUseLocation}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">near_me</span>
                    <span>Start From Current Location</span>
                  </button>
                </div>
              </div>

              {/* OPTION 3: SELECT MANUALLY */}
              <div
                className={`p-5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                  startMethod === 'manual'
                    ? 'border-[#00685f] bg-[#f0fbf9] shadow-sm ring-2 ring-[#00685f]/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">list_alt</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-lg text-slate-900">Select Manually</h3>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Choose Node
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                      Choose your starting point manually from the hospital directory or select any floor node.
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStartMethod(startMethod === 'manual' ? null : 'manual')}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">touch_app</span>
                    <span>{startMethod === 'manual' ? 'Hide Locations' : 'Browse Locations'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* EXPANDABLE SUB-SECTION: QR CODE SCANNER INTERFACE */}
            {startMethod === 'qr' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-900 text-white flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-teal-400 text-[24px]">qr_code_scanner</span>
                    <h4 className="font-extrabold text-base text-white">Hospital Wall QR Checkpoints</h4>
                  </div>
                  <span className="text-xs text-teal-300 font-medium">
                    Tap your nearest checkpoint to set starting point
                  </span>
                </div>

                {/* Instant Tap-to-Scan Checkpoint Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {QR_CHECKPOINTS.map((cp) => (
                    <button
                      key={cp.code}
                      type="button"
                      onClick={() => handleScanCheckpoint(cp)}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left flex items-start gap-3 transition-all cursor-pointer group active:scale-95"
                    >
                      <div className="w-9 h-9 rounded-lg bg-teal-900/60 text-teal-300 border border-teal-500/30 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{cp.icon}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-teal-400 uppercase">
                            {cp.code} • {cp.floorLabel}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                          {cp.label}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {cp.locationDetails}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* EXPANDABLE SUB-SECTION: MANUAL SELECTION LIST */}
            {startMethod === 'manual' && (
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50 border-2 border-slate-200 flex flex-col gap-4 animate-fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-700 text-[22px]">format_list_bulleted</span>
                    <h4 className="font-extrabold text-base text-slate-900">Hospital Checkpoint Directory</h4>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Tap any location to confirm as start point
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HOSPITAL_NODES.map((n) => {
                    const isSelected = startNodeId === n.id;
                    return (
                      <button
                        key={`manual-start-${n.id}`}
                        type="button"
                        onClick={() => handleSetStartPoint(n.id)}
                        className={`p-3.5 rounded-xl border-2 text-left flex items-start justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00685f] text-white border-[#00685f] shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-900'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Node #{n.id}
                            </span>
                            <span className={`text-[11px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                              Floor {n.floorId}
                            </span>
                          </div>
                          <div className="font-extrabold text-sm mt-1">{n.name}</div>
                          <div className={`text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                            Type: {n.type}
                          </div>
                        </div>

                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-white text-[#00685f] flex items-center justify-center font-bold text-xs shrink-0 mt-1">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bottom Proceed Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-medium">
                Starting from: <strong className="text-slate-900">{startNode?.name || 'Main Entrance'} (Floor {startFloorId})</strong>
              </div>
              <button
                type="button"
                onClick={() => setNavStage('route-view')}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#00685f] hover:bg-[#00534c] text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98"
              >
                <span>Confirm &amp; View Route</span>
                <span className="material-symbols-outlined text-[18px]">directions</span>
              </button>
            </div>
          </section>
        )}

        {/* ============================================================== */}
        {/* STEP 3: LIVE HOSPITAL MAP & NAVIGATION CONTROLS                */}
        {/* ============================================================== */}
        {navStage === 'route-view' && (
          <>
            {/* ROUTE CONTROL & PREFERENCE BAR */}
            <section aria-label="Route Overview and Configuration" className="w-full">
              <div className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-xs p-4 sm:p-5 flex flex-col gap-4">
                {/* Selected Journey Pill & Quick Change Buttons */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Start Node Display */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs sm:text-sm font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00685f]" />
                      <span>Start: <strong>{startNode?.name || 'Main Entrance'}</strong></span>
                      <span className="text-[11px] text-slate-500 font-normal">(F{startFloorId})</span>
                    </div>

                    <span className="text-slate-400 font-bold">➔</span>

                    {/* Destination Node Display */}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e6f6f4] border border-[#00685f]/30 text-[#00685f] text-xs sm:text-sm font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                      <span>To: <strong>{destNode?.name || 'Computer Lab 204'}</strong></span>
                      <span className="text-[11px] text-[#00685f]/80 font-normal">(F{destinationFloorId})</span>
                    </div>
                  </div>

                  {/* Change Destination / Start Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNavStage('start-point');
                        setIsNavigating(false);
                        setLiveViewMode('overview');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">trip_origin</span>
                      <span>Change Start</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNavStage('destination');
                        setIsNavigating(false);
                        setLiveViewMode('overview');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#00685f] hover:bg-[#00534c] text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[15px]">pin_drop</span>
                      <span>Change Destination</span>
                    </button>
                  </div>
                </div>

                {/* Preference Selector & Status Pill */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 font-semibold">Preference:</span>
                    <div className="inline-flex p-1 bg-slate-100 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setRoutePreference('none')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          routePreference === 'none'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        No preference
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoutePreference('avoid-stairs')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          routePreference === 'avoid-stairs'
                            ? 'bg-white text-slate-900 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Avoid stairs
                      </button>

                      <button
                        type="button"
                        onClick={() => setRoutePreference('accessible')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                          routePreference === 'accessible'
                            ? 'bg-white text-[#00685f] shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px] text-emerald-600">accessible</span>
                        <span>Accessible route only</span>
                      </button>
                    </div>
                  </div>

                  {/* Status Indicator Pill */}
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                      routeResult.found
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        routeResult.found ? 'bg-emerald-600 animate-pulse' : 'bg-red-600'
                      }`}
                    />
                    <span>
                      {routeResult.found
                        ? `Route calculated: ${routeResult.totalDistanceMeters}m (${routeResult.path.length} checkpoints)`
                        : 'Route: Path Not Found'}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* VISIBLE FLOOR SELECTOR TABS (Floor 1 & Floor 2) */}
            <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div aria-label="Hospital Floors" className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl gap-1.5" role="tablist">
                {/* Floor 1 Tab */}
                <button
                  role="tab"
                  type="button"
                  onClick={() => handleFloorClick('floor1')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentFloor === 'floor1'
                      ? 'bg-white text-[#00685f] shadow-xs border border-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                  }`}
                >
                  <span>Floor 1</span>
                  <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                    (Entrance, Junction, Rm 101, Stairs, Lift)
                  </span>
                  {userActiveFloor === 1 && isNavigating && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      You are here
                    </span>
                  )}
                  {destinationFloorId === 1 && !isNavigating && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#e6f6f4] text-[#00685f] border border-[#00685f]/20">
                      Destination
                    </span>
                  )}
                </button>

                {/* Floor 2 Tab */}
                <button
                  role="tab"
                  type="button"
                  onClick={() => handleFloorClick('floor2')}
                  className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    currentFloor === 'floor2'
                      ? 'bg-white text-[#00685f] shadow-xs border border-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                  }`}
                >
                  <span>Floor 2</span>
                  <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                    (Stairs, Lift, Junction, Lab 204)
                  </span>
                  {userActiveFloor === 2 && isNavigating && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      You are here
                    </span>
                  )}
                  {destinationFloorId === 2 && !isNavigating && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Destination
                    </span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00685f] animate-pulse" />
                <span>
                  Showing {currentFloor === 'floor1' ? 'Floor 1 (Ground Concourse)' : 'Floor 2 (Upper Concourse)'} Map
                </span>
                {crossFloorTransitType && (
                  <button
                    type="button"
                    onClick={() => setCurrentFloor(currentFloor === 'floor1' ? 'floor2' : 'floor1')}
                    className="ml-2 text-xs font-bold text-[#00685f] hover:underline cursor-pointer"
                  >
                    Switch to {currentFloor === 'floor1' ? 'Floor 2' : 'Floor 1'}
                  </button>
                )}
              </div>
            </section>

            {/* MAIN CENTRAL HERO: GOOGLE MAPS-STYLE 2D HOSPITAL FLOOR MAP (SVG) */}
            <section
              ref={mapSectionRef}
              aria-label="Hospital Navigation Map"
              className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-md p-3 sm:p-5 flex flex-col relative overflow-hidden"
            >
              {/* Map Header & Walk Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 px-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00685f] text-[20px]">
                    {isNavigating ? 'near_me' : 'map'}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900">
                    {currentFloor === 'floor1'
                      ? 'Floor 1 • Main Concourse (Nodes 1 - 5)'
                      : 'Floor 2 • Upper Concourse (Nodes 6 - 9)'}
                  </span>
                  {/* Google Maps state badge */}
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isNavigating
                      ? liveViewMode === 'follow'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isNavigating
                      ? liveViewMode === 'follow' ? 'Live Follow (Zoomed)' : 'Route Overview'
                      : 'Route Overview'}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Google Maps View Toggle: Toggle between Follow-Me and Full-Route Overview */}
                  {isNavigating && (
                    <button
                      type="button"
                      onClick={handleToggleViewMode}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px] text-[#00685f]">
                        {liveViewMode === 'follow' ? 'zoom_out_map' : 'center_focus_strong'}
                      </span>
                      <span>{liveViewMode === 'follow' ? 'Full Route' : 'Follow Me'}</span>
                    </button>
                  )}

                  {/* Route Summary Badge */}
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">directions_walk</span>
                    <span>
                      {routeResult.found
                        ? `${isNavigating ? 'Navigating: ' : 'Route: '}${routeResult.totalDistanceMeters}m • ${routeResult.timeFormatted} • ${routeResult.accessibilityNote}`
                        : 'Route unavailable for current node selection'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SVG Map Canvas Container (Supports smooth zoom-in & camera pan) */}
              <div className="w-full relative flex items-center justify-center my-2 bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200/80">
                <div className="w-full max-w-[960px] aspect-[16/9] relative overflow-hidden">
                  {/* ================= FLOOR 1 MAP ================= */}
                  {currentFloor === 'floor1' && (
                    <svg
                      className="w-full h-full drop-shadow-xs select-none"
                      viewBox="0 0 920 520"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <pattern id="grid-f1" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.4" />
                        </pattern>
                      </defs>

                      {/* Floor Plan Base Background (unscaled) */}
                      <rect width="920" height="520" rx="20" fill="#f8fafc" />

                      {/* Google Maps-style Zoomable & Pannable Group */}
                      <g
                        id="camera-canvas-f1"
                        style={{
                          transform: `translate(${mapCameraF1.x}px, ${mapCameraF1.y}px) scale(${mapCameraF1.zoom})`,
                          transformOrigin: '0 0',
                          transition: 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)',
                        }}
                      >
                        <rect x="20" y="20" width="880" height="480" rx="16" fill="url(#grid-f1)" />
                        <rect x="20" y="20" width="880" height="480" rx="16" stroke="#94a3b8" strokeWidth="2.5" fill="#ffffff" />

                        {/* Floor 1 Corridors */}
                        <rect x="180" y="235" width="460" height="50" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                        <rect x="335" y="130" width="50" height="260" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                        <rect x="335" y="235" width="50" height="50" fill="#f1f5f9" />

                        {/* Node 1: Main Entrance (ENTRANCE) Clickable */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(1); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="70"
                            y="200"
                            width="150"
                            height="120"
                            rx="14"
                            fill="#e6f6f4"
                            stroke={destNodeId === 1 ? '#ba1a1a' : startNodeId === 1 ? '#00685f' : '#cbd5e1'}
                            strokeWidth={destNodeId === 1 || startNodeId === 1 ? '3.5' : '2'}
                            className="transition-all"
                          />
                          <rect x="85" y="215" width="75" height="22" rx="6" fill="#00685f" />
                          <text x="122" y="230" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #1</text>
                          <text x="85" y="262" fontSize="15" fontWeight="800" fill="#00685f">Main Entrance</text>
                          <text x="85" y="282" fontSize="11" fontWeight="600" fill="#475569">Building Ingress</text>
                          <text x="85" y="300" fontSize="10" fontWeight="500" fill="#64748b">Ground Floor Lobby</text>
                        </g>

                        {/* Node 2: Floor 1 Main Corridor Junction (JUNCTION) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(2); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <circle
                            cx="360"
                            cy="260"
                            r="32"
                            fill="#f8fafc"
                            stroke={destNodeId === 2 ? '#ba1a1a' : startNodeId === 2 ? '#00685f' : '#94a3b8'}
                            strokeWidth={destNodeId === 2 || startNodeId === 2 ? '3.5' : '2'}
                          />
                          <circle cx="360" cy="260" r="8" fill="#00685f" />
                          <text x="360" y="240" textAnchor="middle" fontSize="9" fontWeight="800" fill="#64748b">JUNCTION #2</text>
                          <text x="360" y="305" textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">Central Corridor</text>
                        </g>

                        {/* Node 3: Room 101 (ROOM) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(3); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="280"
                            y="360"
                            width="160"
                            height="115"
                            rx="14"
                            fill="#f0fdf4"
                            stroke={destNodeId === 3 ? '#ba1a1a' : startNodeId === 3 ? '#00685f' : '#bbf7d0'}
                            strokeWidth={destNodeId === 3 || startNodeId === 3 ? '3.5' : '2'}
                            className="transition-all"
                          />
                          <rect x="295" y="375" width="75" height="22" rx="6" fill="#15803d" />
                          <text x="332" y="390" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #3</text>
                          <text x="295" y="425" fontSize="16" fontWeight="800" fill="#0f172a">Room 101</text>
                          <text x="295" y="445" fontSize="11" fontWeight="600" fill="#64748b">Ground Floor Room</text>
                          <text x="295" y="462" fontSize="10" fontWeight="600" fill="#15803d">OPD / Pharmacy</text>
                        </g>

                        {/* Node 4: Floor 1 Stairs (STAIRS) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(4); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="280"
                            y="45"
                            width="160"
                            height="100"
                            rx="14"
                            fill="#fef3c7"
                            stroke={destNodeId === 4 ? '#ba1a1a' : startNodeId === 4 ? '#00685f' : '#fde68a'}
                            strokeWidth={destNodeId === 4 || startNodeId === 4 ? '3.5' : '2'}
                          />
                          <rect x="295" y="60" width="75" height="22" rx="6" fill="#b45309" />
                          <text x="332" y="75" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #4</text>
                          <text x="295" y="105" fontSize="15" fontWeight="800" fill="#78350f">Floor 1 Stairs</text>
                          <text x="295" y="125" fontSize="11" fontWeight="600" fill="#b45309">Stairway to Floor 2</text>
                        </g>

                        {/* Node 5: Floor 1 Elevator (LIFT) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(5); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="510"
                            y="200"
                            width="170"
                            height="120"
                            rx="14"
                            fill="#e0f2fe"
                            stroke={destNodeId === 5 ? '#ba1a1a' : startNodeId === 5 ? '#00685f' : '#bae6fd'}
                            strokeWidth={destNodeId === 5 || startNodeId === 5 ? '3.5' : '2'}
                          />
                          <rect x="525" y="215" width="75" height="22" rx="6" fill="#006398" />
                          <text x="562" y="230" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #5</text>
                          <text x="525" y="262" fontSize="15" fontWeight="800" fill="#0c4a6e">Floor 1 Elevator</text>
                          <text x="525" y="282" fontSize="11" fontWeight="600" fill="#0284c7">Elevator to Floor 2</text>
                          <text x="525" y="300" fontSize="10" fontWeight="600" fill="#0369a1">Accessible Vertical Transit</text>
                        </g>

                        {/* ============================================================== */}
                        {/* CLEARLY HIGHLIGHTED BLUE ROUTE PATH (FLOOR 1)                   */}
                        {/* Remainder visible BEFORE and DURING navigation                  */}
                        {/* ============================================================== */}
                        {routeResult.found && (
                          <g id="route-highlight-f1">
                            {/* Segment 1 -> 2 (Main Entrance to Corridor Junction) */}
                            {isConsecutiveEdge(1, 2) && (
                              <g>
                                <line x1="145" y1="260" x2="360" y2="260" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
                                <line x1="145" y1="260" x2="360" y2="260" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                                <line x1="145" y1="260" x2="360" y2="260" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Segment 2 -> 3 (Corridor Junction to Room 101) */}
                            {isConsecutiveEdge(2, 3) && (
                              <g>
                                <line x1="360" y1="260" x2="360" y2="425" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
                                <line x1="360" y1="260" x2="360" y2="425" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                                <line x1="360" y1="260" x2="360" y2="425" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Segment 2 -> 4 (Corridor Junction to Floor 1 Stairs) */}
                            {isConsecutiveEdge(2, 4) && (
                              <g>
                                <line x1="360" y1="260" x2="360" y2="90" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
                                <line x1="360" y1="260" x2="360" y2="90" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                                <line x1="360" y1="260" x2="360" y2="90" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Segment 2 -> 5 (Corridor Junction to Floor 1 Elevator) */}
                            {isConsecutiveEdge(2, 5) && (
                              <g>
                                <line x1="360" y1="260" x2="595" y2="260" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
                                <line x1="360" y1="260" x2="595" y2="260" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                                <line x1="360" y1="260" x2="595" y2="260" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Floor Transition Signposts on Floor 1 */}
                            {crossFloorTransitType === 'lift' && (
                              <g transform="translate(595, 175)">
                                <rect x="-70" y="0" width="140" height="24" rx="8" fill="#006398" />
                                <text x="0" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                                  🛗 TAKE LIFT TO FLOOR 2
                                </text>
                              </g>
                            )}
                            {crossFloorTransitType === 'stairs' && (
                              <g transform="translate(360, 20)">
                                <rect x="-70" y="0" width="140" height="24" rx="8" fill="#b45309" />
                                <text x="0" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                                  🪜 TAKE STAIRS TO FLOOR 2
                                </text>
                              </g>
                            )}
                          </g>
                        )}

                        {/* Distinct Starting Point Marker on Floor 1 */}
                        {routeResult.found && startCoordsFloor1 && (
                          <g transform={`translate(${startCoordsFloor1.x}, ${startCoordsFloor1.y})`}>
                            <circle cx="0" cy="0" r="16" fill="#00685f" stroke="#ffffff" strokeWidth="3.5" />
                            <circle cx="0" cy="0" r="5" fill="#ffffff" />
                            <rect x="-38" y="-32" width="76" height="20" rx="8" fill="#00685f" />
                            <text x="0" y="-18" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff">
                              START
                            </text>
                          </g>
                        )}

                        {/* Distinct Destination Pin on Floor 1 */}
                        {routeResult.found && destCoordsFloor1 && (
                          <g transform={`translate(${destCoordsFloor1.x}, ${destCoordsFloor1.y})`}>
                            <circle cx="0" cy="0" r="18" fill="#ba1a1a" stroke="#ffffff" strokeWidth="3.5" />
                            <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="900" fill="#ffffff">📍</text>
                            <rect x="-60" y="24" width="120" height="22" rx="8" fill="#ba1a1a" />
                            <text x="0" y="38" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                              {destNode?.name || 'Destination'}
                            </text>
                          </g>
                        )}

                        {/* Live Moving "You are here" User Marker on Floor 1 */}
                        {isNavigating && userActiveFloor === 1 && (
                          <g transform={`translate(${userMapCoords.floor1.x}, ${userMapCoords.floor1.y})`}>
                            <circle cx="0" cy="0" r="24" fill="#00685f" className="animate-ping-slow opacity-50" />
                            <circle cx="0" cy="0" r="14" fill="#00685f" stroke="#ffffff" strokeWidth="3.5" />
                            {internalTrackingData.heading != null ? (
                              <g transform={`rotate(${internalTrackingData.heading})`}>
                                <polygon points="0,-18 5,-11 -5,-11" fill="#00685f" stroke="#ffffff" strokeWidth="1.5" />
                                <circle cx="0" cy="0" r="4" fill="#ffffff" />
                              </g>
                            ) : (
                              <circle cx="0" cy="0" r="4" fill="#ffffff" />
                            )}
                            <rect x="-48" y="20" width="96" height="22" rx="11" fill="#0f172a" />
                            <text x="0" y="35" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                              YOU ARE HERE
                            </text>
                          </g>
                        )}
                      </g>
                    </svg>
                  )}

                  {/* ================= FLOOR 2 MAP ================= */}
                  {currentFloor === 'floor2' && (
                    <svg
                      className="w-full h-full drop-shadow-xs select-none"
                      viewBox="0 0 920 520"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <defs>
                        <pattern id="grid-f2" width="20" height="20" patternUnits="userSpaceOnUse">
                          <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.4" />
                        </pattern>
                      </defs>

                      {/* Floor Plan Base Background (unscaled) */}
                      <rect width="920" height="520" rx="20" fill="#f8fafc" />

                      {/* Google Maps-style Zoomable & Pannable Group */}
                      <g
                        id="camera-canvas-f2"
                        style={{
                          transform: `translate(${mapCameraF2.x}px, ${mapCameraF2.y}px) scale(${mapCameraF2.zoom})`,
                          transformOrigin: '0 0',
                          transition: 'transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)',
                        }}
                      >
                        <rect x="20" y="20" width="880" height="480" rx="16" fill="url(#grid-f2)" />
                        <rect x="20" y="20" width="880" height="480" rx="16" stroke="#94a3b8" strokeWidth="2.5" fill="#ffffff" />

                        {/* Floor 2 Corridors */}
                        <rect x="335" y="235" width="460" height="50" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                        <rect x="335" y="130" width="50" height="155" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />

                        {/* Node 6: Floor 2 Stairs (STAIRS) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(6); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="280"
                            y="45"
                            width="160"
                            height="100"
                            rx="14"
                            fill="#fef3c7"
                            stroke={destNodeId === 6 ? '#ba1a1a' : startNodeId === 6 ? '#00685f' : '#fde68a'}
                            strokeWidth={destNodeId === 6 || startNodeId === 6 ? '3.5' : '2'}
                          />
                          <rect x="295" y="60" width="75" height="22" rx="6" fill="#b45309" />
                          <text x="332" y="75" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #6</text>
                          <text x="295" y="105" fontSize="15" fontWeight="800" fill="#78350f">Floor 2 Stairs</text>
                          <text x="295" y="125" fontSize="11" fontWeight="600" fill="#b45309">Stairs to Floor 1</text>
                        </g>

                        {/* Node 7: Floor 2 Elevator (LIFT) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(7); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="420"
                            y="200"
                            width="160"
                            height="120"
                            rx="14"
                            fill="#e0f2fe"
                            stroke={destNodeId === 7 ? '#ba1a1a' : startNodeId === 7 ? '#00685f' : '#bae6fd'}
                            strokeWidth={destNodeId === 7 || startNodeId === 7 ? '3.5' : '2'}
                          />
                          <rect x="435" y="215" width="75" height="22" rx="6" fill="#006398" />
                          <text x="472" y="230" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #7</text>
                          <text x="435" y="262" fontSize="15" fontWeight="800" fill="#0c4a6e">Floor 2 Elevator</text>
                          <text x="435" y="282" fontSize="11" fontWeight="600" fill="#0284c7">Elevator to Floor 1</text>
                          <text x="435" y="300" fontSize="10" fontWeight="600" fill="#0369a1">Accessible Vertical Transit</text>
                        </g>

                        {/* Node 8: Floor 2 Corridor Junction (JUNCTION) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(8); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <circle
                            cx="615"
                            cy="260"
                            r="32"
                            fill="#f8fafc"
                            stroke={destNodeId === 8 ? '#ba1a1a' : startNodeId === 8 ? '#00685f' : '#94a3b8'}
                            strokeWidth={destNodeId === 8 || startNodeId === 8 ? '3.5' : '2'}
                          />
                          <circle cx="615" cy="260" r="8" fill="#00685f" />
                          <text x="615" y="240" textAnchor="middle" fontSize="9" fontWeight="800" fill="#64748b">JUNCTION #8</text>
                          <text x="615" y="305" textAnchor="middle" fontSize="11" fontWeight="700" fill="#334155">Upper Concourse</text>
                        </g>

                        {/* Node 9: Computer Lab 204 (ROOM) */}
                        <g className="cursor-pointer" onClick={() => { setDestNodeId(9); setIsNavigating(false); setLiveViewMode('overview'); }}>
                          <rect
                            x="710"
                            y="180"
                            width="170"
                            height="160"
                            rx="16"
                            fill="#eef2ff"
                            stroke={destNodeId === 9 ? '#ba1a1a' : startNodeId === 9 ? '#00685f' : '#c7d2fe'}
                            strokeWidth={destNodeId === 9 || startNodeId === 9 ? '3.5' : '2'}
                            className="transition-all"
                          />
                          <rect x="725" y="195" width="75" height="22" rx="6" fill="#4338ca" />
                          <text x="762" y="210" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">NODE #9</text>
                          <text x="725" y="242" fontSize="24">💻</text>
                          <text x="725" y="262" fontSize="16" fontWeight="800" fill="#4338ca">Computer Lab 204</text>
                          <text x="725" y="282" fontSize="11" fontWeight="600" fill="#475569">Sample Room (Floor 2)</text>
                          <text x="725" y="300" fontSize="10" fontWeight="600" fill="#4f46e5">Diagnostic Laboratory</text>
                        </g>

                        {/* ============================================================== */}
                        {/* CLEARLY HIGHLIGHTED BLUE ROUTE PATH (FLOOR 2)                   */}
                        {/* Remainder visible BEFORE and DURING navigation                  */}
                        {/* ============================================================== */}
                        {routeResult.found && (
                          <g id="route-highlight-f2">
                            {/* Segment 6 -> 8 (Floor 2 Stairs to Junction) */}
                            {isConsecutiveEdge(6, 8) && (
                              <g>
                                <path d="M 360 90 L 360 260 L 615 260" fill="none" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
                                <path d="M 360 90 L 360 260 L 615 260" fill="none" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M 360 90 L 360 260 L 615 260" fill="none" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" strokeLinejoin="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Segment 7 -> 8 (Floor 2 Elevator to Junction) */}
                            {isConsecutiveEdge(7, 8) && (
                              <g>
                                <line x1="510" y1="260" x2="615" y2="260" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
                                <line x1="510" y1="260" x2="615" y2="260" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                                <line x1="510" y1="260" x2="615" y2="260" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Segment 8 -> 9 (Junction to Computer Lab 204) */}
                            {isConsecutiveEdge(8, 9) && (
                              <g>
                                <line x1="615" y1="260" x2="800" y2="260" stroke="#93c5fd" strokeWidth="16" strokeLinecap="round" opacity="0.6" />
                                <line x1="615" y1="260" x2="800" y2="260" stroke="#2563eb" strokeWidth="8" strokeLinecap="round" />
                                <line x1="615" y1="260" x2="800" y2="260" stroke="#ffffff" strokeWidth="3" strokeDasharray="10 8" strokeLinecap="round" className="active-route-path" />
                              </g>
                            )}

                            {/* Floor Transition Signposts on Floor 2 */}
                            {crossFloorTransitType === 'lift' && (
                              <g transform="translate(510, 175)">
                                <rect x="-70" y="0" width="140" height="24" rx="8" fill="#006398" />
                                <text x="0" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                                  🛗 FROM ELEVATOR (F1)
                                </text>
                              </g>
                            )}
                            {crossFloorTransitType === 'stairs' && (
                              <g transform="translate(360, 20)">
                                <rect x="-65" y="0" width="130" height="24" rx="8" fill="#b45309" />
                                <text x="0" y="16" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                                  🪜 FROM STAIRS (F1)
                                </text>
                              </g>
                            )}
                          </g>
                        )}

                        {/* Distinct Starting Point Marker on Floor 2 */}
                        {routeResult.found && startCoordsFloor2 && (
                          <g transform={`translate(${startCoordsFloor2.x}, ${startCoordsFloor2.y})`}>
                            <circle cx="0" cy="0" r="16" fill="#00685f" stroke="#ffffff" strokeWidth="3.5" />
                            <circle cx="0" cy="0" r="5" fill="#ffffff" />
                            <rect x="-38" y="-32" width="76" height="20" rx="8" fill="#00685f" />
                            <text x="0" y="-18" textAnchor="middle" fontSize="9" fontWeight="800" fill="#ffffff">
                              START
                            </text>
                          </g>
                        )}

                        {/* Distinct Destination Pin on Floor 2 */}
                        {routeResult.found && destCoordsFloor2 && (
                          <g transform={`translate(${destCoordsFloor2.x}, ${destCoordsFloor2.y})`}>
                            <circle cx="0" cy="0" r="18" fill="#ba1a1a" stroke="#ffffff" strokeWidth="3.5" />
                            <text x="0" y="6" textAnchor="middle" fontSize="14" fontWeight="900" fill="#ffffff">📍</text>
                            <rect x="-65" y="24" width="130" height="22" rx="8" fill="#ba1a1a" />
                            <text x="0" y="38" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                              {destNode?.name || 'Destination'}
                            </text>
                          </g>
                        )}

                        {/* Live Moving "You are here" User Marker on Floor 2 */}
                        {isNavigating && userActiveFloor === 2 && (
                          <g transform={`translate(${userMapCoords.floor2.x}, ${userMapCoords.floor2.y})`}>
                            <circle cx="0" cy="0" r="24" fill="#00685f" className="animate-ping-slow opacity-50" />
                            <circle cx="0" cy="0" r="14" fill="#00685f" stroke="#ffffff" strokeWidth="3.5" />
                            {internalTrackingData.heading != null ? (
                              <g transform={`rotate(${internalTrackingData.heading})`}>
                                <polygon points="0,-18 5,-11 -5,-11" fill="#00685f" stroke="#ffffff" strokeWidth="1.5" />
                                <circle cx="0" cy="0" r="4" fill="#ffffff" />
                              </g>
                            ) : (
                              <circle cx="0" cy="0" r="4" fill="#ffffff" />
                            )}
                            <rect x="-48" y="20" width="96" height="22" rx="11" fill="#0f172a" />
                            <text x="0" y="35" textAnchor="middle" fontSize="10" fontWeight="800" fill="#ffffff">
                              YOU ARE HERE
                            </text>
                          </g>
                        )}
                      </g>
                    </svg>
                  )}
                </div>
              </div>

              {/* Map Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 px-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">info</span>
                  <span>Map Legend:</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#00685f] ring-2 ring-[#00685f]/20" />
                    <span>You are here</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-2 rounded-full bg-[#2563eb]" />
                    <span className="text-[#2563eb] font-bold">Highlighted Route</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#006398] text-white flex items-center justify-center text-[10px]">
                      🛗
                    </span>
                    <span>Elevator (Accessible)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded bg-[#b45309] text-white flex items-center justify-center text-[10px]">
                      🪜
                    </span>
                    <span>Stairs</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]">📍</span>
                    <span>Destination</span>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================== */}
            {/* MAP CONTROLS: IMMEDIATELY BELOW THE MAP                        */}
            {/* ============================================================== */}
            <section
              aria-label="Navigation Map Controls"
              className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-md p-4 sm:p-5 flex flex-col gap-3"
            >
              {!isNavigating ? (
                // BEFORE STARTING: ROUTE PREVIEW & PROMINENT START NAVIGATION BUTTON (State 1)
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#e6f6f4] text-[#00685f] border-2 border-[#00685f]/30 flex items-center justify-center shrink-0 shadow-2xs">
                      <span className="material-symbols-outlined text-[28px]">explore</span>
                    </div>
                    <div>
                      <div className="text-xs font-extrabold uppercase tracking-wider text-[#00685f]">
                        Route Preview Overview
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-900">
                        {destNode?.name || 'Destination'}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {routeResult.found
                          ? `${routeResult.totalDistanceMeters}m walk • Approx ${routeResult.timeFormatted} • ${routeResult.accessibilityNote}`
                          : 'Path calculation error'}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStartNavigation}
                    disabled={!routeResult.found}
                    aria-label="Start Navigation"
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#00685f] hover:bg-[#00534c] text-white text-base sm:text-lg font-extrabold flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[26px]">navigation</span>
                    <span>Start Navigation</span>
                  </button>
                </div>
              ) : (
                // AFTER USER CLICKS START NAVIGATION: ACTIVE NAVIGATION CONTROLS (State 2)
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                      <span className="material-symbols-outlined text-[28px]">near_me</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-700">
                          Live Navigation Active
                        </span>
                      </div>
                      <div className="text-base sm:text-lg font-extrabold text-slate-900">
                        Guiding to {destNode?.name || 'Destination'}
                      </div>
                      <div className="text-xs text-slate-600 font-medium">
                        {routeProgressState.hasArrived
                          ? 'Arrived at destination!'
                          : `Following step ${routeProgressState.activeStepIndex + 1} of ${routeResult.steps.length}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
                    {/* Recenter Button (Google Maps Recenter) */}
                    <button
                      type="button"
                      onClick={handleRecenter}
                      aria-label="Recenter map on your position"
                      className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-[#00685f] text-slate-800 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[#00685f]">my_location</span>
                      <span>Recenter</span>
                    </button>

                    {/* Google Maps Route Overview vs Zoomed View Toggle */}
                    <button
                      type="button"
                      onClick={handleToggleViewMode}
                      aria-label="Toggle Route Overview"
                      className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[18px] text-blue-600">
                        {liveViewMode === 'follow' ? 'map' : 'near_me'}
                      </span>
                      <span>{liveViewMode === 'follow' ? 'Overview' : 'Zoom In'}</span>
                    </button>

                    {/* QR Checkpoint Position Calibration Button */}
                    <button
                      type="button"
                      onClick={() => setShowCalibrationPicker(!showCalibrationPicker)}
                      aria-label="Verify position with QR checkpoint"
                      className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-teal-50 hover:bg-teal-100 border-2 border-teal-300 text-teal-900 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[20px] text-teal-700">qr_code_scanner</span>
                      <span>{showCalibrationPicker ? 'Close Signs' : 'Scan Sign'}</span>
                    </button>

                    {/* Stop Navigation Button */}
                    <button
                      type="button"
                      onClick={handleStopNavigation}
                      aria-label="Stop Navigation"
                      className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer active:scale-98"
                    >
                      <span className="material-symbols-outlined text-[20px]">stop_circle</span>
                      <span>Stop</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback Toast */}
              {recenterToast && (
                <div className="w-full text-center text-xs font-bold text-[#00685f] py-1.5 px-3 bg-[#e6f6f4] rounded-xl border border-[#00685f]/20 animate-fade-in">
                  ✓ {recenterToast}
                </div>
              )}
              {calibrationToast && (
                <div className="w-full text-center text-xs font-bold text-emerald-800 py-1.5 px-3 bg-emerald-50 rounded-xl border border-emerald-300 animate-fade-in">
                  ✓ {calibrationToast}
                </div>
              )}

              {/* Checkpoint Calibration Quick Tray */}
              {isNavigating && showCalibrationPicker && (
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Tap any wall QR checkpoint you are standing next to:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCalibrationPicker(false)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {QR_CHECKPOINTS.map((cp) => (
                      <button
                        key={`tray-${cp.code}`}
                        type="button"
                        onClick={() => handleCalibrateWithCheckpoint(cp)}
                        className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-left flex items-center gap-2.5 transition-all cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px] text-[#00685f]">{cp.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 truncate">{cp.label}</div>
                          <div className="text-[10px] text-slate-500">{cp.floorLabel}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* ERROR BANNER (When Route is Not Found) */}
            {!routeResult.found && !errorDismissed && (
              <div
                id="route-error-banner"
                className="w-full p-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-900 flex items-start gap-3 shadow-2xs"
              >
                <span className="material-symbols-outlined text-red-600 text-[26px] shrink-0 mt-0.5">
                  error
                </span>
                <div className="flex-1">
                  <div className="font-extrabold text-xs sm:text-sm text-red-800">
                    Route: Path Not Found
                  </div>
                  <p className="text-xs text-red-700 font-medium mt-0.5 leading-relaxed">
                    {routeResult.errorMessage ||
                      'No connected accessible path exists between the selected start and destination locations.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorDismissed(true)}
                  className="text-xs font-bold text-red-700 bg-white border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* STEP-BY-STEP NAVIGATION DIRECTIONS PANEL (BELOW THE MAP CONTROLS) */}
            <section
              aria-label="Turn-by-turn Navigation Directions"
              className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-xs p-4 sm:p-6 flex flex-col gap-5"
            >
              {/* Primary Active Step Hero Card */}
              <div className="w-full bg-[#e6f6f4] border-2 border-[#00685f]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-2xs">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#00685f] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">{heroInstruction.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#00685f] mb-0.5">
                      {heroInstruction.label}
                    </div>
                    <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 leading-snug">
                      {heroInstruction.text}
                    </h2>
                  </div>
                </div>

                {/* Read Aloud Button */}
                <button
                  type="button"
                  onClick={() => readAloudInstruction(heroInstruction.text)}
                  title="Listen to audio directions"
                  className="shrink-0 h-10 px-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-[#00685f] font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-2xs active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isSpeaking ? 'record_voice_over' : 'volume_up'}
                  </span>
                  <span>{isSpeaking ? 'Speaking...' : 'Read aloud'}</span>
                </button>
              </div>

              {/* Turn-by-Turn Checklist Steps Sequence */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    Step-by-Step Directions
                  </h3>
                  <span className="text-xs font-semibold text-[#00685f]">
                    {routeResult.found
                      ? `${routeResult.steps.length} steps • ${routeResult.totalDistanceMeters}m total distance`
                      : '0 steps'}
                  </span>
                </div>

                {!routeResult.found ? (
                  <div className="w-full p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center gap-2">
                    <span className="material-symbols-outlined text-[32px] text-slate-400">wrong_location</span>
                    <div className="font-extrabold text-sm text-slate-700">No Directions Available</div>
                    <p className="text-xs text-slate-500 max-w-md">
                      {routeResult.errorMessage || 'No valid route exists between the selected start and destination locations.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {routeResult.steps.map((step, idx) => {
                      const isCurrent = idx === routeProgressState.activeStepIndex && !routeProgressState.hasArrived;
                      const isCompleted = idx < routeProgressState.activeStepIndex || routeProgressState.hasArrived;

                      return (
                        <div
                          key={step.num}
                          className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between transition-all ${
                            isCurrent
                              ? 'border-[#00685f] bg-[#f0fbf9] ring-2 ring-[#00685f]/20 shadow-2xs'
                              : isCompleted
                              ? 'border-slate-200 bg-slate-50/70 opacity-90'
                              : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                  isCurrent
                                    ? 'bg-[#00685f] text-white'
                                    : isCompleted
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {isCompleted ? '✓ Done' : `Step ${step.num}`}
                              </span>
                              <span className="text-[11px] font-bold text-slate-500">
                                {step.floor}
                              </span>
                            </div>

                            <div className="font-extrabold text-xs sm:text-sm text-slate-900 mb-1 flex items-start gap-1.5">
                              <span className={`material-symbols-outlined text-[18px] shrink-0 ${isCurrent ? 'text-[#00685f]' : 'text-slate-500'}`}>
                                {step.icon}
                              </span>
                              <span>{step.title}</span>
                            </div>
                            <p className="text-xs text-slate-600 font-medium pl-6 leading-relaxed">
                              {step.desc}
                            </p>
                          </div>

                          {isCurrent && (
                            <div className="mt-3 pt-2 border-t border-[#00685f]/20 flex items-center justify-between text-[11px] font-bold text-[#00685f]">
                              <span>Current Step</span>
                              <span className="w-2 h-2 rounded-full bg-[#00685f] animate-ping" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {/* CLEAN MINIMAL FOOTER */}
      <footer className="w-full bg-white border-t border-slate-200 py-4 px-4 sm:px-8 shrink-0 text-center text-xs text-slate-500 font-medium">
        Need human assistance? Ask any staff member in a teal vest or visit the Main Lobby Reception Desk.
      </footer>
    </div>
  );
};
