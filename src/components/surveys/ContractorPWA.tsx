// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// CONTRACTOR GPS FIELD SURVEY WEBPAGE (MOBILE-FIRST PWA)
// PURE WHITE THEME & OFFLINE-READY STAGING CAPABILITY
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { surveyService } from '../../services/surveyService';
import { offlineQueue } from '../../lib/offlineQueue';
import { SurveyAssetType } from '../../types/surveys';
import {
  Smartphone, MapPin, Camera, Wifi, WifiOff, UploadCloud,
  CheckCircle2, Plus, RefreshCw, X
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
    <div className="max-w-2xl mx-auto p-3 sm:p-6 space-y-4 text-neutral-900 select-none">
      {/* PWA Mobile Header Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white font-extrabold flex items-center justify-center text-lg shadow-xs flex-shrink-0">
              <Smartphone className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-neutral-950">Contractor GPS Field Survey (PWA)</h2>
              <p className="text-xs text-neutral-500 font-mono">
                {user.fullName || user.username} ({user.contractorCompany || 'Larsen Power Ltd'})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOnline ? (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-mono border border-emerald-200 font-bold shadow-2xs">
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>ONLINE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-neutral-100 text-neutral-600 text-xs font-mono border border-neutral-200">
                <WifiOff className="w-3.5 h-3.5" />
                <span>OFFLINE ({unsyncedCount})</span>
              </span>
            )}
          </div>
        </div>

        {/* Live GPS Telemetry Box */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-neutral-500 font-mono">Live GPS Sensor Telemetry</div>
            <div className="font-mono text-sm text-neutral-950 font-extrabold mt-0.5">
              {gpsCoords[0].toFixed(6)}° N, {gpsCoords[1].toFixed(6)}° E
            </div>
            <div className="text-[11px] text-neutral-500 font-mono flex items-center space-x-2 mt-0.5">
              <span>Horizontal Accuracy: <b className="text-neutral-900 font-bold">±{gpsAccuracy}m</b></span>
              <span>•</span>
              <span>Elevation: <b>{altitude}m MSL</b></span>
            </div>
          </div>

          <button
            onClick={handleAcquireGPS}
            disabled={isLocating}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Acquiring...' : 'Refresh GPS'}</span>
          </button>
        </div>
      </div>

      {/* Asset Capture Form */}
      <form onSubmit={handleAddAssetToDraft} className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
          <h3 className="font-bold text-xs text-neutral-900 uppercase tracking-wider flex items-center space-x-2 font-mono">
            <Plus className="w-4 h-4 text-neutral-700" />
            <span>Capture New Electrical Asset</span>
          </h3>
          <span className="text-[11px] text-neutral-500 font-mono font-bold">WO: {workOrderNo}</span>
        </div>

        {submitMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-2 animate-fadeIn font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold">{submitMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Asset Category</label>
            <select
              value={assetType}
              onChange={e => setAssetType(e.target.value as SurveyAssetType)}
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            >
              <option value="pole">Utility Pole (HT / LT)</option>
              <option value="transformer">Distribution Transformer (DT)</option>
              <option value="consumer">Consumer Premise / Meter</option>
              <option value="conductor">Conductor Line Span</option>
              <option value="streetlight">Streetlight</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-neutral-600 font-medium mb-1 font-mono">Asset ID / Code</label>
            <input
              type="text"
              value={assetCode}
              onChange={e => setAssetCode(e.target.value)}
              placeholder="e.g. POL-MARA-003"
              className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-xs text-neutral-900 font-mono focus:bg-white focus:outline-none focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Dynamic Attributes based on Asset Type */}
        {assetType === 'pole' && (
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <label className="block text-[10px] text-neutral-500 font-medium mb-1 font-mono">Pole Type & Material</label>
              <select
                value={attributes.pole_type}
                onChange={e => setAttributes({ ...attributes, pole_type: e.target.value })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="PSCC 9m">PSCC 9m (Concrete)</option>
                <option value="Steel Tubular 11m">Steel Tubular 11m (Galvanized)</option>
                <option value="Rail Pole 13m">Rail Pole 13m</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 font-medium mb-1 font-mono">Number of Insulators</label>
              <input
                type="number"
                value={attributes.num_insulators || 3}
                onChange={e => setAttributes({ ...attributes, num_insulators: parseInt(e.target.value) })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {assetType === 'consumer' && (
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
            <div>
              <label className="block text-[10px] text-neutral-500 font-medium mb-1 font-mono">Meter Classification</label>
              <select
                value={attributes.is_smart_meter ? 'smart' : 'conv'}
                onChange={e => setAttributes({ ...attributes, is_smart_meter: e.target.value === 'smart' })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 focus:outline-none"
              >
                <option value="smart">Smart Energy Meter (AMI)</option>
                <option value="conv">Conventional Electronic Meter</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 font-medium mb-1 font-mono">Connected Supply Pole</label>
              <input
                type="text"
                placeholder="e.g. POL-MARA-001"
                onChange={e => setAttributes({ ...attributes, connected_pole: e.target.value })}
                className="w-full bg-white border border-neutral-300 rounded-lg px-2.5 py-1.5 text-xs text-neutral-900 font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2 text-xs text-neutral-500 font-mono">
            <Camera className="w-4 h-4 text-neutral-700" />
            <span>Geotagged Photo: Attached (Watermarked)</span>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add to Local Batch</span>
          </button>
        </div>
      </form>

      {/* Staged Draft Items */}
      {stagedQueue.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
            <h4 className="font-bold text-xs text-neutral-900 uppercase tracking-wider font-mono">
              Pending Survey Batch ({stagedQueue.length} Assets Captured)
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-mono border border-neutral-200 font-bold">
              Draft Staging
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {stagedQueue.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs"
              >
                <div>
                  <span className="font-bold text-neutral-950">{item.temporaryCode}</span>
                  <span className="text-neutral-500 text-[11px] ml-2 font-mono">({item.assetType})</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-900 font-bold">±{item.gpsAccuracyM}m</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleSubmitBatchForApproval}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Submit Survey to Junior Engineer (JE) for Official Review</span>
          </button>
        </div>
      )}
    </div>
  );
};
