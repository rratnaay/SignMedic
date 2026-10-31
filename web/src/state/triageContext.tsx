import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { TriageState, TriageAction } from '../types';
import { initialTriageState, triageReducer } from './triageReducer';

interface TriageContextType {
  state: TriageState;
  dispatch: React.Dispatch<TriageAction>;
}

const TriageContext = createContext<TriageContextType | undefined>(undefined);

const BROADCAST_CHANNEL_NAME = 'signmedic_triage_broadcast';

export const TriageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(triageReducer, initialTriageState);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isReceivingBroadcastRef = useRef<boolean>(false);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
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
      // BroadcastChannel might not be supported in some non-standard environments
    }
  }, []);

  // Broadcast state updates to other tabs whenever state changes, unless the update was caused by a broadcast
  useEffect(() => {
    if (isReceivingBroadcastRef.current) return;
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({
        type: 'SYNC_STATE',
        payload: state,
      });
    }
  }, [state]);

  return <TriageContext.Provider value={{ state, dispatch }}>{children}</TriageContext.Provider>;
};

export function useTriage(): TriageContextType {
  const context = useContext(TriageContext);
  if (!context) {
    throw new Error('useTriage must be used within a TriageProvider');
  }
  return context;
}
