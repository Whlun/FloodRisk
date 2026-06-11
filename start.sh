#!/usr/bin/env bash
# FloodRisk / Axhub Make 开发服务启动脚本
# 用法: ./start.sh [命令] [选项]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PORT=51720
BASE_URL="http://127.0.0.1:${PORT}/"

usage() {
  cat <<'EOF'
FloodRisk 开发服务启动脚本

用法:
  ./start.sh              启动开发服务（管理台，全部原型）
  ./start.sh start        同上
  ./start.sh deqing       仅启动「德清内涝风险」原型（更快）
  ./start.sh deqing-index 仅启动「德清内涝风险首页」原型
  ./start.sh restart      重启开发服务
  ./start.sh stop         停止开发服务
  ./start.sh status       查看服务是否在运行
  ./start.sh install      仅安装依赖，不启动
  ./start.sh help         显示此帮助

服务地址: http://127.0.0.1:51720/
EOF
}

need_node() {
  if ! command -v node >/dev/null 2>&1; then
    echo "❌ 未找到 Node.js，请先安装 Node.js 18+：https://nodejs.org/"
    exit 1
  fi
  if ! command -v npm >/dev/null 2>&1; then
    echo "❌ 未找到 npm，请确认 Node.js 安装完整。"
    exit 1
  fi
}

ensure_deps() {
  if [[ ! -d node_modules ]]; then
    echo "📦 首次运行，正在安装依赖…"
    npm install
    echo ""
  fi
}

is_running() {
  curl -sf --max-time 2 "${BASE_URL}health" >/dev/null 2>&1
}

cmd_status() {
  if is_running; then
    echo "✅ 开发服务正在运行：${BASE_URL}"
    lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true
  else
    echo "⏹  开发服务未运行（端口 ${PORT} 无响应）"
    exit 1
  fi
}

cmd_install() {
  need_node
  npm install
  echo "✅ 依赖安装完成"
}

cmd_stop() {
  need_node
  ensure_deps
  npm run stop
}

cmd_restart() {
  need_node
  ensure_deps
  npm run restart
}

run_dev() {
  local npm_script="$1"
  need_node
  ensure_deps

  if is_running; then
    echo ""
    echo "✅ 开发服务已在运行，无需重复启动："
    echo "   ${BASE_URL}"
    echo ""
    echo "如需重启，请执行：./start.sh restart"
    echo ""
    return 0
  fi

  echo ""
  echo "🚀 正在启动开发服务…"
  echo "   访问地址: ${BASE_URL}"
  echo "   按 Ctrl+C 可停止"
  echo ""
  npm run "${npm_script}"
}

cmd="${1:-start}"

case "${cmd}" in
  start|dev)
    run_dev start
    ;;
  deqing)
    run_dev dev:deqing
    ;;
  deqing-index)
    run_dev dev:deqing-index
    ;;
  restart)
    cmd_restart
    ;;
  stop)
    cmd_stop
    ;;
  status)
    cmd_status
    ;;
  install)
    cmd_install
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "未知命令: ${cmd}"
    echo ""
    usage
    exit 1
    ;;
esac
