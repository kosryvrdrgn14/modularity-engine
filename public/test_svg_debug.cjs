const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push(err.message));

  console.log('=== SVG CACHE DEBUG ===\n');

  await page.goto(`file://${path.resolve(__dirname, 'game.html')}`);
  await page.waitForTimeout(1500);

  // Click start
  const overlay = await page.$('#start-overlay');
  if (overlay) await overlay.click();
  await page.waitForTimeout(500);

  // Inject a diagnostic hook into _drawEntity to log cache lookups
  const result = await page.evaluate(() => {
    // Find the Renderer prototype's _drawEntity
    const origDraw = Renderer.prototype._drawEntity;
    const debugLog = [];
    let svgHits = 0;
    let shapeFallbacks = 0;

    Renderer.prototype._drawEntity = function(entity) {
      const ctx = this.ctx;
      ctx.save();

      if (entity.iFrames > 0 && Math.floor(entity.iFrames * 10) % 2 === 0) {
        ctx.globalAlpha = 0.5;
      }

      const x = Math.round(entity.x);
      const y = Math.round(entity.y);
      const size = entity.size;
      const color = entity.visual?.color || '#FFF';
      const shape = entity.visual?.shape || 'square';

      const cacheKey = (entity.type || 'unknown') + '_' + shape + '_' + color;
      const svgImage = this.imageCache && this.imageCache[cacheKey];

      // Log first few unique cache key lookups
      if (debugLog.length < 20 && !debugLog.find(d => d.key === cacheKey)) {
        debugLog.push({
          key: cacheKey,
          found: !!(svgImage && svgImage.complete && svgImage.naturalWidth > 0),
          imgComplete: svgImage ? svgImage.complete : 'no img',
          imgWidth: svgImage ? svgImage.naturalWidth : 'no img',
          cacheKeys: this.imageCache ? Object.keys(this.imageCache).length : 0,
        });
      }

      if (svgImage && svgImage.complete && svgImage.naturalWidth > 0) {
        const drawSize = size * 2;
        ctx.drawImage(svgImage, x - size, y - size, drawSize, drawSize);
        svgHits++;
      } else {
        ctx.fillStyle = color;
        if (shape === 'square') {
          ctx.fillRect(x - size, y - size, size * 2, size * 2);
        } else if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y);
          ctx.lineTo(x, y + size);
          ctx.lineTo(x - size, y);
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'triangle') {
          ctx.beginPath();
          ctx.moveTo(x, y - size);
          ctx.lineTo(x + size, y + size);
          ctx.lineTo(x - size, y + size);
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'star') {
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? size : size * 0.5;
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
            else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
          }
          ctx.closePath();
          ctx.fill();
        }
        shapeFallbacks++;
      }

      ctx.restore();
    };

    return new Promise(resolve => {
      setTimeout(() => {
        Renderer.prototype._drawEntity = origDraw;
        resolve({ debugLog, svgHits, shapeFallbacks });
      }, 3000);
    });
  });

  console.log('Cache key lookups (first 20 unique):');
  for (const entry of result.debugLog) {
    const status = entry.found ? '✅ SVG HIT' : '❌ SHAPE FALLBACK';
    console.log(`  ${status} key="${entry.key}" imgComplete=${entry.imgComplete} width=${entry.imgWidth} cacheSize=${entry.cacheKeys}`);
  }
  console.log(`\nSVG hits: ${result.svgHits}`);
  console.log(`Shape fallbacks: ${result.shapeFallbacks}`);

  if (errors.length > 0) {
    console.log('\nJS Errors:', errors);
  }

  await browser.close();
})();
