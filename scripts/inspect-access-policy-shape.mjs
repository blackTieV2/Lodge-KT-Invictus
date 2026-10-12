// Read-only diagnostic. Print field names/types, never policy values or credentials.
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
const domain = 'invictus.layer-8-labs.com';
if (!/^[a-f0-9]{32}$/.test(account || '') || !token) throw Error('Required deployment credentials are unavailable.');
async function get(path) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {
    method: 'GET', redirect: 'error', headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(15000)
  });
  let b; try { b = await r.json(); } catch { throw Error('Cloudflare returned non-JSON. Values suppressed.'); }
  if (!r.ok || !b.success) throw Error(`Read-only Cloudflare request failed: HTTP ${r.status}. Values suppressed.`);
  return b;
}
async function list(path) {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const b = await get(`${path}?page=${page}&per_page=100`);
    if (!Array.isArray(b.result)) throw Error('Invalid list response.');
    all.push(...b.result);
    if (b.result_info?.total_pages ? page >= b.result_info.total_pages : b.result.length < 100) return all;
  }
  throw Error('Pagination bound reached.');
}
const apps = (await list('access/apps')).filter(a => a.domain === domain);
if (apps.length !== 1 || apps[0].name !== 'Invictus Online Register' || apps[0].type !== 'self_hosted' || !/^[a-f0-9-]{36}$/.test(apps[0].id)) throw Error('Invictus Access application identity not confirmed.');
const p = (await list(`access/apps/${apps[0].id}/policies`)).filter(p => p.name === 'Invictus named officers');
if (p.length !== 1) throw Error('Managed policy is missing or ambiguous.');
const fields = Object.keys(p[0]).sort().map(name => ({name: /^[a-z][a-z0-9_]{0,63}$/.test(name) ? name : '[non-schema key redacted]', type: p[0][name] === null ? 'null' : Array.isArray(p[0][name]) ? 'array' : typeof p[0][name]}));
console.log(JSON.stringify({readOnly: true, matchedApplication: true, matchedManagedPolicy: true, fields}, null, 2));
