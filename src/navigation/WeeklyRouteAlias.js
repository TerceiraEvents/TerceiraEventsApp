import { useEffect } from 'react';
import { primaryRoutes, rootRoutes } from '../utils/navigation';

/** Open the primary Weekly destination from a root navigation entry. */
export default function WeeklyRouteAlias({ navigation }) {
  useEffect(() => { navigation.popTo(rootRoutes.main, { screen: primaryRoutes.weekly }); }, [navigation]);
  return null;
}
