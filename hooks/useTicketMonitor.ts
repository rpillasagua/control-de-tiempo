'use client';
import { useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/lib/types';

/**
 * Hook that listens to Firestore in real-time for new PENDIENTE tickets
 * for a given company and fires a callback when one arrives.
 */
export function useTicketMonitor(
  companyId: string | null,
  onNewTicket: (ticket: Ticket) => void
) {
  // Track the IDs we've already seen so we only fire for truly NEW tickets
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const stableCallback = useCallback(onNewTicket, []);

  useEffect(() => {
    if (!companyId) return;

    const q = query(
      collection(db, 'tickets'),
      where('companyId', '==', companyId),
      where('status', '==', 'PENDIENTE')
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!initialized.current) {
        // First load: seed known IDs without firing alerts
        snap.docs.forEach((d) => knownIds.current.add(d.id));
        initialized.current = true;
        return;
      }

      snap.docs.forEach((d) => {
        if (!knownIds.current.has(d.id)) {
          knownIds.current.add(d.id);
          stableCallback(d.data() as Ticket);
        }
      });
    });

    return () => {
      unsub();
      initialized.current = false;
      knownIds.current.clear();
    };
  }, [companyId, stableCallback]);
}
