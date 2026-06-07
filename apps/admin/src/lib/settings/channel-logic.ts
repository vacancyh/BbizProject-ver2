/**
 * 판매채널 검증 로직 — 화면에서 직접 호출(dead code 금지).
 *
 * 호출처: apps/admin/src/app/(admin)/settings/channels/page.tsx
 *  - validateChannelInput()  : 채널명 1~50자 검증 (spec t003 §4 I1)
 *  - isDefaultChannel()      : 기본 채널 여부 판단 (spec §3 S1: 기본 채널 삭제 금지)
 *
 * spec: t003_판매채널.md §4 입력/검증 규칙
 */

export type ChannelFieldError = { field: string; message: string };

export type ChannelInputParams = {
  /** 채널명 — I1: 1~50자 필수 */
  name: string;
};

/**
 * 채널 입력 검증.
 * @returns 오류 목록 (빈 배열이면 유효)
 */
export function validateChannelInput(
  params: ChannelInputParams
): ChannelFieldError[] {
  const errors: ChannelFieldError[] = [];
  const name = params.name.trim();

  if (!name) {
    errors.push({ field: "name", message: "채널명 필수" });
    return errors;
  }
  if (name.length > 50) {
    errors.push({ field: "name", message: "채널명은 50자 이하여야 합니다" });
  }
  return errors;
}

/**
 * 기본 채널 여부 판단 — metadata.is_default 기반.
 * 단독몰에서 기본 채널은 삭제 금지(spec §3 S1).
 */
export function isDefaultChannel(
  metadata?: { is_default?: boolean; [k: string]: unknown } | null
): boolean {
  return metadata?.is_default === true;
}
