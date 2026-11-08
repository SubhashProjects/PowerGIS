// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// CONTRACTOR GPS FIELD SURVEY WEBPAGE (MOBILE-FIRST PWA)
// Features: Live GPS Accuracy, Offline Queue, Meter-to-Pole Mapping, Photo Capture
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { surveyService } from '../../services/surveyService';
import { assetService } from '../../services/assetService';
import { offlineQueue } from '../../lib/offlineQueue';
import { SurveyAssetType } from '../../types/surveys';
import {
  Smartphone, MapPin, Camera, Wifi, WifiOff, UploadCloud,
  CheckCircle2, Plus, AlertCircle, RefreshCw
} from 'lucide-react';

export const ContractorPWA: React.FC = () => {
  const { user } = useAuth();

  // GPS State
  const [gpsCoords, setGpsCoords] = useState<[number, number]>([11.9295, 79.8242]);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(1.8);
  const [altitude, setAltitude] = useState<number>(12.4);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [unsyncedCount, setUnsyncedCount] = useState<number>(offlineQueue.getUnsyncedCount());

  // Form State
  const [assetType, setAssetType] = useState<SurveyAssetType>('pole');
  const [assetCode, setAssetCode] = useState<string>('');
  const [workOrderNo, setWorkOrderNo] = useState<string>('WO-RDSS-104');
  const [attributes, setAttributes] = useState<Record<string, any>>({
    pole_number: 'P-03/MARA',
    pole_type: 'PSCC 9m',
    num_insulators: 3,
    feeder: 'FDR-MARA-01',
    is_smart_meter: true,
  });

  // Staged local records before submission
  const [stagedQueue, setStagedQueue] = useState<any[]>([]);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineQueue.subscribe(cnt => setUnsyncedCount(cnt));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleAcquireGPS = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setGpsCoords([pos.coords.latitude, pos.coords.longitude]);
          setGpsAccuracy(Math.round(pos.coords.accuracy * 10) / 10);
          if (pos.coords.altitude) setAltitude(Math.round(pos.coords.altitude * 10) / 10);
          setIsLocating(false);
        },
        () => {
          // Fallback simulation near Puducherry
          const jitterLat = 11.9295 + (Math.random() - 0.5) * 0.003;
          const jitterLng = 79.8242 + (Math.random() - 0.5) * 0.003;
          setGpsCoords([jitterLat, jitterLng]);
          setGpsAccuracy(1.8);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleAddAssetToDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const tempCode = assetCode.trim() || `TMP-${assetType.toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const newItem = {
      assetType,
      temporaryCode: tempCode,
      attributes: { ...attributes },
      gpsAccuracyM: gpsAccuracy,
      altitudeM: altitude,
      validationStatus: 'valid' as const,
      coordinates: gpsCoords,
    };

    setStagedQueue(prev => [...prev, newItem]);

    // Also queue into offline queue
    offlineQueue.enqueueRecord({
      contractorId: user.id,
      workOrderNumber: workOrderNo,
      assetType,
      temporaryCode: tempCode,
      coordinates: gpsCoords,
      gpsAccuracyM: gpsAccuracy,
      altitudeM: altitude,
      attributes: { ...attributes },
    });

    setAssetCode('');
    setSubmitMessage(`Asset ${tempCode} captured with GPS ±${gpsAccuracy}m`);
    setTimeout(() => setSubmitMessage(null), 3500);
  };

  const handleSubmitBatchForApproval = () => {
    if (stagedQueue.length === 0) {
      alert('Please capture at least one asset before submitting survey');
      return;
    }

    try {
      surveyService.submitSurvey(
        `Field Survey for ${workOrderNo} (${stagedQueue.length} assets)`,
        workOrderNo,
        stagedQueue
      );
      setStagedQueue([]);
      offlineQueue.clearSynced();
      alert('Survey submitted successfully! It is now pending JE Verification.');
    } catch (err: any) {
      alert('Submission failed: ' + err.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      {/* PWA Mobile Header Card */}
      <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Contractor GPS Field Survey</h2>
              <p className="text-xs text-slate-400">Offline PWA • {user.fullName} ({user.contractorCompany || 'Larsen Power'})</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOnline ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono border border-emerald-500/20">
                <Wifi className="w-3 h-3" />
                <span>ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-mono border border-rose-500/20">
                <WifiOff className="w-3 h-3" />
                <span>OFFLINE</span>
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Telemetry Box */}
        <div className="mt-4 p-3 rounded-xl bg-[#090f1a] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Live GPS Coordinates</div>
            <div className="font-mono text-sm text-sky-300 font-semibold">
              {gpsCoords[0].toFixed(6)}° N, {gpsCoords[1].toFixed(6)}° E
            </div>
            <div className="text-[11px] text-slate-400 flex items-center space-x-2 mt-0.5">
              <span>Accuracy: <b className="text-emerald-400">±{gpsAccuracy}m</b></span>
              <span>•</span>
              <span>Altitude: <b>{altitude}m MSL</b></span>
            </div>
          </div>

          <button
            onClick={handleAcquireGPS}
            disabled={isLocating}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring...' : 'Refresh GPS'}</span>
          </button>
        </div>
      </div>

      {/* Asset Capture Form */}
      <form onSubmit={handleAddAssetToDraft} className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Map New Electrical Asset</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Work Order: {workOrderNo}</span>
        </div>

        {submitMessage && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{submitMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">Asset Category</label>
            <select
              value={assetType}
              onChange={e => setAssetType(e.target.value as SurveyAssetType)}
              className="w-full bg-[#0b1220] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="pole">Utility Pole (HT / LT)</option>
              <option value="transformer">Distribution Transformer (DT)</option>
              <option value="consumer">Consumer Premise / Meter</option>
              <option value="conductor">Conductor Line Span</option>
              <option value="streetlight">Streetlight</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 font-medium mb-1">Asset ID / Code</label>
            <input
              type="text"
              value={assetCode}
              onChange={e => setAssetCode(e.target.value)}
              placeholder="e.g. POL-MARA-003"
              className="w-full bg-[#0b1220] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        {/* Dynamic Attributes based on Asset Type */}
        {assetType === 'pole' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#0a101b] rounded-xl border border-slate-800">
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Pole Type & Material</label>
              <select
                value={attributes.pole_type}
                onChange={e => setAttributes({ ...attributes, pole_type: e.target.value })}
                className="w-full bg-[#121c2d] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="PSCC 9m">PSCC 9m (Concrete)</option>
                <option value="Steel Tubular 11m">Steel Tubular 11m (Galvanized)</option>
                <option value="Rail Pole 13m">Rail Pole 13m</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Number of Insulators</label>
              <input
                type="number"
                value={attributes.num_insulators || 3}
                onChange={e => setAttributes({ ...attributes, num_insulators: parseInt(e.target.value) })}
                className="w-full bg-[#121c2d] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>
        )}

        {assetType === 'consumer' && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#0a101b] rounded-xl border border-slate-800">
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Meter Classification</label>
              <select
                value={attributes.is_smart_meter ? 'smart' : 'conv'}
                onChange={e => setAttributes({ ...attributes, is_smart_meter: e.target.value === 'smart' })}
                className="w-full bg-[#121c2d] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              >
                <option value="smart">Smart Energy Meter (AMI)</option>
                <option value="conv">Conventional Electronic Meter</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 font-medium mb-1">Connected Supply Pole</label>
              <input
                type="text"
                placeholder="e.g. POL-MARA-001"
                onChange={e => setAttributes({ ...attributes, connected_pole: e.target.value })}
                className="w-full bg-[#121c2d] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <Camera className="w-4 h-4 text-sky-400" />
            <span>Geotagged Photo: Attached (Simulated)</span>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/30 transition-all flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Local Survey Batch</span>
          </button>
        </div>
      </form>

      {/* Staged Draft Items */}
      {stagedQueue.length > 0 && (
        <div className="bg-[#121b2d] border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-xs text-white uppercase tracking-wider">
              Pending Survey Batch ({stagedQueue.length} Assets Captured)
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono">
              Draft (Unsubmitted)
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {stagedQueue.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-[#0a101b] border border-slate-800 text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-200">{item.temporaryCode}</span>
                  <span className="text-slate-400 text-[11px] ml-2">({item.assetType})</span>
                </div>
                <div className="text-[11px] font-mono text-emerald-400">±{item.gpsAccuracyM}m</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitBatchForApproval}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Submit Survey to Junior Engineer (JE) for Official Review</span>
          </button>
        </div>
      )}
    </div>
  );
};
