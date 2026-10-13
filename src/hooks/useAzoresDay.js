import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { todayAzores } from '../utils/data';

/** Keep the Azores calendar day current while a screen is focused. */
export default function useAzoresDay() {
  const [day, setDay] = useState(todayAzores);
  useFocusEffect(useCallback(() => {
    const sync = () => setDay(todayAzores());
    sync();
    const timer = setInterval(sync, 60000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, []));
  return day;
}
