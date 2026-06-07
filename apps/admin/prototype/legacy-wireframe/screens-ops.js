/* ============================================================
   운영 화면 — 주문 / 상품 / 회원
   ============================================================ */
(function(){
  const SC = window.SCREENS = window.SCREENS || {};

  const pager = (n)=>`<div class="pager">
    <span class="pg">‹</span>
    ${Array.from({length:n},(_,i)=>`<span class="pg ${i===0?'active':''}">${i+1}</span>`).join('')}
    <span class="pg">›</span></div>`;

  /* ---------------- 주문 관리 ---------------- */
  const orderTabs = [
    ['전체',1284],['결제완료',23],['배송준비',41],['배송중',88],
    ['배송완료',1102],['취소',6],['환불',4],['교환',3],
  ];
  const orders = [
    ['20260530-0184','05.30 14:22','김O연','프리미엄 코튼 티셔츠 외 2건','₩78,000','결제완료','accent'],
    ['20260530-0183','05.30 13:58','이O준','경량 패딩 자켓 (블랙)','₩129,000','배송준비',''],
    ['20260530-0181','05.30 13:10','박O서','베이직 데일리 슬랙스','₩39,000','배송중',''],
    ['20260530-0179','05.30 12:44','최O우','논슬립 러닝 양말 3팩 외 1건','₩24,500','취소요청','warn'],
    ['20260530-0175','05.30 11:31','정O민','오가닉 코튼 후드 집업','₩62,000','환불요청','warn'],
    ['20260530-0170','05.30 10:05','강O호','캐주얼 캔버스 스니커즈','₩55,000','배송완료','dim'],
    ['20260530-0168','05.30 09:48','윤O아','프리미엄 코튼 티셔츠','₩26,000','배송완료','dim'],
  ];
  SC.orders = function(){
    return `
      <div class="page-head">
        <div><h1>주문 관리</h1><div class="sub">전체 1,284건 · 처리 대기 74건</div></div>
        <div class="spacer"></div>
        <button class="btn ghost">⭳ 엑셀 다운로드</button>
        <button class="btn">일괄 송장 등록</button>
      </div>

      <div class="sk filterbar">
        <div class="field"><span class="lbl">기간</span> 2026.05.01 ~ 05.30 ▾</div>
        <div class="field"><span class="lbl">주문상태</span> 전체 ▾</div>
        <div class="field"><span class="lbl">결제수단</span> 전체 ▾</div>
        <div class="field grow">🔍 주문번호 · 주문자 · 상품명 검색</div>
        <button class="btn primary">조회</button>
        <button class="btn ghost">초기화</button>
      </div>

      <div class="tabs">
        ${orderTabs.map((t,i)=>`<div class="tab ${i===0?'active':''}">${t[0]} <span class="cnt">${t[1].toLocaleString()}</span></div>`).join('')}
      </div>

      <div class="sk" style="overflow:hidden;">
        <table class="table">
          <thead><tr>
            <th><span class="check"></span></th><th>주문번호</th><th>주문일시</th><th>주문자</th>
            <th>상품</th><th>결제금액</th><th>상태</th><th>처리</th>
          </tr></thead>
          <tbody>
            ${orders.map(o=>`<tr>
              <td><span class="check"></span></td>
              <td class="num">${o[0]}</td>
              <td class="num muted">${o[1]}</td>
              <td>${o[2]}</td>
              <td>${o[3]}</td>
              <td class="num">${o[4]}</td>
              <td><span class="tag ${o[6]}">${o[5]}</span></td>
              <td><button class="btn ghost" style="padding:5px 11px; font-size:13px;">상세</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${pager(7)}`;
  };

  /* ---------------- 상품 관리 ---------------- */
  const cats = ['전체','상의','하의','아우터','신발','잡화','언더웨어','세일'];
  const prods = [
    ['프리미엄 코튼 오버핏 티셔츠','상의','₩26,000','312','판매중','accent'],
    ['베이직 데일리 슬랙스','하의','₩39,000','88','판매중','accent'],
    ['경량 패딩 자켓 (블랙)','아우터','₩129,000','12','품절임박','warn'],
    ['논슬립 러닝 양말 3팩','잡화','₩8,900','0','품절','dim'],
    ['오가닉 코튼 후드 집업','상의','₩62,000','146','판매중','accent'],
    ['캐주얼 캔버스 스니커즈','신발','₩55,000','57','숨김','dim'],
  ];
  SC.products = function(){
    return `
      <div class="page-head">
        <div><h1>상품 관리</h1><div class="sub">전체 1,842개 · 판매중 1,610 · 품절 64</div></div>
        <div class="spacer"></div>
        <button class="btn ghost">⭳ 일괄 수정</button>
        <button class="btn primary">＋ 상품 등록</button>
      </div>

      <div class="tabs">
        ${cats.map((c,i)=>`<div class="chip ${i===0?'active':''}">${c}</div>`).join('')}
      </div>

      <div class="sk filterbar">
        <div class="field"><span class="lbl">판매상태</span> 전체 ▾</div>
        <div class="field"><span class="lbl">재고</span> 전체 ▾</div>
        <div class="field"><span class="lbl">정렬</span> 최신 등록순 ▾</div>
        <div class="field grow">🔍 상품명 · 상품코드 검색</div>
        <button class="btn primary">조회</button>
      </div>

      <div class="sk" style="overflow:hidden;">
        <table class="table">
          <thead><tr>
            <th><span class="check"></span></th><th>상품</th><th>카테고리</th>
            <th>판매가</th><th>재고</th><th>상태</th><th>다국어</th><th>관리</th>
          </tr></thead>
          <tbody>
            ${prods.map(p=>`<tr>
              <td><span class="check"></span></td>
              <td><div class="prod-cell"><span class="thumb"></span><span>${p[0]}</span></div></td>
              <td class="muted">${p[1]}</td>
              <td class="num">${p[2]}</td>
              <td class="num ${p[3]==='0'?'':''}">${p[3]}</td>
              <td><span class="tag ${p[5]}">${p[4]}</span></td>
              <td><span class="tag dim">KR EN JP</span></td>
              <td><button class="btn ghost" style="padding:5px 11px; font-size:13px;">수정</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${pager(6)}

      <div class="note" style="margin-top:var(--gap);">✎ 템플릿형 — “상품 등록/수정” 폼은 어느 업종 상품에도 적용되도록 공통 필드(기본정보·옵션·이미지·배송·다국어)로 구성합니다. 아래는 등록 폼 스케치.</div>

      <div class="sk card">
        <div class="card-head"><h3>상품 등록 / 수정</h3></div>
        <div class="form-grid">
          <div class="f-label">상품명 <span class="req">*</span></div>
          <div><div class="input">예) 프리미엄 코튼 오버핏 티셔츠</div><div class="help">다국어 입력 지원 — 🇰🇷 KR / 🇺🇸 EN / 🇯🇵 JP 탭 전환</div></div>

          <div class="f-label">카테고리 <span class="req">*</span></div>
          <div style="display:flex; gap:10px;"><div class="input" style="flex:1">대분류 ▾</div><div class="input" style="flex:1">중분류 ▾</div></div>

          <div class="f-label">판매가 / 할인가</div>
          <div style="display:flex; gap:10px;"><div class="input" style="flex:1">₩ 0</div><div class="input" style="flex:1">₩ 0</div></div>

          <div class="f-label">옵션</div>
          <div><div class="sk-dash" style="padding:12px;"><span class="hand-note">＋ 색상 / 사이즈 등 옵션 조합 · 재고 매트릭스</span></div></div>

          <div class="f-label">대표 이미지 <span class="req">*</span></div>
          <div style="display:flex; gap:10px;">
            <div class="ph" style="width:96px; height:96px;">대표</div>
            <div class="ph" style="width:96px; height:96px;">+</div>
            <div class="ph" style="width:96px; height:96px;">+</div>
          </div>

          <div class="f-label">상세 설명</div>
          <div><div class="input area">상세페이지 에디터 영역 (이미지·텍스트)</div></div>
        </div>
        <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:18px;">
          <button class="btn ghost">임시 저장</button>
          <button class="btn primary">등록</button>
        </div>
      </div>`;
  };

  /* ---------------- 회원 관리 ---------------- */
  const members = [
    ['user_kim91','김O연','VIP','2024.03.11','42건','₩3,820,000','정상'],
    ['lee_jun','이O준','일반','2026.05.28','1건','₩129,000','정상'],
    ['park_seo','박O서','일반','2025.11.02','8건','₩412,000','정상'],
    ['choi_woo','최O우','우수','2025.06.20','19건','₩1,240,000','정상'],
    ['jung_min','정O민','일반','2026.01.15','3건','₩186,000','휴면'],
    ['kang_ho','강O호','일반','2026.05.30','0건','₩0','정상'],
  ];
  SC.members = function(){
    return `
      <div class="page-head">
        <div><h1>회원 관리</h1><div class="sub">전체 48,210명 · 오늘 가입 37 · 휴면 1,204</div></div>
        <div class="spacer"></div>
        <button class="btn ghost">⭳ 엑셀</button>
        <button class="btn">SMS / 메일 발송</button>
      </div>

      <div class="col-3 mb">
        <div class="sk kpi"><div class="k-label">전체 회원</div><div class="k-value">48,210</div></div>
        <div class="sk kpi"><div class="k-label">이번달 신규</div><div class="k-value">1,083</div></div>
        <div class="sk kpi"><div class="k-label">VIP 회원</div><div class="k-value">312</div></div>
      </div>

      <div class="sk filterbar">
        <div class="field"><span class="lbl">가입일</span> 전체 ▾</div>
        <div class="field"><span class="lbl">등급</span> 전체 ▾</div>
        <div class="field"><span class="lbl">상태</span> 전체 ▾</div>
        <div class="field grow">🔍 이름 · 아이디 · 연락처 검색</div>
        <button class="btn primary">조회</button>
      </div>

      <div class="sk" style="overflow:hidden;">
        <table class="table">
          <thead><tr>
            <th><span class="check"></span></th><th>아이디</th><th>이름</th><th>등급</th>
            <th>가입일</th><th>주문수</th><th>누적 구매액</th><th>상태</th><th></th>
          </tr></thead>
          <tbody>
            ${members.map(m=>`<tr>
              <td><span class="check"></span></td>
              <td class="num">${m[0]}</td>
              <td>${m[1]}</td>
              <td><span class="tag ${m[2]==='VIP'?'accent':m[2]==='우수'?'accent':''}">${m[2]}</span></td>
              <td class="num muted">${m[3]}</td>
              <td class="num">${m[4]}</td>
              <td class="num">${m[5]}</td>
              <td><span class="tag ${m[6]==='휴면'?'dim':''}">${m[6]}</span></td>
              <td><button class="btn ghost" style="padding:5px 11px; font-size:13px;">상세</button></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      ${pager(8)}`;
  };
})();
