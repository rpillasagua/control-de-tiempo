'use client';
import { useEffect, useRef, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ticket } from '@/lib/types';
import { toast } from 'sonner';

/**
 * Hook that listens to Firestore in real-time for tickets newly assigned to this technician.
 * Fires a toast + native Notification when a new assignment arrives.
 */
export function useTechnicianTicketMonitor(technicianEmail: string | null) {
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  const playPing = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.6);
    } catch { /* AudioContext not available */ }
  }, []);

  useEffect(() => {
    if (!technicianEmail) return;

    // Request notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const q = query(
      collection(db, 'tickets'),
      where('assignedTo', '==', technicianEmail),
      where('status', '==', 'ASIGNADO')
    );

    const unsub = onSnapshot(q, (snap) => {
      if (!initialized.current) {
        snap.docs.forEach((d) => knownIds.current.add(d.id));
        initialized.current = true;
        return;
      }

      snap.docs.forEach((d) => {
        if (!knownIds.current.has(d.id)) {
          knownIds.current.add(d.id);
          const ticket = d.data() as Ticket;

          // Priority label for message
          const priorityLabels: Record<string, string> = {
            ALTA: '🔴 URGENTE',
            NORMAL: '🔵 Normal',
            BAJA: '⚫ Baja',
          };
          const priorityText = ticket.priority ? priorityLabels[ticket.priority] : '';

          // In-app toast
          toast.success(
            `📋 Nueva tarea asignada${priorityText ? ` [${priorityText}]` : ''}: ${ticket.clientName}`,
            { duration: 8000 }
          );

          // Play ping
          playPing();

          // Native browser notification
          if (
            typeof window !== 'undefined' &&
            'Notification' in window &&
            Notification.permission === 'granted'
          ) {
            new Notification('📋 Nueva Tarea Asignada', {
              body: `${priorityText ? `[${priorityText}] ` : ''}Cliente: ${ticket.clientName}\n📍 ${ticket.clientAddress}`,
              icon: '/icon-192.png',
              tag: ticket.id, // Prevents duplicate notifications
            });
          }
        }
      });
    });

    return () => {
      unsub();
      initialized.current = false;
      knownIds.current.clear();
    };
  }, [technicianEmail, playPing]);
}
