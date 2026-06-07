/* ============================================================
   SCREEN — 대시보드 (운영 액션 중심)
   ============================================================ */
(function(){
  const SC=window.SCREENS=window.SCREENS||{};
  const I=window.ICON;

  SC.dashboard=function(){
    const d=DATA.dashboard, CH=CHARTS, C=window.C;
    const wonMan = v => (v/10000).toLocaleString('ko-KR')+'만';

    const head = C.pageHeader('오늘 운영 현황',
      `${d.date} · 마지막 업데이트 ${d.updated}`,
      `${C.select('기간','오늘',`onclick="ADMIN.toast('기간 필터 (데모)','info')"`)}
       ${C.btn('리포트 내보내기',{icon:'download'})}`);

    const kpiGrid = `<div class="kpi-grid">${d.kpis.map(k=>C.summaryCard(k.label,k.value,k)).join('')}</div>`;

    // 처리 필요 업무 — 운영자가 바로 행동할 우선순위 (지표보다 먼저)
    const priorities=[
      { n:'23', label:'결제 대기',     sub:'배송 준비 필요', icon:'clock',   tone:'blue',  route:'orders' },
      { n:'41', label:'배송 준비',     sub:'송장 등록 대기', icon:'package', tone:'amber', route:'shipping' },
      { n:'7',  label:'환불·취소 요청', sub:'24시간 내 처리', icon:'refund',  tone:'red',   route:'orders' },
      { n:'18', label:'미답변 문의',   sub:'CS 응대 필요',   icon:'message', tone:'blue',  route:'reviews' },
      { n:'4',  label:'품절 임박 상품', sub:'재고 확인 필요', icon:'alert',   tone:'amber', route:'products' },
    ];
    const priorityRow=`
      <div class="action-priority">
        <div class="ap-head"><span class="ap-title">처리 필요 업무</span><span class="ap-sub">오늘 먼저 확인하세요</span></div>
        <div class="ap-grid">
          ${priorities.map(p=>`
            <button class="ap-card ${p.tone}" onclick="SCREENS.go('${p.route}')">
              <span class="ap-ic">${I(p.icon,18)}</span>
              <span class="ap-n">${p.n}</span>
              <span class="ap-l">${p.label}</span>
              <span class="ap-s">${p.sub}${I('chevronRight',14)}</span>
            </button>`).join('')}
        </div>
      </div>`;

    // 매출 추이 + 처리 대기
    const salesCard = `
      <div class="card">
        ${C.cardHead('매출 추이','최근 7일',`${C.select('','일별',`onclick="event.stopPropagation()"`)}`)}
        <div class="chart-legend">
          ${d.salesTrend.series.map(s=>`<span class="lg"><i style="background:${s.color}"></i>${s.name}</span>`).join('')}
        </div>
        <div class="chart-pad">${CH.lineChart({labels:d.salesTrend.labels, series:d.salesTrend.series, yfmt:wonMan})}</div>
      </div>`;
    const queueCard = `
      <div class="card">
        ${C.cardHead('처리 대기 업무','',`<span class="link" onclick="SCREENS.go('orders')">주문으로</span>`)}
        <div class="queue-list">
          ${d.queue.map(q=>`
            <div class="queue-row" onclick="SCREENS.go('${q.icon==='message'?'reviews':'orders'}')">
              <span class="q-ic ${q.ic}">${I(q.icon,17)}</span>
              <span class="q-l"><b>${q.t}</b><span>${q.s}</span></span>
              <span class="q-n ${q.hot?'hot':''}">${q.n}</span>
              <span class="q-go">${I('chevronRight',16)}</span>
            </div>`).join('')}
        </div>
      </div>`;
    const mainRow = `<div class="dash-main">${salesCard}${queueCard}</div>`;

    // 주문상태 bar + 카테고리 donut
    const statusCard = `
      <div class="card">
        ${C.cardHead('주문 상태 분포','진행중 주문 기준')}
        <div class="chart-pad">${CH.barChart({items:d.orderStatus})}</div>
      </div>`;
    const total=d.category.reduce((a,s)=>a+s.value,0);
    const donutCard = `
      <div class="card">
        ${C.cardHead('카테고리별 매출 비중','이번 달')}
        <div class="donut-wrap">
          ${CH.donutChart({segments:d.category, centerTop:'100%', centerSub:'전체 매출'})}
          <div class="donut-legend">
            ${d.category.map(s=>`<div class="dl"><i style="background:${s.color}"></i><span class="dl-n">${s.label}</span><b>${Math.round(s.value/total*100)}%</b></div>`).join('')}
          </div>
        </div>
      </div>`;
    const grid2 = `<div class="dash-grid2">${statusCard}${donutCard}</div>`;

    // 최근 주문 + 인기 상품
    const recentCard = `
      <div class="card">
        ${C.cardHead('최근 주문','',`<span class="link" onclick="SCREENS.go('orders')">전체 보기</span>`)}
        <div class="rank">
          ${d.recentOrders.map(o=>`
            <div class="rank-row" style="cursor:pointer" onclick="SCREENS.go('orders')">
              <span class="r-name" style="flex:0 0 130px; color:var(--text-2); font-weight:600">${o[0]}</span>
              <span class="r-name">${o[2]}<span style="color:var(--text-3); font-weight:400"> · ${o[1]}</span></span>
              <span class="r-meta"><b>₩${o[3]}</b></span>
              ${C.badge(o[4],o[5])}
            </div>`).join('')}
        </div>
      </div>`;
    const topCard = `
      <div class="card">
        ${C.cardHead('인기 상품 TOP 5','판매 수량 기준',`<span class="link" onclick="SCREENS.go('stats')">통계</span>`)}
        <div class="rank">
          ${d.topProducts.map((p,i)=>`
            <div class="rank-row">
              <span class="rk ${i<3?'top':''}">${i+1}</span>
              <span class="r-img"></span>
              <span class="r-name">${p[0]}<span style="color:var(--text-3); font-weight:400"> · ${p[1]}</span></span>
              <span class="r-meta"><b>${(+String(p[2]).replace(/,/g,'')).toLocaleString('ko-KR')}건</b><span>₩${p[3]}</span></span>
            </div>`).join('')}
        </div>
      </div>`;
    const grid3a = `<div class="dash-grid3 mb16">${recentCard}${topCard}</div>`;

    // 리뷰/문의 + 품절 임박
    const feedCard = `
      <div class="card">
        ${C.cardHead('리뷰 · 문의 알림','',`<span class="link" onclick="SCREENS.go('reviews')">CS 센터</span>`)}
        <div class="feed">
          ${d.feed.map(f=>`
            <div class="feed-row">
              <span class="f-ic ${f.tone==='amber'?'':''}" style="background:${f.tone==='amber'?'var(--warning-weak)':'var(--primary-weak)'};color:${f.tone==='amber'?'var(--warning)':'var(--primary)'}">${I(f.type==='review'?'star':'message',15)}</span>
              <span class="f-b"><span class="f-t">${f.txt} ${f.stars?`<span class="stars">${'★'.repeat(f.stars)}${'☆'.repeat(5-f.stars)}</span>`:''}</span><span class="f-m">${f.m}</span></span>
            </div>`).join('')}
        </div>
      </div>`;
    const lowCard = `
      <div class="card">
        ${C.cardHead('품절 임박 상품','재고 25개 이하',`<span class="link" onclick="SCREENS.go('products')">상품 관리</span>`)}
        <div class="rank">
          ${d.lowStock.map(p=>`
            <div class="rank-row" style="cursor:pointer" onclick="SCREENS.go('products')">
              <span class="r-img"></span>
              <span class="r-name">${p[0]}<span style="color:var(--text-3); font-weight:400"> · ${p[1]}</span></span>
              <span class="r-meta"><b style="color:${p[2]<=0?'var(--danger)':'var(--warning)'}">${p[2]}개</b></span>
              ${C.badge(p[3],p[4])}
            </div>`).join('')}
        </div>
      </div>`;
    const grid3b = `<div class="dash-grid3">${feedCard}${lowCard}</div>`;

    return head + priorityRow + kpiGrid + mainRow + grid2 + grid3a + grid3b;
  };
})();
