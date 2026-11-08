// Entorno para lanzar Wrangler en local: sin variables de proxy (si no, el Worker enviaría sus peticiones al proxy).
export function localEnv() {
  const env = { ...process.env, CI: '1', WRANGLER_SEND_METRICS: 'false' };
  for (const k of Object.keys(env)) if (/^(https?_proxy|global_agent_https?_proxy|npm_config_https?_proxy|yarn_https?_proxy)$/i.test(k)) delete env[k];
  return env;
}

/** Arranca `wrangler dev` en su propio grupo de procesos para poder pararlo entero (wrangler + workerd). */
import { spawn } from 'node:child_process';
export function startWrangler(cwd, onOutput = () => {}) {
  const child = spawn('npx', ['wrangler', 'dev', '--local', '--port', '8787', '--ip', '127.0.0.1', '--log-level', 'log'], { cwd, env: localEnv(), detached: true });
  child.stdout.on('data', (d) => onOutput(String(d))); child.stderr.on('data', (d) => onOutput(String(d)));
  return { child, stop: () => { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* ya terminó */ } } };
}
