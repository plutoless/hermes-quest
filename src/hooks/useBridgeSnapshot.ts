import { useEffect, useState } from 'react';
import { mockHermesBridge } from '../bridge/mockHermesBridge';
import type { BridgeEvent, BridgeSnapshot } from '../types';

export function useBridgeSnapshot() {
  const [snapshot, setSnapshot] = useState<BridgeSnapshot>(() => mockHermesBridge.getSnapshot());
  const [lastEvent, setLastEvent] = useState<BridgeEvent | null>(null);

  useEffect(() => {
    return mockHermesBridge.subscribe((nextSnapshot, event) => {
      setSnapshot(nextSnapshot);
      setLastEvent(event);
    });
  }, []);

  return { snapshot, lastEvent, bridge: mockHermesBridge };
}
