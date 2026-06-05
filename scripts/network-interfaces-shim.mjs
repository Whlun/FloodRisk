/**
 * 供 `node --import` 在加载 Vite 之前执行。
 * macOS 在 VPN、网络切换、休眠唤醒后，偶发 `os.networkInterfaces()` → libuv `uv_interface_addresses` 失败，
 * Vite 在 `resolveServerUrls` 阶段会直接退出。此处失败时回退为仅本机回环，避免开发服起不来。
 */
import os from 'node:os';

const original = os.networkInterfaces.bind(os);

/** @returns {import('node:os').NetworkInterfaceInfo[]} */
function loopbackOnly() {
  return [
    {
      address: '127.0.0.1',
      netmask: '255.0.0.0',
      family: 'IPv4',
      mac: '00:00:00:00:00:00',
      internal: true,
      cidr: '127.0.0.1/8',
    },
  ];
}

function safeNetworkInterfaces() {
  try {
    const result = original();
    if (result && typeof result === 'object') {
      return result;
    }
  } catch {
    // 枚举失败时使用回退
  }
  return { lo: loopbackOnly() };
}

try {
  Object.defineProperty(os, 'networkInterfaces', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: safeNetworkInterfaces,
  });
} catch {
  // 极少数环境下 defineProperty 不可用时尽量直接赋值
  os.networkInterfaces = safeNetworkInterfaces;
}
