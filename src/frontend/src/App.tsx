import { useEffect } from "react";

// ===== MODULE-LEVEL MUTABLE STATE (matching original JS) =====
let currentLat = 17.068839;
let currentLon = 79.258973;
let zoom = 15;
let serialNumber = 1;
let lastRefGenerationTime = Date.now();

const HYDERABAD_COORDS = { lat: 17.385044, lon: 78.486671 };
const NALGONDA_COORDS = { lat: 17.0562, lon: 79.267899 };

// ===== ALL ORIGINAL JS FUNCTIONS =====

function decimalToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
  let direction = "";
  if (isLatitude) {
    direction = decimal >= 0 ? "N" : "S";
  } else {
    direction = decimal >= 0 ? "E" : "W";
  }
  return `${degrees}°${minutes.toString().padStart(2, "0")}'${seconds}"${direction}`;
}

function getCoordinatesInBothFormats(lat: number, lon: number): string {
  const decimalFormatted = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  const dmsFormatted = `(${decimalToDMS(lat, true)} ${decimalToDMS(lon, false)})`;
  return `${decimalFormatted}\n${dmsFormatted}`;
}

function getGoogleMapsLink(lat: number, lon: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function getGoogleMapsEmbedUrl(
  lat: number,
  lon: number,
  zoomLevel: number,
): string {
  return `https://www.google.com/maps?q=${lat},${lon}&hl=en&z=${zoomLevel}&output=embed`;
}

function formatIndianPin(pin: string | undefined | null): string {
  const p = String(pin || "").replace(/\s+/g, "");
  return /^\d{6}$/.test(p) ? `${p.slice(0, 3)} ${p.slice(3)}` : "";
}

function pickFirst(obj: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    if (obj?.[k]) return obj[k];
  }
  return "";
}

function safeUpper(text: string): string {
  return (text || "").toString().trim().toUpperCase();
}

function translateToEnglish(text: string): string {
  if (!text) return text;
  let translated = text;
  // Remove non-ASCII characters (e.g. Hindi/Devanagari script)
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentionally removing non-ASCII chars
  translated = translated.replace(/[^\u0020-\u007E]/g, " ");
  translated = translated.replace(/\s+/g, " ").trim();
  return translated;
}

function formatFullIndiaAddress(address: Record<string, string>): string {
  if (!address) return "Location details not available.";
  const village = pickFirst(address, [
    "village",
    "hamlet",
    "locality",
    "suburb",
    "neighbourhood",
    "town",
    "city",
  ]);
  const mandal = pickFirst(address, [
    "subdistrict",
    "county",
    "municipality",
    "city_district",
  ]);
  const district = pickFirst(address, [
    "district",
    "state_district",
    "county",
    "region",
  ]);
  const state = pickFirst(address, ["state"]);
  const pin = formatIndianPin(address.postcode);
  const villageEng = translateToEnglish(village || "");
  const mandalEng = translateToEnglish(mandal || "");
  const districtEng = translateToEnglish(district || "");
  const stateEng = translateToEnglish(state || "");
  const parts: string[] = [];
  if (villageEng?.trim()) {
    parts.push(`${safeUpper(villageEng)} VILLAGE`);
  }
  if (mandalEng?.trim()) {
    const cleanMandal = mandalEng.toUpperCase().replace(/\s+MANDAL$/, "");
    parts.push(`${cleanMandal} MANDAL`);
  }
  if (districtEng?.trim()) {
    const cleanDistrict = districtEng.toUpperCase().replace(/\s+DISTRICT$/, "");
    parts.push(`${cleanDistrict} DISTRICT`);
  }
  if (stateEng?.trim()) {
    const cleanState = stateEng.toUpperCase().replace(/\s+STATE$/, "");
    parts.push(`${cleanState} STATE`);
  }
  if (parts.length === 0 && address.display_name) {
    const displayName = translateToEnglish(address.display_name);
    if (displayName?.trim()) {
      parts.push(safeUpper(displayName));
    }
  }
  let out =
    parts.length > 0 ? parts.join(", ") : "Location details not available.";
  if (pin) {
    out += `, PIN: ${pin} (INDIA).`;
  } else if (parts.length > 0) {
    out += " (INDIA).";
  }
  out = out
    .replace(/[^\u0020-\u007E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return out || "Location details not available.";
}

// draggable state
let activeDragElement: HTMLElement | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function makeDraggable(element: HTMLElement) {
  element.addEventListener("mousedown", startDrag);
  element.addEventListener("touchstart", startDragTouch, { passive: false });

  function startDrag(e: MouseEvent) {
    e.preventDefault();
    activeDragElement = element;
    const rect = element.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    element.classList.add("dragging");
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", stopDrag);
  }

  function startDragTouch(e: TouchEvent) {
    if (e.touches.length === 1) {
      e.preventDefault();
      activeDragElement = element;
      const rect = element.getBoundingClientRect();
      const touch = e.touches[0];
      dragOffsetX = touch.clientX - rect.left;
      dragOffsetY = touch.clientY - rect.top;
      element.classList.add("dragging");
      document.addEventListener("touchmove", onDragTouch, { passive: false });
      document.addEventListener("touchend", stopDragTouch);
    }
  }

  function onDrag(e: MouseEvent) {
    if (activeDragElement === element) {
      e.preventDefault();
      const mapWrapper = document.getElementById("mapWrapper");
      if (!mapWrapper) return;
      const mapRect = mapWrapper.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      let newX = e.clientX - mapRect.left - dragOffsetX;
      let newY = e.clientY - mapRect.top - dragOffsetY;
      newX = Math.max(
        10,
        Math.min(newX, mapRect.width - elementRect.width - 10),
      );
      newY = Math.max(
        10,
        Math.min(newY, mapRect.height - elementRect.height - 10),
      );
      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    }
  }

  function onDragTouch(e: TouchEvent) {
    if (activeDragElement === element && e.touches.length === 1) {
      e.preventDefault();
      const mapWrapper = document.getElementById("mapWrapper");
      if (!mapWrapper) return;
      const mapRect = mapWrapper.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const touch = e.touches[0];
      let newX = touch.clientX - mapRect.left - dragOffsetX;
      let newY = touch.clientY - mapRect.top - dragOffsetY;
      newX = Math.max(
        10,
        Math.min(newX, mapRect.width - elementRect.width - 10),
      );
      newY = Math.max(
        10,
        Math.min(newY, mapRect.height - elementRect.height - 10),
      );
      element.style.left = `${newX}px`;
      element.style.top = `${newY}px`;
      element.style.right = "auto";
      element.style.bottom = "auto";
    }
  }

  function stopDrag() {
    if (activeDragElement === element) {
      element.classList.remove("dragging");
      activeDragElement = null;
      document.removeEventListener("mousemove", onDrag);
      document.removeEventListener("mouseup", stopDrag);
      saveElementPosition(element.id, element.style.left, element.style.top);
    }
  }

  function stopDragTouch() {
    if (activeDragElement === element) {
      element.classList.remove("dragging");
      activeDragElement = null;
      document.removeEventListener("touchmove", onDragTouch);
      document.removeEventListener("touchend", stopDragTouch);
      saveElementPosition(element.id, element.style.left, element.style.top);
    }
  }
}

function saveElementPosition(elementId: string, left: string, top: string) {
  const positions = JSON.parse(
    localStorage.getItem("mapElementPositions") || "{}",
  );
  positions[elementId] = { left, top };
  localStorage.setItem("mapElementPositions", JSON.stringify(positions));
}

function loadElementPositions() {
  const positions = JSON.parse(
    localStorage.getItem("mapElementPositions") || "{}",
  );
  for (const elementId of Object.keys(positions)) {
    const element = document.getElementById(elementId);
    if (element && positions[elementId]) {
      element.style.left = positions[elementId].left;
      element.style.top = positions[elementId].top;
    }
  }
}

function showNotification(message: string, type = "success") {
  const notification = document.getElementById("notification");
  if (!notification) return;
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => notification.classList.remove("show"), 2000);
}

function updateSiteLocationDisplay() {
  const siteLocationValue = document.getElementById("siteLocationValue");
  if (!siteLocationValue) return;
  const coords = `${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`;
  siteLocationValue.textContent = coords;
  const bhuvanCoordsValue = document.getElementById("bhuvanCoordsValue");
  if (bhuvanCoordsValue) bhuvanCoordsValue.textContent = coords;
}

function updateGoogleMap(lat: number, lon: number, zoomLevel: number = zoom) {
  currentLat = lat;
  currentLon = lon;
  zoom = zoomLevel;
  const iframe = document.getElementById("mapFrame") as HTMLIFrameElement;
  if (!iframe) return true;
  iframe.style.opacity = "0.5";
  const embedUrl = getGoogleMapsEmbedUrl(lat, lon, zoomLevel);
  iframe.src = embedUrl;
  setTimeout(() => {
    iframe.style.opacity = "1";
  }, 250);
  const coordsInput = document.getElementById(
    "coordsInput",
  ) as HTMLInputElement;
  if (coordsInput) coordsInput.value = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  updateSiteLocationDisplay();
  fetchLocationFromCoords();
  calculateDistances();
  const googleBtn = document.getElementById("googleBtn");
  const bhuvanBtn = document.querySelector(".btn.bhuvan-rainbow");
  if (googleBtn) googleBtn.classList.add("active");
  if (bhuvanBtn) bhuvanBtn.classList.remove("active");
  return true;
}

async function getLocation() {
  const btn = document.getElementById("getLocationBtn") as HTMLButtonElement;
  if (!btn) return;
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "⏳";
  if (!navigator.geolocation) {
    showNotification("Geolocation not supported", "error");
    btn.disabled = false;
    btn.textContent = originalText;
    return;
  }
  try {
    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      },
    );
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    updateGoogleMap(lat, lon);
    generateNewReference();
    showNotification(
      `Location found: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
      "success",
    );
  } catch (error) {
    console.error("Location error:", error);
    showNotification("Location error. Trying IP...", "error");
    try {
      await getLocationByIP();
    } catch {
      showNotification("Using default location", "info");
    }
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function getLocationByIP() {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("https://ipapi.co/json/", {
      signal: controller.signal,
    });
    if (!response.ok) throw new Error("IP location failed");
    const data = await response.json();
    if (data.latitude && data.longitude) {
      const lat = Number.parseFloat(data.latitude);
      const lon = Number.parseFloat(data.longitude);
      updateGoogleMap(lat, lon);
      showNotification("Approximate location from IP", "info");
      return true;
    }
    throw new Error("No IP coords");
  } finally {
    clearTimeout(t);
  }
}

function showGoogleMap() {
  const input = (
    document.getElementById("coordsInput") as HTMLInputElement
  ).value.trim();
  const parts = input.split(",");
  let lat = currentLat;
  let lon = currentLon;
  if (parts.length >= 2) {
    const parsedLat = Number.parseFloat(parts[0].trim());
    const parsedLon = Number.parseFloat(parts[1].trim());
    if (!Number.isNaN(parsedLat) && !Number.isNaN(parsedLon)) {
      lat = parsedLat;
      lon = parsedLon;
    }
  }
  updateGoogleMap(lat, lon);
}

function openBhuvanMap() {
  const input = (
    document.getElementById("coordsInput") as HTMLInputElement
  ).value.trim();
  const parts = input.split(",");
  if (parts.length >= 2) {
    const lat = Number.parseFloat(parts[0]);
    const lon = Number.parseFloat(parts[1]);
    if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
      currentLat = lat;
      currentLon = lon;
    }
  }
  updateSiteLocationDisplay();
  const googleBtn = document.getElementById("googleBtn");
  const bhuvanBtn = document.querySelector(".btn.bhuvan-rainbow");
  if (bhuvanBtn) bhuvanBtn.classList.add("active");
  if (googleBtn) googleBtn.classList.remove("active");
  const coords = `${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`;
  navigator.clipboard
    .writeText(coords)
    .then(() => {
      showNotification("Coordinates copied for Bhuvan Map!", "success");
      setTimeout(() => {
        const modal = document.getElementById("bhuvanInfoModal");
        if (modal) modal.classList.add("show");
      }, 500);
    })
    .catch((err) => {
      console.error("Failed to copy coordinates:", err);
      showNotification("Failed to copy coordinates", "error");
      const modal = document.getElementById("bhuvanInfoModal");
      if (modal) modal.classList.add("show");
    });
}

function closeBhuvanInfo() {
  const modal = document.getElementById("bhuvanInfoModal");
  if (modal) modal.classList.remove("show");
}

function copyBhuvanCoords() {
  const coords = `${currentLat.toFixed(6)}, ${currentLon.toFixed(6)}`;
  navigator.clipboard
    .writeText(coords)
    .then(() => {
      showNotification("Copied", "success");
      setTimeout(closeBhuvanInfo, 500);
    })
    .catch(() => showNotification("Failed", "error"));
}

function openBhuvanInNewTab() {
  const bhuvanUrl = `https://bhuvan.nrsc.gov.in/ngmaps/#16/${currentLat.toFixed(6)}/${currentLon.toFixed(6)}`;
  const newWindow = window.open(bhuvanUrl, "_blank", "noopener,noreferrer");
  if (newWindow) showNotification("Bhuvan opened", "success");
  else {
    showNotification("Allow popups", "error");
    copyBhuvanCoords();
  }
  closeBhuvanInfo();
}

function generateReferenceNumber(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();
  const dateStr = `${day}-${month}-${year}`;
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timeStr = `${hours}.${minutes}`;
  const currentMinute = now.getMinutes();
  const lastMinute = new Date(lastRefGenerationTime).getMinutes();
  if (currentMinute !== lastMinute) serialNumber = 1;
  const refNumber = `Ref.No. ${dateStr} ${timeStr}/${serialNumber}`;
  const refInput = document.getElementById("refInput") as HTMLInputElement;
  if (refInput) refInput.value = refNumber;
  lastRefGenerationTime = now.getTime();
  updateRefDisplay();
  return refNumber;
}

function generateNewReference() {
  const now = new Date();
  const currentMinute = now.getMinutes();
  const lastMinute = new Date(lastRefGenerationTime).getMinutes();
  if (currentMinute === lastMinute) serialNumber++;
  else serialNumber = 1;
  generateReferenceNumber();
  showNotification("New ref", "info");
}

function updateRefDisplay() {
  const refInput = document.getElementById("refInput") as HTMLInputElement;
  const refValue = document.getElementById("refValue");
  if (refValue)
    refValue.textContent =
      (refInput ? refInput.value : "") || "Ref.No. 05-01-2026 20.49/1";
}

function updateLocationDisplay() {
  const locationInput = document.getElementById(
    "locationInput",
  ) as HTMLInputElement;
  const locationValue = document.getElementById("locationValue");
  if (locationValue)
    locationValue.textContent =
      (locationInput ? locationInput.value : "") || "Fetching...";
}

async function fetchLocationFromCoords() {
  const locationInput = document.getElementById(
    "locationInput",
  ) as HTMLInputElement;
  if (!locationInput) return;
  locationInput.value = "Fetching...";
  updateLocationDisplay();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentLat}&lon=${currentLon}&zoom=18&addressdetails=1`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch address");
    const data = await response.json();
    if (data?.address) {
      locationInput.value = formatFullIndiaAddress(
        data.address as Record<string, string>,
      );
    } else {
      locationInput.value = "Location details not available.";
    }
  } catch (error) {
    console.error("Error fetching address:", error);
    locationInput.value = "Location details not available.";
  }
  updateLocationDisplay();
}

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateDistances(): { hyderabad: string; nalgonda: string } {
  try {
    const distanceToHyderabad = calculateDistance(
      currentLat,
      currentLon,
      HYDERABAD_COORDS.lat,
      HYDERABAD_COORDS.lon,
    );
    const distanceToNalgonda = calculateDistance(
      currentLat,
      currentLon,
      NALGONDA_COORDS.lat,
      NALGONDA_COORDS.lon,
    );
    const dHyd = document.getElementById("distanceHyderabad");
    const dNal = document.getElementById("distanceNalgonda");
    if (dHyd)
      dHyd.textContent = `Hyderabad: ${distanceToHyderabad.toFixed(2)} km`;
    if (dNal)
      dNal.textContent = `Nalgonda: ${distanceToNalgonda.toFixed(2)} km`;
    return {
      hyderabad: `DISTANCE FROM Hyderabad: ${distanceToHyderabad.toFixed(2)} km.`,
      nalgonda: `DISTANCE FROM Nalgonda: ${distanceToNalgonda.toFixed(2)} km.`,
    };
  } catch (_error) {
    return {
      hyderabad: "DISTANCE FROM Hyderabad: --.-- km.",
      nalgonda: "DISTANCE FROM Nalgonda: --.-- km.",
    };
  }
}

function copyCoordsManual() {
  const coordsInput = document.getElementById(
    "coordsInput",
  ) as HTMLInputElement;
  const coords = coordsInput ? coordsInput.value.trim() : "";
  if (!coords) return;
  navigator.clipboard
    .writeText(coords)
    .then(() => showNotification("Copied", "success"))
    .catch(() => showNotification("Failed", "error"));
}

function copyAllDetails() {
  const coords = getCoordinatesInBothFormats(currentLat, currentLon);
  const refInput = document.getElementById("refInput") as HTMLInputElement;
  const locationInput = document.getElementById(
    "locationInput",
  ) as HTMLInputElement;
  const ref = refInput ? refInput.value.trim() : "";
  const location = locationInput ? locationInput.value.trim() : "";
  const gmap = getGoogleMapsLink(currentLat, currentLon);
  const distances = calculateDistances();
  const allDetails = `📍 Coordinates: ${coords}\n🔗 Google Map: ${gmap}\n📋 ${ref}\n🏢 Location: ${location}\n📏 ${distances.hyderabad}\n📏 ${distances.nalgonda}`;
  navigator.clipboard
    .writeText(allDetails)
    .then(() =>
      showNotification("All details copied with distances!", "success"),
    )
    .catch(() => showNotification("Failed to copy", "error"));
}

function shareOnWhatsApp() {
  const coords = getCoordinatesInBothFormats(currentLat, currentLon);
  const refInput = document.getElementById("refInput") as HTMLInputElement;
  const locationInput = document.getElementById(
    "locationInput",
  ) as HTMLInputElement;
  const ref = refInput ? refInput.value.trim() : "";
  const location = locationInput ? locationInput.value.trim() : "";
  const gmap = getGoogleMapsLink(currentLat, currentLon);
  const distances = calculateDistances();
  const message = `📍 *Coordinates:* ${encodeURIComponent(coords)}%0A🔗 *Google Map:* ${encodeURIComponent(gmap)}%0A📋 *Reference:* ${encodeURIComponent(ref)}%0A🏢 *Location:* ${encodeURIComponent(location)}%0A📏 *${encodeURIComponent(distances.hyderabad)}*%0A📏 *${encodeURIComponent(distances.nalgonda)}*`;
  window.open(`https://wa.me/?text=${message}`, "_blank");
  showNotification("WhatsApp...", "info");
}

function showWhatsHere() {
  const modal = document.getElementById("whatsHereModal");
  const locationInput = document.getElementById(
    "locationInput",
  ) as HTMLInputElement;
  const whatsHereCoords = document.getElementById("whatsHereCoords");
  const whatsHereAddress = document.getElementById("whatsHereAddress");
  const whatsHereGmap = document.getElementById("whatsHereGmap");
  if (whatsHereCoords)
    whatsHereCoords.textContent = getCoordinatesInBothFormats(
      currentLat,
      currentLon,
    );
  if (whatsHereAddress)
    whatsHereAddress.textContent = locationInput ? locationInput.value : "";
  if (whatsHereGmap)
    whatsHereGmap.textContent = getGoogleMapsLink(currentLat, currentLon);
  if (modal) modal.classList.add("show");
}

function closeWhatsHere() {
  const modal = document.getElementById("whatsHereModal");
  if (modal) modal.classList.remove("show");
}

function copyWhatsHereDetails() {
  const coords = getCoordinatesInBothFormats(currentLat, currentLon);
  const whatsHereAddress = document.getElementById("whatsHereAddress");
  const refInput = document.getElementById("refInput") as HTMLInputElement;
  const address = whatsHereAddress ? whatsHereAddress.textContent || "" : "";
  const ref = refInput ? refInput.value : "";
  const gmap = getGoogleMapsLink(currentLat, currentLon);
  const distances = calculateDistances();
  const details = `📍 Coordinates: ${coords}\n🔗 Google Map: ${gmap}\n\n🏢 Location:\n${address}\n\n📋 Reference: ${ref}\n\n📏 ${distances.hyderabad}\n📏 ${distances.nalgonda}`;
  navigator.clipboard
    .writeText(details)
    .then(() => {
      showNotification("Copied with distances", "success");
      setTimeout(closeWhatsHere, 500);
    })
    .catch(() => showNotification("Failed", "error"));
}

function zoomIn() {
  if (zoom < 16) {
    zoom++;
    updateGoogleMap(currentLat, currentLon, zoom);
  } else showNotification("Max zoom", "info");
}

function zoomOut() {
  if (zoom > 1) {
    zoom--;
    updateGoogleMap(currentLat, currentLon, zoom);
  } else showNotification("Min zoom", "info");
}

// ===== REACT COMPONENT =====

export default function App() {
  useEffect(() => {
    const draggableElements = [
      "refDisplay",
      "locationDisplay",
      "siteLocationDisplay",
      "distanceDisplay",
    ];
    for (const id of draggableElements) {
      const element = document.getElementById(id);
      if (element) makeDraggable(element);
    }
    loadElementPositions();
    generateReferenceNumber();
    updateRefDisplay();
    updateSiteLocationDisplay();
    setTimeout(() => {
      fetchLocationFromCoords();
      calculateDistances();
    }, 500);
  }, []);

  return (
    <>
      <div className="container">
        {/* Left Panel (Sidebar) */}
        <div className="left-panel">
          <div className="title-section">
            <h1>GPRS ALL - MAP VIEWER</h1>
            <p className="subtitle">Google Maps &amp; Bhuvan Integration</p>
          </div>

          <div className="input-group">
            <label htmlFor="coordsInput">ENTER GPS COORDINATES</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                id="coordsInput"
                className="center-input"
                placeholder="Enter GPS coordinates"
                defaultValue="17.068839, 79.258973"
                data-ocid="coords.input"
              />
              <button
                type="button"
                className="btn"
                onClick={copyCoordsManual}
                style={{ minWidth: "80px" }}
                data-ocid="coords.secondary_button"
              >
                📋 Copy
              </button>
            </div>
          </div>

          <div className="button-grid">
            <button
              type="button"
              className="btn whats-here"
              onClick={showWhatsHere}
              data-ocid="whats_here.button"
            >
              📍 What's Here
            </button>
            <button
              type="button"
              className="btn calculate-distance"
              onClick={calculateDistances}
              data-ocid="distance.button"
            >
              📏 Distance
            </button>
            <button
              type="button"
              className="btn"
              onClick={getLocation}
              id="getLocationBtn"
              data-ocid="my_location.button"
            >
              📍 My Location
            </button>
            <button
              type="button"
              className="btn new-ref"
              onClick={generateNewReference}
              data-ocid="new_ref.button"
            >
              🔄 New Reference
            </button>
            <button
              type="button"
              className="btn copy-all"
              onClick={copyAllDetails}
              data-ocid="copy_all.button"
            >
              📋 Copy All
            </button>
            <button
              type="button"
              className="btn whatsapp"
              onClick={shareOnWhatsApp}
              data-ocid="whatsapp.button"
            >
              📱 WhatsApp
            </button>
            <button
              type="button"
              className="btn active"
              id="googleBtn"
              onClick={showGoogleMap}
              data-ocid="google_map.button"
            >
              🗺️ Google Map
            </button>
            <button
              type="button"
              className="btn bhuvan-rainbow"
              onClick={openBhuvanMap}
              data-ocid="bhuvan_map.button"
            >
              🛰️ Bhuvan Map
            </button>
          </div>

          <div className="input-group">
            <label htmlFor="refInput">REFERENCE NAME/NO.</label>
            <input
              type="text"
              id="refInput"
              className="details-input"
              placeholder="Auto-generated"
              readOnly
              data-ocid="ref_input.input"
            />
          </div>

          <div className="input-group">
            <label htmlFor="locationInput">LOCATION DETAILS</label>
            <input
              type="text"
              id="locationInput"
              className="details-input location-input"
              placeholder="Location Details"
              defaultValue="Fetching..."
              onInput={updateLocationDisplay}
              data-ocid="location_input.input"
            />
          </div>
        </div>

        {/* Map Section */}
        <div className="map-section">
          <div className="map-wrapper" id="mapWrapper">
            <iframe
              id="mapFrame"
              src="https://www.google.com/maps?q=17.068839,79.258973&hl=en&z=15&output=embed"
              allowFullScreen
              loading="lazy"
              title="Google Maps"
            />

            {/* Draggable Info Displays */}
            <div className="ref-display" id="refDisplay">
              <div className="ref-title">REFERENCE NAME/NO.</div>
              <div className="ref-value" id="refValue">
                Ref.No. 05-01-2026 20.49/1
              </div>
            </div>

            <div className="location-display" id="locationDisplay">
              <div className="location-title">LOCATION DETAILS</div>
              <div className="location-value" id="locationValue">
                Fetching...
              </div>
            </div>

            <div className="site-location-display" id="siteLocationDisplay">
              <div className="site-location-title">SITE LOCATION</div>
              <div className="site-location-value" id="siteLocationValue">
                17.068839, 79.258973
              </div>
            </div>

            <div className="distance-display" id="distanceDisplay">
              <div className="distance-title">DISTANCE FROM CITIES</div>
              <div className="distance-value">
                <div className="distance-from" id="distanceHyderabad">
                  Hyderabad: --.-- km
                </div>
                <div className="distance-from" id="distanceNalgonda">
                  Nalgonda: --.-- km
                </div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="zoom-controls">
              <button
                type="button"
                className="zoom-btn"
                onClick={zoomIn}
                data-ocid="zoom_in.button"
              >
                +
              </button>
              <button
                type="button"
                className="zoom-btn"
                onClick={zoomOut}
                data-ocid="zoom_out.button"
              >
                -
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* What's Here Modal */}
      <div
        className="whats-here-modal"
        id="whatsHereModal"
        data-ocid="whats_here.modal"
      >
        <div className="whats-here-content">
          <div className="whats-here-header">
            <div className="whats-here-title">
              <span>📍 What's Here</span>
            </div>
            <button
              type="button"
              className="close-modal"
              onClick={closeWhatsHere}
              data-ocid="whats_here.close_button"
            >
              ×
            </button>
          </div>
          <div className="whats-here-body">
            <div className="whats-here-coords">
              <div className="whats-here-label">COORDINATES</div>
              <div className="whats-here-value" id="whatsHereCoords">
                17.068839, 79.258973
              </div>
            </div>
            <div className="whats-here-address">
              <div className="whats-here-label">LOCATION DETAILS</div>
              <div className="whats-here-value" id="whatsHereAddress">
                Fetching...
              </div>
              <div className="whats-here-label" style={{ marginTop: "12px" }}>
                GOOGLE MAP LINK
              </div>
              <div className="whats-here-value" id="whatsHereGmap">
                --
              </div>
            </div>
          </div>
          <div className="whats-here-footer">
            <button
              type="button"
              className="whats-here-copy-btn"
              onClick={copyWhatsHereDetails}
              data-ocid="whats_here.copy_button"
            >
              <span>📋 Copy</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bhuvan Info Modal */}
      <div
        className="bhuvan-info-modal"
        id="bhuvanInfoModal"
        data-ocid="bhuvan.modal"
      >
        <div className="bhuvan-info-content">
          <div className="bhuvan-info-header">
            <div className="bhuvan-info-title">
              <div className="bhuvan-icon-large">🛰️</div>
              <span>Bhuvan Map</span>
            </div>
            <button
              type="button"
              className="bhuvan-info-close"
              onClick={closeBhuvanInfo}
              data-ocid="bhuvan.close_button"
            >
              ×
            </button>
          </div>
          <div className="bhuvan-info-body">
            <div className="bhuvan-coords-display">
              <div className="bhuvan-coords-label">
                SITE LOCATION COORDINATES
              </div>
              <div className="bhuvan-coords-value" id="bhuvanCoordsValue">
                17.068839, 79.258973
              </div>
              <div className="site-location-label">SAME AS GOOGLE MAPS</div>
            </div>
            <div className="bhuvan-instructions">
              <div className="instructions-title">📋 Instructions:</div>
              <ul className="instructions-list">
                <li>Copy coordinates for Bhuvan Map</li>
                <li>Open Bhuvan website in new tab</li>
                <li>Paste coordinates in Bhuvan search</li>
                <li>Coordinates match Google Maps</li>
              </ul>
            </div>
            <div className="bhuvan-info-footer">
              <button
                type="button"
                className="bhuvan-info-btn copy"
                onClick={copyBhuvanCoords}
                data-ocid="bhuvan.copy_button"
              >
                📋 Copy
              </button>
              <button
                type="button"
                className="bhuvan-info-btn open"
                onClick={openBhuvanInNewTab}
                data-ocid="bhuvan.open_button"
              >
                🛰️ Open
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="notification" id="notification">
        Coordinates copied!
      </div>
    </>
  );
}
