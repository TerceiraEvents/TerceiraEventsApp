export function createLinking({ prefixes, parsePath, serializeState }) {
  const config = {
    screens: {
      EventDetail: 'events/',
      Main: { screens: { Home: '', Events: 'special/', Saved: 'saved/' } },
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
    const url = new URL(path.replace(/^\//, ''), 'https://eventosterceira.pt/');
    if (/^\/(?:pt\/)?events\/?$/.test(url.pathname)) {
      const id = url.searchParams.get('id');
      return { routes: [{ name: 'Main' }, { name: 'EventDetail', params: id && /^[a-zA-Z0-9_-]+$/.test(id) ? { id } : {} }] };
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
