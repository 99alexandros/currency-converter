# Currency Converter

A modern, real-time currency converter with a glassmorphism UI built with vanilla HTML, CSS, and JavaScript.

![Screenshot placeholder](screenshot.png)

## Features

- **Live exchange rates** — fetches real-time rates from the ExchangeRate-API v6
- **30 world currencies** — the most commonly traded currencies, each with a country flag and full name
- **Searchable dropdowns** — type to filter currencies by code or name instantly
- **Swap button** — switch the from/to currencies in one click with a smooth animation
- **7-day trend chart** — visualizes the exchange rate over the past week using Chart.js
- **Auto-refresh** — rates update automatically every 60 seconds with a live countdown
- **Conversion history** — the last 5 conversions are saved to localStorage and persist across sessions
- **Responsive design** — works on mobile and desktop

## Technologies

| Layer | Technology |
|-------|-----------|
| Markup | HTML5 |
| Styling | CSS3 (custom properties, glassmorphism, CSS animations) |
| Logic | Vanilla JavaScript (ES2020+) |
| Charts | [Chart.js v4](https://www.chartjs.org/) |
| Rates API | [ExchangeRate-API v6](https://www.exchangerate-api.com/) |
| Flag images | [flagcdn.com](https://flagcdn.com/) |
| Font | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts |

## Project Structure

```
currency-tracker/
├── index.html   # App shell and markup
├── styles.css   # All styles (glassmorphism theme, components, responsive)
└── script.js    # App logic (fetch, conversion, chart, history, dropdowns)
```

## Getting Started

No build step required. Open `index.html` directly in a browser or serve it with any static file server:

```bash
npx serve .
```
