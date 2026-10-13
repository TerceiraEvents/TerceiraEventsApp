import { useEffect, useRef } from 'react';
import { subscribeSpecialEvents } from '../utils/data';

/** Deliver cache-ready and background publication changes to a mounted consumer. */
export default function useSpecialFeed(onUpdate) {
  const listener = useRef(onUpdate);
  listener.current = onUpdate;
  useEffect(() => subscribeSpecialEvents((events, state) => listener.current(events, state)), []);
}
