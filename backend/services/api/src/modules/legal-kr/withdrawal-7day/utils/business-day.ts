/**
 * 영업일 계산 유틸
 *
 * 출처: 「전자상거래 등에서의 소비자보호에 관한 법률」 §18 ①
 * (사업자는 청약철회 통지를 받은 날부터 영업일 기준 3 일 이내 환불 의무)
 *
 * V1 단순 구현 = 토요일·일요일만 영업일에서 제외합니다.
 * TODO(후속 사이클): 한국 공휴일 (설날·추석·삼일절·광복절·개천절·한글날 등) 도 제외.
 *                    공휴일 데이터는 공공데이터포털 (data.go.kr) 의 특일 정보 API 를 사용하거나
 *                    별도 holiday 테이블을 두는 방식 후속 검토.
 *
 * 외부 라이브러리 의존성을 추가하지 않고 표준 Date 만으로 구현합니다.
 */

/**
 * 주어진 Date 가 영업일인지 판정합니다.
 *
 * @param date 판정 대상 Date 객체
 * @returns 토·일이 아니면 true, 토·일이면 false
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay()
  // getDay: 0 = 일요일, 6 = 토요일
  return day !== 0 && day !== 6
}

/**
 * 시작 시각으로부터 영업일 N 일 후의 시각을 계산합니다.
 *
 * 계산 룰:
 *  - 시작 시각이 영업일이든 비영업일이든, 시작 시각을 0 일차로 보고
 *    그 다음 영업일을 1 일차로 셉니다 (= 시작 시각 자체는 카운트 안 함).
 *  - 토·일은 영업일에서 제외합니다 (V1 단순 구현).
 *  - 시간 (시·분·초·밀리초) 은 시작 시각의 값을 그대로 보존합니다.
 *
 * @param startedAt 기산 시작 시각
 * @param businessDays 더할 영업일 수 (예: 3)
 * @returns 영업일 N 일 후의 Date
 */
export function addBusinessDays(startedAt: Date, businessDays: number): Date {
  if (businessDays <= 0) {
    return new Date(startedAt.getTime())
  }

  const result = new Date(startedAt.getTime())
  let added = 0
  while (added < businessDays) {
    // 하루씩 전진하면서 영업일이면 카운트 합니다.
    result.setDate(result.getDate() + 1)
    if (isBusinessDay(result)) {
      added += 1
    }
  }
  return result
}

/**
 * 시작 시각으로부터 달력일 N 일 후의 시각을 계산합니다.
 *
 * 출처: 전자상거래법 §17 ① 의 "7 일" 은 영업일이 아닌 달력일 기준입니다.
 *
 * @param startedAt 기산 시작 시각
 * @param days 더할 달력일 수 (예: 7)
 * @returns 달력일 N 일 후의 Date
 */
export function addCalendarDays(startedAt: Date, days: number): Date {
  const result = new Date(startedAt.getTime())
  result.setDate(result.getDate() + days)
  return result
}
