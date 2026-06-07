/* ============================================================
   보조 화면 — 정산·매출 / 프로모션·쿠폰 / CS / 통계 / 설정
   ============================================================ */
(function(){
  const SC = window.SCREENS = window.SCREENS || {};

  /* ---------------- 정산 · 매출 ---------------- */
  SC.settlement = function(){
    const rows = [
      ['2026-05','₩384,200,000','₩11,526,000','₩7,684,000','₩364,990,000','정산완료','dim'],
      ['2026-04','₩356,800,000','₩10,704,000','₩7,136,000','₩338,960,000','정산완료','dim'],
      ['2026-03','₩402,100,000','₩12,063,000','₩8,042,000','₩382,995,000','정산완료','dim'],
      ['2026-06','₩42,800,000','₩1,284,000','₩856,000','정산 예정','정산대기','warn'],
    ];
    return `
      <div class="page-head">
        <div><h1>정산 · 매출</h1><div class="sub">결제·환불·수수료 기준 월별 정산 내역</div></div>
        <div class="spacer"></div>
        <button class="btn ghost">⭳ 정산서 PDF</button>
      </div>

      <div class="col-3 mb">
        <div class="sk kpi"><div class="k-ic">₩</div><div class="k-label">이번달 총 매출</div><div class="k-value">₩384.2M</div><div class="k-delta"><span class="up">▲</span>전월 대비 +7.7%</div></div>
        <div class="sk kpi"><div class="k-ic">↩</div><div class="k-label">환불액</div><div class="k-value">₩7.68M</div><div class="k-delta">전월 대비 +1.2%</div></div>
        <div class="sk kpi"><div class="k-ic">＝</div><div class="k-label">정산 예정액</div><div class="k-value">₩364.9M</div><div class="k-delta">06.10 지급 예정</div></div>
      </div>

      <div class="sk card mb">
        <div class="card-head"><h3>월별 매출 추이</h3>
          <div style="margin-left:auto; display:flex; gap:6px;"><span class="chip active">매출</span><span class="chip">주문수</span><span class="chip">객단가</span></div>
        </div>
        <div class="ph-chart" style="height:240px"><div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);" class="hand-note">▇▆▇▅▆▇▇ 월별 매출 막대 + 추세선 ▇▆▅</div></div>
      </div>

      <div class="sk" style="overflow:hidden;">
        <table class="table">
          <thead><tr><th>정산월</th><th>총 매출</th><th>수수료(3%)</th><th>환불액</th><th>정산 금액</th><th>상태</th><th></th></tr></thead>
          <tbody>
            ${rows.map(r=>`<tr>
              <td class="num">${r[0]}</td><td class="num">${r[1]}</td>
              <td class="num muted">${r[2]}</td><td class="num muted">${r[3]}</td>
              <td class="num">${r[4]}</td><td><span class="tag ${r[6]}">${r[5]}</span></td>
              <td><button class="btn ghost" style="padding:5px 11px; font-size:13px;">상세</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  /* ---------------- 프로모션 · 쿠폰 ---------------- */
  SC.promotion = function(){
    const coupons = [
      ['신규가입 15% 할인','정률 15%','전체 상품','2,104 / 5,000','진행중','accent'],
      ['5월 시즌오프 ₩5,000','정액 5,000원','5만원 이상','881 / 2,000','진행중','accent'],
      ['VIP 전용 무료배송','배송비 무료','VIP 등급','340 / 무제한','진행중','accent'],
      ['리뷰 작성 ₩2,000','정액 2,000원','전체 상품','1,560 / 3,000','종료예정','warn'],
      ['겨울 패딩 20% (종료)','정률 20%','아우터','4,000 / 4,000','종료','dim'],
    ];
    return `
      <div class="page-head">
        <div><h1>프로모션 · 쿠폰</h1><div class="sub">진행중 3 · 예약 1 · 종료 12</div></div>
        <div class="spacer"></div>
        <button class="btn">기획전 만들기</button>
        <button class="btn primary">＋ 쿠폰 발급</button>
      </div>

      <div class="col-2 mb">
        <div class="sk card">
          <div class="card-head"><h3>진행중 기획전</h3><span class="more">전체 →</span></div>
          <div style="display:flex; gap:12px;">
            <div class="ph" style="width:120px; height:84px;">배너<br>이미지</div>
            <div style="flex:1;">
              <div style="font-weight:700; margin-bottom:6px;">초여름 데일리룩 최대 30%</div>
              <div class="sub" style="font-family:'Gowun Dodum'; font-size:13px; color:var(--ink-soft);">2026.05.20 ~ 06.05 · 노출 상품 42개</div>
              <div style="margin-top:10px; display:flex; gap:6px;"><span class="tag accent">메인 노출</span><span class="tag dim">3개 국어</span></div>
            </div>
          </div>
        </div>
        <div class="sk card">
          <div class="card-head"><h3>쿠폰 사용 현황</h3></div>
          <div class="ph-chart" style="height:108px"><div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);" class="hand-note">발급 대비 사용률 도넛 + 추이</div></div>
        </div>
      </div>

      <div class="sk" style="overflow:hidden;">
        <table class="table">
          <thead><tr><th>쿠폰명</th><th>혜택</th><th>대상</th><th>사용 / 발급</th><th>상태</th><th></th></tr></thead>
          <tbody>
            ${coupons.map(c=>`<tr>
              <td>${c[0]}</td><td class="muted">${c[1]}</td><td class="muted">${c[2]}</td>
              <td class="num">${c[3]}</td><td><span class="tag ${c[5]}">${c[4]}</span></td>
              <td><button class="btn ghost" style="padding:5px 11px; font-size:13px;">관리</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  /* ---------------- CS (리뷰 · 문의) ---------------- */
  SC.cs = function(){
    const inq = [
      ['답변대기','상품문의','경량 패딩 자켓 (블랙)','이O준','색상 차이 문의드립니다','5분 전','warn'],
      ['답변대기','배송문의','베이직 데일리 슬랙스','정O민','배송지 변경 가능한가요?','22분 전','warn'],
      ['답변완료','교환/반품','캐주얼 스니커즈','강O호','사이즈 교환 요청','1시간 전','dim'],
      ['답변완료','상품문의','오가닉 후드 집업','윤O아','세탁 방법 안내 부탁','3시간 전','dim'],
    ];
    return `
      <div class="page-head">
        <div><h1>리뷰 · 문의 (CS)</h1><div class="sub">미답변 문의 18 · 신고 리뷰 2</div></div>
        <div class="spacer"></div>
        <button class="btn ghost">자주 쓰는 답변 관리</button>
      </div>

      <div class="tabs">
        <div class="tab active">1:1 문의 <span class="cnt">18</span></div>
        <div class="tab">상품 Q&A <span class="cnt">42</span></div>
        <div class="tab">리뷰 관리 <span class="cnt">1,204</span></div>
        <div class="tab">신고 / 블라인드 <span class="cnt">2</span></div>
      </div>

      <div class="col-2">
        <div class="sk" style="overflow:hidden;">
          <table class="table">
            <thead><tr><th>상태</th><th>유형</th><th>상품 / 작성자</th><th>접수</th></tr></thead>
            <tbody>
              ${inq.map((q,i)=>`<tr style="${i===0?'background:var(--accent-soft);':''}">
                <td><span class="tag ${q[6]}">${q[0]}</span></td>
                <td class="muted">${q[1]}</td>
                <td><div>${q[4]}</div><div class="muted" style="font-size:12px;">${q[2]} · ${q[3]}</div></td>
                <td class="num muted">${q[5]}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>

        <div class="sk card">
          <div class="card-head"><h3>문의 상세 / 답변</h3><span class="tag warn">답변대기</span></div>
          <div class="sk-soft" style="padding:13px; border-radius:var(--radius-sm); margin-bottom:12px;">
            <div class="muted" style="font-size:12px; margin-bottom:6px;">이O준 · 경량 패딩 자켓 (블랙) · 5분 전</div>
            <div>실제 색상이 사진과 차이가 있을까요? 블랙이 너무 밝지 않은지 궁금합니다.</div>
          </div>
          <div class="input area" style="min-height:120px;">답변을 입력하세요… (자주 쓰는 답변 불러오기 가능)</div>
          <div class="help">🌐 고객 언어 자동 감지 — 한국어 / English / 日本語 템플릿 제공</div>
          <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:14px;">
            <button class="btn ghost">보류</button>
            <button class="btn primary">답변 등록</button>
          </div>
        </div>
      </div>`;
  };

  /* ---------------- 통계 · 리포트 ---------------- */
  SC.stats = function(){
    const card = (t,h,note)=>`<div class="sk card"><div class="card-head"><h3>${t}</h3><span class="more">상세 →</span></div>
      <div class="ph-chart" style="height:${h}px"><div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);" class="hand-note">${note}</div></div></div>`;
    return `
      <div class="page-head">
        <div><h1>통계 · 리포트</h1><div class="sub">기간: 2026.05.01 ~ 05.30</div></div>
        <div class="spacer"></div>
        <div class="field"><span class="lbl">기간</span> 이번 달 ▾</div>
        <button class="btn ghost">⭳ 리포트 내보내기</button>
      </div>

      <div class="col-3 mb">
        ${['매출 ₩384.2M','주문 4,021건','객단가 ₩95,500'].map(s=>`<div class="sk kpi"><div class="k-label">${s.split(' ')[0]}</div><div class="k-value">${s.split(' ').slice(1).join(' ')}</div></div>`).join('')}
      </div>

      <div class="col-2 mb">
        ${card('일자별 매출 / 주문',220,'／＼ 매출·주문 듀얼 라인 ／＼')}
        ${card('카테고리별 매출 비중',220,'◔ 도넛 — 상의/하의/아우터/신발…')}
      </div>
      <div class="col-2">
        ${card('시간대별 주문 분포',180,'▁▃▅▇▆▅▃ 0시~24시 히트맵')}
        ${card('신규 vs 재구매',180,'▆▆ 신규/재구매 누적 막대')}
      </div>`;
  };

  /* ---------------- 쇼핑몰 설정 ---------------- */
  SC.settings = function(){
    const langRow = (flag,name,on)=>`<div style="display:flex; align-items:center; gap:10px; padding:9px 0; border-bottom:1.5px solid var(--line-soft);">
      <span style="width:26px;">${flag}</span><span style="flex:1;">${name}</span>
      <span class="tag ${on?'accent':'dim'}">${on?'노출':'숨김'}</span>
      <span style="width:42px; height:24px; border:2px solid ${on?'var(--accent)':'var(--line)'}; border-radius:999px; background:${on?'var(--accent-soft)':'var(--panel)'}; position:relative;"><span style="position:absolute; top:2px; ${on?'right:3px':'left:3px'}; width:16px; height:16px; border-radius:50%; background:${on?'var(--accent)':'var(--line)'};"></span></span>
    </div>`;
    return `
      <div class="page-head">
        <div><h1>쇼핑몰 설정</h1><div class="sub">기본정보 · 다국어 · 운영자 권한</div></div>
        <div class="spacer"></div>
        <button class="btn primary">변경사항 저장</button>
      </div>

      <div class="tabs">
        <div class="tab active">기본 정보</div>
        <div class="tab">다국어 / 통화</div>
        <div class="tab">배송 / 결제</div>
        <div class="tab">운영자 권한</div>
        <div class="tab">알림 설정</div>
      </div>

      <div class="col-2">
        <div class="sk card">
          <div class="card-head"><h3>기본 정보</h3></div>
          <div class="form-grid">
            <div class="f-label">쇼핑몰 이름</div><div class="input">○○ 스토어</div>
            <div class="f-label">대표 도메인</div><div class="input">www.example-store.com</div>
            <div class="f-label">대표 이메일</div><div class="input">help@example-store.com</div>
            <div class="f-label">고객센터</div><div class="input">1588-0000</div>
            <div class="f-label">로고</div><div class="ph" style="width:130px; height:54px;">로고 이미지</div>
          </div>
        </div>

        <div style="display:grid; gap:var(--gap); align-content:start;">
          <div class="sk card">
            <div class="card-head"><h3>다국어 / 통화</h3><span class="hand-note">기본: 한국어 · KRW</span></div>
            ${langRow('🇰🇷','한국어 (기본)',true)}
            ${langRow('🇺🇸','English',true)}
            ${langRow('🇯🇵','日本語',true)}
            ${langRow('🇨🇳','简体中文',false)}
            <div class="help" style="margin-top:10px;">상품명·상세·배너·쿠폰은 언어별 입력 필드를 제공하며, 미입력 시 기본 언어로 대체됩니다.</div>
          </div>
          <div class="sk card">
            <div class="card-head"><h3>운영자 권한</h3><span class="more">＋ 운영자 초대</span></div>
            <div class="rank-list">
              ${[['최고관리자','전체 권한','accent'],['주문담당','주문·CS','dim'],['MD','상품·프로모션','dim']].map(r=>`
                <div class="rank-item"><div class="feed-ic">👤</div><div class="r-name">${r[0]}</div><span class="tag ${r[2]}">${r[1]}</span></div>`).join('')}
            </div>
          </div>
        </div>
      </div>`;
  };
})();
