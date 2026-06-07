/* ============================================================
   SCREENS — 배송 / 정산 / 쿠폰 / 리뷰·문의 / 통계 / 설정
   ============================================================ */
(function(){
  const SC=window.SCREENS=window.SCREENS||{};
  window.DRAWERS=window.DRAWERS||{};
  const I=window.ICON, C=window.C, CH=window.CHARTS;

  /* ============================ 배송 관리 ============================ */
  SC.shipping=function(){
    const head=C.pageHeader('배송 관리','출고 대기 64건 · 배송 중 88건',
      `${C.btn('배송 설정',{icon:'settings',variant:'ghost'})}${C.btn('일괄 송장 등록',{icon:'truck',variant:'primary'})}`);
    // KPI — 배송 업무 순서대로 (대기→준비→중→완료→확인 필요)
    const summary=`<div class="kpi-grid" style="grid-template-columns:repeat(5,1fr)">
      ${C.summaryCard('배송 대기','23건',{icon:'clock',sub:'결제완료 후 미처리',attn:true})}
      ${C.summaryCard('배송 준비','41건',{icon:'package',sub:'송장 등록 대기'})}
      ${C.summaryCard('배송 중','88건',{icon:'truck',sub:'운송장 추적 가능'})}
      ${C.summaryCard('배송 완료','37건',{icon:'check',sub:'오늘 · 전일 41건'})}
      ${C.summaryCard('송장 오류·확인','2건',{icon:'alert',sub:'송장번호 확인 필요',attn:true})}
    </div>`;
    const tabs=`<div class="card mb16">${C.segtabs(DATA.shippingTabs,1)}</div>`;
    const filter=C.filterBar(`
      ${C.searchInput('주문번호 · 송장번호 검색')}
      ${C.select('택배사','전체')}${C.select('기간','최근 7일')}
      <span class="spacer"></span>${C.btn('조회',{variant:'primary'})}`);
    const headRow=`<tr>${C.checkTh}${C.th('주문번호')}${C.th('고객')}${C.th('상품')}${C.th('택배사')}${C.th('송장번호')}${C.th('배송상태')}${C.th('')}</tr>`;
    const body=DATA.shippings.map((s,i)=>{
      const noInv = s[4]==='준비중';
      return `<tr data-drawer="shipping" data-id="${i}" class="${noInv?'need-invoice':''}">
      ${C.checkTd}<td class="strong">#${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td><td class="muted">${s[3]}</td>
      <td class="tnum">${noInv?'<span class="no-invoice"><span class="ni-dot"></span>미등록</span>':s[4]}</td>
      <td>${C.badge(s[5],s[6])}</td><td>${C.kebab}</td></tr>`;}).join('');
    return head+summary+tabs+filter+`
      <div class="card" data-kind="orders">${C.table(headRow,body)}${C.pagination('1–4 / 129건','',1)}</div>`;
  };
  window.DRAWERS.shipping=function(id){
    const s=DATA.shippings[id];
    const body=`<div class="dsec">
      <div class="dsec-t">배송 정보</div>${C.kv([['주문번호',`#${s[0]}`],['받는 분',s[1]],['연락처','010-****-5678'],['상품',s[2]],['주소','서울특별시 강남구 테헤란로 ○○']])}</div>
      <div class="dsec"><div class="dsec-t">송장 등록</div>
        <div class="frow"><span class="field-l">택배사</span><button class="inp select-like">${s[3]} ${I('chevronDown',15)}</button></div>
        <div class="frow"><span class="field-l">송장번호</span><input class="inp" placeholder="송장번호 입력" value="${s[4]==='준비중'?'':s[4]}" /></div></div>`;
    return { title:`배송 #${s[0]}`, sub:`${s[1]} · ${s[3]}`, status:C.badge(s[5],s[6]), body,
      footer:`<span class="spacer"></span><button class="btn" data-detail-close>닫기</button><button class="btn primary" onclick="ADMIN.savedDetail('저장했습니다.')">송장 등록</button>` };
  };

  /* ============================ 정산 관리 (확장 예정) ============================ */
  SC.settlement=function(){
    const head=C.pageHeader('정산 관리','이번 달 정산 예정 ₩364,990,000',
      `${C.btn('정산서 PDF',{icon:'print'})}${C.btn('정산 내역 다운로드',{icon:'download'})}`);
    const summary=`<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      ${C.summaryCard('이번 달 매출','₩384.2M',{icon:'won',delta:7.7,dir:'up',sub:'전월 대비'})}
      ${C.summaryCard('결제 수수료','₩11.5M',{icon:'dollar',sub:'요율 3.0%'})}
      ${C.summaryCard('환불·차감','₩7.68M',{icon:'refund',sub:'전월 대비 +1.2%'})}
      ${C.summaryCard('정산 예정액','₩364.9M',{icon:'settlement',sub:'06.10 지급 예정',attn:true})}
    </div>`;
    const notice=C.notice('정산 관리는 추후 <b>결제 · 환불 · 수수료 · 입금 내역</b> 연동과 함께 확장됩니다. 현재는 월별 정산 집계 구조를 제공합니다.');
    const tabs=`<div class="card mb16">${C.segtabs(DATA.settlementTabs,1)}</div>`;
    const chart=`<div class="card mb16">${C.cardHead('월별 매출 · 정산 추이','최근 7개월')}
      <div class="chart-pad">${CH.barChart({items:[
        {label:'1월',value:312},{label:'2월',value:298},{label:'3월',value:402},
        {label:'4월',value:357},{label:'5월',value:384}].map(x=>({label:x.label,value:x.value,color:'#2563EB'})), yfmt:v=>v+'M'})}</div></div>`;
    const headRow=`<tr>${C.th('정산월')}${C.th('총 매출',{num:true})}${C.th('수수료',{num:true})}${C.th('환불액',{num:true})}${C.th('정산 금액',{num:true})}${C.th('상태')}${C.th('지급일')}${C.th('')}</tr>`;
    const body=DATA.settlements.map((s,i)=>`<tr data-drawer="settlement" data-id="${i}">
      <td class="strong">${s[0]}</td><td class="num">₩${s[1]}</td><td class="num muted">₩${s[2]}</td>
      <td class="num muted">₩${s[3]}</td><td class="num strong">₩${s[4]}</td>
      <td>${C.badge(s[5],s[6])}</td><td class="muted">${s[7]}</td><td>${C.kebab}</td></tr>`).join('');
    return head+summary+notice+tabs+chart+`
      <div class="card">${C.table(headRow,body)}${C.pagination('1–4 / 24건','',1)}</div>`;
  };
  window.DRAWERS.settlement=function(id){
    const s=DATA.settlements[id];
    const body=`<div class="dsec">
      <div class="dsec-t">${s[0]} 정산 내역</div>
      ${C.kv([['총 매출',`₩${s[1]}`],['결제 수수료 (3%)',`₩${s[2]}`],['환불·차감',`₩${s[3]}`],['정산 금액',`<b style="font-size:15px">₩${s[4]}</b>`],['지급 예정',s[7]]])}</div>`;
    const canConfirm = s[5]==='정산 예정';
    return { title:`${s[0]} 정산`, sub:'월별 정산 상세', status:C.badge(s[5],s[6]), body,
      footer:`${canConfirm?`<div class="danger-zone"><button class="btn danger" onclick="MISC.confirmSettle(${id})">정산 확정</button></div>`:''}<span class="spacer"></span><button class="btn" data-detail-close>닫기</button><button class="btn primary" onclick="ADMIN.toast('정산서를 내보냅니다','info')">정산서 PDF</button>` };
  };
  window.MISC=window.MISC||{};
  MISC.confirmSettle=function(id){
    const s=DATA.settlements[id];
    ADMIN.confirm({tone:'danger',icon:'alert',danger:true,title:'정산을 확정하시겠습니까?',
      msg:'확정 후에는 정산 금액을 수정할 수 없습니다.',
      meta:{target:`${s[0]} · ₩${s[4]}`, effect:'정산 확정 · 지급 예약', reversible:false},
      confirmText:'정산 확정', onConfirm:()=>{ ADMIN.closeDetail(true);
        ADMIN.result({status:'success',title:'정산을 확정했습니다.',msg:'지급 예정일에 등록된 계좌로 입금됩니다.'}); }});
  };

  /* ============================ 쿠폰·프로모션 ============================ */
  SC.coupons=function(){
    const head=C.pageHeader('쿠폰 · 프로모션','진행중 3 · 예약 1 · 종료 12',
      `${C.btn('기획전 만들기',{icon:'store'})}${C.btn('쿠폰 발급',{icon:'plus',variant:'primary'})}`);
    const cards=`<div class="dash-grid2 mb16">
      <div class="card"><div class="card-pad" style="display:flex;gap:14px;align-items:center">
        <div style="width:120px;height:84px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);flex:0 0 auto;display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:12px">배너</div>
        <div style="flex:1"><div style="font-weight:800;margin-bottom:6px">초여름 데일리룩 최대 30%</div>
        <div class="muted" style="font-size:13px">2026.05.20 ~ 06.05 · 노출 상품 42개</div>
        <div style="display:flex;gap:6px;margin-top:10px">${C.badge('진행중','success')}${C.badge('메인 노출','primary')}${C.badge('3개 국어','neutral')}</div></div>
      </div></div>
      <div class="card">${C.cardHead('쿠폰 사용 추이','최근 7일')}
        <div class="donut-wrap"><div class="chart-pad" style="padding:8px 0">${CH.donutChart({segments:[{label:'사용',value:62,color:'#2563EB'},{label:'미사용',value:38,color:'#E5E7EB'}],centerTop:'62%',centerSub:'사용률'})}</div>
        <div class="donut-legend"><div class="dl"><i style="background:#2563EB"></i><span class="dl-n">사용</span><b>4,885장</b></div><div class="dl"><i style="background:#E5E7EB"></i><span class="dl-n">미사용</span><b>2,996장</b></div></div></div></div>
    </div>`;
    const headRow=`<tr>${C.checkTh}${C.th('쿠폰명')}${C.th('혜택')}${C.th('대상')}${C.th('사용 / 발급',{num:true})}${C.th('상태')}${C.th('')}</tr>`;
    const body=DATA.coupons.map((c,i)=>`<tr data-drawer="coupon" data-id="${i}">
      ${C.checkTd}<td class="strong">${c[0]}</td><td class="muted">${c[1]}</td><td class="muted">${c[2]}</td>
      <td class="num tnum">${c[3]}</td><td>${C.badge(c[4],c[5])}</td><td>${C.kebab}</td></tr>`).join('');
    return head+cards+`<div class="card">${C.cardHead('쿠폰 목록')}${C.table(headRow,body)}${C.pagination('1–5 / 16건','',1)}</div>`;
  };
  window.DRAWERS.coupon=function(id){
    const c=DATA.coupons[id];
    const body=`<div class="dsec">
      <div class="dsec-t">쿠폰 정보</div>${C.kv([['쿠폰명',c[0]],['혜택',c[1]],['사용 대상',c[2]],['사용/발급',c[3]],['유효기간','2026.05.01 ~ 06.30']])}</div>`;
    return { title:c[0], sub:'쿠폰 상세', status:C.badge(c[4],c[5]), body,
      footer:`<div class="danger-zone"><button class="btn danger" onclick="MISC.endCoupon(${id})">즉시 종료</button></div><span class="spacer"></span><button class="btn" data-detail-close>닫기</button><button class="btn primary" onclick="ADMIN.savedDetail('저장했습니다.')">변경사항 저장</button>` };
  };
  MISC.endCoupon=function(id){
    const c=DATA.coupons[id];
    ADMIN.confirm({tone:'danger',icon:'ban',danger:true,title:'쿠폰을 즉시 종료하시겠습니까?',
      msg:'발급된 쿠폰의 신규 사용이 중단됩니다.',
      meta:{target:c[0], effect:'쿠폰 사용 중단', reversible:false},
      confirmText:'즉시 종료', onConfirm:()=>{ ADMIN.closeDetail(true); ADMIN.floatResult('쿠폰을 종료했습니다.'); }});
  };

  /* ============================ 리뷰 · 문의 ============================ */
  SC.reviews=function(){
    const head=C.pageHeader('리뷰 · 문의','미답변 문의 18건 · 신고 리뷰 2건',
      `${C.btn('자주 쓰는 답변',{icon:'message'})}`);
    const tabs=`<div class="card mb16">${C.segtabs([['1:1 문의',18],['상품 Q&A',42],['리뷰 관리',1204],['신고·블라인드',2]],0)}</div>`;
    const list=DATA.inquiries.map((q,i)=>`
      <div class="queue-row" data-inq="${i}" style="${i===0?'background:var(--primary-weak)':''}">
        <span class="q-ic ${q[7]==='warning'?'amber':'gray'}">${I(q[1]==='배송문의'?'truck':q[1]==='교환/반품'?'refund':'message',16)}</span>
        <span class="q-l"><b>${q[4]}</b><span>${q[2]} · ${q[3]} · ${q[5]}</span></span>
        ${C.badge(q[0],q[7])}
      </div>`).join('');
    const left=`<div class="card"><div class="queue-list">${list}</div></div>`;
    const q=DATA.inquiries[0];
    const right=`<div class="card">${C.cardHead('문의 상세 / 답변','',C.badge('답변대기','warning'))}
      <div class="card-pad">
        <div style="padding:13px;background:var(--surface-2);border-radius:10px;margin-bottom:14px">
          <div class="muted" style="font-size:12px;margin-bottom:6px">${q[3]} · ${q[2]} · ${q[5]}</div>
          <div>${q[4]}</div></div>
        <div class="frow"><span class="field-l">답변 작성</span>
          <div class="lang-tabs"><span class="lang-tab active">한국어</span><span class="lang-tab">EN</span><span class="lang-tab">JP</span></div>
          <textarea class="inp" placeholder="답변을 입력하세요 — 자주 쓰는 답변 불러오기 가능">안녕하세요, 고객님. 문의 주셔서 감사합니다.</textarea></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button class="btn" onclick="ADMIN.toast('보류 처리되었습니다','info')">보류</button>
          <button class="btn primary" onclick="ADMIN.toast('답변이 등록되었습니다')">답변 등록</button></div>
      </div></div>`;
    return head+tabs+`<div class="dash-grid2" style="grid-template-columns:1fr 1fr">${left}${right}</div>`;
  };
  SC._after_reviews=function(){
    document.querySelectorAll('[data-inq]').forEach(el=>el.onclick=()=>{
      document.querySelectorAll('[data-inq]').forEach(x=>x.style.background='');
      el.style.background='var(--primary-weak)';
    });
  };

  /* ============================ 통계 · 리포트 ============================ */
  SC.stats=function(){
    const head=C.pageHeader('통계 · 리포트','기간: 2026.05.01 ~ 05.30',
      `${C.select('기간','이번 달')}${C.btn('리포트 내보내기',{icon:'download'})}`);
    const summary=`<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      ${C.summaryCard('총 매출','₩384.2M',{icon:'won',delta:7.7,dir:'up',sub:'전월 대비'})}
      ${C.summaryCard('순매출','₩356.8M',{icon:'trending',sub:'환불 제외'})}
      ${C.summaryCard('주문 수','4,021건',{icon:'cart',delta:5.1,dir:'up',sub:'전월 대비'})}
      ${C.summaryCard('평균 주문금액','₩95,500',{icon:'dollar',delta:2.4,dir:'up',sub:'전월 대비'})}
    </div>`;
    const c1=`<div class="card">${C.cardHead('일자별 매출 / 주문','최근 7일')}
      <div class="chart-legend">${DATA.dashboard.salesTrend.series.map(s=>`<span class="lg"><i style="background:${s.color}"></i>${s.name}</span>`).join('')}</div>
      <div class="chart-pad">${CH.lineChart({labels:DATA.dashboard.salesTrend.labels,series:DATA.dashboard.salesTrend.series,yfmt:v=>(v/10000).toLocaleString('ko-KR')+'만'})}</div></div>`;
    const total=DATA.dashboard.category.reduce((a,s)=>a+s.value,0);
    const c2=`<div class="card">${C.cardHead('카테고리별 매출 비중','이번 달')}
      <div class="donut-wrap">${CH.donutChart({segments:DATA.dashboard.category,centerTop:'100%',centerSub:'전체'})}
      <div class="donut-legend">${DATA.dashboard.category.map(s=>`<div class="dl"><i style="background:${s.color}"></i><span class="dl-n">${s.label}</span><b>${Math.round(s.value/total*100)}%</b></div>`).join('')}</div></div></div>`;
    const c3=`<div class="card">${C.cardHead('시간대별 주문 분포','평균')}
      <div class="chart-pad">${CH.barChart({items:[['0–6시',180],['6–10시',420],['10–14시',880],['14–18시',1020],['18–22시',1180],['22–24시',341]].map(x=>({label:x[0],value:x[1],color:'#0EA5E9'}))})}</div></div>`;
    const c4=`<div class="card">${C.cardHead('신규 vs 재구매','주문 건수 기준')}
      <div class="chart-pad">${CH.barChart({items:[{label:'신규',value:1480,color:'#2563EB'},{label:'재구매',value:2541,color:'#1E293B'}]})}</div></div>`;
    return head+summary+`<div class="dash-grid2 mb16">${c1}${c2}</div><div class="dash-grid2">${c3}${c4}</div>`;
  };

  /* ============================ 쇼핑몰 설정 ============================ */
  SC.settings=function(){
    const head=C.pageHeader('쇼핑몰 설정','기본 정보 · 다국어 · 운영자 권한',
      `<span class="save-hint" id="saveHint">변경사항 없음</span>${C.btn('변경사항 저장',{icon:'check',variant:'primary',attr:'id="settingsSave"'})}`);
    const tabs=`<div class="card mb16">${C.segtabs([['기본 정보',0],['다국어·통화',0],['배송·결제',0],['운영자 권한',0],['알림',0]],0)}</div>`;
    const basic=`<div class="card"><div class="card-pad">
      <div class="dsec-t">기본 정보</div>
      <div class="frow"><span class="field-l">쇼핑몰 이름</span><input class="inp" value="○○ 스토어" /></div>
      <div class="frow"><span class="field-l">대표 도메인</span><input class="inp" value="www.example-store.com" /></div>
      <div class="frow"><div class="fgrid2"><div><span class="field-l">대표 이메일</span><input class="inp" value="help@example-store.com" /></div><div><span class="field-l">고객센터</span><input class="inp" value="1588-0000" /></div></div></div>
      <div class="frow"><span class="field-l">로고</span><div style="width:140px;height:56px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:12px;gap:6px">${I('upload',16)}로고 업로드</div></div>
    </div></div>`;
    const langRow=(code,name,on)=>`<div class="dline" data-lang-row>
      <span style="width:34px;font-size:11px;font-weight:800;color:var(--text-3);letter-spacing:.04em">${code}</span><span class="dl-t" style="flex:1"><b>${name}</b></span>
      ${C.badge(on?'노출':'숨김',on?'success':'neutral')}
      <span class="lang-toggle" data-lang="${name}" data-on="${on?1:0}" onclick="SCREENS._toggleLang(this)" style="width:42px;height:24px;border-radius:999px;background:${on?'var(--primary)':'var(--border-strong)'};position:relative;cursor:pointer;flex:0 0 auto">
        <span style="position:absolute;top:3px;${on?'right:3px':'left:3px'};width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:var(--shadow-sm)"></span></span></div>`;
    const roleRow=(ini,name,email,roleLabel,roleKey,top)=>`<div class="dline role-row" data-who="${name}">
      <span style="width:32px;height:32px;border-radius:50%;background:${top?'#E0E7FF':'var(--surface-2)'};color:${top?'#3730A3':'var(--text-2)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${ini}</span>
      <span class="dl-t" style="flex:1"><b>${name}</b><span>${email}</span></span>
      ${top?C.badge('최고관리자','primary')
        :`<span class="role-pick">${['주문·CS','상품·프로모션','읽기전용'].map(r=>`<span class="role-opt ${r===roleLabel?'active':''}" data-role="${r}" onclick="SCREENS._changeRole(this)">${r}</span>`).join('')}</span>`}</div>`;
    const right=`<div style="display:grid;gap:18px;align-content:start">
      <div class="card"><div class="card-pad">
        <div class="dsec-t">다국어 · 통화 <span style="color:var(--text-3);font-weight:400">· 기본 한국어 / KRW</span></div>
        ${langRow('KR','한국어 (기본)',true)}${langRow('EN','English',true)}${langRow('JP','日本語',true)}${langRow('CN','简体中文',false)}
        <div style="margin-top:12px;font-size:12px;color:var(--text-3)">언어 노출 변경은 실제 쇼핑몰에 즉시 반영되어 별도 확인을 거칩니다.</div>
      </div></div>
      <div class="card"><div class="card-pad">
        <div style="display:flex;align-items:center"><div class="dsec-t" style="margin:0">운영자 권한</div><span class="link" style="margin-left:auto" onclick="ADMIN.toast('운영자 초대 (데모)','info')">＋ 운영자 초대</span></div>
        <div style="margin-top:12px">
          ${roleRow('관','관리자','admin@example-store.com','','',true)}
          ${roleRow('주','주문담당자','order@example-store.com','주문·CS')}
          ${roleRow('엠','MD','md@example-store.com','상품·프로모션')}
        </div>
        <div class="log-note">${I('info',15)}<span>권한 변경 내역은 관리 로그에 기록되며, 변경 즉시 해당 운영자에게 적용됩니다.</span></div>
      </div></div>
    </div>`;
    return head+tabs+`<div class="settings-grid">${basic}${right}</div>`;
  };
  SC._after_settings=function(){
    const content=document.getElementById('content');
    let dirty=false;
    const saveBtn=document.getElementById('settingsSave');
    const hint=document.getElementById('saveHint');
    if(saveBtn) saveBtn.classList.add('is-disabled');
    SC.__settingsDirty=()=>dirty;
    SC.__settingsClean=()=>{ dirty=false; if(saveBtn) saveBtn.classList.add('is-disabled'); if(hint){ hint.textContent='변경사항 없음'; hint.classList.remove('dirty'); } };
    const markDirty=()=>{ if(dirty)return; dirty=true; if(saveBtn) saveBtn.classList.remove('is-disabled'); if(hint){ hint.textContent='저장하지 않은 변경사항'; hint.classList.add('dirty'); } };
    content.querySelectorAll('.inp, textarea').forEach(el=> el.addEventListener('input', markDirty));
    if(saveBtn) saveBtn.onclick=()=> SC._saveSettings();
  };
  SC._saveSettings=function(){
    if(!SC.__settingsDirty || !SC.__settingsDirty()){ ADMIN.toast('변경된 내용이 없습니다','info'); return; }
    // C: 중요한 저장 — Confirm 후 Result Modal
    ADMIN.confirm({tone:'primary',icon:'info',title:'설정을 저장하시겠습니까?',
      msg:'기본 정보 변경사항을 저장합니다.',
      meta:{target:'쇼핑몰 기본 설정', effect:'쇼핑몰 노출에 반영', reversible:true},
      confirmText:'변경사항 저장', onConfirm:()=>{ SC.__settingsClean&&SC.__settingsClean();
        ADMIN.result({status:'success',title:'저장했습니다.',msg:'설정 변경사항이 적용되었습니다.'}); }});
  };
  // 다국어·통화 — 노출 영향 → Confirm + Result
  SC._toggleLang=function(el){
    const name=el.dataset.lang; const on=el.dataset.on==='1';
    ADMIN.confirm({tone:'warn',icon:'globe',title:`${name} 노출을 ${on?'중단':'시작'}하시겠습니까?`,
      msg:'다국어·통화 설정은 실제 쇼핑몰 노출에 즉시 영향을 줍니다.',
      meta:{target:name, effect:on?'고객 노출 중단':'고객 노출 시작', reversible:true},
      confirmText:on?'노출 중단':'노출 시작', onConfirm:()=>{
        el.dataset.on=on?'0':'1';
        el.style.background = on?'var(--border-strong)':'var(--primary)';
        const knob=el.querySelector('span'); if(knob){ knob.style.left=on?'3px':''; knob.style.right=on?'':'3px'; }
        const badge=el.closest('.dline').querySelector('.badge');
        if(badge){ badge.className='badge '+(on?'neutral':'success'); badge.lastChild.textContent=on?'숨김':'노출'; }
        ADMIN.result({status:'success',title:'변경했습니다.',msg:`${name} 노출이 ${on?'중단':'시작'}되었습니다.`}); }});
  };
  // 운영자 권한 변경 — Confirm 필수 + 로그 기록
  SC._changeRole=function(el){
    if(el.classList.contains('active')) return;
    const role=el.dataset.role; const who=el.closest('.role-row').dataset.who;
    const opts=[...el.parentElement.children];
    ADMIN.confirm({tone:'primary',icon:'members',title:'권한을 변경하시겠습니까?',
      msg:'운영자 권한을 변경합니다.',
      meta:{target:`${who} → ${role}`, effect:'접근 가능 메뉴 변경', reversible:true},
      confirmText:'권한 변경', onConfirm:()=>{ opts.forEach(o=>o.classList.remove('active')); el.classList.add('active');
        ADMIN.result({status:'success',title:'권한을 변경했습니다.',msg:'변경 내역이 관리 로그에 기록되었습니다.'}); }});
  };
})();
