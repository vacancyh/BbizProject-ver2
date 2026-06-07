/**
 * 내부 메모 순수 로직 (t011_내부메모 §V0-2)
 *
 * production 호출 위치:
 *  - canDeleteMemo      → apps/admin/src/app/(admin)/orders/page.tsx (삭제 버튼 노출 조건)
 *  - isValidMemoContent → apps/admin/src/app/(admin)/orders/page.tsx (메모 저장 입력 검증)
 *  - parseCurrentUser   → apps/admin/src/app/(admin)/orders/page.tsx (현재 사용자 ID/role 추출)
 *
 * 백엔드 권한 검증은 route 내 inline 수행 (공유 불가 환경) — 본 파일은 프론트 전용.
 */

/**
 * 메모 삭제 가능 여부 판정.
 *  - 본인(작성자) 또는 SUPER 등급이면 true.
 *  - 그 외(타인) = false → 삭제 버튼 비노출 + 백엔드 403 대상.
 */
export function canDeleteMemo({
  memoAuthorId,
  requesterId,
  requesterRole,
}: {
  memoAuthorId: string | null;
  requesterId: string | null;
  requesterRole: string | null;
}): boolean {
  if (requesterRole === "super") return true;
  if (!memoAuthorId || !requesterId) return false;
  return memoAuthorId === requesterId;
}

/**
 * 메모 내용 유효성 검증.
 *  - 1자 이상 2000자 이하, 공백만인 경우 false.
 */
export function isValidMemoContent(content: string): boolean {
  if (!content || !content.trim()) return false;
  return content.trim().length >= 1 && content.trim().length <= 2000;
}

/**
 * JWT 토큰에서 현재 사용자 정보 추출.
 * Medusa JWT payload = { actor_id, actor_type, ... }
 * role 정보는 JWT에 없으므로 actor_id만 반환(role은 RBAC API 조회 필요).
 */
export function parseCurrentActorId(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // base64url → base64 정규화
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(b64)) as Record<string, unknown>;
    return (decoded.actor_id as string) ?? null;
  } catch {
    return null;
  }
}
