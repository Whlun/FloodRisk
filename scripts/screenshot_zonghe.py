#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""综合态势模块 — 组件级颗粒度截图脚本"""

import json, os, random, socket, struct, subprocess, time, http.client, base64
from urllib.parse import urlparse

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 19222
BASE = "http://192.168.0.110:51720"
OUT = "/Volumes/WhlunService/tes/screenshots/综合态势"
W, H = 1920, 1080

os.makedirs(OUT, exist_ok=True)


class WS:
    def __init__(self, url):
        self.url = url
        self.sock = None

    def connect(self):
        p = urlparse(self.url)
        host = p.hostname
        port = p.port or 80
        path = p.path or "/"
        if p.query:
            path += "?" + p.query
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(30)
        self.sock.connect((host, port))
        key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
        hs = (
            f"GET {path} HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\n"
            f"Connection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(hs.encode())
        resp = b""
        while b"\r\n\r\n" not in resp:
            resp += self.sock.recv(4096)

    def send(self, data):
        if isinstance(data, str):
            data = data.encode()
        f = bytearray([0x81])
        l = len(data)
        if l <= 125:
            f.append(0x80 | l)
        elif l <= 65535:
            f.append(0x80 | 126)
            f.extend(struct.pack(">H", l))
        else:
            f.append(0x80 | 127)
            f.extend(struct.pack(">Q", l))
        m = bytes(random.getrandbits(8) for _ in range(4))
        f.extend(m)
        d = bytearray(data)
        for i in range(len(d)):
            d[i] ^= m[i % 4]
        f.extend(d)
        self.sock.sendall(f)

    def recv(self):
        h = self._rx(2)
        if not h:
            return None
        op = h[0] & 0x0F
        masked = (h[1] & 0x80) != 0
        l = h[1] & 0x7F
        if l == 126:
            l = struct.unpack(">H", self._rx(2))[0]
        elif l == 127:
            l = struct.unpack(">Q", self._rx(8))[0]
        mk = self._rx(4) if masked else b""
        d = bytearray(self._rx(l))
        if masked:
            for i in range(len(d)):
                d[i] ^= mk[i % 4]
        if op == 0x8:
            return None
        if op == 0x9:
            self.sock.sendall(bytes([0x8A, len(d)]) + bytes(d))
            return self.recv()
        return d.decode("utf-8") if op == 0x1 else d

    def _rx(self, n):
        d = bytearray()
        while len(d) < n:
            c = self.sock.recv(n - len(d))
            if not c:
                raise ConnectionError
            d.extend(c)
        return bytes(d)

    def close(self):
        if self.sock:
            try: self.sock.close()
            except: pass


class CDP:
    def __init__(self, port):
        self.port = port
        self.ws = None
        self.mid = 0

    def connect(self):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request("GET", "/json")
        pages = json.loads(conn.getresponse().read().decode())
        ws_url = None
        for p in pages:
            if p.get("type") == "page" and "webSocketDebuggerUrl" in p:
                ws_url = p["webSocketDebuggerUrl"]
                break
        if not ws_url:
            raise Exception("No CDP page found")
        self.ws = WS(ws_url)
        self.ws.connect()
        self.cmd("Page.enable")
        self._drain(timeout=3)
        self.cmd("Runtime.enable")
        self._drain(timeout=3)
        self.cmd("Emulation.setDeviceMetricsOverride", {
            "width": W, "height": H, "deviceScaleFactor": 1, "mobile": False
        })
        self._drain(timeout=3)

    def cmd(self, method, params=None):
        self.mid += 1
        msg = {"id": self.mid, "method": method}
        if params: msg["params"] = params
        self.ws.send(json.dumps(msg))
        return self.mid

    def _drain(self, timeout=30):
        t = time.time()
        while time.time() - t < timeout:
            try:
                d = self.ws.recv()
                if d is None: return None
                m = json.loads(d)
                if "id" in m: return m
            except socket.timeout: continue
            except: pass
        return None

    def _wait_response(self, expected=None, timeout=30):
        t = time.time()
        while time.time() - t < timeout:
            try:
                d = self.ws.recv()
                if d is None: return None
                m = json.loads(d)
                if expected is not None and "id" in m and m["id"] == expected:
                    return m
                elif expected is None and "id" in m:
                    return m
            except socket.timeout: continue
            except: pass
        return None

    def navigate(self, url, wait=3):
        mid = self.cmd("Page.navigate", {"url": url})
        t0 = time.time()
        while time.time() - t0 < 30:
            try:
                d = self.ws.recv()
                if d is None: break
                m = json.loads(d)
                if m.get("method") == "Page.loadEventFired": break
            except socket.timeout: continue
            except: break
        time.sleep(wait)

    def screenshot(self, filepath, clip=None):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        params = {"format": "png"}
        if clip: params["clip"] = clip
        mid = self.cmd("Page.captureScreenshot", params)
        resp = self._wait_response(expected=mid, timeout=30)
        if resp and "result" in resp and "data" in resp["result"]:
            img = base64.b64decode(resp["result"]["data"])
            with open(filepath, "wb") as f: f.write(img)
            rel = os.path.relpath(filepath, os.path.dirname(OUT))
            print(f"  ✅ {os.path.basename(filepath)} ({len(img)} bytes)")
            return True
        print(f"  ❌ FAIL: {os.path.basename(filepath)}")
        return False

    def js(self, expression):
        mid = self.cmd("Runtime.evaluate", {
            "expression": expression, "awaitPromise": True, "returnByValue": True
        })
        resp = self._wait_response(expected=mid, timeout=15)
        if resp and "result" in resp and "result" in resp["result"]:
            return resp["result"]["result"].get("value")
        return None

    def js_click(self, js_expr):
        """Execute a JS expression that clicks an element and return result"""
        return self.js(js_expr)

    def click_at(self, x, y):
        self.cmd("Input.dispatchMouseEvent", {
            "type": "mousePressed", "x": x, "y": y,
            "button": "left", "clickCount": 1
        })
        self._drain(timeout=2)
        self.cmd("Input.dispatchMouseEvent", {
            "type": "mouseReleased", "x": x, "y": y,
            "button": "left", "clickCount": 1
        })
        self._drain(timeout=2)

    def get_element_center(self, selector, index=0):
        """Get bounding rect center of an element"""
        res = self.js(f"""
        (function() {{
            var els = document.querySelectorAll('{selector}');
            if (els.length <= {index}) return null;
            var r = els[{index}].getBoundingClientRect();
            return JSON.stringify({{ x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2), w: Math.round(r.width), h: Math.round(r.height), text: (els[{index}].textContent||'').trim().substring(0,40) }});
        }})()
        """)
        if res:
            try: return json.loads(res)
            except: return None
        return None

    def click_element(self, selector, index=0):
        info = self.get_element_center(selector, index)
        if info and "x" in info:
            self.click_at(info["x"], info["y"])
            print(f"  🔘 Clicked: {info.get('text','?')[:30]}")
            return info
        print(f"  ⚠️ Element not found: {selector}[{index}]")
        return None

    def wait_for(self, condition_js, timeout=15):
        t0 = time.time()
        while time.time() - t0 < timeout:
            r = self.js(condition_js)
            if r: return True
            time.sleep(0.5)
        return False

    def scroll_into_view(self, selector, index=0):
        self.js(f"""
        (function() {{
            var els = document.querySelectorAll('{selector}');
            if (els.length > {index}) els[{index}].scrollIntoView({{block:'nearest',behavior:'instant'}});
        }})()
        """)

    def close(self):
        if self.ws: self.ws.close()


def shot(cdp, name, wait=1, clip=None):
    fp = os.path.join(OUT, name)
    if wait: time.sleep(wait)
    return cdp.screenshot(fp, clip=clip)


def main():
    # --- Start Chrome if needed ---
    running = False
    try:
        conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=3)
        conn.request("GET", "/json")
        conn.getresponse()
        running = True
    except: pass

    if not running:
        subprocess.Popen(
            [CHROME, f"--remote-debugging-port={PORT}", "--headless=new",
             "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
             "--use-angle=swiftshader", "--enable-webgl",
             f"--window-size={W},{H}", "--hide-scrollbars", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        time.sleep(5)

    cdp = CDP(PORT)
    cdp.connect()
    print("🚀 CDP Connected\n")

    # ===== Navigate to 综合态势 (via shell) =====
    zonghe_url = (
        f"{BASE}/prototypes/"
        "%E9%9F%B6%E5%B1%B1%E9%AB%98%E6%96%B0%E5%8C%BA%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%BB%BC%E5%90%88%E6%95%B4%E6%B2%BB%E4%B8%80%E5%BC%A0%E5%9B%BE/zonghe"
    )
    print("=== 综合态势 组件级截图 ===")
    cdp.navigate(zonghe_url, wait=12)

    # Verify page loaded properly
    has_map = cdp.js("""(function() { return !!document.querySelector('.zht-root'); })()""")
    print(f"  Page loaded (zht-root): {has_map}")
    has_maplibre = cdp.js("""(function() { return !!document.querySelector('.maplibregl-canvas'); })()""")
    print(f"  MapLibre canvas: {has_maplibre}")

    # 1. Full-page overview
    print("\n📸 1. Full page overview")
    shot(cdp, "综合态势-首页-全屏概览.png", wait=0)

    # 2. Left stat panel — 设施概况
    print("\n📸 2. Left stat panels (scrolling)")
    shot(cdp, "综合态势-左侧-设施概况指标区.png", wait=0)
    
    # Scroll to 生态整治
    cdp.js("""
    (function() {
        var secs = document.querySelectorAll('.zht-left-section');
        if (secs.length >= 2) secs[1].scrollIntoView({block:'start',behavior:'instant'});
    })()
    """)
    time.sleep(0.5)
    shot(cdp, "综合态势-左侧-生态整治指标区.png", wait=0)

    # Scroll to 水利工程
    cdp.js("""
    (function() {
        var secs = document.querySelectorAll('.zht-left-section');
        if (secs.length >= 3) secs[2].scrollIntoView({block:'start',behavior:'instant'});
    })()
    """)
    time.sleep(0.5)
    shot(cdp, "综合态势-左侧-水利工程指标区.png", wait=0)

    # Scroll to 应急协同
    cdp.js("""
    (function() {
        var secs = document.querySelectorAll('.zht-left-section');
        if (secs.length >= 4) secs[3].scrollIntoView({block:'start',behavior:'instant'});
    })()
    """)
    time.sleep(0.5)
    shot(cdp, "综合态势-左侧-应急协同指标区.png", wait=0)

    # Scroll back to top of left panel
    cdp.js("""
    (function() {
        var left = document.querySelector('.zht-left');
        if (left) left.scrollTop = 0;
    })()
    """)
    time.sleep(0.5)

    # 3. Click "泵站" stat card to open detail drawer
    print("\n📸 3. Stat detail drawer")
    cdp.js_click("""
    (function() {
        var cards = document.querySelectorAll('.zht-stat-card:not(.zht-stat-card--disabled)');
        for (var c of cards) {
            if (c.textContent.includes('泵站')) { c.click(); return JSON.stringify({clicked: true, text: c.textContent.trim().substring(0,30)}); }
        }
        return JSON.stringify({clicked: false});
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-指标明细-泵站抽屉展开.png", wait=0)

    # Close drawer
    cdp.js_click("""
    (function() {
        var cards = document.querySelectorAll('.zht-stat-card--active');
        if (cards.length > 0) { cards[0].click(); return 'closed'; }
        var close = document.querySelector('.zht-stat-drawer__close, .zht-stat-drawer__hd button');
        if (close) { close.click(); return 'closed via btn'; }
        return 'not found';
    })()
    """)
    time.sleep(1)

    # 4. Map toolbar — take a close-up of toolbar area
    print("\n📸 4. Map vertical toolbar")
    # The toolbar is inside .zht-body-main, at top-left
    shot(cdp, "综合态势-地图工具条-全部.png", wait=0)

    # 5. Layer control popover (③)
    print("\n📸 5. Layer control popover")
    # Find and click the layer control button (3rd tool button)
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        for (var b of btns) {
            if (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('图层')) { b.click(); return 'clicked'; }
        }
        // fallback: click 3rd button
        if (btns.length >= 3) { btns[2].click(); return 'fallback 3rd'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-地图工具条-图层控制弹窗.png", wait=0)
    # Close by clicking again
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn--on');
        if (btns.length > 0) { btns[0].click(); }
        var popovers = document.querySelectorAll('.ant-popover');
        popovers.forEach(function(p) { p.style.display = 'none'; });
    })()
    """)
    time.sleep(0.5)

    # 6. Map style popover (⑤)
    print("\n📸 6. Map style popover")
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        for (var b of btns) {
            if (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('样式')) { b.click(); return 'clicked'; }
        }
        if (btns.length >= 5) { btns[4].click(); return 'fallback 5th'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-地图工具条-地图样式弹窗.png", wait=0)
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn--on');
        if (btns.length > 0) btns[0].click();
    })()
    """)
    time.sleep(0.5)

    # 7. View preset popover (⑦)
    print("\n📸 7. Map view presets popover")
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        for (var b of btns) {
            if (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('视角')) { b.click(); return 'clicked'; }
        }
        if (btns.length >= 7) { btns[6].click(); return 'fallback 7th'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-地图工具条-地图视角弹窗.png", wait=0)
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn--on');
        if (btns.length > 0) btns[0].click();
    })()
    """)
    time.sleep(0.5)

    # 8. POI hint config popover (②)
    print("\n📸 8. POI hint config popover")
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        for (var b of btns) {
            if (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('POI')) { b.click(); return 'clicked'; }
        }
        if (btns.length >= 2) { btns[1].click(); return 'fallback 2nd'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-地图工具条-POI提示配置弹窗.png", wait=0)
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn--on');
        if (btns.length > 0) btns[0].click();
    })()
    """)
    time.sleep(0.5)

    # 9. Right panel — Analysis dashboard (default)
    print("\n📸 9. Right panel — Analysis Dashboard")
    shot(cdp, "综合态势-右侧-分析看板-整体.png", wait=0)

    # This is a three-part dashboard. Try to capture individual sections
    # by evaluating their visibility
    
    # 10. Right panel — switch to Map Search
    print("\n📸 10. Right panel — Map Search Panel")
    # Click the search tool button (①)
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        if (btns.length >= 1) { btns[0].click(); return 'clicked search'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-右侧-搜索面板-条件查询.png", wait=0)

    # Switch to 空间要素查询 tab
    cdp.js("""
    (function() {
        var tabs = document.querySelectorAll('.ant-tabs-tab');
        for (var t of tabs) {
            if (t.textContent.includes('空间要素')) { t.click(); return 'clicked'; }
        }
        return 'not found';
    })()
    """)
    time.sleep(1)
    shot(cdp, "综合态势-右侧-搜索面板-空间要素查询.png", wait=0)

    # Go back to analysis dashboard
    cdp.js("""
    (function() {
        var links = document.querySelectorAll('a, button, [role="button"]');
        for (var l of links) {
            if (l.textContent.includes('分析看板') || l.textContent.includes('返回')) { l.click(); return 'clicked'; }
        }
        // fallback: click search button again
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        if (btns.length >= 1) { btns[0].click(); return 'fallback search toggle'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)

    # 11. Alarm panel — click alarm trigger in shell header
    print("\n📸 11. Alarm Panel")
    alarm_trigger = cdp.js_click("""
    (function() {
        var tr = document.querySelector('.ss-one-map-shell__alarm-trigger');
        if (tr) { tr.click(); return 'clicked alarm trigger'; }
        // fallback: try .ant-badge with bell
        var badges = document.querySelectorAll('.ant-badge');
        for (var b of badges) { b.click(); return 'clicked badge'; }
        return 'not found';
    })()
    """)
    print(f"  Alarm trigger: {alarm_trigger}")
    time.sleep(2)
    shot(cdp, "综合态势-右侧-报警看板-侧栏态.png", wait=0)

    # Expand alarm (overlay mode)
    cdp.js("""
    (function() {
        var expand = document.querySelector('.zht-stat-drawer__expand button, .zht-stat-drawer__expand [role="button"], .anticon-menu-fold, .anticon-menu-unfold');
        if (expand) { expand.click(); return 'expanded'; }
        // try clicking the expand icon
        var btns = document.querySelectorAll('.zht-stat-drawer__hd button');
        if (btns.length >= 2) { btns[1].click(); return 'expanded btn2'; }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    
    # Check if alarm is in overlay/expanded state
    expanded = cdp.js("""
    (function() {
        var overlay = document.querySelector('.zht-alarm-rail--expanded');
        return !!overlay;
    })()
    """)
    print(f"  Alarm expanded: {expanded}")
    shot(cdp, "综合态势-右侧-报警看板-铺满态.png", wait=0)

    # Close alarm
    cdp.js("""
    (function() {
        var close = document.querySelector('.zht-stat-drawer__hd button:first-child, .zht-stat-drawer__close');
        if (close) { close.click(); return 'closed'; }
        // click alarm trigger again
        var tr = document.querySelector('.ss-one-map-shell__alarm-trigger');
        if (tr) { tr.click(); return 'closed via trigger'; }
        return 'not found';
    })()
    """)
    time.sleep(1)

    # 12. Section trace analysis entry (if visible)
    print("\n📸 12. Section trace & pollution source")
    shot(cdp, "综合态势-地图-设施点位概览.png", wait=0)

    # 13. Map with expanded view (zoom in)
    cdp.js("""
    (function() {
        var zoomIn = document.querySelectorAll('.zht-map-tool-btn');
        for (var b of zoomIn) {
            if (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('放大')) { b.click(); return 'zoomed'; }
        }
        return 'not found';
    })()
    """)
    time.sleep(1.5)
    shot(cdp, "综合态势-地图-放大后视图.png", wait=0)

    # Reset view
    cdp.js("""
    (function() {
        var btns = document.querySelectorAll('.zht-map-tool-btn');
        for (var b of btns) {
            if (b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('复位')) { b.click(); return 'reset'; }
        }
        return 'not found';
    })()
    """)
    time.sleep(1)

    cdp.close()
    print("\n✅ === 综合态势截图完成! ===")
    print(f"📁 截图目录: {OUT}")
    # List all generated files
    for f in sorted(os.listdir(OUT)):
        if f.endswith('.png'):
            sz = os.path.getsize(os.path.join(OUT, f))
            print(f"  📷 {f} ({sz:,} bytes)")


if __name__ == "__main__":
    main()