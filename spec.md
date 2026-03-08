# GPRS ALL

## Current State
New project with no existing frontend or backend code.

## Requested Changes (Diff)

### Add
- Full GPRS ALL Map Viewer application converted from the provided HTML into a React + TypeScript app
- Left sidebar (white background, dark text, 300px wide) with:
  - Title: "GPRS ALL - MAP VIEWER" + subtitle "Google Maps & Bhuvan Integration"
  - GPS Coordinates text input with Copy button
  - 2x4 button grid: What's Here, Distance, My Location, New Reference, Copy All, WhatsApp, Google Map, Bhuvan Map
  - Reference Name/No. readonly input (auto-generated)
  - Location Details editable input
- Map section (flex-fill) with:
  - Google Maps embed iframe
  - 4 draggable overlay info cards: Reference, Location Details, Site Location, Distance From Cities
  - Zoom +/- controls (bottom-right)
- "What's Here" modal with coordinates, location details, Google Maps link, and copy button
- Bhuvan Map modal with coordinates display, instructions, copy + open buttons
- Toast notification system (success/error/info)
- All JavaScript logic:
  - GPS geolocation + IP fallback
  - Reverse geocoding via Nominatim (English-only output)
  - Distance calculation to Hyderabad and Nalgonda using Haversine formula
  - Auto-generated reference numbers (date/time/serial format)
  - Drag-and-drop for overlay cards with localStorage position persistence
  - DMS coordinate format conversion
  - Copy to clipboard (coordinates, all details, WhatsApp share)
  - Bhuvan map integration (auto-copy + open in new tab)
  - Zoom in/out (max zoom 16, min 1)

### Modify
- None (new project)

### Remove
- None (new project)

## Implementation Plan
1. Convert the entire HTML/CSS/JS into a single React component (App.tsx) preserving all CSS classes, IDs, logic, and behavior exactly
2. Use useRef and useEffect to replicate DOMContentLoaded initialization
3. Preserve all inline styles, class names, and element IDs as-is for full parity
4. The backend is minimal (no persistent data needed) -- generate a trivial Motoko actor
5. All external API calls (Nominatim, ipapi.co) remain as fetch calls in the frontend
