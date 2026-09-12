// deno-lint-ignore-file no-explicit-any

// ─── File logger ─────────────────────────────────────────────────────────────
// Writes every log line to openajazz.log next to the binary so logs are
// always available even when the terminal doesn't show stdout (e.g. Windows).

// Write log next to the binary (Deno.execPath()) so it's always findable
// regardless of the working directory when the app is launched.
const _execDir = (() => {
  try {
    const p = Deno.execPath();
    const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
    return i >= 0 ? p.slice(0, i) : ".";
  } catch { return "."; }
})();
const LOG_FILE = `${_execDir}/openajazz.log`;
try { Deno.removeSync(LOG_FILE); } catch { /* first run */ }

function log(...args: unknown[]) {
  const line = `[${new Date().toISOString()}] ${args.map(String).join(" ")}`;
  console.log(line);
  try { Deno.writeTextFileSync(LOG_FILE, line + "\n", { append: true }); } catch { /* ignore */ }
}

function logWarn(...args: unknown[]) {
  const line = `[${new Date().toISOString()}] WARN ${args.map(String).join(" ")}`;
  console.warn(line);
  try { Deno.writeTextFileSync(LOG_FILE, line + "\n", { append: true }); } catch { /* ignore */ }
}

function logError(...args: unknown[]) {
  const line = `[${new Date().toISOString()}] ERROR ${args.map(String).join(" ")}`;
  console.error(line);
  try { Deno.writeTextFileSync(LOG_FILE, line + "\n", { append: true }); } catch { /* ignore */ }
}

// ─── Mode & version ──────────────────────────────────────────────────────────

const VERSION = "0.3.0";
const MOCK_MODE = Deno.env.get("OPENAJAZZ_MOCK") === "1";

log(`[openajazz] v${VERSION} | platform: ${Deno.build.os} | mock: ${MOCK_MODE}`);

// ─── Mock data ───────────────────────────────────────────────────────────────

interface MockKeyboard {
  path: string;
  name: string;
  manufacturer: string;
  kind: string;
  features: { rgb: boolean; timeSync: boolean };
  mock: boolean;
}

const MOCK_KEYBOARDS: MockKeyboard[] = [
  { path: "mock-ak820",  name: "AK820",   manufacturer: "AJAZZ", kind: "ak820",   features: { rgb: true, timeSync: false }, mock: true },
  { path: "mock-ak35i",  name: "AK35I",   manufacturer: "AJAZZ", kind: "ak35i",   features: { rgb: true, timeSync: true  }, mock: true },
  { path: "mock-f75max", name: "F75 Max", manufacturer: "Aula",  kind: "f75_max", features: { rgb: true, timeSync: true  }, mock: true },
];

// ─── Frontend HTML ────────────────────────────────────────────────────────────
// All JS inside the template literal uses plain functions and string
// concatenation — no nested template literals — so no backtick escaping is
// needed beyond the single ${VERSION} injection that happens at startup.

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <script>window.__MOCK__=${MOCK_MODE};window.__VERSION__='${VERSION}';</script>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>openajazz</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:            #0d0d0d;
      --surface:       #1a1a1a;
      --surface-hover: #222;
      --border:        #2a2a2a;
      --accent:        #818cf8;
      --accent-hover:  #6366f1;
      --text:          #f0f0f0;
      --text-muted:    #666;
      --success:       #4ade80;
      --error:         #f87171;
    }

    html, body {
      height: 100%;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      display: grid;
      grid-template-rows: 48px 1fr;
      overflow: hidden;
    }

    /* ── Header ── */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.25rem;
      flex-shrink: 0;
    }

    .header-title {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .header-version {
      font-size: 12px;
      color: var(--text-muted);
    }

    /* ── App body: sidebar + content ── */
    .app-body {
      display: grid;
      grid-template-columns: 220px 1fr;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Sidebar ── */
    .sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      padding: 0.75rem 0;
      overflow-y: auto;
    }

    .sidebar-heading {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0 0.75rem 0.5rem;
    }

    .kb-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      border: none;
      background: none;
      color: var(--text);
      font-size: 13px;
      width: 100%;
      text-align: left;
      transition: background 0.12s;
    }

    .kb-item:hover  { background: var(--surface-hover); }

    .kb-item.active {
      background: color-mix(in srgb, var(--accent) 14%, transparent);
      color: var(--accent);
    }

    .kb-icon { font-size: 14px; flex-shrink: 0; }

    /* ── Content area ── */
    .content {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: var(--bg);
      min-height: 0;
    }

    /* ── Empty state ── */
    .empty-state {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--text-muted);
    }

    .empty-state-icon { font-size: 2.5rem; }

    /* ── Controls panel ── */
    .controls-panel {
      flex: 1;
      padding: 1.5rem 1.75rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .kb-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .kb-name {
      font-size: 18px;
      font-weight: 600;
    }

    .mfr-badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text-muted);
    }

    .divider {
      height: 1px;
      background: var(--border);
    }

    /* ── Control rows ── */
    .ctrl-row {
      display: grid;
      grid-template-columns: 110px 1fr;
      align-items: start;
      gap: 0.75rem;
    }

    .ctrl-label {
      font-size: 13px;
      color: var(--text-muted);
      font-weight: 500;
      padding-top: 0.3rem;
    }

    .ctrl-body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    /* Color */
    .color-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }

    input[type="color"] {
      width: 40px;
      height: 32px;
      padding: 2px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--surface);
      cursor: pointer;
    }

    input[type="color"]:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .hex-label {
      font-family: monospace;
      font-size: 13px;
      min-width: 5.5ch;
    }

    /* Generic buttons */
    .btn {
      padding: 0.32rem 0.85rem;
      border-radius: 6px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text);
      font-size: 13px;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s, color 0.12s;
      white-space: nowrap;
      line-height: 1.5;
    }

    .btn:hover { background: var(--surface-hover); }

    .btn.active {
      background: color-mix(in srgb, var(--accent) 18%, transparent);
      border-color: var(--accent);
      color: var(--accent);
    }

    .btn-accent {
      background: var(--accent);
      border-color: var(--accent);
      color: #0d0d0d;
      font-weight: 600;
    }

    .btn-accent:hover {
      background: var(--accent-hover);
      border-color: var(--accent-hover);
    }

    /* Effect chips */
    .effect-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .chip {
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
      background: var(--surface);
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.12s;
      white-space: nowrap;
    }

    .chip:hover { background: var(--surface-hover); color: var(--text); }

    .chip.active {
      background: var(--accent);
      border-color: var(--accent);
      color: #0d0d0d;
      font-weight: 600;
    }

    /* Sliders */
    .slider-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    input[type="range"] {
      -webkit-appearance: none;
      appearance: none;
      width: 160px;
      height: 4px;
      border-radius: 2px;
      background: var(--border);
      outline: none;
      cursor: pointer;
    }

    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
    }

    input[type="range"]::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--accent);
      border: none;
      cursor: pointer;
    }

    .slider-value {
      font-size: 12px;
      color: var(--text-muted);
      min-width: 6ch;
    }

    /* Direction button group */
    .dir-group {
      display: flex;
      border: 1px solid var(--border);
      border-radius: 6px;
      overflow: hidden;
      width: fit-content;
    }

    .dir-group .btn {
      border: none;
      border-right: 1px solid var(--border);
      border-radius: 0;
    }

    .dir-group .btn:last-child { border-right: none; }

    .dir-group .btn.active {
      background: color-mix(in srgb, var(--accent) 18%, transparent);
      color: var(--accent);
    }

    /* Actions row */
    .actions-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding-top: 0.25rem;
    }

    /* Status bar */
    .status-bar {
      font-size: 12px;
      min-height: 1.4em;
      transition: opacity 0.4s;
    }

    .status-bar.ok   { color: var(--success); }
    .status-bar.err  { color: var(--error); }
    .status-bar.fade { opacity: 0; }
  </style>
</head>
<body>
  <header>
    <span class="header-title">&#x2328; openajazz</span>
    <span class="header-version">v${VERSION}</span>
  </header>

  <div class="app-body">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-heading">Keyboards</div>
      <div id="kb-list"></div>
      <div style="margin-top:auto;display:flex;flex-direction:column;gap:0.35rem;padding:0.5rem 0 0;">
        <button class="btn" id="add-kb-btn" style="width:100%">&#xFF0B; Add Keyboard</button>
        <button class="btn" id="refresh-btn" style="width:100%">&#x21BB; Refresh</button>
      </div>
    </aside>

    <!-- Main content -->
    <main class="content">
      <div class="empty-state" id="empty-state">
        <div class="empty-state-icon">&#x2328;</div>
        <div id="empty-state-msg">No keyboards found</div>
      </div>

      <div class="controls-panel" id="controls-panel" style="display:none">
        <!-- Keyboard identity -->
        <div class="kb-header">
          <span class="kb-name" id="kb-name"></span>
          <span class="mfr-badge" id="kb-mfr"></span>
        </div>
        <div class="divider"></div>

        <!-- Color -->
        <div class="ctrl-row">
          <span class="ctrl-label">Color</span>
          <div class="ctrl-body">
            <div class="color-row">
              <input type="color" id="color-input" value="#ffffff">
              <span class="hex-label" id="hex-label">#FFFFFF</span>
              <button class="btn" id="rainbow-btn" style="display:none">&#x1F308; Rainbow</button>
            </div>
          </div>
        </div>

        <!-- Effect -->
        <div class="ctrl-row">
          <span class="ctrl-label">Effect</span>
          <div class="ctrl-body">
            <div class="effect-grid" id="effect-grid"></div>
          </div>
        </div>

        <!-- Brightness -->
        <div class="ctrl-row">
          <span class="ctrl-label">Brightness</span>
          <div class="ctrl-body">
            <div class="slider-row">
              <input type="range" id="brightness-input" min="0" max="4" step="1" value="4">
              <span class="slider-value" id="brightness-label">Highest</span>
            </div>
          </div>
        </div>

        <!-- Speed -->
        <div class="ctrl-row">
          <span class="ctrl-label">Speed</span>
          <div class="ctrl-body">
            <div class="slider-row">
              <input type="range" id="speed-input" min="0" max="4" step="1" value="2">
              <span class="slider-value" id="speed-label">Medium</span>
            </div>
          </div>
        </div>

        <!-- Direction -->
        <div class="ctrl-row">
          <span class="ctrl-label">Direction</span>
          <div class="ctrl-body">
            <div class="dir-group">
              <button class="btn active" id="dir-ltr">&larr; Left &middot; Right</button>
              <button class="btn"         id="dir-rtl">Right &middot; Left &rarr;</button>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="actions-row">
          <button class="btn"        id="sync-time-btn" style="display:none">&#x23F0; Sync Time</button>
          <button class="btn btn-accent" id="apply-btn">&#x2713; Apply RGB</button>
        </div>

        <!-- Status feedback -->
        <div class="status-bar" id="status-bar"></div>
      </div>
    </main>
  </div>

  <script type="module">
    // ── Mode flag injected by Deno at startup ──────────────────────────────────
    var MOCK_MODE = window.__MOCK__ || false;

    // ── Supported keyboards (VID/PID/usagePage) for WebHID ───────────────────
    var SUPPORTED_KEYBOARDS = [
      { vendorId: 0x320F, productId: 0x505B, usagePage: 0xFF1C, name: 'AK820',   manufacturer: 'AJAZZ', kind: 'ak820',   timeSync: false },
      { vendorId: 0x0c45, productId: 0x8009, usagePage: 0xff13, name: 'AK35I',   manufacturer: 'AJAZZ', kind: 'ak35i',   timeSync: true  },
      { vendorId: 0x0c45, productId: 0x800a, usagePage: 0xff13, name: 'F75 Max', manufacturer: 'Aula',  kind: 'f75_max', timeSync: true  },
    ];

    var AK820_EFFECT_CODES = {
      static:5, corrugated:1, cloud:2, serpentine:3, spectrum:4,
      breath:5, reaction:7, ripples:8, traverse:9, stars:10,
      flowers:11, roll:12, wave:13, cartoon:14, rain:15, scan:16, surmount:17, speed:18
    };
    var F75_EFFECT_CODES = {
      static:1, glittering:4, falling:5, colourful:6, breath:7, spectrum:8,
      outward:9, scrolling:10, rolling:11, rotating:12, explode:13, launch:14,
      ripples:15, flowing:16, pulsating:17, tilt:18, shuttle:19
    };

    function sleep(ms) { return new Promise(function(r) { setTimeout(r, ms); }); }

    function identifyDevice(device) {
      var usagePage = (device.collections && device.collections[0]) ? device.collections[0].usagePage : 0;
      for (var i = 0; i < SUPPORTED_KEYBOARDS.length; i++) {
        var kb = SUPPORTED_KEYBOARDS[i];
        if (device.vendorId === kb.vendorId && device.productId === kb.productId &&
            (usagePage === 0 || usagePage === kb.usagePage)) {
          return { path: device.productId + '_' + device.vendorId, name: kb.name,
                   manufacturer: kb.manufacturer, kind: kb.kind,
                   features: { rgb: true, timeSync: kb.timeSync }, mock: false };
        }
      }
      return null;
    }

    // ── AK820: Output Reports ─────────────────────────────────────────────────
    async function applyRgbAK820(hidDevice, s) {
      var data = new Uint8Array(64);
      data[0] = 0x2A; data[1] = 0x3D; data[2] = 0x06; data[3] = 0x1d;
      if (s.rainbow) { data[12] = 0x01; }
      else { data[13] = s.r; data[14] = s.g; data[15] = s.b; }
      data[8]  = AK820_EFFECT_CODES[s.effect] || 5;
      data[9]  = s.brightness;
      data[10] = s.speed;
      data[11] = s.direction;
      await hidDevice.sendReport(0x04, data);
    }

    // ── F75/AK35i: Feature Reports ────────────────────────────────────────────
    function f75ControlMsg(kind) {
      var d = new Uint8Array(64); d[0] = 0x04; d[1] = kind; return d;
    }
    function f75PreDataMsg(kind) {
      var d = f75ControlMsg(kind); d[8] = 0x01; return d;
    }

    async function applyRgbF75(hidDevice, s) {
      await hidDevice.sendFeatureReport(0, f75ControlMsg(0x18));
      await sleep(5);
      await hidDevice.receiveFeatureReport(0);
      await sleep(5);

      await hidDevice.sendFeatureReport(0, f75PreDataMsg(0x13));
      await sleep(5);
      await hidDevice.receiveFeatureReport(0);
      await sleep(5);

      var data = new Uint8Array(64);
      data[14] = 0xAA; data[15] = 0x55;
      data[0] = F75_EFFECT_CODES[s.effect] || 1;
      if (!s.rainbow) { data[1] = s.r; data[2] = s.g; data[3] = s.b; }
      data[9]  = s.brightness;
      data[10] = 4 - s.speed;  // F75 speed is inverted
      data[11] = s.direction;
      await hidDevice.sendFeatureReport(0, data);
      await sleep(5);

      await hidDevice.sendFeatureReport(0, f75ControlMsg(0x02));
      await sleep(5);
      await hidDevice.receiveFeatureReport(0);
    }

    async function applyTimeSyncF75(hidDevice) {
      await hidDevice.sendFeatureReport(0, f75ControlMsg(0x18));
      await sleep(5);
      await hidDevice.receiveFeatureReport(0);
      await sleep(5);

      await hidDevice.sendFeatureReport(0, f75PreDataMsg(0x28));
      await sleep(5);
      await hidDevice.receiveFeatureReport(0);
      await sleep(5);

      var now = new Date();
      var data = new Uint8Array(64);
      data[1] = 0x01; data[2] = 0x5a;
      data[3] = now.getFullYear() % 100;
      data[4] = now.getDate();
      data[5] = now.getMonth() + 1;
      data[6] = now.getHours();
      data[7] = now.getMinutes();
      data[8] = now.getSeconds();
      data[62] = 0xaa; data[63] = 0x55;
      await hidDevice.sendFeatureReport(0, data);
      await sleep(5);

      await hidDevice.sendFeatureReport(0, f75ControlMsg(0x02));
      await sleep(5);
      await hidDevice.receiveFeatureReport(0);
    }

    // ── Effect lists ──────────────────────────────────────────────────────────
    var EFFECTS_AK820 = [
      'Static','Corrugated','Cloud','Serpentine','Spectrum','Breath',
      'Reaction','Ripples','Traverse','Stars','Flowers','Roll','Wave',
      'Cartoon','Rain','Scan','Surmount','Speed'
    ];
    var EFFECTS_OTHER = [
      'Static','Glittering','Falling','Colourful','Breath','Spectrum',
      'Outward','Scrolling','Rolling','Rotating','Explode','Launch',
      'Ripples','Flowing','Pulsating','Tilt','Shuttle'
    ];
    var BRIGHTNESS_LABELS = ['Lowest','Low','Medium','High','Highest'];
    var SPEED_LABELS      = ['Fastest','Fast','Medium','Slow','Slowest'];

    // ── App state ─────────────────────────────────────────────────────────────
    var state = {
      keyboards: [],
      selected:  null,   // full keyboard object or null
      color:      '#ffffff',
      rainbow:    false,
      effect:     'static',
      brightness: 4,
      speed:      2,
      direction:  0,     // 0 = L→R, 1 = R→L
    };

    var activeHidDevice = null;  // raw HIDDevice opened via WebHID

    // ── DOM references ────────────────────────────────────────────────────────
    var kbList         = document.getElementById('kb-list');
    var emptyState     = document.getElementById('empty-state');
    var controlsPanel  = document.getElementById('controls-panel');
    var kbNameEl       = document.getElementById('kb-name');
    var kbMfrEl        = document.getElementById('kb-mfr');
    var colorInput     = document.getElementById('color-input');
    var hexLabel       = document.getElementById('hex-label');
    var rainbowBtn     = document.getElementById('rainbow-btn');
    var effectGrid     = document.getElementById('effect-grid');
    var brightnessInput= document.getElementById('brightness-input');
    var brightnessLabel= document.getElementById('brightness-label');
    var speedInput     = document.getElementById('speed-input');
    var speedLabel     = document.getElementById('speed-label');
    var dirLtr         = document.getElementById('dir-ltr');
    var dirRtl         = document.getElementById('dir-rtl');
    var syncTimeBtn    = document.getElementById('sync-time-btn');
    var applyBtn       = document.getElementById('apply-btn');
    var statusBar      = document.getElementById('status-bar');
    var refreshBtn     = document.getElementById('refresh-btn');
    var addKbBtn       = document.getElementById('add-kb-btn');
    var emptyMsg       = document.getElementById('empty-state-msg');

    var statusTimer = null;

    // ── Status feedback ───────────────────────────────────────────────────────
    function showStatus(msg, ok) {
      clearTimeout(statusTimer);
      statusBar.textContent = msg;
      statusBar.className = 'status-bar ' + (ok ? 'ok' : 'err');
      statusTimer = setTimeout(function() {
        statusBar.classList.add('fade');
        setTimeout(function() {
          statusBar.textContent = '';
          statusBar.className = 'status-bar';
        }, 400);
      }, 3000);
    }

    // ── Sidebar ───────────────────────────────────────────────────────────────
    function loadKeyboards() {
      if (MOCK_MODE) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Scanning...';
        fetch('/api/keyboards')
          .then(function(res) { return res.json(); })
          .then(function(keyboards) {
            state.keyboards = keyboards;
            renderSidebar();
            if (!state.selected && keyboards.length > 0) selectKeyboard(keyboards[0]);
          })
          .catch(function(e) { console.error('Discovery failed:', e); })
          .finally(function() {
            refreshBtn.disabled = false;
            refreshBtn.textContent = '\u21BB Refresh';
          });
        return;
      }
      if (!navigator.hid) {
        emptyMsg.textContent = 'WebHID not available. Make sure the app is built with the CEF backend.';
        return;
      }
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Scanning...';
      navigator.hid.getDevices()
        .then(function(devices) {
          var keyboards = devices.map(identifyDevice).filter(Boolean);
          state.keyboards = keyboards;
          window.__hidDevices = {};
          devices.forEach(function(d) {
            var info = identifyDevice(d);
            if (info) window.__hidDevices[info.path] = d;
          });
          renderSidebar();
          if (!state.selected && keyboards.length > 0) selectKeyboard(keyboards[0]);
        })
        .finally(function() {
          refreshBtn.disabled = false;
          refreshBtn.textContent = '\u21BB Refresh';
        });
    }

    function addKeyboard() {
      if (!navigator.hid) return;
      var filters = SUPPORTED_KEYBOARDS.map(function(kb) {
        return { vendorId: kb.vendorId, productId: kb.productId };
      });
      navigator.hid.requestDevice({ filters: filters })
        .then(function(devices) {
          if (devices.length > 0) loadKeyboards();
        })
        .catch(function() { /* user cancelled */ });
    }

    refreshBtn.addEventListener('click', loadKeyboards);
    if (addKbBtn) addKbBtn.addEventListener('click', addKeyboard);
    // Add Keyboard button is only meaningful in real (WebHID) mode
    if (MOCK_MODE && addKbBtn) addKbBtn.style.display = 'none';

    function renderSidebar() {
      kbList.innerHTML = '';
      if (state.keyboards.length === 0) {
        emptyMsg.textContent = 'No supported keyboards found. Plug in your keyboard and click Refresh.';
      } else {
        emptyMsg.textContent = 'Select a keyboard from the sidebar';
      }
      state.keyboards.forEach(function(kb) {
        var btn = document.createElement('button');
        var isActive = state.selected && state.selected.path === kb.path;
        btn.className = 'kb-item' + (isActive ? ' active' : '');
        var icon = document.createElement('span');
        icon.className = 'kb-icon';
        icon.textContent = '\u2328';
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(kb.name));
        btn.addEventListener('click', function() { selectKeyboard(kb); });
        kbList.appendChild(btn);
      });
    }

    // ── Effect chips ──────────────────────────────────────────────────────────
    function renderEffects() {
      var effects = state.selected && state.selected.kind === 'ak820'
        ? EFFECTS_AK820
        : EFFECTS_OTHER;
      effectGrid.innerHTML = '';
      effects.forEach(function(name) {
        var key = name.toLowerCase();
        var chip = document.createElement('button');
        chip.className = 'chip' + (state.effect === key ? ' active' : '');
        chip.textContent = name;
        chip.addEventListener('click', function() {
          state.effect = key;
          renderEffects();
        });
        effectGrid.appendChild(chip);
      });
    }

    // ── Controls panel ────────────────────────────────────────────────────────
    function renderControls() {
      if (!state.selected) {
        emptyState.style.display = 'flex';
        controlsPanel.style.display = 'none';
        return;
      }
      emptyState.style.display = 'none';
      controlsPanel.style.display = 'flex';

      kbNameEl.textContent = state.selected.name;
      kbMfrEl.textContent  = state.selected.manufacturer;

      // Rainbow toggle only available on AK820
      var showRainbow = state.selected.kind === 'ak820';
      rainbowBtn.style.display = showRainbow ? '' : 'none';
      if (!showRainbow) state.rainbow = false;

      colorInput.disabled = state.rainbow;
      rainbowBtn.className = 'btn' + (state.rainbow ? ' active' : '');
      colorInput.value = state.color;
      hexLabel.textContent = state.color.toUpperCase();

      brightnessInput.value = String(state.brightness);
      brightnessLabel.textContent = BRIGHTNESS_LABELS[state.brightness];

      speedInput.value = String(state.speed);
      speedLabel.textContent = SPEED_LABELS[state.speed];

      dirLtr.className = 'btn' + (state.direction === 0 ? ' active' : '');
      dirRtl.className = 'btn' + (state.direction === 1 ? ' active' : '');

      syncTimeBtn.style.display = state.selected.features.timeSync ? '' : 'none';

      renderEffects();
    }

    // ── Keyboard selection ────────────────────────────────────────────────────
    function selectKeyboard(kb) {
      state.selected = kb;
      state.rainbow  = false;
      state.effect   = 'static';
      renderSidebar();
      renderControls();
      if (!MOCK_MODE) {
        var raw = window.__hidDevices && window.__hidDevices[kb.path];
        if (raw) {
          raw.open().then(function() {
            activeHidDevice = raw;
          }).catch(function(e) {
            showStatus('\u2717 Failed to open device: ' + e.message, false);
          });
        }
      } else {
        fetch('/api/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: kb.path }),
        }).catch(function() {});
      }
    }

    // ── Input event wiring ────────────────────────────────────────────────────
    colorInput.addEventListener('input', function() {
      state.color = colorInput.value;
      hexLabel.textContent = state.color.toUpperCase();
    });

    rainbowBtn.addEventListener('click', function() {
      state.rainbow = !state.rainbow;
      colorInput.disabled = state.rainbow;
      rainbowBtn.className = 'btn' + (state.rainbow ? ' active' : '');
    });

    brightnessInput.addEventListener('input', function() {
      state.brightness = parseInt(brightnessInput.value, 10);
      brightnessLabel.textContent = BRIGHTNESS_LABELS[state.brightness];
    });

    speedInput.addEventListener('input', function() {
      state.speed = parseInt(speedInput.value, 10);
      speedLabel.textContent = SPEED_LABELS[state.speed];
    });

    dirLtr.addEventListener('click', function() {
      state.direction = 0;
      dirLtr.className = 'btn active';
      dirRtl.className = 'btn';
    });

    dirRtl.addEventListener('click', function() {
      state.direction = 1;
      dirRtl.className = 'btn active';
      dirLtr.className = 'btn';
    });

    // ── Apply RGB ─────────────────────────────────────────────────────────────
    applyBtn.addEventListener('click', function() {
      if (!state.selected) return;
      if (MOCK_MODE) {
        fetch('/api/rgb', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            color:      state.color,
            rainbow:    state.rainbow,
            effect:     state.effect,
            brightness: state.brightness,
            speed:      state.speed,
            direction:  state.direction,
          }),
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.ok) {
            showStatus('\u2713 RGB settings applied.', true);
          } else {
            showStatus('\u2717 Failed: ' + (data.error || 'unknown error'), false);
          }
        })
        .catch(function(e) { showStatus('\u2717 Failed: ' + e.message, false); });
        return;
      }
      if (!activeHidDevice) { showStatus('\u2717 No keyboard open', false); return; }
      var s = {
        r: parseInt(state.color.slice(1,3), 16),
        g: parseInt(state.color.slice(3,5), 16),
        b: parseInt(state.color.slice(5,7), 16),
        rainbow: state.rainbow,
        effect: state.effect,
        brightness: state.brightness,
        speed: state.speed,
        direction: state.direction,
      };
      var fn = (state.selected.kind === 'ak820') ? applyRgbAK820 : applyRgbF75;
      fn(activeHidDevice, s)
        .then(function() { showStatus('\u2713 RGB applied.', true); })
        .catch(function(e) { showStatus('\u2717 Failed: ' + e.message, false); });
    });

    // ── Sync Time ─────────────────────────────────────────────────────────────
    syncTimeBtn.addEventListener('click', function() {
      if (!state.selected) return;
      if (MOCK_MODE) {
        fetch('/api/time', { method: 'POST' })
        .then(function(res) { return res.json(); })
        .then(function(data) {
          if (data.ok) {
            showStatus('\u2713 Time synced: ' + data.time, true);
          } else {
            showStatus('\u2717 Failed to sync time.', false);
          }
        })
        .catch(function(e) { showStatus('\u2717 Failed: ' + e.message, false); });
        return;
      }
      if (!activeHidDevice) { showStatus('\u2717 No keyboard open', false); return; }
      applyTimeSyncF75(activeHidDevice)
        .then(function() { showStatus('\u2713 Time synced.', true); })
        .catch(function(e) { showStatus('\u2717 Failed: ' + e.message, false); });
    });

    // ── Bootstrap ─────────────────────────────────────────────────────────────
    loadKeyboards();
  </script>
</body>
</html>`;

// ─── HTTP server ──────────────────────────────────────────────────────────────────
// Real HID communication is handled by WebHID inside the CEF webview.
// The backend only serves the HTML page; all API routes are mock-only.

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  // GET /favicon.ico — suppress 404 noise in logs
  if (method === "GET" && pathname === "/favicon.ico") {
    return new Response(null, { status: 204 });
  }

  // GET / — serve the full HTML application
  if (method === "GET" && pathname === "/") {
    log("[openajazz] Serving UI");
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // Mock-mode only routes — the webview uses these instead of WebHID when
  // OPENAJAZZ_MOCK=1 so the UI can be exercised without real hardware.
  if (MOCK_MODE) {
    if (method === "GET" && pathname === "/api/keyboards") {
      log("[openajazz] keyboards: mock mode, returning", MOCK_KEYBOARDS.length, "mock keyboards:", MOCK_KEYBOARDS.map(k => k.name).join(", "));
      return Response.json(MOCK_KEYBOARDS);
    }

    if (method === "POST" && pathname === "/api/connect") {
      const body = await req.json() as { path: string };
      log("[openajazz] connect: mock", body.path);
      return Response.json({ ok: true });
    }

    if (method === "POST" && pathname === "/api/disconnect") {
      log("[openajazz] disconnect: mock");
      return Response.json({ ok: true });
    }

    if (method === "POST" && pathname === "/api/rgb") {
      const body = await req.json();
      log("[openajazz] rgb: mock", JSON.stringify(body));
      return Response.json({ ok: true });
    }

    if (method === "POST" && pathname === "/api/time") {
      log("[openajazz] time: mock");
      return Response.json({ ok: true, time: new Date().toISOString() });
    }
  }

  logWarn("[openajazz] 404:", method, pathname);
  return new Response("Not Found", { status: 404 });
});

log("[openajazz] Server started.");

// Exit when the user presses X. The first new Deno.BrowserWindow() call
// adopts the startup window rather than creating a new one.
try {
  const win = new (Deno as any).BrowserWindow({ title: "openajazz" });
  win.addEventListener("close", () => {
    log("[openajazz] Window closed, exiting.");
    Deno.exit(0);
  });
  log("[openajazz] Window close handler registered.");
} catch {
  // Running via deno run (dev mode), not deno desktop — ignore.
}
