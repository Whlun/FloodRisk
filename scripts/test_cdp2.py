#!/usr/bin/env python3
import base64, json, os, random, socket, struct, time, http.client
from urllib.parse import urlparse

PORT = 19222
OUT = "/Volumes/WhlunService/AxhubMake/docs/screenshots"
os.makedirs(OUT, exist_ok=True)

class WS:
    def __init__(self, url):
        self.url = url; self.sock = None
    def connect(self):
        p = urlparse(self.url); host = p.hostname; port = p.port or 80
        path = p.path or "/"
        if p.query: path += "?" + p.query
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(30)
        self.sock.connect((host, port))
        key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
        hs = f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        self.sock.sendall(hs.encode())
        resp = b""
        while b"\r\n\r\n" not in resp: resp += self.sock.recv(4096)
        print("WebSocket handshake complete")
    def send(self, data):
        if isinstance(data, str): data = data.encode()
        f = bytearray([0x81])
        l = len(data)
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
        if op == 0x9:
            self.sock.sendall(bytes([0x8A, len(d)]) + bytes(d)); return self.recv()
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

# Get WS URL
conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=10)
conn.request("GET", "/json")
pages = json.loads(conn.getresponse().read().decode())
ws_url = None
for p in pages:
    if p.get("type") == "page" and "webSocketDebuggerUrl" in p:
        ws_url = p["webSocketDebuggerUrl"]
        break
print(f"WS URL: {ws_url}")
if not ws_url:
    print("ERROR: No page CDP URL"); exit(1)

ws = WS(ws_url)
ws.connect()

mid = 0
def cmd(method, params=None):
    global mid
    mid += 1
    msg = {"id": mid, "method": method}
    if params: msg["params"] = params
    ws.send(json.dumps(msg))
    return mid

def recv_id(expected, timeout=30):
    t = time.time()
    while time.time() - t < timeout:
        try:
            d = ws.recv()
            if d is None: return None
            m = json.loads(d)
            if "id" in m and m["id"] == expected:
                return m
        except socket.timeout: continue
        except: pass
    return None

# Enable Page
r = cmd("Page.enable")
resp = recv_id(r, timeout=5)
print(f"Page.enable: {resp is not None and 'result' in (resp or {})}")

# Navigate
r = cmd("Page.navigate", {"url": "http://192.168.0.110:51720/prototypes/%E9%9F%B6%E5%B1%B1%E9%AB%98%E6%96%B0%E5%8C%BA%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%BB%BC%E5%90%88%E6%95%B4%E6%B2%BB%E4%B8%80%E5%BC%A0%E5%9B%BE/zonghe"})
# Wait for load event
t = time.time()
while time.time() - t < 30:
    try:
        d = ws.recv()
        if d is None: break
        m = json.loads(d)
        if m.get("method") == "Page.loadEventFired":
            print("Page loaded!")
            break
    except socket.timeout: continue
    except: break

time.sleep(5)

# Screenshot
r = cmd("Page.captureScreenshot", {"format": "png"})
resp = recv_id(r, timeout=30)
print(f"Screenshot resp id={resp.get('id') if resp else None}")
if resp and "result" in resp and "data" in resp["result"]:
    img = base64.b64decode(resp["result"]["data"])
    fp = os.path.join(OUT, "test_cdp2.png")
    with open(fp, "wb") as f: f.write(img)
    print(f"OK! Saved {fp} ({len(img)} bytes)")
elif resp:
    print(f"FAIL: {str(resp)[:500]}")
else:
    print("FAIL: no response")

ws.close()
