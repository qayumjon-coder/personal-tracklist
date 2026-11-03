# Fronto Music Player - Future Ideas Archive

This file contains concepts and features planned for future integration into the Fronto Music Player ecosystem to enhance the Cyberpunk/Hacker aesthetic and improve UX.

## 1. Advanced Audio FX & DJ Panel
- **Pitch / Speed Control:** Real-time playback speed and pitch manipulation (e.g., Nightcore, Slowed + Reverb).
- **DSP Effects:** Integrate Web Audio API nodes for effects like Reverb (concert hall/room), Bitcrusher (8-bit retro sound), and Flanger.

## 2. Local Folder Import (Drag & Drop)
- Allow users to drag and drop an entire local directory onto the UI.
- Recursively scan for `.mp3`, `.wav`, and `.flac` files to build a local library seamlessly without selecting files one by one.

## 3. Data Chip System (Playlist Export/Import)
- Save custom playlists (URLs, local references) as `.fronto` or `.json` physical files.
- Dragging a "Data Chip" file back into the app instantly restores the playlist, mimicking cyberpunk physical data storage mechanisms.

## 4. A.I. Voice Assistant (Neural Comm)
- Utilize the Web Speech API to add voice recognition.
- Commands: *"Play next"*, *"Set volume to 50"*, *"Activate Zen mode"*, *"Search Goth"*.
- Triggered by a hotkey or clicking a microphone icon, complete with sci-fi audio feedback (beeps/chimes).

## 5. Picture-in-Picture (PiP) Mini Player
- Use the Document Picture-in-Picture API to detach the player from the main browser tab.
- Creates a small, borderless, floating Cyberpunk widget that persists over other applications while the user works or browses other tabs.

## 6. Cyber Command Palette (Ctrl+K Global Search)
- Port the Admin Panel's `Ctrl+K` cyberpunk command palette to the main Player page.
- Direct instant playback, queue additions, lyrics peek, and keyboard navigation.
- See detailed architecture in `docs/PLAYER_COMMAND_PALETTE_ROADMAP.md`.

## 7. Custom Cyberpunk Category Dropdown for Player
- Replace the legacy basic category dropdown in `PlayerRightPanel.tsx` with the Admin panel's searchable, badge-counted, quick-filtered cyberpunk dropdown.
- Include instant genre search, song count badges, and click-outside dismissal.
- Documented in `docs/PLAYER_COMMAND_PALETTE_ROADMAP.md`.

## 8. Brand Identity & Rebranding Concept: "Pulsar"
- **Working Title / Brand:** `Pulsar // Cyberpunk Audio Station` (or `Pulsar — Cyberpunk Music Player`)
- **Scientific & Physical Foundation:** 
  - Discovered in 1967 by Jocelyn Bell Burnell.
  - A rapidly rotating, highly magnetized neutron star that emits mathematically precise electromagnetic beams into deep space.
  - Revered in astrophysics as the cosmos's natural metronome (pulsing rhythmically with atomic-clock precision).
- **Music & Cultural Legacy:**
  - The radio waveform visualization of the very first discovered pulsar (`PSR B1919+21`) is the iconic cover art of Joy Division's legendary post-punk album *"Unknown Pleasures"* (1979), permanently fusing the concept of pulsars with music history and sound visualization.
- **Cyberpunk Fit:**
  - Dense energy core, neon electromagnetic wave pulses, deep space / dark synthwave atmosphere.
  - Ends in `-r` (clean phonetics across Uzbek, Russian, and English).
- **SEO & Search Differentiation Strategy:**
  - Avoid generic collision with the legacy Android app *"Pulsar Music Player"* by branding strictly as a Cyberpunk web experience: `Pulsar Cyberpunk Player` or `Pulsar Audio Station`.
- **Planned Execution Scope:**
  - Global title and metadata in `FrontEnd/index.html` and `FrontEnd/src/components/SEO.tsx`.
  - PWA manifest (`manifest.webmanifest`) and `vite.config.ts`.
  - ASCII logo art in `Terminal.tsx` and boot screen branding in `LoadingScreen.tsx`.
  - Search engine directives (`robots.txt`, `sitemap.xml`).


