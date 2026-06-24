# 로컬 개발 환경 헬스체크 — 3개 서비스 + 인프라 포트 상태 한눈에.
# 사용: pwsh ./scripts/healthcheck.ps1
# (하이브리드 구동: Docker = Postgres/Redis, 네이티브 = 백엔드/관리자/스토어프론트)

$ErrorActionPreference = "SilentlyContinue"

function Test-Port($name, $port) {
  $ok = [bool](Get-NetTCPConnection -LocalPort $port -State Listen)
  "{0,-22} :{1,-5} {2}" -f $name, $port, ($(if ($ok) { "✅ LISTEN" } else { "❌ DOWN" }))
}

function Test-Http($name, $url) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
    "{0,-22} {1,-32} ✅ {2}" -f $name, $url, $r.StatusCode
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    "{0,-22} {1,-32} {2}" -f $name, $url, ($(if ($code) { "⚠ HTTP $code" } else { "❌ NO RESPONSE" }))
  }
}

Write-Output "===== 인프라 포트 (Docker) ====="
Test-Port "Postgres" 5434
Test-Port "Redis"    6381

Write-Output "`n===== 앱 포트 (네이티브) ====="
Test-Port "Backend (Medusa)" 9000
Test-Port "Admin"            7002
Test-Port "Storefront"       8000

Write-Output "`n===== HTTP 헬스 ====="
Test-Http "Backend health" "http://localhost:9000/health"
Test-Http "Admin"          "http://localhost:7002/login"
Test-Http "Storefront"     "http://localhost:8000/kr"

Write-Output "`n완료. ❌/⚠ 가 있으면 해당 서비스 기동/로그를 확인하세요. (셋업 가이드 참고)"
