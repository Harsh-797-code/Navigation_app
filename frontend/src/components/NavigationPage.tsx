import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Compass,
  Search,
  X,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  List,
  Accessibility,
  ArrowRight,
  DoorOpen,
  LogOut,
  Stethoscope,
  Pill,
  Microscope,
  Flame,
  CheckCircle2,
  Square,
  SlidersHorizontal,
  Headphones
} from 'lucide-react';
import { DESTINATIONS, MAP_NODES, START_OPTIONS, FLOOR_LABELS } from '../data/hospitalGraph';
import { Floor, NavigationStep, RouteResult } from '../types/navigation';
import { calculateRoute } from '../utils/pathfinding';
import { HospitalMap } from './HospitalMap';

interface NavigationPageProps {
  userEmail: string;
  onLogout: () => void;
  fontSizeLarge: boolean;
  onToggleFontSize: () => void;
}

export const NavigationPage: React.FC<NavigationPageProps> = ({
  userEmail: _userEmail,
  onLogout,
  fontSizeLarge,
  onToggleFontSize
}) => {
  // Navigation State
  const [selectedDestKey, setSelectedDestKey] = useState<string>('pharmacy');
  const [startNodeId, setStartNodeId] = useState<string>('g-reception');
  const [currentFloor, setCurrentFloor] = useState<Floor>('ground');
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  // Toggle switch to prioritize step-free routes (avoids stairs, favors elevators/ramps)
  const [accessibleOnly, setAccessibleOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFullDirectionsModal, setShowFullDirectionsModal] = useState<boolean>(false);

  // Text-to-Speech (TTS) State using Web Speech API
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [speakingStepIndex, setSpeakingStepIndex] = useState<number | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(0.92); // Paced for clear hospital navigation
  const [autoReadSteps, setAutoReadSteps] = useState<boolean>(false);
  const [showSpeechSettings, setShowSpeechSettings] = useState<boolean>(false);
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Selected Destination object
  const currentDestination = useMemo(() => {
    return DESTINATIONS.find((d) => d.id === selectedDestKey) || DESTINATIONS[0];
  }, [selectedDestKey]);

  // Target Node ID
  const targetNodeId = currentDestination.nodeId;

  // Pathfinding calculation via Dijkstra / BFS with step-free prioritization
  const routeResult: RouteResult | null = useMemo(() => {
    return calculateRoute(startNodeId, targetNodeId, accessibleOnly);
  }, [startNodeId, targetNodeId, accessibleOnly]);

  // Text-to-Speech: Cancel speech when component unmounts or path changes
  const stopSpeaking = useCallback(() => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingStepIndex(null);
  }, [speechSupported]);

  // Text-to-Speech: Read out specific navigation step using Web Speech API
  const speakInstruction = useCallback(
    (step: NavigationStep) => {
      if (!speechSupported) {
        alert(`Navigation Instruction: ${step.instruction}`);
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Format natural spoken phrasing
      let speechText = `Step ${step.stepIndex} of ${step.totalSteps} on ${step.floorLabel}. ${step.title}. ${step.instruction}`;

      if (step.transitionType === 'elevator') {
        speechText += ' Elevator transfer is 100 percent step-free.';
      } else if (step.transitionType === 'stairs') {
        speechText += ' Note: climbing stairs required on this route.';
      } else if (step.transitionType === 'ramp') {
        speechText += ' Accessible step-free ramp pathway.';
      }

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = speechRate;
      utterance.pitch = 1.0;

      // Select natural English voice if present in browser
      const voices = window.speechSynthesis.getVoices();
      const englishVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Natural') ||
              v.name.includes('Google') ||
              v.name.includes('Samantha') ||
              v.name.includes('Daniel') ||
              v.name.includes('Aaron'))
        ) || voices.find((v) => v.lang.startsWith('en'));

      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        setSpeakingStepIndex(step.stepIndex - 1);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingStepIndex(null);
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingStepIndex(null);
      };

      window.speechSynthesis.speak(utterance);
    },
    [speechSupported, speechRate]
  );

  // Toggle Read Aloud for current active step
  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
    } else if (routeResult && routeResult.steps[activeStepIndex]) {
      speakInstruction(routeResult.steps[activeStepIndex]);
    }
  };

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // When auto-read is enabled, speak instructions automatically as step advances
  useEffect(() => {
    if (autoReadSteps && routeResult && routeResult.steps[activeStepIndex]) {
      speakInstruction(routeResult.steps[activeStepIndex]);
    }
  }, [activeStepIndex, autoReadSteps, routeResult, speakInstruction]);

  // When destination changes, reset step and automatically show target floor
  const handleSelectDestination = (destKey: string) => {
    stopSpeaking();
    setSelectedDestKey(destKey);
    const dest = DESTINATIONS.find((d) => d.id === destKey);
    if (dest) {
      setSearchQuery(dest.name);
      setCurrentFloor(dest.floor);
      setActiveStepIndex(0);
    }
  };

  // When changing starting point, recalculate route and jump to start floor
  const handleStartNodeChange = (newStartId: string) => {
    stopSpeaking();
    setStartNodeId(newStartId);
    setActiveStepIndex(0);
    const node = MAP_NODES[newStartId];
    if (node) {
      setCurrentFloor(node.floor);
    }
  };

  // Stepping controls (Previous Step / Next Step)
  const handlePreviousStep = () => {
    if (!routeResult || routeResult.steps.length === 0) return;
    const newIndex = Math.max(0, activeStepIndex - 1);
    setActiveStepIndex(newIndex);
    const step = routeResult.steps[newIndex];
    if (step) {
      setCurrentFloor(step.floor);
    }
  };

  const handleNextStep = () => {
    if (!routeResult || routeResult.steps.length === 0) return;
    const newIndex = Math.min(routeResult.steps.length - 1, activeStepIndex + 1);
    setActiveStepIndex(newIndex);
    const step = routeResult.steps[newIndex];
    if (step) {
      setCurrentFloor(step.floor);
    }
  };

  const handleJumpToStep = (index: number) => {
    if (!routeResult || !routeResult.steps[index]) return;
    setActiveStepIndex(index);
    setCurrentFloor(routeResult.steps[index].floor);
  };

  // Filter destinations based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return DESTINATIONS.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.room.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.floorLabel.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const activeStep = routeResult?.steps[activeStepIndex];

  return (
    <div className={`min-h-screen flex flex-col bg-[#f8fafc] text-slate-800 ${fontSizeLarge ? 'text-lg' : 'text-sm'}`}>
      {/* 1. TOP STICKY HEADER */}
      <header className="w-full bg-white border-b border-slate-200 shadow-xs py-3 px-4 sm:px-8 shrink-0 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#00685f] flex items-center justify-center text-white shadow-md shadow-[#00685f]/20 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-extrabold tracking-tight text-[#00685f]">MediPath</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-[#00685f]">
                  Indoor Wayfinding
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                St. Jude Regional Medical Center • Indoor Patient Navigation
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
            {/* Header Step-Free Toggle Switch */}
            <div
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-2xl border transition-all cursor-pointer shadow-xs ${
                accessibleOnly
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
              onClick={() => setAccessibleOnly(!accessibleOnly)}
              title="Click to toggle: Prioritize step-free routes (avoids stairs, favors elevators/ramps)"
            >
              <Accessibility className={`w-4 h-4 ${accessibleOnly ? 'text-emerald-700' : 'text-slate-500'}`} />
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-bold whitespace-nowrap">Step-free Route:</span>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                    accessibleOnly ? 'bg-emerald-200/70 text-emerald-900' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {accessibleOnly ? 'Active (No Stairs)' : 'Off (Stairs Allowed)'}
                </span>
              </div>

              {/* Visual Switch Control */}
              <button
                type="button"
                role="switch"
                aria-checked={accessibleOnly}
                aria-label="Prioritize step-free routes switch"
                onClick={(e) => {
                  e.stopPropagation();
                  setAccessibleOnly(!accessibleOnly);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00685f] focus:ring-offset-1 ${
                  accessibleOnly ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    accessibleOnly ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Accessibility text size button */}
            <button
              type="button"
              onClick={onToggleFontSize}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
              title="Toggle Text Size"
            >
              {fontSizeLarge ? 'A Normal' : 'A A+'}
            </button>

            {/* User Account / Logout */}
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 hover:text-red-700 transition-colors cursor-pointer"
              title="Sign Out / Back to Login"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col gap-5">
        {/* Search Bar, Starting Point Selector & Dedicated Step-Free Priority Switch Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Prominent Search Bar */}
          <div className="relative lg:col-span-5">
            <div className="relative w-full shadow-xs rounded-2xl bg-white border-2 border-slate-200 focus-within:border-[#00685f] focus-within:ring-4 focus-within:ring-[#00685f]/10 transition-all">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Where do you want to go?"
                className="w-full pl-12 pr-10 py-3.5 bg-transparent rounded-2xl text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 bg-slate-100 rounded-full p-0.5" />
                </button>
              )}
            </div>

            {/* Instant Search Suggestions Dropdown */}
            {searchResults.length > 0 && searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {searchResults.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => {
                      handleSelectDestination(dest.id);
                      setSearchQuery(dest.name);
                    }}
                    className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#00685f] flex items-center justify-center font-bold text-xs">
                        📍
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-900">{dest.name}</div>
                        <div className="text-xs text-slate-500 font-medium">
                          {dest.room} • {dest.floorLabel}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#00685f] flex items-center gap-1">
                      Navigate <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Starting-Point Selector */}
          <div className="lg:col-span-4 bg-white border-2 border-slate-200 rounded-2xl p-2 px-3.5 flex items-center gap-2.5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#00685f] flex items-center justify-center shrink-0">
              <DoorOpen className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Starting Point
              </label>
              <select
                value={startNodeId}
                onChange={(e) => handleStartNodeChange(e.target.value)}
                className="w-full bg-transparent text-xs sm:text-sm font-extrabold text-slate-900 focus:outline-none cursor-pointer truncate"
              >
                {START_OPTIONS.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.label} ({FLOOR_LABELS[node.floor].name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dedicated Step-Free Priority Toggle Switch Card */}
          <div
            onClick={() => setAccessibleOnly(!accessibleOnly)}
            className={`lg:col-span-3 border-2 rounded-2xl p-2.5 px-3.5 flex items-center justify-between gap-3 shadow-xs cursor-pointer select-none transition-all ${
              accessibleOnly
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/20'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
            title="Toggle switch to prioritize step-free routes, avoiding stairs and favoring elevators & ramps"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  accessibleOnly ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                <Accessibility className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 leading-tight">
                  <span className="truncate">Prioritize Step-free</span>
                </div>
                <div className="text-[10px] font-medium text-slate-500 mt-0.5 leading-tight">
                  {accessibleOnly ? 'Avoids stairs • Favors elevators' : 'Stairs permitted (Quickest walk)'}
                </div>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={accessibleOnly}
              aria-label="Prioritize step-free route"
              onClick={(e) => {
                e.stopPropagation();
                setAccessibleOnly(!accessibleOnly);
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#00685f] focus:ring-offset-1 ${
                accessibleOnly ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  accessibleOnly ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 4 Large Destination Buttons */}
        <section aria-label="Popular Hospital Destinations">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Popular Destinations
            </span>
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Tap any destination to calculate path & floor
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Emergency */}
            <button
              type="button"
              onClick={() => handleSelectDestination('emergency')}
              className={`p-4 rounded-2xl border-2 text-left flex items-start justify-between min-h-[96px] transition-all relative overflow-hidden group cursor-pointer ${
                selectedDestKey === 'emergency'
                  ? 'bg-[#ba1a1a] text-white border-[#ba1a1a] shadow-md scale-[1.01] ring-2 ring-[#ba1a1a]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedDestKey === 'emergency'
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-red-50 text-red-600 border-red-100'
                  }`}
                >
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-extrabold text-base ${selectedDestKey === 'emergency' ? 'text-white' : 'text-slate-900'}`}>
                    Emergency
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${selectedDestKey === 'emergency' ? 'text-white/90' : 'text-slate-500'}`}>
                    Ground Floor
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${selectedDestKey === 'emergency' ? 'text-white/80' : 'text-red-600'}`}>
                    Urgent Care • Triage
                  </div>
                </div>
              </div>
              {selectedDestKey === 'emergency' && (
                <span className="w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shrink-0 mt-1" />
              )}
            </button>

            {/* OPD */}
            <button
              type="button"
              onClick={() => handleSelectDestination('opd')}
              className={`p-4 rounded-2xl border-2 text-left flex items-start justify-between min-h-[96px] transition-all relative overflow-hidden group cursor-pointer ${
                selectedDestKey === 'opd'
                  ? 'bg-[#00685f] text-white border-[#00685f] shadow-md scale-[1.01] ring-2 ring-[#00685f]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedDestKey === 'opd'
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-teal-50 text-teal-700 border-teal-100'
                  }`}
                >
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-extrabold text-base ${selectedDestKey === 'opd' ? 'text-white' : 'text-slate-900'}`}>
                    OPD
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${selectedDestKey === 'opd' ? 'text-white/90' : 'text-slate-500'}`}>
                    Ground Floor
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${selectedDestKey === 'opd' ? 'text-white/80' : 'text-teal-700'}`}>
                    Outpatient Clinics
                  </div>
                </div>
              </div>
              {selectedDestKey === 'opd' && (
                <span className="w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shrink-0 mt-1" />
              )}
            </button>

            {/* Pharmacy */}
            <button
              type="button"
              onClick={() => handleSelectDestination('pharmacy')}
              className={`p-4 rounded-2xl border-2 text-left flex items-start justify-between min-h-[96px] transition-all relative overflow-hidden group cursor-pointer ${
                selectedDestKey === 'pharmacy'
                  ? 'bg-[#006398] text-white border-[#006398] shadow-md scale-[1.01] ring-2 ring-[#006398]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedDestKey === 'pharmacy'
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-sky-50 text-sky-700 border-sky-100'
                  }`}
                >
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-extrabold text-base ${selectedDestKey === 'pharmacy' ? 'text-white' : 'text-slate-900'}`}>
                    Pharmacy
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${selectedDestKey === 'pharmacy' ? 'text-white/90' : 'text-slate-500'}`}>
                    First Floor
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${selectedDestKey === 'pharmacy' ? 'text-white/80' : 'text-sky-700'}`}>
                    Room 102 • Dispensary
                  </div>
                </div>
              </div>
              {selectedDestKey === 'pharmacy' && (
                <span className="w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shrink-0 mt-1" />
              )}
            </button>

            {/* Laboratory */}
            <button
              type="button"
              onClick={() => handleSelectDestination('lab')}
              className={`p-4 rounded-2xl border-2 text-left flex items-start justify-between min-h-[96px] transition-all relative overflow-hidden group cursor-pointer ${
                selectedDestKey === 'lab'
                  ? 'bg-[#4338ca] text-white border-[#4338ca] shadow-md scale-[1.01] ring-2 ring-[#4338ca]/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    selectedDestKey === 'lab'
                      ? 'bg-white/20 text-white border-white/30'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  }`}
                >
                  <Microscope className="w-6 h-6" />
                </div>
                <div>
                  <div className={`font-extrabold text-base ${selectedDestKey === 'lab' ? 'text-white' : 'text-slate-900'}`}>
                    Laboratory
                  </div>
                  <div className={`text-xs font-semibold mt-0.5 ${selectedDestKey === 'lab' ? 'text-white/90' : 'text-slate-500'}`}>
                    Second Floor
                  </div>
                  <div className={`text-[11px] font-medium mt-0.5 ${selectedDestKey === 'lab' ? 'text-white/80' : 'text-indigo-700'}`}>
                    Room 205 • Blood & Tests
                  </div>
                </div>
              </div>
              {selectedDestKey === 'lab' && (
                <span className="w-3 h-3 rounded-full bg-white ring-4 ring-white/30 shrink-0 mt-1" />
              )}
            </button>
          </div>
        </section>

        {/* Floor Selector Tabs */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1.5 bg-slate-200/80 rounded-2xl gap-1.5 overflow-x-auto" role="tablist">
            {(['ground', 'first', 'second'] as Floor[]).map((floorKey) => {
              const isSelected = currentFloor === floorKey;
              const isDestFloor = currentDestination.floor === floorKey;
              const info = FLOOR_LABELS[floorKey];

              return (
                <button
                  key={floorKey}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setCurrentFloor(floorKey)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer focus:outline-none whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-[#00685f] shadow-sm border border-slate-200/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                  }`}
                >
                  <span>{info.name}</span>
                  <span className="text-[11px] font-normal text-slate-500 hidden md:inline">
                    ({info.subtitle})
                  </span>
                  {isDestFloor && (
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected
                          ? 'bg-teal-50 text-[#00685f] border border-teal-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      Destination
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs self-start sm:self-auto">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00685f] animate-pulse" />
            <span>Showing {FLOOR_LABELS[currentFloor].name} ({FLOOR_LABELS[currentFloor].subtitle}) Map</span>
          </div>
        </section>

        {/* 5. MAIN CENTRAL HERO: 2D HOSPITAL FLOOR MAP */}
        <section aria-label="Interactive 2D Hospital Map" className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-md p-3 sm:p-5 flex flex-col relative">
          {/* Map Header & Walk Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 px-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-[#00685f] font-bold text-sm">
                {FLOOR_LABELS[currentFloor].description}
              </span>
            </div>

            {/* Estimated Walk & Accessibility Badge */}
            {routeResult && (
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs ${
                  routeResult.isStepFree
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50 border-amber-300 text-amber-900'
                }`}
              >
                <span className="text-sm">{routeResult.isStepFree ? '♿' : '🪜'}</span>
                <span>
                  {routeResult.estimatedMinutes} min walk • {routeResult.totalDistanceMeters}m •{' '}
                  {routeResult.isStepFree
                    ? '100% Step-free (Elevators & Ramps only • 0 stairs)'
                    : 'Standard Route (Includes stairs)'}
                </span>
              </div>
            )}
          </div>

          {/* Interactive SVG Hospital Map */}
          <HospitalMap
            currentFloor={currentFloor}
            routeResult={routeResult}
            activeStepIndex={activeStepIndex}
            startNodeId={startNodeId}
            targetNodeId={targetNodeId}
            onSelectDestination={handleSelectDestination}
            onSelectStartNode={handleStartNodeChange}
          />
        </section>

        {/* 6. STEP-BY-STEP NAVIGATION DIRECTIONS PANEL & TEXT-TO-SPEECH CONTROLS */}
        <section aria-label="Turn-by-turn Navigation Directions" className="w-full bg-white rounded-3xl border-2 border-slate-200 shadow-sm p-4 sm:p-6 flex flex-col gap-4">
          {/* Active Step Hero Banner */}
          {activeStep && (
            <div
              className={`w-full rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-xs border-2 ${
                isSpeaking
                  ? 'bg-teal-50 border-[#00685f] ring-3 ring-[#00685f]/15'
                  : 'bg-teal-50/70 border-[#00685f]/30'
              }`}
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm relative ${
                    activeStep.transitionType === 'elevator'
                      ? 'bg-[#006398]'
                      : activeStep.transitionType === 'stairs'
                      ? 'bg-slate-700'
                      : activeStep.transitionType === 'ramp'
                      ? 'bg-emerald-700'
                      : 'bg-[#00685f]'
                  }`}
                >
                  {activeStep.transitionType === 'elevator' ? (
                    <span className="text-xl">🛗</span>
                  ) : activeStep.transitionType === 'stairs' ? (
                    <span className="text-xl">🪜</span>
                  ) : activeStep.transitionType === 'ramp' ? (
                    <span className="text-xl">♿</span>
                  ) : activeStep.icon === 'check_circle' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : activeStep.icon === 'turn_right' ? (
                    <ArrowRight className="w-6 h-6" />
                  ) : (
                    <Compass className="w-6 h-6" />
                  )}

                  {/* Audio Equalizer Overlay when Speaking */}
                  {isSpeaking && (
                    <div className="absolute -bottom-1 -right-1 bg-white text-[#00685f] p-0.5 rounded-full border border-[#00685f] shadow-xs flex items-center justify-center">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#00685f] mb-0.5 flex flex-wrap items-center gap-2">
                    <span>Step {activeStep.stepIndex} of {activeStep.totalSteps} • {activeStep.floorLabel}</span>
                    {activeStep.transitionType === 'elevator' && (
                      <span className="bg-sky-100 text-sky-800 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        Elevator Transfer
                      </span>
                    )}
                    {activeStep.transitionType === 'stairs' && (
                      <span className="bg-amber-100 text-amber-900 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        Stairs Route
                      </span>
                    )}
                    {activeStep.transitionType === 'ramp' && (
                      <span className="bg-emerald-100 text-emerald-900 text-[10px] px-2 py-0.2 rounded-full font-bold">
                        Step-free Ramp
                      </span>
                    )}
                    {isSpeaking && (
                      <span className="inline-flex items-center gap-1 bg-[#00685f] text-white text-[10px] px-2 py-0.2 rounded-full font-bold animate-pulse">
                        <Volume2 className="w-3 h-3" />
                        Speaking now
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                    {activeStep.instruction}
                  </h2>
                </div>
              </div>

              {/* Navigation Action Buttons: Previous Step, Next Step, Text-To-Speech Read Aloud, Full Directions */}
              <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  type="button"
                  onClick={handlePreviousStep}
                  disabled={activeStepIndex === 0}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextStep}
                  disabled={!routeResult || activeStepIndex >= routeResult.steps.length - 1}
                  className="px-3.5 py-2 rounded-xl bg-[#00685f] hover:bg-[#00534c] text-white font-bold text-xs sm:text-sm flex items-center gap-1 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Main Text-to-Speech (Web Speech API) Action Button */}
                <button
                  type="button"
                  onClick={handleToggleReadAloud}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs cursor-pointer ${
                    isSpeaking
                      ? 'bg-red-50 text-red-700 border-2 border-red-300 hover:bg-red-100 ring-2 ring-red-400/20'
                      : 'bg-white hover:bg-slate-50 border-2 border-[#00685f]/40 text-[#00685f] hover:border-[#00685f]'
                  }`}
                  title={isSpeaking ? 'Stop speaking instruction' : 'Listen to current instruction using Text-to-Speech'}
                  aria-label={isSpeaking ? 'Stop text-to-speech audio' : 'Read instruction aloud'}
                >
                  {isSpeaking ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-current text-red-600" />
                      <span>Stop reading</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-[#00685f]" />
                      <span>Read aloud</span>
                    </>
                  )}

                  {/* Animated Sound Wave bars when Speaking */}
                  {isSpeaking && (
                    <span className="flex items-end gap-0.5 h-3.5 pl-0.5">
                      <span className="w-0.5 h-2 bg-red-600 animate-pulse" />
                      <span className="w-0.5 h-3.5 bg-red-600 animate-bounce" />
                      <span className="w-0.5 h-2.5 bg-red-600 animate-pulse" />
                    </span>
                  )}
                </button>

                {/* Speech Settings Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowSpeechSettings(!showSpeechSettings)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    showSpeechSettings || autoReadSteps
                      ? 'bg-teal-50 border-[#00685f] text-[#00685f]'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                  title="Text-to-Speech Preferences (Voice Speed, Auto-Announce)"
                  aria-label="Text-to-Speech Preferences"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullDirectionsModal(true)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  title="Show Full Directions"
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Full Directions</span>
                </button>
              </div>
            </div>
          )}

          {/* Speech Settings Drawer / Expandable Panel */}
          {showSpeechSettings && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-700 shadow-2xs">
              <div className="flex items-center gap-2 text-[#00685f]">
                <Headphones className="w-4 h-4" />
                <span className="font-extrabold">Text-to-Speech Voice Settings</span>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Speech Rate Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium">Reading Speed:</span>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setSpeechRate(0.8)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        speechRate === 0.8 ? 'bg-[#00685f] text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      0.8x (Slow & Clear)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechRate(0.92)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        speechRate === 0.92 ? 'bg-[#00685f] text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1.0x (Normal)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpeechRate(1.15)}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                        speechRate === 1.15 ? 'bg-[#00685f] text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1.2x (Fast)
                    </button>
                  </div>
                </div>

                {/* Auto-Read On Step Change Toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoReadSteps}
                    onChange={(e) => setAutoReadSteps(e.target.checked)}
                    className="w-4 h-4 rounded text-[#00685f] focus:ring-[#00685f] cursor-pointer"
                  />
                  <span>Auto-read on step change (Hands-free)</span>
                </label>
              </div>
            </div>
          )}

          {/* Turn-by-Turn Checklist Steps Sequence */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                Complete Route Sequence
              </h3>
              <div className="flex items-center gap-3">
                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                  >
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop Speech</span>
                  </button>
                )}
                <span className="text-xs font-bold text-[#00685f]">
                  {routeResult?.steps.length || 0} steps total • {routeResult?.totalDistanceMeters || 0}m
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {routeResult?.steps.map((step, idx) => {
                const isCurrent = idx === activeStepIndex;
                const isThisStepSpeaking = speakingStepIndex === idx;

                return (
                  <div
                    key={`seq-card-${idx}`}
                    onClick={() => handleJumpToStep(idx)}
                    className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between transition-all cursor-pointer relative ${
                      isCurrent
                        ? 'border-[#00685f] bg-teal-50/60 ring-2 ring-[#00685f]/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isCurrent ? 'bg-[#00685f] text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          Step {step.stepIndex}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-bold text-slate-500">{step.floorLabel}</span>
                          {/* Individual Step Text-to-Speech Play Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJumpToStep(idx);
                              speakInstruction(step);
                            }}
                            className={`p-1 rounded-md transition-colors ${
                              isThisStepSpeaking
                                ? 'bg-[#00685f] text-white animate-pulse'
                                : 'text-slate-400 hover:text-[#00685f] hover:bg-teal-50'
                            }`}
                            title="Listen to this instruction aloud"
                            aria-label={`Read Step ${step.stepIndex} aloud`}
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="font-extrabold text-sm text-slate-900 mb-1 flex items-start gap-1.5">
                        <span className="text-base text-[#00685f] shrink-0">
                          {step.transitionType === 'elevator'
                            ? '🛗'
                            : step.transitionType === 'stairs'
                            ? '🪜'
                            : step.transitionType === 'ramp'
                            ? '♿'
                            : '→'}
                        </span>
                        <span>{step.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium pl-5 leading-relaxed">
                        {step.instruction}
                      </p>
                    </div>

                    {isCurrent && (
                      <div className="mt-3 pt-2 border-t border-[#00685f]/20 flex items-center justify-between text-[11px] font-bold text-[#00685f]">
                        <span className="flex items-center gap-1">
                          <span>Current position</span>
                          {isThisStepSpeaking && <span className="text-[10px] text-emerald-700">(Playing Audio)</span>}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-[#00685f] animate-ping" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* FULL DIRECTIONS MODAL WITH TEXT-TO-SPEECH READ-OUT */}
      {showFullDirectionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Full Directions to {currentDestination.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {routeResult?.steps.length} steps • {routeResult?.totalDistanceMeters}m • ~{routeResult?.estimatedMinutes} min •{' '}
                  <span className={routeResult?.isStepFree ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                    {routeResult?.isStepFree ? '100% Step-free (Elevator/Ramps)' : 'Includes stairs'}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setShowFullDirectionsModal(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto py-4 space-y-3 flex-1">
              {routeResult?.steps.map((step, idx) => (
                <div
                  key={`modal-step-${idx}`}
                  onClick={() => {
                    handleJumpToStep(idx);
                  }}
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors cursor-pointer ${
                    idx === activeStepIndex
                      ? 'border-[#00685f] bg-teal-50/60 ring-2 ring-[#00685f]/15'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-7 h-7 rounded-lg bg-[#00685f] text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {step.stepIndex}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">{step.title}</span>
                      <span className="text-[11px] font-semibold text-slate-500">{step.floorLabel}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{step.instruction}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJumpToStep(idx);
                      speakInstruction(step);
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-teal-50 text-[#00685f] cursor-pointer shadow-2xs shrink-0"
                    title="Listen to this step"
                    aria-label={`Listen to step ${step.stepIndex}`}
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              {isSpeaking ? (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="px-3.5 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current text-red-600" />
                  <span>Stop Speech</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (routeResult && routeResult.steps[activeStepIndex]) {
                      speakInstruction(routeResult.steps[activeStepIndex]);
                    }
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-50 text-[#00685f] border border-teal-200 hover:bg-teal-100 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Read Current Step Aloud</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setShowFullDirectionsModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#00685f] text-white font-bold text-xs cursor-pointer"
              >
                Close Directions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLEAN MINIMAL FOOTER */}
      <footer className="w-full bg-white border-t border-slate-200 py-3.5 px-4 sm:px-8 shrink-0 text-center text-xs text-slate-500 font-medium">
        Need human assistance? Ask any staff member in a teal vest or visit the Main Lobby Reception Desk.
      </footer>
    </div>
  );
};
