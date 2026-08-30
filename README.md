# Vanilla JS Tools

Vanilla JS Tools is now a `Vite + React + TypeScript` single-page app that keeps the existing SMS analyzer and finance workflows while moving the project onto a modern frontend stack.

Live demo: https://prashantgabu-e.github.io/vanilla-js-tools/

## Features

- SMS XML upload, parsing, filtering, charting, and CSV export
- Finance entry form with shortcut presets
- Bulk transaction entry with one-submit save flow
- `HashRouter` page navigation for GitHub Pages compatibility
- Responsive custom CSS UI with `Lucide React` icons

## Tech Stack

- Vite
- React
- TypeScript
- React Router with `HashRouter`
- Custom CSS
- Lucide React
- AG Grid Community

## Project Structure

- `src/App.tsx` - app shell and routes
- `src/pages/` - SMS analyzer, finance, and bulk finance pages
- `src/utils/` - XML parsing and finance submission helpers
- `src/styles.css` - application styling
- `vite.config.ts` - Vite config with `docs/` build output

## Run Locally

1. Install dependencies with `npm install`.
2. Start the dev server with `npm run dev`.

## Build

- Production build: `npm run build`
- Static output directory: `docs/`

## GitHub Pages

This project is configured for deployment from the `master` branch using the `/docs` folder.

## Notes

- Routing uses hashes so deep links work correctly on GitHub Pages.
- The finance submission flow still posts to the existing Google Apps Script endpoint.
