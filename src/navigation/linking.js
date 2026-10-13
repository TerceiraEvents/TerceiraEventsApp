export function createLinking({ prefixes, parsePath, serializeState }) {
  const config = {
    screens: {
      EventDetail: 'events/',
      Main: { screens: { Home: '', Events: 'special/' } },
    },
  };
  function cleanState(state) {
    return {
      ...state,
      routes: state.routes.map((route) => ({
        ...route,
        ...(route.name === 'EventDetail' ? { params: route.params?.id ? { id: route.params.id } : {} } : {}),
        ...(route.state ? { state: cleanState(route.state) } : {}),
      })),
    };
  }
  function getStateFromPath(path, options) {
    const pathname = path.split(/[?#]/, 1)[0].replace(/^\//, '');
    if (/^(?:pt\/)?saved\/?$/.test(pathname)) {
      return { routes: [{ name: 'Main', state: { routes: [{ name: 'Events', params: { saved: true, range: 'all' } }] } }] };
    }
    if (/^(?:pt\/)?events\/?$/.test(pathname)) {
      const parsed = parsePath(path.replace(/^\/?pt\//, ''), options);
      const id = parsed?.routes?.find((route) => route.name === 'EventDetail')?.params?.id;
      return { routes: [{ name: 'Main' }, { name: 'EventDetail', params: typeof id === 'string' && /^[a-zA-Z0-9_-]+$/.test(id) ? { id } : {} }] };
    }
    return parsePath(path, options);
  }
  return {
    prefixes,
    config,
    getStateFromPath,
    getPathFromState: (state, options) => serializeState(cleanState(state), options),
  };
}
