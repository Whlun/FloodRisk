#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import base64, json, os, random, socket, struct, subprocess, time, http.client
from urllib.parse import urlparse

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 19222
BASE = "http://192.168.0.110:51720"
OUT = "/Volumes/WhlunService/AxhubMake/docs/screenshots"
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
            try:
                self.sock.close()
            except:
                pass


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
        self._recv(timeout=3)
        self.cmd("Runtime.enable")
        self._recv(timeout=3)
        self.cmd("DOM.enable")
        self._recv(timeout=3)
        self.cmd("Emulation.setDeviceMetricsOverride", {
            "width": W, "height": H, "deviceScaleFactor": 2, "mobile": False
        })
        self._recv(timeout=3)

    def cmd(self, method, params=None):
        self.mid += 1
        msg = {"id": self.mid, "method": method}
        if params:
            msg["params"] = params
        self.ws.send(json.dumps(msg))
        return self.mid

    def _recv(self, expected=None, timeout=30):
        t = time.time()
        while time.time() - t < timeout:
            try:
                d = self.ws.recv()
                if d is None:
                    return None
                m = json.loads(d)
                if expected is not None and "id" in m and m["id"] == expected:
                    return m
                elif expected is None and "id" in m:
                    return m
            except socket.timeout:
                continue
            except:
                pass
        return None

    def navigate(self, url, wait=3):
        mid = self.cmd("Page.navigate", {"url": url})
        t = time.time()
        while time.time() - t < 30:
            try:
                d = self.ws.recv()
                if d is None:
                    break
                m = json.loads(d)
                if m.get("method") == "Page.loadEventFired":
                    break
            except socket.timeout:
                continue
            except:
                break
        time.sleep(wait)

    def screenshot(self, filepath):
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        mid = self.cmd("Page.captureScreenshot", {"format": "png"})
        resp = self._recv(expected=mid, timeout=30)
        if resp and "result" in resp and "data" in resp["result"]:
            img = base64.b64decode(resp["result"]["data"])
            with open(filepath, "wb") as f:
                f.write(img)
            print(f"  OK: {os.path.relpath(filepath, OUT)} ({len(img)} bytes)")
            return True
        print(f"  FAIL: {os.path.relpath(filepath, OUT)}")
        return False

    def js(self, expression):
        mid = self.cmd("Runtime.evaluate", {
            "expression": expression, "awaitPromise": True, "returnByValue": True
        })
        resp = self._recv(expected=mid, timeout=15)
        if resp and "result" in resp and "result" in resp["result"]:
            return resp["result"]["result"].get("value")
        return None

    def js_click(self, selector, text=None, index=0, scroll_into_view=True):
        text_cond = f"els[i].textContent.trim().indexOf('{text}') >= 0" if text else "true"
        scroll_js = "el.scrollIntoView({block:'center',behavior:'instant'});" if scroll_into_view else ""
        result = self.js(f"""
        (function() {{
            var els = document.querySelectorAll('{selector}');
            var matches = [];
            for (var i = 0; i < els.length; i++) {{
                if ({text_cond}) {{
                    matches.push(els[i]);
                }}
            }}
            if (matches.length <= {index}) return JSON.stringify({{error: 'not found', count: matches.length, selector: '{selector}', text: '{text}'}});
            var el = matches[{index}];
            {scroll_js}
            el.click();
            return JSON.stringify({{ok: true, text: el.textContent.trim().substring(0, 50)}});
        }})()
        """)
        if result:
            try:
                r = json.loads(result)
                if "error" in r:
                    print(f"  WARN: js_click '{selector}' text='{text}' -> {r}")
                    return None
                print(f"  JS_CLICK: '{r['text']}'")
                return r
            except Exception as e:
                print(f"  WARN: js_click parse error: {e}")
        else:
            print(f"  WARN: js_click '{selector}' text='{text}' -> no result")
        return None

    def click_at(self, x, y):
        self.cmd("Input.dispatchMouseEvent", {
            "type": "mousePressed", "x": x, "y": y,
            "button": "left", "clickCount": 1
        })
        self._recv(timeout=3)
        self.cmd("Input.dispatchMouseEvent", {
            "type": "mouseReleased", "x": x, "y": y,
            "button": "left", "clickCount": 1
        })
        self._recv(timeout=3)

    def find_and_click(self, selector, text=None, index=0):
        text_cond = f"els[i].textContent.trim().indexOf('{text}') >= 0" if text else "true"
        result = self.js(f"""
        (function() {{
            var els = document.querySelectorAll('{selector}');
            var matches = [];
            for (var i = 0; i < els.length; i++) {{
                if ({text_cond}) {{
                    matches.push(els[i]);
                }}
            }}
            if (matches.length <= {index}) return JSON.stringify({{error: 'not found', count: matches.length, selector: '{selector}', text: '{text}'}});
            var el = matches[{index}];
            el.scrollIntoView({{block:'center',behavior:'instant'}});
            var rect = el.getBoundingClientRect();
            return JSON.stringify({{
                x: Math.round(rect.left + rect.width / 2),
                y: Math.round(rect.top + rect.height / 2),
                w: Math.round(rect.width),
                h: Math.round(rect.height),
                text: el.textContent.trim().substring(0, 50)
            }});
        }})()
        """)
        if result:
            try:
                pos = json.loads(result)
                if "error" in pos:
                    print(f"  WARN: find_and_click '{selector}' text='{text}' -> {pos}")
                    return None
                self.click_at(pos["x"], pos["y"])
                print(f"  CLICK: '{pos['text']}' at ({pos['x']}, {pos['y']})")
                return pos
            except Exception as e:
                print(f"  WARN: find_and_click parse error: {e}")
        else:
            print(f"  WARN: find_and_click '{selector}' text='{text}' -> no result")
        return None

    def close_modal(self):
        time.sleep(0.5)
        self.js_click(".ant-modal-close-x, .ant-modal-close, .ant-drawer-close")
        time.sleep(0.5)

    def close(self):
        if self.ws:
            self.ws.close()


def shot(cdp, subdir, name, wait=1):
    fp = os.path.join(OUT, subdir, name)
    if wait:
        time.sleep(wait)
    return cdp.screenshot(fp)


def click_menu(cdp, label):
    cdp.js_click(".sidebar-menu-item", label)
    time.sleep(1)


def click_submenu(cdp, label):
    cdp.js_click(".sidebar-submenu-item", label, scroll_into_view=True)
    time.sleep(1.5)


def click_nested(cdp, label):
    cdp.js_click(".sidebar-submenu-item.sidebar-submenu-nested", label, scroll_into_view=True)
    time.sleep(1.5)


def click_parent(cdp, label):
    cdp.js_click(".sidebar-submenu-item.sidebar-submenu-parent", label, scroll_into_view=True)
    time.sleep(1)


def click_button(cdp, label):
    cdp.find_and_click("button", label)
    time.sleep(1.5)


def main():
    running = False
    try:
        conn = http.client.HTTPConnection("127.0.0.1", PORT, timeout=3)
        conn.request("GET", "/json")
        conn.getresponse()
        running = True
    except:
        pass

    if not running:
        subprocess.Popen(
            [CHROME, f"--remote-debugging-port={PORT}", "--headless=new",
             "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
             f"--window-size={W},{H}", "--hide-scrollbars", "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        time.sleep(4)

    cdp = CDP(PORT)
    cdp.connect()
    print("CDP connected\n")

    # ==========================================
    # 1. 综合态势
    # ==========================================
    print("=== 综合态势 ===")
    cdp.navigate(
        f"{BASE}/prototypes/%E9%9F%B6%E5%B1%B1%E9%AB%98%E6%96%B0%E5%8C%BA%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%BB%BC%E5%90%88%E6%95%B4%E6%B2%BB%E4%B8%80%E5%BC%A0%E5%9B%BE/zonghe",
        wait=6
    )
    shot(cdp, "综合态势", "综合态势首页.png", wait=0)

    cdp.js_click(".ss-one-map-shell__alarm-trigger")
    shot(cdp, "综合态势", "报警信息弹窗.png", wait=2)
    cdp.js_click(".ss-one-map-shell__alarm-trigger")

    # ==========================================
    # 2. 设施管理
    # ==========================================
    print("\n=== 设施管理 ===")
    cdp.navigate(
        f"{BASE}/prototypes/%E9%9F%B6%E5%B1%B1%E6%B0%B4%E7%8E%AF%E5%A2%83%E8%AE%BE%E6%96%BD%E7%AE%A1%E7%90%86%E7%B3%BB%E7%BB%9F",
        wait=5
    )
    shot(cdp, "设施管理", "排水管点列表页.png", wait=0)

    click_button(cdp, "新增")
    shot(cdp, "设施管理", "新增排水管点弹窗.png", wait=2)
    cdp.close_modal()

    cdp.find_and_click("a, .ant-btn-link, button", "详情")
    shot(cdp, "设施管理", "排水管点详情弹窗.png", wait=2)
    cdp.close_modal()

    click_menu(cdp, "排水管网")
    click_submenu(cdp, "排水管线")
    shot(cdp, "设施管理", "排水管线列表页.png", wait=2)

    click_submenu(cdp, "管线档案信息")
    shot(cdp, "设施管理", "管线档案信息页.png", wait=2)

    click_menu(cdp, "泵站管理")
    click_submenu(cdp, "泵站信息")
    shot(cdp, "设施管理", "泵站管理列表页.png", wait=2)

    click_submenu(cdp, "泵站统计")
    shot(cdp, "设施管理", "泵站统计页.png", wait=2)

    click_submenu(cdp, "安全指数评估")
    shot(cdp, "设施管理", "泵站安全指数评估页.png", wait=2)

    click_menu(cdp, "排口管理")
    click_submenu(cdp, "入河排口核查列表")
    shot(cdp, "设施管理", "排口管理列表页.png", wait=2)

    click_submenu(cdp, "问题列表")
    shot(cdp, "设施管理", "排口问题列表页.png", wait=2)

    click_submenu(cdp, "责任主体信息")
    shot(cdp, "设施管理", "排口责任主体信息页.png", wait=2)

    click_menu(cdp, "污水厂管理")
    click_submenu(cdp, "污水厂信息")
    shot(cdp, "设施管理", "污水厂管理列表页.png", wait=2)

    click_submenu(cdp, "运维信息")
    shot(cdp, "设施管理", "污水厂运维信息页.png", wait=2)

    click_menu(cdp, "事件管理")
    click_submenu(cdp, "事件列表")
    shot(cdp, "设施管理", "事件管理列表页.png", wait=2)

    click_submenu(cdp, "事件统计")
    shot(cdp, "设施管理", "事件统计页.png", wait=2)

    click_menu(cdp, "排水户")
    shot(cdp, "设施管理", "排水户管理列表页.png", wait=2)

    # ==========================================
    # 3. 生态整治
    # ==========================================
    print("\n=== 生态整治 ===")
    cdp.navigate(f"{BASE}/prototypes/%E7%94%9F%E6%80%81%E6%95%B4%E6%B2%BB", wait=5)
    shot(cdp, "生态整治", "项目档案列表页.png", wait=0)

    click_button(cdp, "新增")
    shot(cdp, "生态整治", "新增项目档案弹窗.png", wait=2)
    cdp.close_modal()

    cdp.find_and_click("a, .ant-btn-link, button", "详情")
    shot(cdp, "生态整治", "项目档案详情弹窗.png", wait=2)
    cdp.close_modal()

    click_submenu(cdp, "项目汇总统计")
    shot(cdp, "生态整治", "项目汇总统计页.png", wait=2)

    click_menu(cdp, "河湖长制")
    time.sleep(1)
    click_submenu(cdp, "责任段信息")
    shot(cdp, "生态整治", "责任段信息页.png", wait=2)

    click_nested(cdp, "河流信息")
    shot(cdp, "生态整治", "河流信息列表页.png", wait=2)

    click_nested(cdp, "湖泊信息")
    shot(cdp, "生态整治", "湖泊信息列表页.png", wait=2)

    click_submenu(cdp, "河长责任区域")
    shot(cdp, "生态整治", "河长责任区域页.png", wait=2)

    click_submenu(cdp, "巡河信息")
    shot(cdp, "生态整治", "巡河信息列表页.png", wait=2)

    click_submenu(cdp, "事务列表")
    shot(cdp, "生态整治", "事务列表页.png", wait=2)

    click_submenu(cdp, "河长通讯录")
    shot(cdp, "生态整治", "河长通讯录页.png", wait=2)

    # ==========================================
    # 4. 遥感监测
    # ==========================================
    print("\n=== 遥感监测 ===")
    cdp.navigate(f"{BASE}/prototypes/%E9%81%A5%E6%84%9F%E7%9B%91%E6%B5%8B", wait=5)
    shot(cdp, "遥感监测", "遥感监测页面.png", wait=0)

    # ==========================================
    # 5. 应急协同
    # ==========================================
    print("\n=== 应急协同 ===")
    cdp.navigate(f"{BASE}/prototypes/%E5%BA%94%E6%80%A5%E5%8D%8F%E5%90%8C", wait=5)
    shot(cdp, "应急协同", "应急事件列表页.png", wait=0)

    click_button(cdp, "新增")
    shot(cdp, "应急协同", "新增应急事件弹窗.png", wait=2)
    cdp.close_modal()

    cdp.find_and_click("a, .ant-btn-link, button", "详情")
    shot(cdp, "应急协同", "应急事件详情弹窗.png", wait=2)
    cdp.close_modal()

    click_submenu(cdp, "事件评估")
    shot(cdp, "应急协同", "事件评估列表页.png", wait=2)

    click_submenu(cdp, "事件复盘")
    shot(cdp, "应急协同", "事件复盘页.png", wait=2)

    click_submenu(cdp, "风险源企业信息")
    shot(cdp, "应急协同", "风险源企业信息页.png", wait=2)

    click_submenu(cdp, "应急物资")
    shot(cdp, "应急协同", "应急物资列表页.png", wait=2)

    click_submenu(cdp, "社会物资点")
    shot(cdp, "应急协同", "社会物资点页.png", wait=2)

    click_submenu(cdp, "应急预案信息")
    shot(cdp, "应急协同", "应急预案信息页.png", wait=2)

    click_submenu(cdp, "应急队伍信息")
    shot(cdp, "应急协同", "应急队伍信息页.png", wait=2)

    click_submenu(cdp, "应急专家库")
    shot(cdp, "应急协同", "应急专家库页.png", wait=2)

    # ==========================================
    # 6. 系统管理
    # ==========================================
    print("\n=== 系统管理 ===")
    cdp.navigate(
        f"{BASE}/prototypes/%E9%9F%B6%E5%B1%B1%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86",
        wait=5
    )
    shot(cdp, "系统管理", "水质综合报表页面.png", wait=0)

    click_submenu(cdp, "流量综合报表")
    shot(cdp, "系统管理", "流量综合报表页面.png", wait=2)

    click_submenu(cdp, "水位综合报表")
    shot(cdp, "系统管理", "水位综合报表页面.png", wait=2)

    click_submenu(cdp, "日报表信息")
    shot(cdp, "系统管理", "日报表信息页.png", wait=2)

    click_submenu(cdp, "月报表信息")
    shot(cdp, "系统管理", "月报表信息页.png", wait=2)

    click_submenu(cdp, "年度报表信息")
    shot(cdp, "系统管理", "年度报表信息页.png", wait=2)

    click_nested(cdp, "农村污水及集中处理设施")
    shot(cdp, "系统管理", "农村污水及集中处理设施页.png", wait=2)

    click_nested(cdp, "农业农村源")
    shot(cdp, "系统管理", "农业农村源页.png", wait=2)

    click_nested(cdp, "工业企业污染源")
    shot(cdp, "系统管理", "工业企业污染源页.png", wait=2)

    click_nested(cdp, "水库")
    shot(cdp, "系统管理", "水库信息页.png", wait=2)

    click_nested(cdp, "闸坝")
    shot(cdp, "系统管理", "闸坝信息页.png", wait=2)

    click_nested(cdp, "堤防")
    shot(cdp, "系统管理", "堤防信息页.png", wait=2)

    click_submenu(cdp, "遥感监测情况")
    shot(cdp, "系统管理", "遥感监测情况页.png", wait=2)

    click_submenu(cdp, "工业园区信息")
    shot(cdp, "系统管理", "工业园区信息页.png", wait=2)

    click_submenu(cdp, "流域信息")
    shot(cdp, "系统管理", "流域信息页.png", wait=2)

    cdp.close()
    print("\n=== All screenshots completed! ===")


if __name__ == "__main__":
    main()
