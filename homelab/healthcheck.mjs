// Docker liveness, not proof of public sign-in or membership-data readiness.
try {
  const response = await fetch(`http://127.0.0.1:${Number(process.env.PORT || 8080)}/healthz`, { signal: AbortSignal.timeout(3000) });
  process.exit(response.ok && (await response.json()).status === 'ok' ? 0 : 1);
} catch { process.exit(1); }
