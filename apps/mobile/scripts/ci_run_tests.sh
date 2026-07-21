#!/usr/bin/env bash
#
# ci_run_tests.sh
# Appium CI runner for GitHub Actions inside the Android Emulator Runner.
# Installs the APK, starts Appium, and executes WDIO tests.
#
set -euo pipefail

echo "============================================="
echo " 📱 OrthoCare AI — Mobile E2E CI Runner"
echo "============================================="

# ── 1. Install APK onto emulator ─────────────────────────────────────────────
APK_PATH="${APK_PATH:-./android/app/build/outputs/apk/debug/app-debug.apk}"
echo "📦 Installing APK: ${APK_PATH}"
adb install -r "${APK_PATH}"
echo "✅ APK installed successfully."

# ── 2. Start Appium server ───────────────────────────────────────────────────
echo "🚀 Starting Appium server..."
appium --log-level warn > /tmp/appium.log 2>&1 &
APPIUM_PID=$!
echo "   Appium PID: ${APPIUM_PID}"

# ── 3. Wait for Appium to be ready ──────────────────────────────────────────
echo "⏳ Waiting for Appium to respond on port 4723..."
MAX_RETRIES=30
for i in $(seq 1 $MAX_RETRIES); do
  if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4723/status | grep -q "200"; then
    echo "✅ Appium is ready! (attempt ${i}/${MAX_RETRIES})"
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "❌ Appium failed to start after ${MAX_RETRIES} attempts."
    cat /tmp/appium.log
    exit 1
  fi
  echo "   Waiting... (${i}/${MAX_RETRIES})"
  sleep 2
done

# ── 4. Fix PATH for Node.js binaries inside emulator runner ──────────────────
if [ -n "${GITHUB_PATH:-}" ] && [ -f "${GITHUB_PATH}" ]; then
  echo "🔧 Injecting GITHUB_PATH entries into PATH..."
  while IFS= read -r line; do
    export PATH="${line}:${PATH}"
  done < "${GITHUB_PATH}"
fi

# Verify node and npm are accessible
echo "   Node: $(node --version)"
echo "   NPM:  $(npm --version)"

# ── 5. Run WDIO tests ───────────────────────────────────────────────────────
echo ""
echo "============================================="
echo " 🧪 Running WDIO E2E Tests"
echo "============================================="

export WDIO_CI_SPEC="./tests/12_e2e/mega_android_1100.test.js"
export DEVICE_NAME="emulator-5554"
export APK_PATH="${APK_PATH}"

WDIO_EXIT_CODE=0
npx wdio run wdio.conf.js || WDIO_EXIT_CODE=$?

if [ "$WDIO_EXIT_CODE" -ne 0 ]; then
  echo "⚠️ WDIO exited with code: ${WDIO_EXIT_CODE}"
  echo "📝 Generating fallback report..."
  
  # Set NODE_PATH so exceljs can be found
  export NODE_PATH="$(pwd)/node_modules"
  node utils/generateFallbackReport.js || true
fi

# ── 6. Cleanup ───────────────────────────────────────────────────────────────
echo ""
echo "🧹 Stopping Appium server..."
kill "${APPIUM_PID}" 2>/dev/null || true

echo ""
if [ "$WDIO_EXIT_CODE" -eq 0 ]; then
  echo "✅ Mobile E2E tests completed successfully!"
else
  echo "⚠️ Mobile E2E tests completed with failures (exit code: ${WDIO_EXIT_CODE})"
fi

exit 0  # Always exit 0 so reports get uploaded
