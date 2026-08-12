# 로컬 개발 서버 재기동 — 백엔드/스토어프론트/관리자 3종.
# 사용: pwsh ./scripts/restart-dev.ps1
# (하이브리드 구동: Docker = Postgres/Redis 는 건드리지 않는다. 네이티브 3종만 재기동)
#
# ── 언제 쓰나 ────────────────────────────────────────────────────────────────
# 오래 작업하거나 E2E 를 여러 번 돌리면 Next dev 서버가 핫리로드를 누적해 계속 부푼다.
# 2026-08-12 실측: 스토어프론트 한 프로세스가 **4.3GB**, 시스템 여유 메모리 519MB
# → 전부 스왑에 걸려 화면이 눈에 띄게 느려졌다. 재기동으로 5.8GB 를 회수했다.
#
# ── 왜 백엔드는 pnpm 으로 띄우나 ─────────────────────────────────────────────
# `node .../@medusajs/cli/cli.js develop` 로 직접 띄우면 이렇게 죽는다:
#     Cannot find module '@medusajs/locking'
# pnpm 은 node_modules 를 엄격하게 구성하는데 이 패키지는 **전이 의존성**이라
# (선언된 건 @medusajs/locking-redis) 경로로 직접 진입하면 해석되지 않는다.
# pnpm 을 거쳐야 모듈 해석이 제대로 선다.
#
# ── 왜 창을 띄우지 않고 분리(Start-Process)하나 ──────────────────────────────
# 이 셸의 자식으로 띄우면 셸이 끝날 때 같이 죽는다. 더 나쁜 건 반쯤 죽은 채
# 포트만 물고 남는 경우다 — stdout 파이프가 끊긴 고아 프로세스가 다음 요청에서
# EPIPE 로 터진다(실제로 겪음). 그래서 분리해서 띄운다.

$ErrorActionPreference = "SilentlyContinue"
$root = "C:\study\BbizProject-ver2"
$logDir = Join-Path $root ".dev-logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

Write-Output "===== 기존 프로세스 정리 ====="
$killed = 0
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ForEach-Object {
  if ($_.CommandLine -and $_.CommandLine -like "*BbizProject-ver2*") {
    Stop-Process -Id $_.ProcessId -Force
    $killed++
  }
}
"종료한 노드 프로세스: {0}개" -f $killed
Start-Sleep -Seconds 4

# 포트가 안 비면 새 서버가 조용히 다른 포트로 뜬다 — 그러면 모든 주소가 어긋난다.
Write-Output ""
Write-Output "===== 포트 확인 ====="
foreach ($p in 9000, 8000, 7002) {
  $c = Get-NetTCPConnection -LocalPort $p -State Listen
  if ($c) {
    $c | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
    Start-Sleep -Seconds 2
    $still = Get-NetTCPConnection -LocalPort $p -State Listen
    "{0,-6} {1}" -f $p, ($(if ($still) { "❌ 여전히 점유 중" } else { "✅ 해제됨" }))
  } else {
    "{0,-6} ✅ 비어 있음" -f $p
  }
}

Write-Output ""
Write-Output "===== 기동 ====="
# 백엔드는 pnpm 경유(위 주석 참조). cmd /c 로 PATH·corepack 해석을 그대로 쓴다.
Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "pnpm dev > `"$logDir\backend.log`" 2>&1" `
  -WorkingDirectory "$root\backend\services\api" -WindowStyle Hidden
"백엔드      :9000  (로그 .dev-logs\backend.log)"

Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "pnpm dev > `"$logDir\web.log`" 2>&1" `
  -WorkingDirectory "$root\apps\web" -WindowStyle Hidden
"스토어프론트 :8000  (로그 .dev-logs\web.log)"

Start-Process -FilePath "cmd.exe" `
  -ArgumentList "/c", "pnpm dev > `"$logDir\admin.log`" 2>&1" `
  -WorkingDirectory "$root\apps\admin" -WindowStyle Hidden
"관리자      :7002  (로그 .dev-logs\admin.log)"

Write-Output ""
Write-Output "===== 기동 대기 ====="
$targets = @(
  @{ name = "백엔드";       url = "http://localhost:9000/hc" },
  @{ name = "스토어프론트"; url = "http://localhost:8000/kr" },
  @{ name = "관리자";       url = "http://localhost:7002/login" }
)
$deadline = (Get-Date).AddMinutes(5)
foreach ($t in $targets) {
  $ok = $false
  while (-not $ok -and (Get-Date) -lt $deadline) {
    try {
      $r = Invoke-WebRequest -Uri $t.url -UseBasicParsing -TimeoutSec 20
      if ($r.StatusCode -eq 200) { $ok = $true }
    } catch { Start-Sleep -Seconds 5 }
  }
  "{0,-14} {1}" -f $t.name, ($(if ($ok) { "✅ 준비됨" } else { "⚠ 아직 안 뜸 — 로그를 확인하세요" }))
}

$os = Get-CimInstance Win32_OperatingSystem
Write-Output ""
"여유 메모리: {0} MB / 전체 {1} MB" -f `
  [math]::Round($os.FreePhysicalMemory / 1KB, 0), [math]::Round($os.TotalVisibleMemorySize / 1KB, 0)
Write-Output ""
Write-Output "첫 접속은 dev 컴파일 때문에 느립니다. 미리 데우려면:"
Write-Output "  pwsh ./scripts/healthcheck.ps1"
