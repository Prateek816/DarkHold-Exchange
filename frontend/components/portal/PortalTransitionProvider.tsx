'use client';

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { soundFx } from '@/lib/sound';

export type PortalDirection =
  | 'SIGNING IN'
  | 'SIGNING OUT'
  | 'ENTERING WORKPLACE'
  | 'EXITING TO PORTAL';

export interface PortalTransitionContextType {
  isTransitioning: boolean;
  direction: PortalDirection;
  step: number; // 1, 2, 3
  progress: number; // 0 to 100
  message: string;
  portalNavigate: (
    url: string,
    direction?: PortalDirection | 'ENTERING' | 'EXITING' | 'SIGN_IN' | 'SIGN_OUT'
  ) => Promise<void>;
  signInTransition: (targetUrl?: string) => Promise<void>;
  signOutTransition: (targetUrl?: string) => Promise<void>;
}

const PortalTransitionContext = createContext<PortalTransitionContextType | null>(null);

export function usePortalTransition(): PortalTransitionContextType {
  const context = useContext(PortalTransitionContext);
  if (!context) {
    return {
      isTransitioning: false,
      direction: 'SIGNING IN',
      step: 1,
      progress: 0,
      message: '',
      portalNavigate: async () => {},
      signInTransition: async () => {},
      signOutTransition: async () => {},
    };
  }
  return context;
}

export function PortalTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [direction, setDirection] = useState<PortalDirection>('SIGNING IN');
  const [step, setStep] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');

  const isTransitioningRef = useRef<boolean>(false);
  const timerStep2Ref = useRef<NodeJS.Timeout | null>(null);
  const timerStep3Ref = useRef<NodeJS.Timeout | null>(null);
  const timerCompleteRef = useRef<NodeJS.Timeout | null>(null);
  const timerEndRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timerStep2Ref.current) clearTimeout(timerStep2Ref.current);
    if (timerStep3Ref.current) clearTimeout(timerStep3Ref.current);
    if (timerCompleteRef.current) clearTimeout(timerCompleteRef.current);
    if (timerEndRef.current) clearTimeout(timerEndRef.current);
  }, []);

  const portalNavigate = useCallback(
    async (
      targetUrl: string,
      explicitDirection?: PortalDirection | 'ENTERING' | 'EXITING' | 'SIGN_IN' | 'SIGN_OUT'
    ): Promise<void> => {
      // User requirement: Only while signing in and signing out show that loading screen.
      // Apart from that, do NOT show anytime.
      const isAuthTransition =
        explicitDirection === 'SIGNING IN' ||
        explicitDirection === 'SIGNING OUT' ||
        explicitDirection === 'SIGN_IN' ||
        explicitDirection === 'SIGN_OUT' ||
        explicitDirection === 'ENTERING' ||
        explicitDirection === 'EXITING' ||
        explicitDirection === 'ENTERING WORKPLACE' ||
        explicitDirection === 'EXITING TO PORTAL';

      // If this is a regular non-auth navigation, route immediately without any loading screen
      if (!isAuthTransition) {
        router.push(targetUrl);
        return;
      }

      // Rapid successive clicks guard / race condition prevention
      if (isTransitioningRef.current) {
        return;
      }

      // Normalize direction for display
      let dir: PortalDirection = 'SIGNING IN';
      if (
        explicitDirection === 'SIGNING OUT' ||
        explicitDirection === 'SIGN_OUT' ||
        explicitDirection === 'EXITING' ||
        explicitDirection === 'EXITING TO PORTAL'
      ) {
        dir = 'SIGNING OUT';
      } else {
        dir = 'SIGNING IN';
      }

      clearTimers();
      isTransitioningRef.current = true;
      setDirection(dir);
      setIsTransitioning(true);
      setStep(1);
      setProgress(25);

      const isEntering = dir === 'SIGNING IN';
      setMessage(
        isEntering
          ? 'AUTHENTICATING ENCRYPTED CREDENTIALS...'
          : 'COMMITTING SIMULATED LEDGER STATE...'
      );

      // Play procedural audio chime
      soundFx.playPortalTransition(isEntering ? 'ENTERING' : 'EXITING');

      // Dispatch route navigation so page components load underneath
      router.push(targetUrl);

      return new Promise<void>((resolve) => {
        // Step 2 at 280ms: Tunnel handshake / session revocation
        timerStep2Ref.current = setTimeout(() => {
          setStep(2);
          setProgress(65);
          setMessage(
            isEntering
              ? 'CONNECTING TO HIGH-FREQUENCY WEBSOCKET TUNNEL...'
              : 'REVOKING HIGH-FREQUENCY WEBSOCKET SESSION...'
          );
          soundFx.playStepTick(2);
        }, 280);

        // Step 3 at 580ms: Desk initialization / session termination
        timerStep3Ref.current = setTimeout(() => {
          setStep(3);
          setProgress(92);
          setMessage(
            isEntering
              ? 'INITIALIZING WORKPLACE DESK...'
              : 'TERMINATING WORKPLACE SESSION...'
          );
          soundFx.playStepTick(3);
        }, 580);

        // Progress reaches 100% at 750ms
        timerCompleteRef.current = setTimeout(() => {
          setProgress(100);
        }, 750);

        // Complete dissolve & cleanup at 880ms
        timerEndRef.current = setTimeout(() => {
          setIsTransitioning(false);
          isTransitioningRef.current = false;
          resolve();
        }, 880);
      });
    },
    [router, clearTimers]
  );

  const signInTransition = useCallback(
    async (targetUrl: string = '/market'): Promise<void> => {
      return portalNavigate(targetUrl, 'SIGNING IN');
    },
    [portalNavigate]
  );

  const signOutTransition = useCallback(
    async (targetUrl: string = '/login'): Promise<void> => {
      return portalNavigate(targetUrl, 'SIGNING OUT');
    },
    [portalNavigate]
  );

  return (
    <PortalTransitionContext.Provider
      value={{
        isTransitioning,
        direction,
        step,
        progress,
        message,
        portalNavigate,
        signInTransition,
        signOutTransition,
      }}
    >
      {children}
    </PortalTransitionContext.Provider>
  );
}
