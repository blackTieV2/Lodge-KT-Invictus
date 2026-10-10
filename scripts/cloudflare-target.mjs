// One production hostname, entirely on Cloudflare. No home-lab origin.
export const HOSTNAME = 'invictus.layer-8-labs.com';
export const ZONE_NAME = 'layer-8-labs.com';
export const WORKER_NAME = 'invictus-register';
export function cloudflareTarget(config) {
  const routes = config?.routes;
  if (config?.name !== WORKER_NAME || config.workers_dev !== false || config.preview_urls !== false ||
      config.route !== undefined || (config.env && Object.keys(config.env).length) ||
      !Array.isArray(routes) || routes.length !== 1 || routes[0].pattern !== HOSTNAME ||
      routes[0].custom_domain !== true || routes[0].previews_enabled === true ||
      config.assets?.run_worker_first !== true) {
    throw Error('Deployment must use only the approved Cloudflare Custom Domain, with signed access first and alternate URLs disabled.');
  }
  return HOSTNAME;
}
export function checkDomainOwnership(zone, bindings, records, account) {
  if (!zone || zone.name !== ZONE_NAME || zone.status !== 'active' || zone.account?.id !== account ||
      !/^[a-f0-9]{32}$/.test(zone.id || '') || !Array.isArray(bindings) || !Array.isArray(records)) {
    throw Error('The active domain and its ownership must be verified before deployment.');
  }
  const sameHost = bindings.filter(b => b.hostname === HOSTNAME);
  if (sameHost.length > 1 || sameHost.some(b => b.service !== WORKER_NAME || b.zone_id !== zone.id ||
      (b.environment && b.environment !== 'production'))) {
    throw Error('This hostname belongs to another Worker or environment. No takeover is permitted.');
  }
  if (!sameHost.length && records.some(r => r.name === HOSTNAME)) {
    throw Error('An existing DNS record occupies the hostname. Nothing was deleted; review that record before deployment.');
  }
  return sameHost.length === 1;
}
export function acceptedAnonymousProbe(status, location, issuer) {
  if (status === 401 || status === 403) return true;
  if (status !== 302 && status !== 303) return false;
  try {
    const u = new URL(location);
    return u.origin === issuer && u.pathname.startsWith('/cdn-cgi/access/login') && !u.username && !u.password;
  } catch { return false; }
}
