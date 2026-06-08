#!/usr/bin/env node
/**
 * 开发服务启停：避免「端口已占用」误报为启动失败。
 * - start：端口健康则提示已在运行；否则启动
 * - restart：先释放 51720 再启动
 * - stop：结束占用 51720 的进程
 */
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 51720;
const HEALTH_URL = `http://127.0.0.1:${PORT}/health`;
const VITE_ARGS = [
  '--import',
  './scripts/network-interfaces-shim.mjs',
  './node_modules/vite/bin/vite.js',
];

const mode = process.argv[2] || 'start';

function listListenPids() {
  try {
    const out = execSync(`lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    return out ? [...new Set(out.split('\n').map((x) => x.trim()).filter(Boolean))] : [];
  } catch {
    return [];
  }
}

function killPort() {
  const pids = listListenPids();
  for (const pid of pids) {
    try {
      execSync(`kill ${pid}`);
    } catch {
      try {
        execSync(`kill -9 ${pid}`);
      } catch {
        // ignore
      }
    }
  }
  return pids;
}

async function isHealthy() {
  try {
    const res = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

function printRunningHint() {
  console.log('');
  console.log('✅ 开发服务已在运行，无需重复启动：');
  console.log(`   http://localhost:${PORT}/`);
  console.log('');
  console.log('如需先停再起，请执行：npm run restart');
  console.log('');
}

function startVite() {
  const child = spawn(process.execPath, VITE_ARGS, {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 0);
  });
}

async function main() {
  if (mode === 'stop') {
    const pids = killPort();
    if (pids.length) {
      console.log(`已停止开发服务（PID: ${pids.join(', ')}）`);
    } else {
      console.log('51720 端口当前没有开发服务在运行');
    }
    return;
  }

  if (mode === 'restart') {
    const pids = killPort();
    if (pids.length) {
      console.log(`已结束旧进程（PID: ${pids.join(', ')}），正在重新启动…`);
    }
    await sleep(800);
    startVite();
    return;
  }

  if (mode !== 'start') {
    console.error(`未知命令: ${mode}（可用: start | restart | stop）`);
    process.exit(1);
  }

  if (await isHealthy()) {
    printRunningHint();
    return;
  }

  const stale = listListenPids();
  if (stale.length) {
    console.log('检测到 51720 被占用但服务无响应，正在清理旧进程…');
    killPort();
    await sleep(800);
  }

  startVite();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
