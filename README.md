# Configurable Web Scraper

Desktop application for scraping product specifications from e-commerce websites with anti-detection browser automation.

## Features

- Concurrent scraping with configurable workers
- CSS selector-based field extraction
- Resumable scraping with checkpoints
- Real-time progress dashboard
- Export to CSV and JSON
- Anti-bot detection using patchright
- Profile-based configuration

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run package
```

## Configuration

Edit `configs/scraper-config.json` to add site profiles:

```json
{
  "profiles": {
    "your-site": {
      "categoryUrl": "https://example.com/category",
      "productLinkSelector": ".product a",
      "fieldSelectors": {
        "Field Name": ".css-selector"
      }
    }
  }
}
```

## Usage

1. Start the application
2. Select a profile from the dropdown
3. Click "Start" to begin scraping
4. Monitor progress in real-time
5. Find results in `output/data.csv` and `output/data.json`

## Project Structure

```
src/
  main/           # Electron main process (Node.js)
  renderer/       # React UI
  shared/         # Shared types
configs/          # Scraper profiles
output/           # Generated data
```

## License

MIT
