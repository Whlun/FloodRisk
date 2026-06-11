#!/usr/bin/env bash
# 双击此文件即可启动开发服务（macOS）

cd "$(dirname "$0")"

if [[ ! -x start.sh ]]; then
  chmod +x start.sh
fi

./start.sh start

echo ""
read -r -p "按回车键关闭此窗口…" _
