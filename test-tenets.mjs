import { chromium } from 'playwright';
import http from 'http';

// First test: can Node.js reach localhost:3000?
const testResp = await fetch('http://localhost:3000');
console.log('Node.js can reach localhost:3000:', testResp.status);

// Create a reverse proxy
const proxy = http.createServer(async (req, res) => {
  try {
    const targetUrl = `http://localhost:3000${req.url}`;
    
    let body = null;
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      body = Buffer.concat(chunks);
    }
    
    const headers = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!['host', 'connection'].includes(key.toLowerCase())) {
        headers[key] = value;
      }
    }
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });
    
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    res.writeHead(response.status);
    
    const responseBody = await response.arrayBuffer();
    res.end(Buffer.from(responseBody));
  } catch (err) {
    console.error('Proxy error for', req.url, ':', err.message);
    res.writeHead(502);
    res.end('Bad Gateway: ' + err.message);
  }
});

const proxyServer = await new Promise((resolve) => {
  proxy.listen(0, '0.0.0.0', () => resolve(proxy));
});

const proxyPort = proxyServer.address().port;
console.log('Proxy running on port', proxyPort);

const browser = await chromium.launch({ 
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

try {
  console.log('Navigating to proxy...');
  await page.goto(`http://localhost:${proxyPort}`, { timeout: 20000, waitUntil: 'domcontentloaded' });
  console.log('SUCCESS! Title:', await page.title());
  const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 3000));
  console.log('Body preview:', bodyText);
  await page.screenshot({ path: '/tmp/step1-landing.png', fullPage: true });
  console.log('Screenshot saved');
} catch (err) {
  console.log('ERROR:', err.message.split('\n')[0]);
}

await browser.close();
proxyServer.close();
