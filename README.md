# Angra Events App

A mobile app (Android / iOS) for discovering events in Angra do Heroísmo, Terceira Island, Azores.

Built with [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/), this app pulls event data directly from the [Angra Events website](https://angraevents.github.io) repository.

## Features

- **Weekly Events** — Recurring entertainment organized by day of the week
- **Special Events** — This week's events, full upcoming calendar, and archive
- **Venues** — Directory of 12 venues with addresses, maps, hours, and contact info
- **Resources** — External event sources, Instagram accounts, and Facebook pages to follow
- **Pull to refresh** — Fetches the latest event data from GitHub

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npx expo start

# Run on specific platforms
npm run android
npm run ios
npm run web
```

## Data Source

Event data is fetched from the YAML files in the [Angra Events website repo](https://github.com/AngraEvents/Angraevents.github.io):

- `_data/special_events.yml` — Special events (concerts, festivals, etc.)
- `_data/weekly.yml` — Recurring weekly events

Updates to the website data are automatically reflected in the app.

## Tech Stack

- React Native + Expo (SDK 54)
- React Navigation (bottom tabs)
- js-yaml for parsing YAML data from GitHub

## License

MIT
