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

let connectedPath: string | null = null;

// When OPENAJAZZ_MOCK=1 (or no real keyboard found) the server returns the mock
// keyboard list and silently swallows HID writes. Set automatically by
// `deno task dev:mock`; in `deno task dev` real HID is attempted instead.
const MOCK_MODE = Deno.env.get("OPENAJAZZ_MOCK") === "1";

// ─── Package version (kept in sync with deno.json) ───────────────────────────

const VERSION = "0.1.0";

// ─── Frontend HTML ────────────────────────────────────────────────────────────
// All JS inside the template literal uses plain functions and string
// concatenation — no nested template literals — so no backtick escaping is
// needed beyond the single ${VERSION} injection that happens at startup.

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
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
    </aside>

    <!-- Main content -->
    <main class="content">
      <div class="empty-state" id="empty-state">
        <div class="empty-state-icon">&#x2328;</div>
        <div>Select a keyboard from the sidebar</div>
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
    // ── Effect lists (no template literals used — safe inside TS template literal) ──
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

    // ── App state ──────────────────────────────────────────────────────────────
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

    // ── DOM references ─────────────────────────────────────────────────────────
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

    var statusTimer = null;

    // ── Status feedback ────────────────────────────────────────────────────────
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

    // ── Sidebar ────────────────────────────────────────────────────────────────
    function renderSidebar() {
      kbList.innerHTML = '';
      state.keyboards.forEach(function(kb) {
        var btn = document.createElement('button');
        var isActive = state.selected && state.selected.path === kb.path;
        btn.className = 'kb-item' + (isActive ? ' active' : '');
        var icon = document.createElement('span');
        icon.className = 'kb-icon';
        icon.textContent = '⌨';
        btn.appendChild(icon);
        btn.appendChild(document.createTextNode(kb.name));
        btn.addEventListener('click', function() { selectKeyboard(kb); });
        kbList.appendChild(btn);
      });
    }

    // ── Effect chips ───────────────────────────────────────────────────────────
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

    // ── Controls panel ─────────────────────────────────────────────────────────
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

    // ── Keyboard selection ─────────────────────────────────────────────────────
    function selectKeyboard(kb) {
      state.selected  = kb;
      state.rainbow   = false;
      state.effect    = 'static';
      renderSidebar();
      renderControls();
      fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: kb.path }),
      }).catch(function() { /* ignore */ });
    }

    // ── Input event wiring ─────────────────────────────────────────────────────
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

    // ── Apply RGB ──────────────────────────────────────────────────────────────
    applyBtn.addEventListener('click', function() {
      if (!state.selected) return;
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
      .catch(function(e) {
        showStatus('\u2717 Failed: ' + e.message, false);
      });
    });

    // ── Sync Time ──────────────────────────────────────────────────────────────
    syncTimeBtn.addEventListener('click', function() {
      if (!state.selected) return;
      fetch('/api/time', { method: 'POST' })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.ok) {
          showStatus('\u2713 Time synced: ' + data.time, true);
        } else {
          showStatus('\u2717 Failed to sync time.', false);
        }
      })
      .catch(function(e) {
        showStatus('\u2717 Failed: ' + e.message, false);
      });
    });

    // ── Bootstrap ──────────────────────────────────────────────────────────────
    fetch('/api/keyboards')
      .then(function(res) { return res.json(); })
      .then(function(keyboards) {
        state.keyboards = keyboards;
        renderSidebar();
        if (keyboards.length > 0) {
          selectKeyboard(keyboards[0]);
        }
      })
      .catch(function(e) {
        console.error('Failed to load keyboards:', e);
      });
  </script>
</body>
</html>`;

// ─── HTTP server ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method;

  // GET / — serve the full HTML application
  if (method === "GET" && pathname === "/") {
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  // GET /api/keyboards — list detected keyboards (real or mock)
  if (method === "GET" && pathname === "/api/keyboards") {
    if (MOCK_MODE) {
      return Response.json(MOCK_KEYBOARDS);
    }
    // TODO: use node-hid to scan for supported keyboards and return them here.
    // For now, real mode returns an empty list until HID discovery is implemented.
    return Response.json([]);
  }

  // POST /api/connect — set active keyboard
  if (method === "POST" && pathname === "/api/connect") {
    const body = await req.json() as { path: string };
    connectedPath = body.path;
    console.log(MOCK_MODE ? "[mock]" : "[hid]", "connected:", connectedPath);
    return Response.json({ ok: true });
  }

  // POST /api/disconnect — clear active keyboard
  if (method === "POST" && pathname === "/api/disconnect") {
    console.log(MOCK_MODE ? "[mock]" : "[hid]", "disconnected:", connectedPath);
    connectedPath = null;
    return Response.json({ ok: true });
  }

  // POST /api/rgb — apply RGB settings
  if (method === "POST" && pathname === "/api/rgb") {
    const body = await req.json();
    if (MOCK_MODE) {
      console.log("[mock] rgb for", connectedPath, body);
    } else {
      // TODO: plug in node-hid here
      console.log("[hid] rgb for", connectedPath, body);
    }
    return Response.json({ ok: true });
  }

  // POST /api/time — sync clock to keyboard
  if (method === "POST" && pathname === "/api/time") {
    if (MOCK_MODE) {
      console.log("[mock] time sync for", connectedPath);
    } else {
      // TODO: plug in node-hid here
      console.log("[hid] time sync for", connectedPath);
    }
    return Response.json({ ok: true, time: new Date().toISOString() });
  }

  return new Response("Not Found", { status: 404 });
});
