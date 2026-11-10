// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MAP ROTATION & COMPASS BEARING CONTROLLER - PURE WHITE THEME
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
          className={`group flex items-center space-x-2 px-3 py-1.5 rounded-md border transition-colors shadow-sm cursor-pointer ${
            isRotated
              ? 'bg-[#09090B] text-white border-zinc-950 font-bold'
              : 'bg-white text-zinc-900 border-[#E4E4E7] hover:bg-zinc-50'
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
                  isRotated ? 'text-amber-400' : 'text-zinc-700'
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
        <div className="mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-[#E4E4E7] rounded-md shadow-lg p-3.5 text-zinc-900 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-200 text-[10px] uppercase font-bold text-zinc-500 font-mono">
            <span className="flex items-center space-x-1.5 text-zinc-950 font-bold">
              <Compass className="w-3.5 h-3.5" />
              <span>Map Orientation & Rotation</span>
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bearing Readout Display */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-md p-3 text-center mb-3">
            <div className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">Current Bearing</div>
            <div className="text-2xl font-mono font-extrabold text-zinc-950 tracking-tight my-0.5">
              {bearing}° <span className="text-sm font-bold text-zinc-500">{cardinal}</span>
            </div>
            <div className="text-[10px] text-zinc-500 font-mono">
              {bearing === 0 ? 'True North (Default)' : `${bearing}° Clockwise from True North`}
            </div>
          </div>

          {/* Angle Slider */}
          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-[11px] font-mono text-zinc-500">
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
              className="w-full h-1.5 bg-zinc-200 rounded appearance-none cursor-pointer accent-zinc-900"
            />
          </div>

          {/* Step Increment Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            <button
              onClick={() => rotateBy(-15)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-mono font-semibold transition-colors text-zinc-800"
              title="Rotate Counter-Clockwise 15°"
            >
              <RotateCcw className="w-3 h-3" />
              <span>-15°</span>
            </button>
            <button
              onClick={() => rotateBy(15)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-mono font-semibold transition-colors text-zinc-800"
              title="Rotate Clockwise 15°"
            >
              <RotateCw className="w-3 h-3" />
              <span>+15°</span>
            </button>
            <button
              onClick={() => rotateBy(-90)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-mono font-semibold transition-colors text-zinc-800"
              title="Rotate Counter-Clockwise 90°"
            >
              <span>-90°</span>
            </button>
            <button
              onClick={() => rotateBy(90)}
              className="flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-xs font-mono font-semibold transition-colors text-zinc-800"
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
                className={`py-1.5 rounded-md border text-center transition-colors cursor-pointer ${
                  bearing === card.deg
                    ? 'bg-[#09090B] text-white font-bold border-zinc-900'
                    : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
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
            className={`w-full py-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer ${
              bearing !== 0
                ? 'bg-[#09090B] hover:bg-zinc-800 text-white'
                : 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-not-allowed'
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
