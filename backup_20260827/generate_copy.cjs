const fs = require('fs');
const gameCode = fs.readFileSync('game.html', 'utf8');
const escapedCode = gameCode.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
const copyPage = `<!DOCTYPE html>
<html>
<head>
  <title>Copy Game Code</title>
  <style>
    body { font-family: monospace; padding: 20px; background: #1a1a2e; color: #fff; }
    h1 { color: #FFD700; }
    textarea { width: 100%; height: 400px; background: #0a0a1a; color: #0f0; font-size: 10px; }
    button { padding: 15px 30px; font-size: 18px; margin: 10px; cursor: pointer; border: none; border-radius: 8px; }
    .copy-btn { background: #FFD700; color: #000; font-weight: bold; }
    .download-btn { background: #3B82F6; color: #fff; }
    .info { color: #888; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>🎮 Modularity Engine - Game Code</h1>
  <p class="info">Copy the code below and save it as <b>game.html</b></p>
  
  <button class="copy-btn" onclick="copyCode()">📋 Copy All Code</button>
  <button class="download-btn" onclick="downloadFile()">⬇️ Download as game.html</button>
  
  <p id="status" style="color: #0f0; margin: 10px 0;"></p>
  
  <textarea id="code" readonly></textarea>
  
  <script>
    const gameCode = \`${escapedCode}\`;
    document.getElementById('code').value = gameCode;
    
    function copyCode() {
      const textarea = document.getElementById('code');
      textarea.select();
      document.execCommand('copy');
      document.getElementById('status').textContent = '✅ Copied! Now paste into a new file and save as game.html';
    }
    
    function downloadFile() {
      const blob = new Blob([gameCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'game.html';
      a.click();
      URL.revokeObjectURL(url);
      document.getElementById('status').textContent = '✅ Downloaded! Open game.html in your browser';
    }
  </script>
</body>
</html>`;
fs.writeFileSync('copy_game.html', copyPage);
console.log('✅ Generated copy_game.html (' + (copyPage.length / 1024).toFixed(1) + ' KB)');
