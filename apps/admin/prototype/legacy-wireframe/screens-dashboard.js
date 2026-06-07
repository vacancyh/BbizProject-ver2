/* ============================================================
   대시보드 — 3가지 레이아웃 안 (A 클래식 / B 액션센터 / C 차트중심)
   ============================================================ */
(function(){
  const SC = window.SCREENS = window.SCREENS || {};

  /* ---------- shared fragments ---------- */
  const kpis = [
    { label:'오늘 매출', value:'₩12,840,000', delta:'어제 대비 +8.2%', dir:'up', ic:'₩' },
    { label:'오늘 주문', value:'184 건', delta:'어제 대비 +12 건', dir:'up', ic:'📦' },
    { label:'신규 회원', value:'37 명', delta:'어제 대비 -4 명', dir:'down', ic:'👤' },
    { label:'방문자', value:'5,920 명', delta:'어제 대비 +3.1%', dir:'up', ic:'👁' },
  ];
  const kpiCard = (k)=>`
    <div class="sk kpi">
      <div class="k-ic">${k.ic}</div>
      <div class="k-label">${k.label}</div>
      <div class="k-value">${k.value}</div>
      <div class="k-delta"><span class="${k.dir}">${k.dir==='up'?'▲':'▼'}</span>${k.delta}</div>
    </div>`;
  const kpiRow = ()=>`<div class="kpi-row">${kpis.map(kpiCard).join('')}</div>`;

  const pending = [
    {n:23,l:'신규 주문',hot:true},{n:41,l:'배송 준비',hot:true},{n:88,l:'배송 중'},
    {n:6,l:'취소 요청',hot:true},{n:4,l:'환불 요청',hot:true},{n:3,l:'교환 요청'},
  ];
  const pendingCard = (cols)=>`
    <div class="sk card">
      <div class="card-head"><h3>처리 대기 주문</h3><span class="more">전체 보기 →</span></div>
      <div class="pending-grid" style="grid-template-columns:repeat(${cols||3},1fr)">
        ${pending.map(p=>`
          <div class="pending-cell">
            <div class="pc-num ${p.hot?'hot':''}">${p.n}</div>
            <div class="pc-lbl">${p.l}</div>
          </div>`).join('')}
      </div>
    </div>`;

  const salesChart = (h)=>`
    <div class="sk card">
      <div class="card-head">
        <h3>매출 추이</h3>
        <div style="margin-left:auto; display:flex; gap:6px;">
          <span class="chip active">일</span><span class="chip">주</span><span class="chip">월</span>
        </div>
      </div>
      <div class="ph-chart" style="height:${h||220}px">
        <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);"
             class="hand-note">／＼ 일자별 매출·주문 라인 그래프 ／＼</div>
      </div>
    </div>`;

  const products = [
    '프리미엄 코튼 오버핏 티셔츠','베이직 데일리 슬랙스','경량 패딩 자켓 (블랙)',
    '논슬립 러닝 양말 3팩','오가닉 코튼 후드 집업','캐주얼 캔버스 스니커즈',
  ];
  const rankCard = ()=>`
    <div class="sk card">
      <div class="card-head"><h3>인기 상품 TOP 6</h3><span class="more">통계 →</span></div>
      <div class="rank-list">
        ${products.map((p,i)=>`
          <div class="rank-item">
            <div class="rank-no ${i<3?'top':''}">${i+1}</div>
            <div class="r-name">${p}</div>
            <div class="r-val">${(420-i*46)} 건</div>
          </div>`).join('')}
      </div>
    </div>`;

  const feed = [
    {ic:'★',txt:'<b>김O연</b> 님이 「경량 패딩 자켓」에 ★★★★★ 리뷰를 남겼습니다',meta:'5분 전 · 리뷰',},
    {ic:'?',txt:'<b>이O준</b> 님 1:1 문의 — 배송지 변경 요청 (답변 대기)',meta:'21분 전 · 문의',},
    {ic:'!',txt:'「논슬립 러닝 양말 3팩」 재고 12개 — 재고 부족 임박',meta:'1시간 전 · 재고',},
    {ic:'★',txt:'<b>박O서</b> 님이 「베이직 슬랙스」에 ★★☆☆☆ 리뷰를 남겼습니다',meta:'2시간 전 · 리뷰',},
    {ic:'↩',txt:'<b>최O우</b> 님 환불 요청 — 주문 #20260530-0091',meta:'3시간 전 · 환불',},
  ];
  const feedCard = ()=>`
    <div class="sk card">
      <div class="card-head"><h3>리뷰 · 문의 알림</h3><span class="more">CS 센터 →</span></div>
      <div class="feed">
        ${feed.map(f=>`
          <div class="feed-item">
            <div class="feed-ic">${f.ic}</div>
            <div class="feed-body"><div class="f-txt">${f.txt}</div><div class="f-meta">${f.meta}</div></div>
          </div>`).join('')}
      </div>
    </div>`;

  const visitorsCard = ()=>`
    <div class="sk card">
      <div class="card-head"><h3>신규 회원 · 방문자</h3><span class="more">리포트 →</span></div>
      <div class="ph-chart" style="height:150px">
        <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%);"
             class="hand-note">▁▃▅▆▇ 가입·방문 추이 막대 ▇▆▅▃▁</div>
      </div>
    </div>`;

  /* ---------- layout switcher ---------- */
  function switcher(active){
    return `
      <div class="seg" id="dash-seg">
        <button data-l="A" class="${active==='A'?'active':''}">안 A · 클래식</button>
        <button data-l="B" class="${active==='B'?'active':''}">안 B · 액션센터</button>
        <button data-l="C" class="${active==='C'?'active':''}">안 C · 차트중심</button>
      </div>`;
  }
  const blurb = {
    A:'KPI 4종을 상단에 나란히, 그 아래 매출 그래프와 사이드 위젯. 가장 보편적이고 학습 비용이 낮은 표준형.',
    B:'좌측에 “처리 대기 주문”을 크게 배치한 업무 중심형. 로그인 직후 “지금 할 일”이 가장 먼저 보임.',
    C:'큰 매출 그래프를 중심에 둔 잡지형. 우측 레일에 위젯을 쌓아 추이 모니터링에 강함.',
  };

  /* ---------- bodies ---------- */
  function bodyA(){
    return `<div class="dash layout-A">
      ${kpiRow()}
      <div class="split">
        <div style="display:grid; gap:var(--gap); align-content:start;">
          ${salesChart(230)}
          ${pendingCard(6)}
        </div>
        <div style="display:grid; gap:var(--gap); align-content:start;">
          ${rankCard()}
          ${feedCard()}
        </div>
      </div>
    </div>`;
  }
  function bodyB(){
    return `<div class="dash layout-B">
      <div class="top">
        ${pendingCard(3)}
        <div class="kpi-stack">${kpis.map(kpiCard).join('')}</div>
      </div>
      <div class="lower">
        ${salesChart(170)}
        ${rankCard()}
        ${feedCard()}
      </div>
    </div>`;
  }
  function bodyC(){
    return `<div class="dash layout-C">
      <div class="col-main">
        ${kpiRow()}
        ${salesChart(300)}
        ${pendingCard(6)}
      </div>
      <div class="col-side">
        ${rankCard()}
        ${feedCard()}
        ${visitorsCard()}
      </div>
    </div>`;
  }

  SC.dashboard = function(){
    const active = window.__dashLayout || 'A';
    const body = active==='A'?bodyA():active==='B'?bodyB():bodyC();
    setTimeout(()=>{
      const seg = document.getElementById('dash-seg');
      if(seg) seg.querySelectorAll('button').forEach(b=>{
        b.onclick=()=>{ window.__dashLayout=b.dataset.l; SC._render('dashboard'); };
      });
    },0);
    return `
      <div class="page-head">
        <div>
          <h1>대시보드</h1>
          <div class="sub">2026년 5월 30일 토요일 · 마지막 동기화 방금 전</div>
        </div>
        <div class="spacer"></div>
        ${switcher(active)}
      </div>
      <div class="note">✎ 레이아웃 탐색용 — 위 토글로 대시보드 3가지 안을 비교하세요. &nbsp;|&nbsp; <b>${blurb[active]}</b></div>
      ${body}`;
  };
})();
