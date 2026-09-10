import { createKeyboard, writeRgbInto, Effect, Brightness, Speed, Direction } from "./src/index.ts";
import { WebHIDFeatureDevice, WebHIDDeviceNative } from "./src/webhid.ts";

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Openajazz</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #1e1e1e; color: #fff; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
    #status { margin-top: 1rem; color: #aaa; }
  </style>
</head>
<body>
  <h1>Openajazz Desktop</h1>
  <button id="connect">Connect Keyboard</button>
  <div id="status">Not connected</div>
  
  <div id="controls" style="display:none; margin-top: 2rem;">
    <button id="red">Set Red</button>
    <button id="blue">Set Blue</button>
  </div>

  <script type="module">
    // Simplified desktop client script using WebHID
    document.getElementById('connect').addEventListener('click', async () => {
      try {
        const devices = await navigator.hid.requestDevice({
          filters: [
            { vendorId: 0x0c45 }, // AJAZZ / Aula F75 Max
            { vendorId: 0x320F }  // AJAZZ AK820
          ]
        });
        
        if (devices.length > 0) {
          const device = devices[0];
          await device.open();
          document.getElementById('status').innerText = \`Connected to \${device.productName || 'Keyboard'} (VID: \${device.vendorId.toString(16)}, PID: \${device.productId.toString(16)})\`;
          document.getElementById('controls').style.display = 'block';
          
          window.activeDevice = device;
        }
      } catch (e) {
        document.getElementById('status').innerText = 'Error: ' + e.message;
      }
    });

    document.getElementById('red').addEventListener('click', async () => {
       // Send an IPC message or direct HID commands depending on architecture
       // Currently, WebHID might need a backend relay or just execute directly here if permitted.
       document.getElementById('status').innerText = 'Setting red... (Needs bindings export)';
    });
  </script>
</body>
</html>`;

Deno.serve((req) => {
  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
});
