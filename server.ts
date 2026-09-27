/**
 * Same-origin proxy for the ProPublica Nonprofit Explorer API v2.
 *
 * ProPublica's API is public (no key) but sends no CORS headers, so a browser
 * fetch from the app's origin is blocked. This tiny Express server forwards the
 * request server-side (where CORS doesn't apply) and returns the JSON verbatim.
 *
 *   Dev:  run alongside Vite — `npm run server` (listens on :3001).
 *         Vite proxies /api → :3001 (see vite.config.ts).
 *   Prod: the same server can also serve the built dist/ on the Cloud Run applet.
 */
import express from 'express';

const app = express();
const PORT = process.env.SEARCH_PROXY_PORT ? Number(process.env.SEARCH_PROXY_PORT) : 3001;
const BASE_URL = 'https://projects.propublica.org/nonprofits/api/v2';

// Stage one — keyword search. `search` is declared before `:ein` so it isn't
// swallowed by the parameterized route.
app.get('/api/nonprofits/search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (!q) return res.status(400).json({ error: 'missing required query param: q' });

  const params = new URLSearchParams({ q, page: String(req.query.page ?? 0) });
  if (req.query.state) params.set('state[id]', String(req.query.state)); // client sends ?state=NY

  try {
    const upstream = await fetch(`${BASE_URL}/search.json?${params}`);
    const body = await upstream.text();
    // Quirk: ProPublica returns 404 (with a valid JSON body) when a search
    // yields zero results. That's a successful empty search, not an error —
    // normalize it to 200 so the client gets clean empty results.
    const status = upstream.status === 404 && body.includes('"total_results"') ? 200 : upstream.status;
    res.status(status).type('application/json').send(body);
  } catch (err) {
    console.error('ProPublica search proxy error:', err);
    res.status(502).json({ error: 'ProPublica upstream unavailable' });
  }
});

// Stage two — authoritative record by EIN.
app.get('/api/nonprofits/:ein', async (req, res) => {
  const ein = String(req.params.ein).replace(/\D/g, '');
  try {
    const upstream = await fetch(`${BASE_URL}/organizations/${ein}.json`);
    const body = await upstream.text();
    res.status(upstream.status).type('application/json').send(body);
  } catch (err) {
    console.error('ProPublica org proxy error:', err);
    res.status(502).json({ error: 'ProPublica upstream unavailable' });
  }
});

app.listen(PORT, () => {
  console.log(`ProPublica proxy listening on http://localhost:${PORT}`);
});
