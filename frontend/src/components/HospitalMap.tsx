import React, { useState } from 'react';
import { Floor, MapNode, NavigationStep, RouteResult } from '../types/navigation';
import { MAP_NODES } from '../data/hospitalGraph';
import { ZoomIn, ZoomOut, RotateCcw, Compass, MapPin } from 'lucide-react';

interface HospitalMapProps {
  currentFloor: Floor;
  routeResult: RouteResult | null;
  activeStepIndex: number;
  startNodeId: string;
  targetNodeId: string;
  onSelectDestination: (destKey: string) => void;
  onSelectStartNode?: (nodeId: string) => void;
}

export const HospitalMap: React.FC<HospitalMapProps> = ({
  currentFloor,
  routeResult,
  activeStepIndex,
  startNodeId,
  targetNodeId,
  onSelectDestination,
  onSelectStartNode
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleZoom = (factor: number) => {
    setZoomLevel((prev) => Math.max(0.8, Math.min(2.0, Number((prev * factor).toFixed(2)))));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const startNode = MAP_NODES[startNodeId];
  const targetNode = MAP_NODES[targetNodeId];

  // Filter route segments that belong to current viewed floor
  const currentFloorSteps = routeResult?.steps.filter(
    (step) => step.floor === currentFloor && !step.isFloorTransition
  ) || [];

  // Active step info
  const activeStep = routeResult?.steps[activeStepIndex];
  const isActiveStepOnThisFloor = activeStep?.floor === currentFloor;

  // Determine if elevator transition happens on this floor
  const elevatorStepOnFloor = routeResult?.steps.find(
    (s) => s.isFloorTransition && (s.floor === currentFloor || MAP_NODES[s.toNodeId]?.floor === currentFloor)
  );

  return (
    <div className="relative w-full bg-slate-50/70 rounded-2xl overflow-hidden border border-slate-200/90 select-none shadow-inner">
      {/* Map Overlay Controls */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-700 text-xs font-bold shadow-xs">
          <Compass className="w-3.5 h-3.5 text-primary" />
          <span>North ↑</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50/90 backdrop-blur-md border border-amber-200 text-amber-800 text-[11px] font-semibold">
          Illustrative Sample Map
        </span>
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200 p-1 rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => handleZoom(1.15)}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => handleZoom(0.85)}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleResetZoom}
          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Reset Zoom"
          aria-label="Reset Zoom"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* SVG Container with transform support */}
      <div className="w-full aspect-[16/9] min-h-[360px] md:min-h-[460px] relative flex items-center justify-center p-2">
        <div
          className="w-full h-full max-w-[960px] transition-transform duration-200 ease-out"
          style={{
            transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
            transformOrigin: 'center center'
          }}
        >
          <svg
            viewBox="0 0 920 520"
            className="w-full h-full drop-shadow-xs"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="map-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="#cbd5e1" opacity="0.4" />
              </pattern>
              <filter id="elev-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
              </filter>
              <filter id="active-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Base Hospital Structure */}
            <rect width="920" height="520" rx="20" fill="#f8fafc" />
            <rect x="20" y="20" width="880" height="480" rx="16" fill="url(#map-grid-pattern)" />
            <rect x="20" y="20" width="880" height="480" rx="16" stroke="#94a3b8" strokeWidth="2.5" fill="#ffffff" />

            {/* ---------------- GROUND FLOOR PLAN ---------------- */}
            {currentFloor === 'ground' && (
              <g id="ground-floor-layout">
                {/* Corridors */}
                <rect x="100" y="215" width="720" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="415" y="90" width="90" height="340" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="415" y="215" width="90" height="90" fill="#f1f5f9" />

                {/* Cafeteria (Top Left) */}
                <g
                  id="ground-cafe"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectDestination('cafe')}
                >
                  <rect x="70" y="70" width="150" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="85" y="85" width="30" height="28" rx="6" fill="#fff7ed" />
                  <text x="100" y="104" textAnchor="middle" fontSize="14" fontWeight="800">☕</text>
                  <text x="125" y="102" fill="#0f172a" fontSize="14" fontWeight="800">Cafeteria</text>
                  <text x="85" y="135" fill="#64748b" fontSize="11" fontWeight="600">Visitor Dining & Snacks</text>
                  <text x="85" y="152" fill="#94a3b8" fontSize="10" fontWeight="500">Hours: 7am - 9pm</text>
                </g>

                {/* Info Desk (Top Center-Left) */}
                <g
                  id="ground-info"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectDestination('info')}
                >
                  <rect x="245" y="70" width="140" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="260" y="85" width="30" height="28" rx="6" fill="#e6f6f4" />
                  <text x="275" y="104" textAnchor="middle" fontSize="14" fontWeight="800">ℹ️</text>
                  <text x="300" y="102" fill="#00685f" fontSize="14" fontWeight="800">Info Desk</text>
                  <text x="260" y="135" fill="#64748b" fontSize="11" fontWeight="600">Volunteer Help &</text>
                  <text x="260" y="150" fill="#64748b" fontSize="11" fontWeight="600">Wheelchair Loan</text>
                </g>

                {/* Central Elevators & Stairs (Top Center) */}
                <g id="ground-elevators" filter="url(#elev-shadow)">
                  <rect x="410" y="65" width="180" height="125" rx="14" fill="#f0f9ff" stroke="#006398" strokeWidth="2.5" />
                  <rect x="425" y="80" width="55" height="42" rx="6" fill="#006398" />
                  <text x="452" y="105" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ELEV A</text>
                  <rect x="490" y="80" width="55" height="42" rx="6" fill="#006398" />
                  <text x="517" y="105" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ELEV B</text>
                  <rect x="550" y="80" width="30" height="42" rx="6" fill="#e2e8f0" />
                  <text x="565" y="105" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="800">🪜</text>
                  <text x="500" y="148" textAnchor="middle" fill="#006398" fontSize="13" fontWeight="800">Central Elevators & Stairs</text>
                  <text x="500" y="165" textAnchor="middle" fill="#0284c7" fontSize="10" fontWeight="600">Direct access to Floors 1 & 2</text>
                </g>

                {/* Restrooms (Top Right-Center) */}
                <g id="ground-restrooms">
                  <rect x="615" y="70" width="100" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="665" y="112" textAnchor="middle" fontSize="16">🚻</text>
                  <text x="665" y="136" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700">Restrooms</text>
                  <text x="665" y="154" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">ADA Step-free</text>
                </g>

                {/* OPD Clinic (Bottom Left) */}
                <g
                  id="ground-opd"
                  className="cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => onSelectDestination('opd')}
                >
                  <rect
                    x="70"
                    y="335"
                    width="200"
                    height="135"
                    rx="14"
                    fill="#ffffff"
                    stroke={targetNodeId === 'g-opd' ? '#00685f' : '#cbd5e1'}
                    strokeWidth={targetNodeId === 'g-opd' ? '3.5' : '2.5'}
                  />
                  <rect x="85" y="350" width="75" height="24" rx="6" fill="#f0fdf4" />
                  <text x="122" y="366" textAnchor="middle" fill="#166534" fontSize="11" fontWeight="800">Rooms G01-08</text>
                  <text x="85" y="400" fill="#0f172a" fontSize="16" fontWeight="800">OPD Clinic</text>
                  <text x="85" y="420" fill="#64748b" fontSize="12" fontWeight="600">Outpatient Consultation</text>
                  <text x="85" y="442" fill="#00685f" fontSize="11" fontWeight="700">Doctor Appointment Suites</text>
                </g>

                {/* Main Reception & Lobby (Bottom Center - Start Position) */}
                <g
                  id="ground-reception"
                  className="cursor-pointer"
                  onClick={() => onSelectStartNode && onSelectStartNode('g-reception')}
                >
                  <rect
                    x="345"
                    y="335"
                    width="230"
                    height="135"
                    rx="14"
                    fill="#e6f6f4"
                    stroke="#00685f"
                    strokeWidth="3"
                  />
                  <rect x="402" y="348" width="115" height="22" rx="6" fill="#00685f" />
                  <text x="460" y="363" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ENTRANCE LEVEL</text>
                  <text x="460" y="396" textAnchor="middle" fill="#00685f" fontSize="16" fontWeight="800">Main Reception & Lobby</text>
                  <text x="460" y="418" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="600">Welcome Doors • Check-In</text>
                  <text x="460" y="442" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="500">Automatic sliding doors</text>
                </g>

                {/* Emergency Dept (Right Wing) */}
                <g
                  id="ground-emergency"
                  className="cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => onSelectDestination('emergency')}
                >
                  <rect
                    x="605"
                    y="215"
                    width="250"
                    height="210"
                    rx="16"
                    fill="#ffffff"
                    stroke={targetNodeId === 'g-emergency' ? '#ba1a1a' : '#cbd5e1'}
                    strokeWidth={targetNodeId === 'g-emergency' ? '3.5' : '2.5'}
                  />
                  <rect x="625" y="235" width="90" height="24" rx="6" fill="#fef2f2" />
                  <text x="670" y="251" textAnchor="middle" fill="#b91c1c" fontSize="11" fontWeight="800">RED ZONE • ER</text>
                  <text x="625" y="285" fill="#b91c1c" fontSize="18" fontWeight="800">Emergency Dept</text>
                  <text x="625" y="308" fill="#475569" fontSize="13" fontWeight="600">Urgent Care & Fast Triage</text>
                  <text x="625" y="330" fill="#64748b" fontSize="11" fontWeight="500">Trauma Bays 1 - 12</text>
                  <text x="625" y="348" fill="#64748b" fontSize="11" fontWeight="500">24/7 Acute Admissions</text>
                </g>
              </g>
            )}

            {/* ---------------- FIRST FLOOR PLAN ---------------- */}
            {currentFloor === 'first' && (
              <g id="first-floor-layout">
                {/* Distinct Corridor Network for Floor 1 */}
                <rect x="100" y="215" width="720" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="415" y="90" width="90" height="340" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="415" y="215" width="90" height="90" fill="#f1f5f9" />

                {/* Central Elevators & Stairs Arrival */}
                <g id="first-elevators" filter="url(#elev-shadow)">
                  <rect x="410" y="65" width="180" height="125" rx="14" fill="#f0f9ff" stroke="#006398" strokeWidth="2.5" />
                  <rect x="425" y="80" width="55" height="42" rx="6" fill="#006398" />
                  <text x="452" y="105" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ELEV A</text>
                  <rect x="490" y="80" width="55" height="42" rx="6" fill="#006398" />
                  <text x="517" y="105" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ELEV B</text>
                  <rect x="550" y="80" width="30" height="42" rx="6" fill="#e2e8f0" />
                  <text x="565" y="105" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="800">🪜</text>
                  <text x="500" y="148" textAnchor="middle" fill="#006398" fontSize="13" fontWeight="800">Central Elevators (Floor 1)</text>
                  <text x="500" y="165" textAnchor="middle" fill="#0284c7" fontSize="10" fontWeight="600">Elevator Arrival Hub</text>
                </g>

                {/* Cardiology Dept (Top Left) */}
                <g
                  id="first-cardio"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectDestination('cardio')}
                >
                  <rect x="70" y="70" width="200" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="85" y="85" width="80" height="24" rx="6" fill="#fef2f2" />
                  <text x="125" y="101" textAnchor="middle" fill="#dc2626" fontSize="11" fontWeight="800">Suite 101</text>
                  <text x="85" y="132" fill="#0f172a" fontSize="15" fontWeight="800">Cardiology Wing</text>
                  <text x="85" y="152" fill="#64748b" fontSize="11" fontWeight="600">Heart Health & ECG</text>
                </g>

                {/* Restrooms (Top Right-Center) */}
                <g id="first-restrooms">
                  <rect x="615" y="70" width="100" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="665" y="112" textAnchor="middle" fontSize="16">🚻</text>
                  <text x="665" y="136" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700">Restrooms</text>
                  <text x="665" y="154" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">ADA Step-free</text>
                </g>

                {/* Inpatient Wards (Bottom Left) */}
                <g
                  id="first-wards"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectDestination('wards')}
                >
                  <rect x="70" y="335" width="240" height="135" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
                  <rect x="85" y="350" width="90" height="24" rx="6" fill="#f8fafc" />
                  <text x="130" y="366" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="800">Rooms 110-140</text>
                  <text x="85" y="400" fill="#0f172a" fontSize="16" fontWeight="800">Inpatient Wards</text>
                  <text x="85" y="422" fill="#64748b" fontSize="12" fontWeight="600">Patient Recovery Rooms</text>
                  <text x="85" y="442" fill="#94a3b8" fontSize="10" fontWeight="500">Visiting Hours: 10am - 8pm</text>
                </g>

                {/* Nurses Station 1 (Bottom Center) */}
                <g id="first-nurse">
                  <rect x="350" y="335" width="200" height="135" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
                  <rect x="365" y="350" width="95" height="24" rx="6" fill="#e6f6f4" />
                  <text x="412" y="366" textAnchor="middle" fill="#00685f" fontSize="11" fontWeight="800">Staff Station</text>
                  <text x="365" y="400" fill="#0f172a" fontSize="15" fontWeight="800">Nurses Station 1</text>
                  <text x="365" y="422" fill="#64748b" fontSize="12" fontWeight="600">Duty Registered Nurses</text>
                  <text x="365" y="442" fill="#94a3b8" fontSize="10" fontWeight="500">Immediate Assistance</text>
                </g>

                {/* Pharmacy (Room 102 - Right Wing) */}
                <g
                  id="first-pharmacy"
                  className="cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => onSelectDestination('pharmacy')}
                >
                  <rect
                    x="605"
                    y="215"
                    width="250"
                    height="210"
                    rx="16"
                    fill="#ffffff"
                    stroke={targetNodeId === 'f1-pharmacy' ? '#006398' : '#cbd5e1'}
                    strokeWidth={targetNodeId === 'f1-pharmacy' ? '3.5' : '2.5'}
                  />
                  <rect x="625" y="235" width="90" height="26" rx="6" fill="#e0f2fe" />
                  <text x="670" y="252" textAnchor="middle" fill="#0369a1" fontSize="12" fontWeight="800">ROOM 102</text>
                  <text x="625" y="288" fill="#006398" fontSize="18" fontWeight="800">Hospital Pharmacy</text>
                  <text x="625" y="312" fill="#475569" fontSize="13" fontWeight="600">Prescription Pickup & Meds</text>
                  <text x="625" y="334" fill="#64748b" fontSize="11" fontWeight="500">Dispensary Counters 1 - 4</text>
                  <text x="625" y="354" fill="#0284c7" fontSize="11" fontWeight="700">Target Destination</text>
                </g>
              </g>
            )}

            {/* ---------------- SECOND FLOOR PLAN ---------------- */}
            {currentFloor === 'second' && (
              <g id="second-floor-layout">
                {/* Distinct Corridor Network for Floor 2 */}
                <rect x="100" y="215" width="720" height="90" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="415" y="90" width="90" height="340" rx="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
                <rect x="415" y="215" width="90" height="90" fill="#f1f5f9" />

                {/* Central Elevators & Stairs Arrival */}
                <g id="second-elevators" filter="url(#elev-shadow)">
                  <rect x="410" y="65" width="180" height="125" rx="14" fill="#f0f9ff" stroke="#006398" strokeWidth="2.5" />
                  <rect x="425" y="80" width="55" height="42" rx="6" fill="#006398" />
                  <text x="452" y="105" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ELEV A</text>
                  <rect x="490" y="80" width="55" height="42" rx="6" fill="#006398" />
                  <text x="517" y="105" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">ELEV B</text>
                  <rect x="550" y="80" width="30" height="42" rx="6" fill="#e2e8f0" />
                  <text x="565" y="105" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="800">🪜</text>
                  <text x="500" y="148" textAnchor="middle" fill="#006398" fontSize="13" fontWeight="800">Central Elevators (Floor 2)</text>
                  <text x="500" y="165" textAnchor="middle" fill="#0284c7" fontSize="10" fontWeight="600">Elevator Arrival Hub</text>
                </g>

                {/* Radiology & MRI (Top Left) */}
                <g
                  id="second-imaging"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectDestination('imaging')}
                >
                  <rect x="70" y="70" width="200" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <rect x="85" y="85" width="80" height="24" rx="6" fill="#e0e7ff" />
                  <text x="125" y="101" textAnchor="middle" fill="#4338ca" fontSize="11" fontWeight="800">Suite 201</text>
                  <text x="85" y="132" fill="#0f172a" fontSize="15" fontWeight="800">Radiology & MRI</text>
                  <text x="85" y="152" fill="#64748b" fontSize="11" fontWeight="600">X-Ray, CT Scan, Ultrasound</text>
                </g>

                {/* Restrooms (Top Right-Center) */}
                <g id="second-restrooms">
                  <rect x="615" y="70" width="100" height="115" rx="12" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                  <text x="665" y="112" textAnchor="middle" fontSize="16">🚻</text>
                  <text x="665" y="136" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700">Restrooms</text>
                  <text x="665" y="154" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="600">ADA Step-free</text>
                </g>

                {/* Pathology (Bottom Left) */}
                <g
                  id="second-pathology"
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onSelectDestination('pathology')}
                >
                  <rect x="70" y="335" width="220" height="135" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
                  <rect x="85" y="350" width="80" height="24" rx="6" fill="#f8fafc" />
                  <text x="125" y="366" textAnchor="middle" fill="#475569" fontSize="11" fontWeight="800">Suite 210</text>
                  <text x="85" y="400" fill="#0f172a" fontSize="16" fontWeight="800">Pathology Dept</text>
                  <text x="85" y="422" fill="#64748b" fontSize="12" fontWeight="600">Histology & Biopsy</text>
                </g>

                {/* Specialist Suites (Bottom Center) */}
                <g id="second-specialist">
                  <rect x="340" y="335" width="210" height="135" rx="14" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2.5" />
                  <rect x="355" y="350" width="85" height="24" rx="6" fill="#e0f2fe" />
                  <text x="397" y="366" textAnchor="middle" fill="#0369a1" fontSize="11" fontWeight="800">Rooms 220-230</text>
                  <text x="355" y="400" fill="#0f172a" fontSize="15" fontWeight="800">Specialist Suites</text>
                  <text x="355" y="422" fill="#64748b" fontSize="12" fontWeight="600">Neurology & Oncology</text>
                </g>

                {/* Laboratory (Room 205 - Right Wing) */}
                <g
                  id="second-lab"
                  className="cursor-pointer hover:opacity-95 transition-opacity"
                  onClick={() => onSelectDestination('lab')}
                >
                  <rect
                    x="605"
                    y="215"
                    width="250"
                    height="210"
                    rx="16"
                    fill="#ffffff"
                    stroke={targetNodeId === 'f2-lab' ? '#4338ca' : '#cbd5e1'}
                    strokeWidth={targetNodeId === 'f2-lab' ? '3.5' : '2.5'}
                  />
                  <rect x="625" y="235" width="90" height="26" rx="6" fill="#e0e7ff" />
                  <text x="670" y="252" textAnchor="middle" fill="#4338ca" fontSize="12" fontWeight="800">ROOM 205</text>
                  <text x="625" y="288" fill="#4338ca" fontSize="18" fontWeight="800">Clinical Laboratory</text>
                  <text x="625" y="312" fill="#475569" fontSize="13" fontWeight="600">Blood Tests & Diagnostics</text>
                  <text x="625" y="334" fill="#64748b" fontSize="11" fontWeight="500">Phlebotomy Draw Stations</text>
                  <text x="625" y="354" fill="#4f46e5" fontSize="11" fontWeight="700">Target Destination</text>
                </g>
              </g>
            )}

            {/* ================= ROUTE RENDERING ON CURRENT FLOOR ================= */}
            {currentFloorSteps.map((step, idx) => {
              const [[x1, y1], [x2, y2]] = step.pathPoints;
              const isCurrentStep = step.stepIndex === activeStepIndex + 1;
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              return (
                <g key={`route-segment-${idx}`} id={`route-segment-${step.stepIndex}`}>
                  {/* Active Step Glow Halo */}
                  {isCurrentStep && (
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#60a5fa"
                      strokeWidth="16"
                      strokeLinecap="round"
                      opacity="0.45"
                      filter="url(#active-glow)"
                    />
                  )}

                  {/* Main Blue Glowing Route Path */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#2563eb"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className="active-route-path"
                  />

                  {/* Directional Waypoint Arrow Circle */}
                  {step.distanceMeters > 10 && (
                    <g transform={`translate(${midX}, ${midY})`}>
                      <circle cx="0" cy="0" r="10" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="900"
                      >
                        {x2 > x1 ? '→' : x2 < x1 ? '←' : y2 > y1 ? '↓' : '↑'}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Accessible Ramp indicator on Ground Floor Concourse */}
            {currentFloor === 'ground' && (
              <g id="ground-accessible-ramp" className="select-none">
                <rect x="402" y="295" width="45" height="26" rx="6" fill="#e6f6f4" stroke="#00685f" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x="424" y="312" textAnchor="middle" fill="#00685f" fontSize="9" fontWeight="800">♿ RAMP</text>
              </g>
            )}

            {/* If Elevator or Stairs Transition belongs to this floor */}
            {elevatorStepOnFloor && (
              elevatorStepOnFloor.transitionType === 'elevator' ? (
                <g
                  id="elevator-transition-badge"
                  transform="translate(460, 185)"
                  className="cursor-pointer"
                >
                  <circle cx="0" cy="0" r="16" fill="#006398" stroke="#ffffff" strokeWidth="3" />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">🛗</text>
                  <rect x="-95" y="-36" width="190" height="22" rx="6" fill="#006398" />
                  <text x="0" y="-22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                    {currentFloor === 'ground' ? 'TAKE ELEVATOR UP (STEP-FREE)' : 'ELEVATOR ARRIVAL / TRANSFER'}
                  </text>
                </g>
              ) : (
                <g
                  id="stairs-transition-badge"
                  transform="translate(565, 185)"
                  className="cursor-pointer"
                >
                  <circle cx="0" cy="0" r="16" fill="#475569" stroke="#ffffff" strokeWidth="3" />
                  <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="900">🪜</text>
                  <rect x="-85" y="-36" width="170" height="22" rx="6" fill="#475569" />
                  <text x="0" y="-22" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                    {currentFloor === 'ground' ? 'TAKE STAIRS UP (STEP ACCESS)' : 'STAIRS ARRIVAL / TRANSFER'}
                  </text>
                </g>
              )
            )}

            {/* ================= START POINT "YOU ARE HERE" PIN ================= */}
            {startNode && startNode.floor === currentFloor && (
              <g id="you-are-here-marker" transform={`translate(${startNode.x}, ${startNode.y})`}>
                <circle cx="0" cy="0" r="22" fill="#00685f" className="animate-ping-slow" />
                <circle cx="0" cy="0" r="15" fill="#00685f" stroke="#ffffff" strokeWidth="3.5" />
                <circle cx="0" cy="0" r="5" fill="#ffffff" />
                <rect x="-60" y="20" width="120" height="22" rx="11" fill="#0f172a" />
                <text x="0" y="34" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800" letterSpacing="0.5">
                  YOU ARE HERE
                </text>
              </g>
            )}

            {/* ================= DESTINATION PIN ================= */}
            {targetNode && targetNode.floor === currentFloor && (
              <g id="destination-pin-marker" transform={`translate(${targetNode.x}, ${targetNode.y})`}>
                <circle
                  cx="0"
                  cy="0"
                  r="16"
                  fill={
                    targetNode.destinationKey === 'emergency'
                      ? '#ba1a1a'
                      : targetNode.destinationKey === 'lab'
                      ? '#4338ca'
                      : '#006398'
                  }
                  stroke="#ffffff"
                  strokeWidth="3.5"
                />
                <text x="0" y="5" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900">📍</text>
                <rect
                  x="-75"
                  y="22"
                  width="150"
                  height="22"
                  rx="6"
                  fill={
                    targetNode.destinationKey === 'emergency'
                      ? '#ba1a1a'
                      : targetNode.destinationKey === 'lab'
                      ? '#4338ca'
                      : '#006398'
                  }
                />
                <text x="0" y="36" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
                  {targetNode.label}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* Map Legend (Bottom Bar) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-2 px-4 border-t border-slate-200/80 bg-white/70 text-xs font-semibold text-slate-600">
        <div className="flex items-center gap-1.5 text-slate-500">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>Map Legend:</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-primary ring-2 ring-primary/20" />
            <span>You Are Here</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-1.5 rounded-full bg-[#2563eb]" />
            <span>Your Blue Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#006398] text-white flex items-center justify-center text-[10px]">🛗</span>
            <span>Elevators</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#475569] text-white flex items-center justify-center text-[10px]">🪜</span>
            <span>Stairs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#00685f] text-white flex items-center justify-center text-[10px]">♿</span>
            <span>Step-free Ramps</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px]">📍</span>
            <span>Destination</span>
          </div>
        </div>
      </div>
    </div>
  );
};
