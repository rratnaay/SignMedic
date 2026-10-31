import React, { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import { TriageState, TriageAction } from '../types';
import { initialTriageState, triageReducer } from './triageReducer';

export type AppRole = 'standalone' | 'nurse' | 'patient';

export interface TriageContextType {
  state: TriageState;
  dispatch: React.Dispatch<TriageAction>;
  role: AppRole;
  roomCode: string | null;
  peerConnected: boolean;
  setRole: (role: AppRole) => void;
  createRoom: () => string;
  joinRoom: (code: string) => void;
  leaveRoom: () => void;
}

const TriageContext = createContext<TriageContextType | undefined>(undefined);

const getInitialRoomParams = (): { initialRoom: string | null; initialRole: AppRole } => {
  if (typeof window === 'undefined') {
    return { initialRoom: null, initialRole: 'standalone' };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    const roleParam = params.get('role');
    if (roleParam === 'patient' || roleParam === 'nurse') {
      return { initialRoom: room, initialRole: roleParam };
    }
    if (room) {
      return { initialRoom: room, initialRole: 'patient' };
    }
    return { initialRoom: null, initialRole: 'standalone' };
  } catch {
    return { initialRoom: null, initialRole: 'standalone' };
  }
};

export const TriageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(triageReducer, initialTriageState);
  
  const initialParams = getInitialRoomParams();
  const [role, setRole] = useState<AppRole>(initialParams.initialRole);
  const [roomCode, setRoomCode] = useState<string | null>(initialParams.initialRoom);
  const [peerConnected, setPeerConnected] = useState<boolean>(false);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isReceivingBroadcastRef = useRef<boolean>(false);

  // 1. Manage BroadcastChannel (for local tab sync)
  useEffect(() => {
    const channelName = roomCode ? `signmedic_room_${roomCode}` : 'signmedic_triage_broadcast';
    try {
      const channel = new BroadcastChannel(channelName);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'SYNC_STATE' && event.data.payload) {
          isReceivingBroadcastRef.current = true;
          dispatch({ type: 'SYNC_STATE', payload: event.data.payload });
          setTimeout(() => {
            isReceivingBroadcastRef.current = false;
          }, 50);
        }
      };

      return () => {
        channel.close();
      };
    } catch {
      // BroadcastChannel might not be supported in some environments
    }
  }, [roomCode]);

  // 2. Manage WebSocket Relay (for cross-device real-time sync)
  useEffect(() => {
    if (!roomCode || typeof window === 'undefined' || !('WebSocket' in window)) {
      return;
    }

    let isClosed = false;
    let ws: WebSocket | null = null;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws-sync`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isClosed) return;
        ws?.send(JSON.stringify({ type: 'JOIN_ROOM', roomId: roomCode, role }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'PEER_CONNECTED') {
            setPeerConnected(true);
          } else if (msg.type === 'PEER_DISCONNECTED') {
            setPeerConnected(false);
          } else if (msg.type === 'SYNC_STATE' && msg.payload) {
            isReceivingBroadcastRef.current = true;
            dispatch({ type: 'SYNC_STATE', payload: msg.payload });
            setTimeout(() => {
              isReceivingBroadcastRef.current = false;
            }, 50);
          }
        } catch {
          // ignore malformed message
        }
      };

      ws.onclose = () => {
        if (!isClosed) {
          setPeerConnected(false);
        }
      };
    } catch {
      // WebSocket connection failed or not supported in this host
    }

    return () => {
      isClosed = true;
      if (ws) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [roomCode, role]);

  // 3. Broadcast state updates whenever state changes, unless the update was caused by incoming sync
  useEffect(() => {
    if (isReceivingBroadcastRef.current) return;
    
    // Local BroadcastChannel sync
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'SYNC_STATE',
        payload: state,
      });
    }

    // Cross-device WebSocket sync
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && roomCode) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SYNC_STATE',
          roomId: roomCode,
          payload: state,
        })
      );
    }
  }, [state, roomCode]);

  const createRoom = useCallback(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setRoomCode(code);
    setRole('nurse');
    return code;
  }, []);

  const joinRoom = useCallback((code: string) => {
    const cleanCode = code.replace(/\D/g, '').slice(0, 6);
    setRoomCode(cleanCode);
    setRole('patient');
  }, []);

  const leaveRoom = useCallback(() => {
    setRoomCode(null);
    setRole('standalone');
    setPeerConnected(false);
  }, []);

  return (
    <TriageContext.Provider
      value={{
        state,
        dispatch,
        role,
        roomCode,
        peerConnected,
        setRole,
        createRoom,
        joinRoom,
        leaveRoom,
      }}
    >
      {children}
    </TriageContext.Provider>
  );
};

export function useTriage(): TriageContextType {
  const context = useContext(TriageContext);
  if (!context) {
    throw new Error('useTriage must be used within a TriageProvider');
  }
  return context;
}
