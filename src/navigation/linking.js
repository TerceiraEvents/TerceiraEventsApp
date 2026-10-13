export function createLinking({ prefixes, parsePath, serializeState, getLinkingURL, getInitialURL }) {
  const config = {
    screens: {
      EventDetail: 'events/',
      Main: { screens: { Home: '', Weekly: 'weekly/', Events: { path: 'special/', parse: { saved: (value) => value === '1' || value === 'true' }, stringify: { saved: (value) => value ? '1' : '0' } } } },
    },
  };
  function cleanState(state) {
    return {
      ...state,
      routes: state.routes.map((route) => ({
        ...route,
        ...(route.params ? { params: Object.fromEntries(Object.entries(route.params).filter(([, value]) => value !== undefined)) } : {}),
        ...(route.name === 'EventDetail' ? { params: route.params?.id ? { id: route.params.id } : {} } : {}),
        ...(route.state ? { state: cleanState(route.state) } : {}),
      })),
    };
  }
  function getStateFromPath(path, options) {
    const pathname = path.split(/[?#]/, 1)[0].replace(/^\//, '');
    if (/^(?:pt\/)?weekly\/?$/i.test(pathname)) {
      return { routes: [{ name: 'Main', state: { routes: [{ name: 'Weekly' }] } }] };
    }
    if (/^(?:pt\/)?saved\/?$/.test(pathname)) {
      return { routes: [{ name: 'Main', state: { routes: [{ name: 'Events', params: { saved: true, range: 'all' } }] } }] };
    }
    if (/^(?:pt\/)?events\/?$/.test(pathname)) {
      const parsed = parsePath(path.replace(/^\/?pt\//, ''), options);
      const id = parsed?.routes?.find((route) => route.name === 'EventDetail')?.params?.id;
      return { routes: [{ name: 'Main' }, { name: 'EventDetail', params: typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) ? { id } : {} }] };
    }
    return parsePath(path.replace(/^\/?pt\//, ''), options);
  }
  return {
    prefixes,
    config,
    getInitialURL: async () => getLinkingURL?.() ?? await getInitialURL?.(),
    getStateFromPath,
    getPathFromState: (state, options) => serializeState(cleanState(state), options),
  };
}
