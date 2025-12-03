# Characterizer

The best app to train character values and generate conflicts, dilemmas, and common ground between characters.

## Features

- Create and manage characters
- Train character values using a battle-based comparison system
- View value rankings for each character
- Compare characters to find conflicts and common ground
- Track favorite value pairs
- Identify internal conflicts

## Installation

```bash
npm install
```

## Development

```bash
npm start
```

## Build

Build distributable packages:

```bash
# macOS (DMG)
npm run dist:mac

# Windows (EXE)
npm run dist:win
```

Built files are generated in the `dist/` folder:
- macOS Intel: `characterizer-{version}.dmg`
- macOS Apple Silicon: `characterizer-{version}-arm64.dmg`
- Windows: `characterizer Setup {version}.exe`

## Requirements

- Node.js 16+
- Electron 18

## License

MIT
