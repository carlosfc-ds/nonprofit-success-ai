/**
 * ProPublica Nonprofit Explorer API v2 integration.
 *
 * The API is public (no key required) but sends NO CORS headers, so it cannot be
 * called directly from the browser — these functions hit our own /api/nonprofits
 * proxy (see server.ts), which forwards to
 * https://projects.propublica.org/nonprofits/api/v2 from the same origin.
 *
 * Used by the Dashboard registration flow to match a newly-registered nonprofit
 * against its IRS/ProPublica record (EIN + NTEE classification). ProPublica only
 * covers tax-exempt orgs, so callers must gate this on type === 'nonprofit'.
 */

// Subset of ProPublica's search-result fields we actually consume.
export interface ProPublicaOrg {
  ein: number;            // numeric EIN, e.g. 923802462 — used for the detail lookup
  strein: string;         // formatted EIN, e.g. "92-3802462" — used for display/storage
  name: string;
  sub_name?: string;
  city: string;
  state: string;
  ntee_code: string | null;
  score: number;          // ProPublica's own relevance score
}

export interface ProPublicaSearchResponse {
  total_results: number;
  organizations: ProPublicaOrg[];
}

// The resolved match we persist onto a Business.
export interface NonprofitMatch {
  ein: string;            // strein form, e.g. "92-3802462"
  name: string;           // official IRS name
  ntee_code: string | null;
  city: string;
  state: string;
  score: number;
  confidence: 'high' | 'low';
}

const PROXY_BASE = '/api/nonprofits';

type RequestOpts = { isDemo?: boolean; signal?: AbortSignal };

/**
 * Stage one: keyword search. Defaults to state=NY since the whole product is
 * NYC-focused. Returns the raw candidate list (each carries a relevance `score`).
 */
export async function searchOrganizations(
  { q, state = 'NY', page = 0 }: { q: string; state?: string; page?: number },
  opts: RequestOpts = {},
): Promise<ProPublicaSearchResponse> {
  if (opts.isDemo) return demoSearch(q);
  if (!q.trim()) return { total_results: 0, organizations: [] };

  const params = new URLSearchParams({ q, page: String(page) });
  if (state) params.set('state', state); // the proxy re-maps this to ProPublica's state[id]

  const res = await fetch(`${PROXY_BASE}/search?${params}`, { signal: opts.signal });
  if (!res.ok) throw new Error(`ProPublica search failed: ${res.status}`);
  return res.json();
}

/**
 * Stage two: authoritative record for a matched EIN (financials, address, NTEE).
 * Exposed for a future "verified profile" view; the Dashboard flow only needs
 * the search result, so this is not called there yet.
 */
export async function getOrganization(
  ein: number | string,
  opts: RequestOpts = {},
): Promise<unknown> {
  if (opts.isDemo) return null;
  const digits = String(ein).replace(/\D/g, '');
  const res = await fetch(`${PROXY_BASE}/${digits}`, { signal: opts.signal });
  if (!res.ok) throw new Error(`ProPublica lookup failed: ${res.status}`);
  return res.json();
}

// --- Matching -------------------------------------------------------------
// Deterministic name-resolution stand-in (same pattern as scoutRouting.ts): a
// future Claude call could do fuzzy entity resolution behind this same signature.

const NAME_STOPWORDS =
  /\b(the|inc|incorporated|foundation|fund|corp|corporation|company|co|of|for|and|a|an|assn|association|society|services?|nyc|new york)\b/g;

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(NAME_STOPWORDS, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Fraction of shared tokens over the larger name (0..1). */
function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let hits = 0;
  ta.forEach(t => { if (tb.has(t)) hits++; });
  return hits / Math.max(ta.size, tb.size);
}

/**
 * Rank candidates by ProPublica's relevance `score`, weighted by name overlap,
 * and gate the top hit's trust on how closely the names actually match.
 * `high` confidence is safe to auto-attach; `low` should be human-confirmed.
 */
export function matchNonprofit(orgName: string, results: ProPublicaOrg[]): NonprofitMatch | null {
  if (!results.length) return null;

  const target = normalizeName(orgName);
  const ranked = results
    .map(o => {
      const overlap = tokenOverlap(target, normalizeName(o.name));
      return { o, overlap, combined: o.score * (0.5 + overlap) };
    })
    .sort((a, b) => b.combined - a.combined);

  const top = ranked[0];
  return {
    ein: top.o.strein,
    name: top.o.name,
    ntee_code: top.o.ntee_code,
    city: top.o.city,
    state: top.o.state,
    score: top.o.score,
    confidence: top.overlap >= 0.6 ? 'high' : 'low',
  };
}

// --- Demo mode ------------------------------------------------------------

function demoSearch(q: string): ProPublicaSearchResponse {
  const all: ProPublicaOrg[] = [
    { ein: 131111111, strein: '13-1111111', name: 'The Bronx Literacy Fund Inc', city: 'Bronx', state: 'NY', ntee_code: 'B92', score: 68.4 },
    { ein: 132222222, strein: '13-2222222', name: 'Harlem Youth Development Corp', city: 'New York', state: 'NY', ntee_code: 'O50', score: 41.2 },
    { ein: 133333333, strein: '13-3333333', name: 'Brooklyn Green Eats Collective', city: 'Brooklyn', state: 'NY', ntee_code: 'K30', score: 33.7 },
  ];
  const nq = normalizeName(q);
  const organizations = all.filter(o => tokenOverlap(nq, normalizeName(o.name)) > 0);
  const hits = organizations.length ? organizations : all;
  return { total_results: hits.length, organizations: hits };
}
