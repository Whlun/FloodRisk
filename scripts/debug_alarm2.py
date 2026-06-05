#!/usr/bin/env python3
import base64, json, os, random, socket, struct, subprocess, time, http.client
from urllib.parse import urlparse

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 19222
BASE = "http://192.168.0.110:51720"
W, H = 1920, 1080

class WS:
    def __init__(self, url): self.url = url; self.sock = None
    def connect(self):
        p = urlparse(self.url); host = p.hostname; port = p.port or 80
        path = p.path or "/"
        if p.query: path += "?" + p.query
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(30); self.sock.connect((host, port))
        key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
        hs = f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        self.sock.sendall(hs.encode())
        resp = b""
        while b"\r\n\r\n" not in resp: resp += self.sock.recv(4096)
    def send(self, data):
        if isinstance(data, str): data = data.encode()
        f = bytearray([0x81]); l = len(data)
        if l <= 125: f.append(0x80 | l)
        elif l <= 65535: f.append(0x80 | 126); f.extend(struct.pack(">H", l))
        else: f.append(0x80 | 127); f.extend(struct.pack(">Q", l))
        m = bytes(random.getrandbits(8) for _ in range(4)); f.extend(m)
        d = bytearray(data)
        for i in range(len(d)): d[i] ^= m[i % 4]
        f.extend(d); self.sock.sendall(f)
    def recv(self):
        h = self._rx(2)
        if not h: return None
        op = h[0] & 0x0F; masked = (h[1] & 0x80) != 0; l = h[1] & 0x7F
        if l == 126: l = struct.unpack(">H", self._rx(2))[0]
        elif l == 127: l = struct.unpack(">Q", self._rx(8))[0]
        mk = self._rx(4) if masked else b""
        d = bytearray(self._rx(l))
        if masked:
            for i in range(len(d)): d[i] ^= mk[i % 4]
        if op == 0x8: return None
        if op == 0x9: self.sock.sendall(bytes([0x8A, len(d)]) + bytes(d)); return self.recv()
        return d.decode("utf-8") if op == 0x1 else d
    def _rx(self, n):
        d = bytearray()
        while len(d) < n:
            c = self.sock.recv(n - len(d))
            if not c: raise ConnectionError
            d.extend(c)
        return bytes(d)
    def close(self):
        if self.sock:
            try: self.sock.close()
            except: pass

class CDP:
    def __init__(self, port): self.port = port; self.ws = None; self.mid = 0
    def connect(self):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request("GET", "/json")
        pages = json.loads(conn.getresponse().read().decode())
        ws_url = None
        for p in pages:
            if p.get("type") == "page" and "webSocketDebuggerUrl" in p:
                ws_url = p["webSocketDebuggerUrl"]; break
        if not ws_url: raise Exception("No CDP page found")
        self.ws = WS(ws_url); self.ws.connect()
        self.cmd("Page.enable"); self._recv(timeout=3)
        self.cmd("Runtime.enable"); self._recv(timeout=3)
        self.cmd("Emulation.setDeviceMetricsOverride", {"width": W, "height": H, "deviceScaleFactor": 2, "mobile": False})
        self._recv(timeout=3)
    def cmd(self, method, params=None):
        self.mid += 1; msg = {"id": self.mid, "method": method}
        if params: msg["params"] = params
        self.ws.send(json.dumps(msg)); return self.mid
    def _recv(self, expected=None, timeout=30):
        t = time.time()
        while time.time() - t < timeout:
            try:
                d = self.ws.recv()
                if d is None: return None
                m = json.loads(d)
                if expected is not None and "id" in m and m["id"] == expected: return m
                elif expected is None and "id" in m: return m
            except socket.timeout: continue
            except: pass
        return None
    def navigate(self, url, wait=3):
        mid = self.cmd("Page.navigate", {"url": url})
        t = time.time()
        while time.time() - t < 30:
            try:
                d = self.ws.recv()
                if d is None: break
                m = json.loads(d)
                if m.get("method") == "Page.loadEventFired": break
            except socket.timeout: continue
            except: break
        time.sleep(wait)
    def js(self, expression):
        mid = self.cmd("Runtime.evaluate", {"expression": expression, "awaitPromise": True, "returnByValue": True})
        resp = self._recv(expected=mid, timeout=15)
        if resp and "result" in resp and "result" in resp["result"]:
            return resp["result"]["result"].get("value")
        return None
    def close(self):
        if self.ws: self.ws.close()

running = False
try:
    conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=3)
    conn.request("GET", "/json"); conn.getresponse(); running = True
except: pass
if not running:
    subprocess.Popen([CHROME, f"--remote-debugging-port={PORT}", "--headless=new", "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage", f"--window-size={W},{H}", "--hide-scrollbars", "about:blank"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(4)

cdp = CDP(PORT)
cdp.connect()

print("=== 综合态势: 检查页面结构 ===")
cdp.navigate(f"{BASE}/prototypes/%E9%9F%B6%E5%B1%B1%E9%AB%98%E6%96%B0%E5%8C%BA%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%BB%BC%E5%90%88%E6%95%B4%E6%B2%BB%E4%B8%80%E5%BC%A0%E5%9B%BE/zonghe", wait=6)

# Check iframes
result = cdp.js("""
(function() {
    var iframes = document.querySelectorAll('iframe');
    var out = [];
    for (var i = 0; i < iframes.length; i++) {
        out.push({
            src: iframes[i].src || iframes[i].getAttribute('src') || '',
            id: iframes[i].id || '',
            className: iframes[i].className || ''
        });
    }
    return JSON.stringify({
        iframeCount: iframes.length,
        iframes: out,
        bodyText: document.body.textContent.trim().substring(0, 200)
    });
})()
""")
print(f"  Page structure: {result}")

# Check the main page content
result = cdp.js("""
(function() {
    var allElements = document.querySelectorAll('*');
    var classStats = {};
    for (var i = 0; i < allElements.length; i++) {
        var cn = allElements[i].className;
        if (typeof cn === 'string' && cn.indexOf('ss-one-map') >= 0) {
            return 'Found ss-one-map element: ' + cn.substring(0, 100);
        }
        if (typeof cn === 'string' && cn.indexOf('alarm') >= 0) {
            return 'Found alarm element: ' + cn.substring(0, 100);
        }
    }
    return 'No ss-one-map or alarm elements found. Total elements: ' + allElements.length;
})()
""")
print(f"  Element search: {result}")

# List all CDP targets to find iframe targets
conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
conn.request("GET", "/json")
pages = json.loads(conn.getresponse().read().decode())
print(f"\n  CDP targets ({len(pages)}):")
for p in pages:
    print(f"    type={p.get('type')} url={p.get('url', '')[:100]} title={p.get('title', '')[:50]}")

cdp.close()
