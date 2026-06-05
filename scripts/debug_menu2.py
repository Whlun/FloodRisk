#!/usr/bin/env python3
import base64, json, os, random, socket, struct, subprocess, time, http.client
from urllib.parse import urlparse

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 19222
BASE = "http://192.168.0.110:51720"
W, H = 1920, 1080

class WS:
    def __init__(self, url):
        self.url = url; self.sock = None
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
    def __init__(self, port):
        self.port = port; self.ws = None; self.mid = 0
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

# Test 应急协同 - click 风险识别 then check submenu
print("=== 应急协同: 点击风险识别后 ===")
cdp.navigate(f"{BASE}/prototypes/%E5%BA%94%E6%80%A5%E5%8D%8F%E5%90%8C", wait=5)

# Click 风险识别
result = cdp.js("""
(function() {
    var els = document.querySelectorAll('.sidebar-menu-item');
    for (var i = 0; i < els.length; i++) {
        if (els[i].textContent.trim().indexOf('风险识别') >= 0) {
            els[i].click();
            return 'clicked: ' + els[i].textContent.trim();
        }
    }
    return 'not found';
})()
""")
print(f"  {result}")
time.sleep(1)

# Check submenu items after click
result = cdp.js("""
(function() {
    var items = document.querySelectorAll('.sidebar-submenu-item');
    var out = [];
    for (var i = 0; i < items.length; i++) {
        var t = items[i].textContent.trim();
        out.push(t.substring(0, 40) + ' | vis=' + (items[i].offsetParent !== null));
    }
    return JSON.stringify(out);
})()
""")
print(f"  Submenu items: {result}")

# Try clicking 风险源企业信息
result = cdp.js("""
(function() {
    var els = document.querySelectorAll('.sidebar-submenu-item');
    for (var i = 0; i < els.length; i++) {
        var t = els[i].textContent.trim();
        if (t.indexOf('风险源企业') >= 0) {
            els[i].click();
            return 'clicked: ' + t;
        }
    }
    return 'not found. Items: ' + Array.from(els).map(e => e.textContent.trim().substring(0,20)).join(', ');
})()
""")
print(f"  Click result: {result}")

# Test 系统管理 - click 污染源信息 then check nested
print("\n=== 系统管理: 点击污染源信息后 ===")
cdp.navigate(f"{BASE}/prototypes/%E9%9F%B6%E5%B1%B1%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86", wait=5)

# Check nested items visibility
result = cdp.js("""
(function() {
    var items = document.querySelectorAll('.sidebar-submenu-item.sidebar-submenu-nested');
    var out = [];
    for (var i = 0; i < items.length; i++) {
        var t = items[i].textContent.trim();
        out.push(t.substring(0, 30) + ' | vis=' + (items[i].offsetParent !== null) + ' | disp=' + getComputedStyle(items[i]).display);
    }
    return JSON.stringify(out);
})()
""")
print(f"  Nested items: {result}")

# Try clicking 农村污水及集中处理设施
result = cdp.js("""
(function() {
    var els = document.querySelectorAll('.sidebar-submenu-item.sidebar-submenu-nested');
    for (var i = 0; i < els.length; i++) {
        var t = els[i].textContent.trim();
        if (t.indexOf('农村污水') >= 0) {
            els[i].click();
            return 'clicked: ' + t;
        }
    }
    return 'not found. Items: ' + Array.from(els).map(e => e.textContent.trim().substring(0,20)).join(', ');
})()
""")
print(f"  Click result: {result}")

cdp.close()
