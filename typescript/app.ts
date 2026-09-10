import {
  Brightness,
  createKeyboard,
  Direction,
  Effect,
  Speed,
  writeRgbInto,
} from "./src/index.ts";
import { WebHIDDeviceNative, WebHIDFeatureDevice } from "./src/webhid.ts";

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Openajazz</title>
  <style>
    body { font-family: sans-serif; padding: 2rem; background: #1e1e1e; color: #fff; }
    button { padding: 0.5rem 1rem; cursor: pointer; margin-right: 0.5rem; }
    #status { margin-top: 1rem; color: #aaa; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.25rem; }
    select, input { padding: 0.25rem; }
  </style>
</head>
<body>
  <h1>Openajazz Desktop</h1>
  <button id="connect">Connect Keyboard</button>
  <div id="status">Not connected</div>
  
  <div id="controls" style="display:none; margin-top: 2rem;">
    <h2>RGB Controls</h2>
    <div class="form-group">
      <label for="color">Color:</label>
      <input type="color" id="color" value="#ff0000">
    </div>
    
    <div class="form-group">
      <button id="applyColor">Apply Color</button>
      <button id="applyRainbow">Set Rainbow</button>
    </div>
  </div>

  <!-- We load our library logic here so we can use WebHID natively in the browser -->
  <!-- Note: In a real app we'd bundle this or serve the JS from Deno.serve. -->
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
          
          // Let the Deno backend know (optional)
          fetch('/connect', { method: 'POST' });
        }
      } catch (e) {
        document.getElementById('status').innerText = 'Error: ' + e.message;
      }
    });

    document.getElementById('applyColor').addEventListener('click', async () => {
       const colorHex = document.getElementById('color').value;
       document.getElementById('status').innerText = \`Setting color to \${colorHex}... (Implement IPC or Client-Side WebHID)\`;
       // In a full desktop framework we would use Deno bindings here or fetch() to tell Deno to write to node-hid.
    });

    document.getElementById('applyRainbow').addEventListener('click', async () => {
       document.getElementById('status').innerText = \`Setting rainbow... (Implement IPC or Client-Side WebHID)\`;
    });
  </script>
</body>
</html>`;

Deno.serve((req) => {
  return new Response(html, {
    headers: { "content-type": "text/html" },
  });
});
