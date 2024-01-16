import { RefObject, useEffect, useMemo, useRef, useState } from 'react';

export default function useInView(ref: RefObject<HTMLElement>) {
  const [isOnScreen, setIsOnScreen] = useState(false);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    observerRef.current = new IntersectionObserver(([entry]) => setIsOnScreen(entry.isIntersecting));
  }, []);

  useEffect(() => {
    if (observerRef.current && ref.current) observerRef.current.observe(ref.current);

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [ref]);

  return isOnScreen;
}
