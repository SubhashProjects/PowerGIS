// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MAP ROTATION & COMPASS BEARING CONTROLLER - MONOCHROME B&W THEME
// ============================================================================

import React, { useState } from 'react';
import { useGIS } from '../../context/GISContext';
import { Compass, RotateCw, RotateCcw, ArrowUp, Navigation2, Sliders, X } from 'lucide-react';

export const MapRotationControl: React.FC = () => {
  const { bearing, setBearing, rotateBy, resetBearing } = useGIS();
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper to determine cardinal string (N, NE, E, SE, S, SW, W, NW)
  const getCardinal = (deg: number): string => {
    const d = (deg % 360 + 360) % 360;
    if (d >= 337.5 || d < 22.5) return 'N';
    if (d >= 22.5 && d < 67.5) return 'NE';
    if (d >= 67.5 && d < 112.5) return 'E';
    if (d >= 112.5 && d < 157.5) return 'SE';
    if (d >= 157.5 && d < 202.5) return 'S';
    if (d >= 202.5 && d < 247.5) return 'SW';
    if (d >= 247.5 && d < 292.5) return 'W';
    return 'NW';
  };

  const cardinal = getCardinal(bearing);
  const isRotated = bearing !== 0;

  return (
    <div className="absolute top-16 right-4 sm:top-16 sm:right-4 z-[999] select-none flex flex-col items-end">
      {/* Compact Compass Dial Button */}
      <div className="flex items-center space-x-1.5">
        <button
          onClick={() => {
            if (isRotated && !isExpanded) {
              resetBearing();
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
          className={`group flex items-center space-x-2 px-2.5 py-2 rounded-xl border backdrop-blur-md transition-all shadow-2xl ${
            isRotated
              ? 'bg-white text-black border-white ring-2 ring-white/30 font-bold'
              : 'bg-black/90 text-white border-neutral-800 hover:bg-neutral-900'
          }`}
          title={isRotated ? `Bearing: ${bearing}° (${cardinal}) - Click to Reset North, or expand` : 'Map Rotation & Compass'}
        >
          {/* Compass Icon / Needle */}
          <div className="relative w-6 h-6 flex items-center justify-center">
            {/* Compass Dial Ring */}
            <div
              className="w-6 h-6 rounded-full border border-current opacity-40 flex items-center justify-center"
              style={{
                transform: `rotate(${-bearing}deg)`,
                transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
              }}
            >
              <div className="w-0.5 h-1 bg-current absolute top-0" />
            </div>

            {/* Rotating Needle pointing to North */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `rotate(${-bearing}deg)`,
                transition: 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)',
              }}
            >
              <Navigation2
                className={`w-4 h-4 fill-current ${
                  isRotated ? 'text-black' : 'text-white'
                }`}
              />
            </div>
          </div>

          {/* Readout */}
          <span className="text-xs font-mono tracking-tight font-bold">
            {bearing}° <span className="opacity-75">{cardinal}</span>
          </span>

          {/* Quick toggle expanded drawer button */}
          <span
            onClick={e => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-0.5 rounded hover:bg-black/10 transition-colors ml-0.5"
            title="Adjust Angle"
          >
            <Sliders className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
          </span>
        </button>
      </div>

      {/* Expanded Rotation Controller Panel */}
      {isExpanded && (
        <div className="mt-2 w-72 max-w-[calc(100vw-2rem)] bg-[#0a0a0a]/95 backdrop-blur-md border border-neutral-800 rounded-2xl shadow-2xl p-3.5 text-white animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-neutral-800 text-[10px] uppercase font-bold text-neutral-400">
            <span className="flex items-center space-x-1.5 text-white">
              <Compass className="w-3.5 h-3.5" />
              <span>Map Orientation & Rotation</span>
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bearing Readout Display */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 text-center mb-3">
            <div className="text-[10px] text-neutral-400 uppercase font-mono tracking-wider">Current Bearing</div>
            <div className="text-2xl font-mono font-extrabold text-white tracking-tight my-0.5">
              {bearing}° <span className="text-sm font-bold text-neutral-400">{cardinal}</span>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              {bearing === 0 ? 'True North (Default)' : `${bearing}° Clockwise from True North`}
            </div>
          </div>

          {/* Angle Slider */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-[11px] font-mono text-neutral-400">
              <span>0° (N)</span>
              <span>180° (S)</span>
              <span>359°</span>
            </div>
            <input
              type="range"
              min="0"
              max="359"
              value={bearing}
              onChange={e => setBearing(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-white"
            />
          </div>

          {/* Step Increment Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <button
              onClick={() => rotateBy(-15)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-semibold transition-colors"
              title="Rotate Counter-Clockwise 15°"
            >
              <RotateCcw className="w-3 h-3" />
              <span>-15°</span>
            </button>
            <button
              onClick={() => rotateBy(15)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-semibold transition-colors"
              title="Rotate Clockwise 15°"
            >
              <RotateCw className="w-3 h-3" />
              <span>+15°</span>
            </button>
            <button
              onClick={() => rotateBy(-90)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-semibold transition-colors"
              title="Rotate Counter-Clockwise 90°"
            >
              <span>-90°</span>
            </button>
            <button
              onClick={() => rotateBy(90)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-mono font-semibold transition-colors"
              title="Rotate Clockwise 90°"
            >
              <span>+90°</span>
            </button>
          </div>

          {/* Cardinal Presets */}
          <div className="grid grid-cols-4 gap-1.5 mb-3 text-xs font-mono">
            {[
              { label: 'North', deg: 0 },
              { label: 'East', deg: 90 },
              { label: 'South', deg: 180 },
              { label: 'West', deg: 270 },
            ].map(card => (
              <button
                key={card.deg}
                onClick={() => setBearing(card.deg)}
                className={`py-1.5 rounded-lg border text-center transition-all ${
                  bearing === card.deg
                    ? 'bg-white text-black font-bold border-white'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                {card.label[0]} ({card.deg}°)
              </button>
            ))}
          </div>

          {/* Reset to North Button */}
          <button
            onClick={() => {
              resetBearing();
              setIsExpanded(false);
            }}
            disabled={bearing === 0}
            className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              bearing !== 0
                ? 'bg-white text-black hover:bg-neutral-200 shadow-md'
                : 'bg-neutral-900 text-neutral-600 border border-neutral-800 cursor-not-allowed'
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Reset to True North (0°)</span>
          </button>
        </div>
      )}
    </div>
  );
};
