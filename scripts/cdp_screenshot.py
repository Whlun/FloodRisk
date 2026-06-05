#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import asyncio
import base64
import hashlib
import json
import os
import random
import socket
import struct
import subprocess
import sys
import time
import http.client
from urllib.parse import urlparse

CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
CDP_PORT = 19222
BASE_URL = "http://192.168.0.110:51720"
OUTPUT_DIR = "/Volumes/WhlunService/AxhubMake/docs/screenshots"
VIEWPORT_WIDTH = 1920
VIEWPORT_HEIGHT = 1080

os.makedirs(OUTPUT_DIR, exist_ok=True)


class SimpleWebSocket:
    def __init__(self, url):
        self.url = url
        self.sock = None
        self.connected = False

    def connect(self):
        parsed = urlparse(self.url)
        host = parsed.hostname
        port = parsed.port or 80
        path = parsed.path or "/"
        if parsed.query:
            path += "?" + parsed.query

        self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.sock.settimeout(30)
        self.sock.connect((host, port))

        key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()

        handshake = (
            f"GET {path} HTTP/1.1\r\n"
            f"Host: {host}:{port}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        self.sock.sendall(handshake.encode())

        response = b""
        while b"\r\n\r\n" not in response:
            response += self.sock.recv(4096)

        self.connected = True

    def send(self, data):
        if isinstance(data, str):
            data = data.encode("utf-8")

        frame = bytearray()
        frame.append(0x81)  # text frame, FIN

        length = len(data)
        if length <= 125:
            frame.append(0x80 | length)  # masked
        elif length <= 65535:
            frame.append(0x80 | 126)
            frame.extend(struct.pack(">H", length))
        else:
            frame.append(0x80 | 127)
            frame.extend(struct.pack(">Q", length))

        mask = bytes(random.getrandbits(8) for _ in range(4))
        frame.extend(mask)

        masked_data = bytearray(data)
        for i in range(len(masked_data)):
            masked_data[i] ^= mask[i % 4]
        frame.extend(masked_data)

        self.sock.sendall(frame)

    def recv(self):
        header = self._recv_exact(2)
        if not header:
            return None

        opcode = header[0] & 0x0F
        masked = (header[1] & 0x80) != 0
        length = header[1] & 0x7F

        if length == 126:
            length = struct.unpack(">H", self._recv_exact(2))[0]
        elif length == 127:
            length = struct.unpack(">Q", self._recv_exact(8))[0]

        if masked:
            mask = self._recv_exact(4)

        data = self._recv_exact(length)
        if masked:
            data = bytearray(data)
            for i in range(len(data)):
                data[i] ^= mask[i % 4]
            data = bytes(data)

        if opcode == 0x8:  # close
            return None
        if opcode == 0x9:  # ping
            self._send_pong(data)
            return self.recv()

        return data.decode("utf-8") if opcode == 0x1 else data

    def _recv_exact(self, n):
        data = bytearray()
        while len(data) < n:
            chunk = self.sock.recv(n - len(data))
            if not chunk:
                raise ConnectionError("Connection closed")
            data.extend(chunk)
        return bytes(data)

    def _send_pong(self, data):
        frame = bytearray()
        frame.append(0x8A)  # pong
        frame.append(len(data))
        frame.extend(data)
        self.sock.sendall(frame)

    def close(self):
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
            self.connected = False


class CDPClient:
    def __init__(self, port):
        self.port = port
        self.ws = None
        self.msg_id = 0
        self.pending_responses = {}

    def get_ws_url(self):
        conn = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        conn.request("GET", "/json")
        resp = conn.getresponse()
        data = json.loads(resp.read().decode())
        for page in data:
            if "webSocketDebuggerUrl" in page:
                return page["webSocketDebuggerUrl"]
        return None

    def connect(self):
        ws_url = self.get_ws_url()
        if not ws_url:
            raise Exception("Cannot find CDP websocket URL")
        self.ws = SimpleWebSocket(ws_url)
        self.ws.connect()
        self.send_command("Page.enable")
        self._drain_until_id(timeout=5)
        self.send_command("Runtime.enable")
        self._drain_until_id(timeout=5)

    def send_command(self, method, params=None):
        self.msg_id += 1
        msg = {"id": self.msg_id, "method": method}
        if params:
            msg["params"] = params
        self.ws.send(json.dumps(msg))
        return self.msg_id

    def _drain_until_id(self, target_id=None, timeout=30):
        start = time.time()
        while time.time() - start < timeout:
            try:
                data = self.ws.recv()
                if data is None:
                    return None
                msg = json.loads(data)
                if "id" in msg:
                    msg_id = msg["id"]
                    if target_id is not None and msg_id == target_id:
                        return msg
                    self.pending_responses[msg_id] = msg
                # skip events
            except socket.timeout:
                continue
            except Exception as e:
                return None
        return None

    def recv_response(self, expected_id=None, timeout=30):
        if expected_id is not None and expected_id in self.pending_responses:
            return self.pending_responses.pop(expected_id)
        return self._drain_until_id(target_id=expected_id, timeout=timeout)

    def navigate(self, url):
        mid = self.send_command("Page.navigate", {"url": url})
        # wait for load event
        start = time.time()
        while time.time() - start < 30:
            try:
                data = self.ws.recv()
                if data is None:
                    break
                msg = json.loads(data)
                if "id" in msg:
                    self.pending_responses[msg["id"]] = msg
                if msg.get("method") == "Page.loadEventFired":
                    return True
            except socket.timeout:
                continue
            except:
                break
        return False

    def evaluate(self, expression):
        mid = self.send_command("Runtime.evaluate", {
            "expression": expression,
            "awaitPromise": True,
            "returnByValue": True
        })
        resp = self.recv_response(expected_id=mid, timeout=30)
        if resp and "result" in resp and "result" in resp["result"]:
            return resp["result"]["result"].get("value")
        return None

    def screenshot(self, filepath, full_page=False, clip=None):
        params = {"format": "png"}
        if full_page:
            params["captureBeyondViewport"] = True
        if clip:
            params["clip"] = clip

        mid = self.send_command("Page.captureScreenshot", params)
        resp = self.recv_response(expected_id=mid, timeout=30)

        if resp is None:
            print(f"  Screenshot failed: no response for {filepath}")
            return False
        if "error" in resp:
            print(f"  Screenshot failed: CDP error: {resp.get('error')} for {filepath}")
            return False
        if resp and "result" in resp and "data" in resp["result"]:
            img_data = base64.b64decode(resp["result"]["data"])
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            with open(filepath, "wb") as f:
                f.write(img_data)
            print(f"  Screenshot saved: {filepath} ({len(img_data)} bytes)")
            return True
        else:
            print(f"  Screenshot failed: unexpected response for {filepath}: {str(resp)[:200]}")
            return False

    def click_element(self, selector, index=0):
        js = f"""
        (function() {{
            var els = document.querySelectorAll('{selector}');
            if (els.length > {index}) {{
                els[{index}].click();
                return true;
            }}
            return false;
        }})()
        """
        return self.evaluate(js)

    def set_viewport(self, width, height):
        self.send_command("Emulation.setDeviceMetricsOverride", {
            "width": width,
            "height": height,
            "deviceScaleFactor": 2,
            "mobile": False
        })
        return self.recv_response(timeout=10)

    def close(self):
        if self.ws:
            self.ws.close()


def start_chrome():
    existing = subprocess.run(
        ["lsof", "-i", f":{CDP_PORT}"],
        capture_output=True, text=True
    )
    if existing.stdout.strip():
        print(f"Chrome already listening on port {CDP_PORT}")
        return

    cmd = [
        CHROME_PATH,
        f"--remote-debugging-port={CDP_PORT}",
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        f"--window-size={VIEWPORT_WIDTH},{VIEWPORT_HEIGHT}",
        "--hide-scrollbars",
        "about:blank"
    ]
    subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("Starting Chrome...")
    time.sleep(3)


def stop_chrome():
    subprocess.run(["pkill", "-f", f"remote-debugging-port={CDP_PORT}"],
                   capture_output=True)


def take_page_screenshot(client, url, filename, wait=3, full_page=False):
    filepath = os.path.join(OUTPUT_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    print(f"Navigating to: {url}")
    client.navigate(url)
    time.sleep(wait)
    client.screenshot(filepath, full_page=full_page)
    return filepath


def click_and_screenshot(client, selector, filename, wait_after=1.5, index=0):
    filepath = os.path.join(OUTPUT_DIR, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    result = client.click_element(selector, index)
    time.sleep(wait_after)
    client.screenshot(filepath)
    return filepath, result


def main():
    start_chrome()

    client = CDPClient(CDP_PORT)
    try:
        client.connect()
        print("Connected to Chrome CDP")

        client.set_viewport(VIEWPORT_WIDTH, VIEWPORT_HEIGHT)
        time.sleep(1)

        # ==========================================
        # 综合态势
        # ==========================================
        print("\n=== 综合态势 ===")
        zonghe_url = f"{BASE_URL}/prototypes/%E9%9F%B6%E5%B1%B1%E9%AB%98%E6%96%B0%E5%8C%BA%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%BB%BC%E5%90%88%E6%95%B4%E6%B2%BB%E4%B8%80%E5%BC%A0%E5%9B%BE/zonghe"
        take_page_screenshot(client, zonghe_url, "综合态势/综合态势首页.png", wait=5)

        # 点击报警按钮
        click_and_screenshot(client, ".ant-badge, [class*='alarm'], [class*='Alarm']", "综合态势/报警信息弹窗.png", wait_after=2)

        # ==========================================
        # 设施管理
        # ==========================================
        print("\n=== 设施管理 ===")
        facility_url = f"{BASE_URL}/prototypes/%E9%9F%B6%E5%B1%B1%E6%B0%B4%E7%8E%AF%E5%A2%83%E8%AE%BE%E6%96%BD%E7%AE%A1%E7%90%86%E7%B3%BB%E7%BB%9F"
        take_page_screenshot(client, facility_url, "设施管理/排水管点列表页.png", wait=5)

        # 点击排水管线菜单
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('排水管线')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/排水管线列表页.png"))

        # 点击管线档案信息菜单
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('管线档案信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/管线档案信息页.png"))

        # 回到排水管点
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('排水管点')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)

        # 点击新增按钮
        click_and_screenshot(client, "button", "设施管理/新增排水管点弹窗.png", wait_after=2, index=0)

        # 关闭弹窗
        client.evaluate("""
        (function() {
            var closeBtns = document.querySelectorAll('.ant-modal-close, .ant-modal-close-x');
            if (closeBtns.length > 0) { closeBtns[0].click(); return true; }
            var cancelBtns = document.querySelectorAll('button');
            for (var b of cancelBtns) {
                if (b.textContent.includes('取消')) { b.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(1)

        # 点击详情按钮
        click_and_screenshot(client, "a, button", "设施管理/排水管点详情弹窗.png", wait_after=2)

        # 关闭弹窗
        client.evaluate("""
        (function() {
            var closeBtns = document.querySelectorAll('.ant-modal-close, .ant-modal-close-x');
            if (closeBtns.length > 0) { closeBtns[0].click(); return true; }
            var cancelBtns = document.querySelectorAll('button');
            for (var b of cancelBtns) {
                if (b.textContent.includes('取消') || b.textContent.includes('关闭')) { b.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(1)

        # 泵站管理
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('泵站管理') || m.textContent.includes('泵站信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/泵站管理列表页.png"))

        # 排口管理
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('入河排口') || m.textContent.includes('排口核查')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/排口管理列表页.png"))

        # 污水厂管理
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('污水厂信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/污水厂管理列表页.png"))

        # 排水户
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('排水户')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/排水户管理列表页.png"))

        # 事件管理
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item, .ant-menu-submenu-title');
            for (var m of menus) {
                if (m.textContent.includes('事件列表')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "设施管理/事件管理列表页.png"))

        # ==========================================
        # 生态整治
        # ==========================================
        print("\n=== 生态整治 ===")
        eco_url = f"{BASE_URL}/prototypes/%E7%94%9F%E6%80%81%E6%95%B4%E6%B2%BB"
        take_page_screenshot(client, eco_url, "生态整治/项目档案列表页.png", wait=5)

        # 点击新增按钮
        click_and_screenshot(client, "button", "生态整治/新增项目档案弹窗.png", wait_after=2, index=0)

        # 关闭弹窗
        client.evaluate("""
        (function() {
            var closeBtns = document.querySelectorAll('.ant-modal-close, .ant-modal-close-x');
            if (closeBtns.length > 0) { closeBtns[0].click(); return true; }
            return false;
        })()
        """)
        time.sleep(1)

        # 点击详情按钮
        click_and_screenshot(client, "a, button", "生态整治/项目档案详情弹窗.png", wait_after=2)

        # 关闭弹窗
        client.evaluate("""
        (function() {
            var closeBtns = document.querySelectorAll('.ant-modal-close, .ant-drawer-close');
            if (closeBtns.length > 0) { closeBtns[0].click(); return true; }
            return false;
        })()
        """)
        time.sleep(1)

        # 项目汇总统计
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('项目汇总统计')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "生态整治/项目汇总统计页.png"))

        # 河流信息
        client.evaluate("""
        (function() {
            var submenus = document.querySelectorAll('.ant-menu-submenu-title');
            for (var m of submenus) {
                if (m.textContent.includes('河道水体')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(1)
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('河流信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "生态整治/河流信息列表页.png"))

        # 巡河信息
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('巡河信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "生态整治/巡河信息列表页.png"))

        # ==========================================
        # 遥感监测
        # ==========================================
        print("\n=== 遥感监测 ===")
        rs_url = f"{BASE_URL}/prototypes/%E9%81%A5%E6%84%9F%E7%9B%91%E6%B5%8B"
        take_page_screenshot(client, rs_url, "遥感监测/遥感监测页面.png", wait=5)

        # ==========================================
        # 应急协同
        # ==========================================
        print("\n=== 应急协同 ===")
        emg_url = f"{BASE_URL}/prototypes/%E5%BA%94%E6%80%A5%E5%8D%8F%E5%90%8C"
        take_page_screenshot(client, emg_url, "应急协同/应急事件列表页.png", wait=5)

        # 点击新增按钮
        click_and_screenshot(client, "button", "应急协同/新增应急事件弹窗.png", wait_after=2, index=0)

        # 关闭弹窗
        client.evaluate("""
        (function() {
            var closeBtns = document.querySelectorAll('.ant-modal-close, .ant-modal-close-x');
            if (closeBtns.length > 0) { closeBtns[0].click(); return true; }
            return false;
        })()
        """)
        time.sleep(1)

        # 风险源企业信息
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('风险源企业')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "应急协同/风险源企业信息页.png"))

        # 应急物资
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('应急物资')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "应急协同/应急物资列表页.png"))

        # 事件评估
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('事件评估')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "应急协同/事件评估列表页.png"))

        # 事件复盘
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('事件复盘')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "应急协同/事件复盘页.png"))

        # ==========================================
        # 系统管理
        # ==========================================
        print("\n=== 系统管理 ===")
        admin_url = f"{BASE_URL}/prototypes/%E9%9F%B6%E5%B1%B1%E6%B0%B4%E7%8E%AF%E5%A2%83%E7%B3%BB%E7%BB%9F%E7%AE%A1%E7%90%86"
        take_page_screenshot(client, admin_url, "系统管理/水质综合报表页面.png", wait=5)

        # 流量综合报表
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('流量综合报表')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "系统管理/流量综合报表页面.png"))

        # 水位综合报表
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('水位综合报表')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "系统管理/水位综合报表页面.png"))

        # 污染源信息 - 农村污水
        client.evaluate("""
        (function() {
            var submenus = document.querySelectorAll('.ant-menu-submenu-title');
            for (var m of submenus) {
                if (m.textContent.includes('污染源信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(1)
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('农村污水')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "系统管理/农村污水及集中处理设施页.png"))

        # 水利工程信息 - 水库
        client.evaluate("""
        (function() {
            var submenus = document.querySelectorAll('.ant-menu-submenu-title');
            for (var m of submenus) {
                if (m.textContent.includes('水利工程')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(1)
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('水库')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "系统管理/水库信息页.png"))

        # 工业园区信息
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('工业园区')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "系统管理/工业园区信息页.png"))

        # 流域信息
        client.evaluate("""
        (function() {
            var menus = document.querySelectorAll('.ant-menu-item');
            for (var m of menus) {
                if (m.textContent.includes('流域信息')) { m.click(); return true; }
            }
            return false;
        })()
        """)
        time.sleep(2)
        client.screenshot(os.path.join(OUTPUT_DIR, "系统管理/流域信息页.png"))

        print("\n=== All screenshots completed! ===")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    main()
