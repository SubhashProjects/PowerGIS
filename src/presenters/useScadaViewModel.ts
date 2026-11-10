// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// MVP / MVVM PRESENTER: SCADA & DYNAMIC SIMULATOR VIEW MODEL
// Encapsulates SBO Interlocks, Protocol Gateways, and Data Isolation
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { scadaService } from '../services/scadaService';
import { scadaGatewayService } from '../services/scadaGatewayService';
import { assetService } from '../services/assetService';
import {
  ScadaTelemetryPoint,
  ScadaConnectionStatus,
  ScadaGatewayProtocol,
} from '../types/operations';
import { COMMONS } from '../commons';

export interface ScadaViewModel {
  user: ReturnType<typeof useAuth>['user'];
  isSimulatorActive: boolean;
  connectionStatus: ScadaConnectionStatus;
  points: ScadaTelemetryPoint[];
  selectedPoint: ScadaTelemetryPoint | null;
  setSelectedPoint: (point: ScadaTelemetryPoint | null) => void;
  selectedTagForSBO: string | null;
  setSelectedTagForSBO: (tag: string | null) => void;
  sboProtocol: ScadaGatewayProtocol;
  setSboProtocol: (proto: ScadaGatewayProtocol) => void;
  sboReason: string;
  setSboReason: (reason: string) => void;
  sboConfirmed: boolean;
  setSboConfirmed: (confirmed: boolean) => void;
  sboFeedback: { message: string; type: 'success' | 'error' | 'info' } | null;
  handleExecuteSBO: () => void;
  handleToggleConnection: () => void;
  protocolStatuses: ReturnType<typeof scadaGatewayService.getProtocolStatus>;
  commons: typeof COMMONS;
}

export function useScadaViewModel(): ScadaViewModel {
  const { user } = useAuth();
  const [points, setPoints] = useState<ScadaTelemetryPoint[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ScadaConnectionStatus>('SIMULATOR_CONNECTED');
  const [selectedPoint, setSelectedPoint] = useState<ScadaTelemetryPoint | null>(null);
  const [selectedTagForSBO, setSelectedTagForSBO] = useState<string | null>(null);
  const [sboProtocol, setSboProtocol] = useState<ScadaGatewayProtocol>('IEC-60870-5-104');
  const [sboReason, setSboReason] = useState<string>('Emergency Line Breakdown / Conductor Snap');
  const [sboConfirmed, setSboConfirmed] = useState<boolean>(false);
  const [sboFeedback, setSboFeedback] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const isSimulatorActive = useMemo(() => {
    return assetService.isSimulatorMode();
  }, [points]);

  const refreshPoints = useCallback(() => {
    setPoints(scadaService.getPoints('ALL'));
    setConnectionStatus(scadaGatewayService.getConnectionStatus());
  }, []);

  useEffect(() => {
    refreshPoints();

    // Subscribe to real-time SCADA telemetry
    const unsubscribe = scadaService.subscribe(() => {
      refreshPoints();
    });

    return () => {
      unsubscribe();
    };
  }, [refreshPoints]);

  const handleExecuteSBO = useCallback(() => {
    if (!selectedTagForSBO) return;
    const pt = points.find(p => p.tag === selectedTagForSBO);
    if (!pt) return;

    const targetState = pt.breakerStatus === 'CLOSED' ? 'OPEN' : 'CLOSED';
    const success = scadaService.operateBreakerWithSBO(
      selectedTagForSBO,
      targetState,
      sboReason,
      user.fullName || user.username,
      sboProtocol
    );

    if (success) {
      setSboFeedback({
        message: `SBO execution successful. Breaker ${selectedTagForSBO} commanded to ${targetState}.`,
        type: 'success',
      });
      setTimeout(() => {
        setSelectedTagForSBO(null);
        setSboFeedback(null);
        setSboConfirmed(false);
      }, 1500);
    } else {
      setSboFeedback({
        message: `SBO command rejected. Safety interlock or permission check failed.`,
        type: 'error',
      });
    }
  }, [selectedTagForSBO, points, user, sboReason, sboProtocol]);

  const handleToggleConnection = useCallback(() => {
    if (connectionStatus === 'COMM_FAILURE') {
      scadaGatewayService.restoreConnection();
    } else {
      scadaGatewayService.simulateCommFailure();
    }
    setConnectionStatus(scadaGatewayService.getConnectionStatus());
  }, [connectionStatus]);

  const protocolStatuses = useMemo(() => {
    return scadaGatewayService.getProtocolStatus();
  }, [points]);

  return {
    user,
    isSimulatorActive,
    connectionStatus,
    points,
    selectedPoint,
    setSelectedPoint,
    selectedTagForSBO,
    setSelectedTagForSBO,
    sboProtocol,
    setSboProtocol,
    sboReason,
    setSboReason,
    sboConfirmed,
    setSboConfirmed,
    sboFeedback,
    handleExecuteSBO,
    handleToggleConnection,
    protocolStatuses,
    commons: COMMONS,
  };
}
