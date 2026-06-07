/* ============================================================
   SCREENS — 주문 / 상품 / 회원 (테이블 + Drawer)
   ============================================================ */
(function(){
  const SC=window.SCREENS=window.SCREENS||{};
  window.DRAWERS=window.DRAWERS||{};
  const I=window.ICON;
  const C=window.C;
  const won = s => '₩'+s;

  /* 상태 정책 — 결제 / 주문 / 배송을 각각 다른 컬럼으로 (색+텍스트 배지) */
  const payState = o => o[5]==='환불요청' ? ['환불 대기','warning'] : ['결제완료','success'];
  const orderState = o =>
    o[5]==='취소요청' ? ['취소 요청','warning'] :
    o[5]==='환불요청' ? ['환불 요청','danger'] :
    o[6]==='배송완료' ? ['배송 완료','success'] :
    o[6]==='배송중'   ? ['배송 중','neutral'] :
    o[6]==='배송준비' ? ['상품 준비','info'] : ['주문 접수','info'];
  const shipBadge = o => o[6]==='-' ? '<span class="muted">—</span>'
    : C.badge(o[6], o[6]==='배송완료'?'success':o[6]==='배송중'?'neutral':'info');

  /* ============================ 주문 관리 ============================ */
  SC.orders=function(){
    const head=C.pageHeader('주문 관리','전체 1,284건 · 처리 대기 74건',
      `${C.btn('엑셀 다운로드',{icon:'download'})}${C.btn('일괄 송장 등록',{icon:'truck',variant:'primary'})}`);
    const filter=C.filterBar(`
      ${C.searchInput('주문번호 · 고객명 검색')}
      ${C.select('기간','최근 30일')}
      ${C.select('주문상태','전체')}
      ${C.select('결제상태','전체')}
      ${C.select('배송상태','전체')}
      <span class="spacer"></span>
      ${C.btn('초기화',{variant:'ghost'})}${C.btn('조회',{variant:'primary'})}`);

    const headRow=`<tr>${C.checkTh}
      ${C.th('주문번호',{sortable:true,sorted:'desc'})}${C.th('주문일시',{sortable:true})}
      ${C.th('고객명')}${C.th('수량',{num:true})}${C.th('결제금액',{num:true,sortable:true})}
      ${C.th('결제상태')}${C.th('주문상태')}${C.th('배송상태')}${C.th('송장')}${C.th('')}</tr>`;
    const body=DATA.orders.map((o,i)=>{
      const pay=payState(o), ord=orderState(o);
      const hasInv = !(o[7]==='-'||o[7]==='준비중');
      return `
      <tr data-drawer="order" data-id="${i}">
        ${C.checkTd}
        <td class="strong">#${o[0]}</td>
        <td class="muted tnum">${o[1].slice(5)}</td>
        <td>${o[2]}</td>
        <td class="num muted">${o[3]}</td>
        <td class="num strong">${won(o[4])}</td>
        <td>${C.badge(pay[0],pay[1])}</td>
        <td>${C.badge(ord[0],ord[1])}</td>
        <td>${shipBadge(o)}</td>
        <td class="muted tnum">${hasInv?o[7]:o[6]==='배송준비'?'<span class="no-invoice"><span class="ni-dot"></span>미등록</span>':'—'}</td>
        <td>${C.kebab}</td>
      </tr>`;}).join('');

    return head+filter+`
      <div class="card" data-kind="orders">
        ${C.segtabs(DATA.orderTabs,0)}
        ${C.table(headRow,body)}
        ${C.pagination('총 1,284건 중 1–10','전체',1).replace('전체','').replace('총 1,284건 중 1–10','1–10 / 1,284건')}
      </div>`;
  };

  window.DRAWERS.order=function(id){
    const o=DATA.orders[id];
    const pay=payState(o), ord=orderState(o);
    const items=[
      ['프리미엄 코튼 오버핏 티셔츠','옵션: 블랙 / L','26,000','1'],
      ['베이직 데일리 슬랙스','옵션: 그레이 / 32','39,000','1'],
    ];
    const body=`
      <div class="dsec">
        <div class="dsec-t">주문 기본 정보</div>
        ${C.kv([['주문번호',`#${o[0]}`],['주문일시',o[1]],['주문상태',C.badge(ord[0],ord[1])],['주문 경로','PC 웹']])}
      </div>
      <div class="dsec">
        <div class="dsec-t">고객 정보 <span style="color:var(--text-3);font-weight:400">· 개인정보 마스킹</span></div>
        ${C.kv([['주문자',o[2]],['연락처','010-****-1234'],['이메일','k****@example.com'],['등급','일반 회원']])}
      </div>
      <div class="dsec">
        <div class="dsec-t">주문 상품 ${o[3]}건</div>
        ${items.map(it=>`<div class="dline"><span class="dl-img"></span>
          <span class="dl-t"><b>${it[0]}</b><span>${it[1]}</span></span>
          <span class="num"><b>₩${it[2]}</b><div class="muted" style="font-size:12px">수량 ${it[3]}</div></span></div>`).join('')}
      </div>
      <div class="dsec">
        <div class="dsec-t">결제 정보</div>
        ${C.kv([['결제수단','신용카드 (일시불)'],['결제상태',C.badge(pay[0],pay[1])],['상품 합계','₩65,000'],['배송비','₩3,000'],['총 결제금액',`<b style="font-size:15px">${won(o[4])}</b>`]])}
      </div>
      <div class="dsec">
        <div class="dsec-t">배송 정보</div>
        <div class="frow"><span class="field-l">배송 상태 변경</span>
          <button class="inp select-like" onclick="ADMIN.toast('배송 상태 변경 — 강제 완료는 하단 버튼 사용','info')">${o[6]==='-'?'배송 준비':o[6]} ${I('chevronDown',15)}</button></div>
        <div class="frow"><span class="field-l">택배사 / 송장번호</span>
          <div class="fgrid2"><button class="inp select-like">CJ대한통운 ${I('chevronDown',15)}</button><input class="inp" placeholder="송장번호 입력" value="${o[7]==='-'||o[7]==='준비중'?'':o[7]}" /></div></div>
        ${C.kv([['받는 분',o[2]],['주소','서울특별시 강남구 테헤란로 ○○ 12층'],['배송 요청','부재 시 경비실에 맡겨주세요']])}
      </div>
      <div class="dsec">
        <div class="dsec-t">관리자 메모 <span style="color:var(--text-3);font-weight:400">· 고객 비노출</span></div>
        <textarea class="inp" placeholder="내부 메모 (고객에게 노출되지 않음)"></textarea>
      </div>
      <div class="dsec" style="margin-bottom:4px">
        <div class="dsec-t">처리 이력</div>
        <div class="dline" style="padding:8px 0"><span class="dl-t"><b>결제 완료</b><span>${o[1]} · 시스템</span></span></div>
        <div class="dline" style="padding:8px 0"><span class="dl-t"><b>주문 접수</b><span>${o[1]} · 관리자</span></span></div>
      </div>`;
    const footer=`
      <div class="danger-zone">
        <button class="btn danger" onclick="OPS.refund(${id})">환불 처리</button>
        <button class="btn" onclick="OPS.cancelOrder(${id})">주문 취소</button>
      </div>
      <span class="spacer"></span>
      <button class="btn" onclick="OPS.forceDeliver(${id})">배송 완료 처리</button>
      <button class="btn" data-detail-close>닫기</button>
      <button class="btn primary" onclick="ADMIN.savedDetail('저장했습니다.')">변경사항 저장</button>`;
    return { title:`주문 #${o[0]}`, sub:`${o[1]} · ${o[2]}`, status:C.badge(ord[0],ord[1]), body, footer };
  };

  /* 위험 액션 — Confirm Modal → 완료 Result Modal */
  window.OPS = window.OPS || {};
  OPS.refund=function(id){
    const o=DATA.orders[id];
    ADMIN.confirm({tone:'danger',icon:'refund',danger:true,title:'환불 처리하시겠습니까?',
      msg:'고객 결제 금액을 환불하고 결제를 취소합니다.',
      meta:{target:`주문 #${o[0]} · ${won(o[4])}`, effect:'결제 취소 · 환불 접수', reversible:false},
      confirmText:'환불 처리', onConfirm:()=>{ ADMIN._detailDirty=false; ADMIN.closeDetail(true);
        ADMIN.result({status:'success',title:'환불 처리했습니다.',msg:'환불 접수가 완료되었습니다. 정산 내역에 반영됩니다.'}); }});
  };
  OPS.cancelOrder=function(id){
    const o=DATA.orders[id];
    ADMIN.confirm({tone:'danger',icon:'ban',danger:true,title:'주문을 취소하시겠습니까?',
      msg:'주문을 취소 처리합니다.',
      meta:{target:`주문 #${o[0]}`, effect:'주문 취소 · 재고 복원', reversible:false},
      confirmText:'주문 취소', onConfirm:()=>{ ADMIN._detailDirty=false; ADMIN.closeDetail(true);
        ADMIN.result({status:'success',title:'주문을 취소했습니다.',msg:'취소 내역이 처리 이력에 기록되었습니다.'}); }});
  };
  OPS.forceDeliver=function(id){
    const o=DATA.orders[id];
    ADMIN.confirm({tone:'warn',icon:'alert',danger:false,title:'배송 완료로 강제 변경하시겠습니까?',
      msg:'송장 추적과 무관하게 배송 상태를 완료로 변경합니다.',
      meta:{target:`주문 #${o[0]}`, effect:'배송상태 → 배송 완료', reversible:'관리자가 다시 변경 가능'},
      confirmText:'배송 완료 처리', onConfirm:()=>{ ADMIN._detailDirty=false; ADMIN.floatResult('배송 완료로 변경했습니다.'); }});
  };

  /* ============================ 상품 관리 ============================ */
  SC.products=function(){
    const head=C.pageHeader('상품 관리','전체 1,842개 · 판매중 1,610 · 품절 64',
      `${C.btn('일괄 수정',{icon:'sliders'})}${C.btn('상품 등록',{icon:'plus',variant:'primary',attr:'onclick="DRAWERS._newProduct()"'})}`);
    const filter=C.filterBar(`
      ${C.searchInput('상품명 · 상품코드 검색')}
      ${C.select('카테고리','전체')}
      ${C.select('판매상태','전체')}
      ${C.select('재고','전체')}
      <span class="spacer"></span>
      ${C.btn('초기화',{variant:'ghost'})}${C.btn('조회',{variant:'primary'})}`);

    const headRow=`<tr>${C.checkTh}
      ${C.th('상품')}${C.th('카테고리')}${C.th('판매가',{num:true,sortable:true})}
      ${C.th('재고',{num:true,sortable:true})}${C.th('판매상태')}${C.th('최근 수정',{sortable:true})}${C.th('')}</tr>`;
    const body=DATA.products.map((p,i)=>`
      <tr data-drawer="product" data-id="${i}">
        ${C.checkTd}
        <td><div class="prod-cell"><span class="thumb"></span><span class="pc-t"><b>${p[1]}</b><span>${p[0]}</span></span></div></td>
        <td class="muted">${p[2]}</td>
        <td class="num"><span class="inline-edit" data-prefix="₩"><span class="ie-val" data-raw="${p[3].replace(/,/g,'')}">₩${p[3]}</span><span class="ie-pen">${I('edit',13)}</span></span></td>
        <td class="num"><span class="inline-edit"><span class="ie-val" data-raw="${p[4]}" style="${p[4]==='0'?'color:var(--danger);font-weight:700':p[4]<25?'color:var(--warning);font-weight:700':''}">${p[4]}</span><span class="ie-pen">${I('edit',13)}</span></span></td>
        <td>${C.badge(p[5],p[6])}</td>
        <td class="muted">${p[7]}</td>
        <td>${C.kebab}</td>
      </tr>`).join('');

    return head+filter+`
      <div class="card" data-kind="products">
        ${C.segtabs(DATA.prodTabs,0)}
        ${C.table(headRow,body)}
        ${C.pagination('1–8 / 1,842개','',1)}
      </div>`;
  };

  function langField(label, ph){
    return `<div class="frow"><span class="field-l">${label}</span>
      <div class="lang-tabs"><span class="lang-tab active">KR</span><span class="lang-tab">EN</span><span class="lang-tab">JP</span></div>
      <input class="inp" placeholder="${ph}" /></div>`;
  }
  function productBody(p, isNew){
    return `
      ${isNew?C.notice('템플릿형 등록 폼 — 어느 업종의 상품이든 동일한 공통 필드(기본정보·옵션·이미지·다국어)로 입력합니다.'):''}
      <div class="dsec">
        <div class="dsec-t">기본 정보</div>
        ${langField('상품명 <span class="req">*</span>', p?p[1]:'예) 프리미엄 코튼 오버핏 티셔츠')}
        <div class="frow"><span class="field-l">카테고리 <span class="req">*</span></span>
          <div class="fgrid2"><button class="inp select-like">${p?p[2]:'대분류'} ${I('chevronDown',15)}</button><button class="inp select-like">중분류 ${I('chevronDown',15)}</button></div></div>
        <div class="frow"><span class="field-l">상품코드</span><input class="inp" value="${p?p[0]:'자동 생성'}" ${p?'':'disabled'} /></div>
      </div>
      <div class="dsec">
        <div class="dsec-t">판매 정보</div>
        <div class="frow"><div class="fgrid2">
          <div><span class="field-l">판매가 <span class="req">*</span></span><input class="inp" value="${p?'₩ '+p[3]:'₩ 0'}" /></div>
          <div><span class="field-l">재고 수량</span><input class="inp" value="${p?p[4]:'0'}" /></div>
        </div></div>
        <div class="frow"><span class="field-l">판매 상태</span>
          <div class="lang-tabs"><span class="lang-tab ${!p||p[5]==='판매중'?'active':''}">판매중</span><span class="lang-tab">판매중지</span><span class="lang-tab">숨김</span></div></div>
      </div>
      <div class="dsec">
        <div class="dsec-t">옵션</div>
        <div class="frow" style="padding:14px;border:1px dashed var(--border);border-radius:8px;color:var(--text-3);font-size:13px;text-align:center">
          ＋ 색상 / 사이즈 등 옵션 조합 · 재고 매트릭스</div>
      </div>
      <div class="dsec">
        <div class="dsec-t">이미지</div>
        <div style="display:flex;gap:10px">
          <div style="width:84px;height:84px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);display:flex;align-items:center;justify-content:center;color:var(--text-3);font-size:12px;flex-direction:column;gap:4px">${I('upload',18)}대표</div>
          <div style="width:84px;height:84px;border-radius:10px;border:1px dashed var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--text-3)">${I('plus',18)}</div>
          <div style="width:84px;height:84px;border-radius:10px;border:1px dashed var(--border);background:var(--surface);display:flex;align-items:center;justify-content:center;color:var(--text-3)">${I('plus',18)}</div>
        </div>
      </div>`;
  }
  window.DRAWERS.product=function(id){
    const p=DATA.products[id];
    const footer=`
      <div class="danger-zone"><button class="btn danger" onclick="OPS.stopSale(${id})">판매 중지</button></div>
      <span class="spacer"></span>
      <button class="btn" data-detail-close>닫기</button>
      <button class="btn primary" onclick="ADMIN.savedDetail('저장했습니다.')">변경사항 저장</button>`;
    return { title:p[1], sub:`${p[0]} · ${p[2]}`, status:C.badge(p[5],p[6]), body:productBody(p,false), footer };
  };
  OPS.stopSale=function(id){
    const p=DATA.products[id];
    ADMIN.confirm({tone:'danger',icon:'ban',danger:true,title:'판매를 중지하시겠습니까?',
      msg:'쇼핑몰에서 상품 노출이 즉시 중단됩니다.',
      meta:{target:p[1], effect:'노출 중단 (재고·주문 유지)', reversible:true},
      confirmText:'판매 중지', onConfirm:()=>{ ADMIN._detailDirty=false; ADMIN.closeDetail(true); ADMIN.floatResult('판매를 중지했습니다.'); }});
  };
  window.DRAWERS._newProduct=function(){
    ADMIN.openDrawer({ title:'상품 등록', sub:'새 상품을 등록합니다', body:productBody(null,true),
      footer:`<span class="spacer"></span><button class="btn" data-detail-close>취소</button>
        <button class="btn" onclick="ADMIN.floatResult('임시 저장했습니다.','info')">임시 저장</button>
        <button class="btn primary" onclick="ADMIN.savedDetail('상품을 등록했습니다.')">상품 등록</button>` });
  };

  /* ============================ 회원 관리 ============================ */
  SC.members=function(){
    const head=C.pageHeader('회원 관리','전체 48,210명 · 오늘 가입 37명 · 휴면 1,204명',
      `${C.btn('엑셀 다운로드',{icon:'download'})}${C.btn('SMS · 메일 발송',{icon:'message',variant:'primary'})}`);
    const summary=`<div class="kpi-grid" style="grid-template-columns:repeat(4,1fr)">
      ${C.summaryCard('전체 회원','48,210명',{icon:'members',sub:'활성 회원 47,006명'})}
      ${C.summaryCard('이번 달 신규','1,083명',{icon:'userPlus',delta:6.4,dir:'up',sub:'전월 대비'})}
      ${C.summaryCard('VIP 회원','312명',{icon:'star',sub:'누적 구매 300만원↑'})}
      ${C.summaryCard('휴면 회원','1,204명',{icon:'clock',sub:'1년 이상 미접속'})}
    </div>`;
    const filter=C.filterBar(`
      ${C.searchInput('이름 · 아이디 · 연락처 검색')}
      ${C.select('등급','전체')}
      ${C.select('가입일','전체')}
      ${C.select('상태','전체')}
      <span class="spacer"></span>
      ${C.btn('초기화',{variant:'ghost'})}${C.btn('조회',{variant:'primary'})}`);
    const headRow=`<tr>${C.checkTh}
      ${C.th('아이디')}${C.th('이름')}${C.th('등급')}${C.th('가입일',{sortable:true})}
      ${C.th('주문수',{num:true,sortable:true})}${C.th('누적 구매액',{num:true,sortable:true,sorted:'desc'})}${C.th('상태')}${C.th('')}</tr>`;
    const body=DATA.members.map((m,i)=>`
      <tr data-drawer="member" data-id="${i}">
        ${C.checkTd}
        <td class="strong">${m[0]}</td><td>${m[1]}</td>
        <td>${C.badge(m[2], m[2]==='VIP'?'primary':m[2]==='우수'?'info':'neutral')}</td>
        <td class="muted">${m[3]}</td>
        <td class="num">${m[4]}</td>
        <td class="num strong">₩${m[5]}</td>
        <td>${C.badge(m[6],m[7])}</td>
        <td>${C.kebab}</td>
      </tr>`).join('');
    return head+summary+filter+`
      <div class="card" data-kind="members">
        ${C.segtabs(DATA.memberTabs,0)}
        ${C.table(headRow,body)}
        ${C.pagination('1–8 / 48,210명','',1)}
      </div>`;
  };
  window.DRAWERS.member=function(id){
    const m=DATA.members[id];
    const body=`
      <div class="dsec">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px">
          <span style="width:54px;height:54px;border-radius:50%;background:#E0E7FF;color:#3730A3;font-weight:800;display:flex;align-items:center;justify-content:center;font-size:18px">${m[1][0]}</span>
          <div><div style="font-size:17px;font-weight:800">${m[1]} ${C.badge(m[2], m[2]==='VIP'?'primary':m[2]==='우수'?'info':'neutral')}</div>
          <div class="muted" style="font-size:13px">${m[0]} · ${m[6]} 회원</div></div>
        </div>
      </div>
      <div class="dsec">
        <div class="dsec-t">회원 정보</div>
        ${C.kv([['이메일',`${m[0]}@example.com`],['연락처','010-****-5678'],['가입일',m[3]],['최근 접속','2026.05.29'],['마케팅 수신','동의 (SMS·이메일)']])}
      </div>
      <div class="dsec">
        <div class="dsec-t">구매 요약</div>
        <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin:0">
          ${C.summaryCard('총 주문',m[4]+'건',{})}
          ${C.summaryCard('누적 구매액','₩'+m[5],{})}
          ${C.summaryCard('적립금','₩12,400',{})}
        </div>
      </div>
      <div class="dsec">
        <div class="dsec-t">최근 주문</div>
        <div class="dline"><span class="dl-img"></span><span class="dl-t"><b>경량 패딩 자켓 (블랙)</b><span>2026.05.28 · #20260528-0112</span></span>${C.badge('배송완료','success')}</div>
        <div class="dline"><span class="dl-img"></span><span class="dl-t"><b>베이직 데일리 슬랙스</b><span>2026.05.10 · #20260510-0087</span></span>${C.badge('배송완료','success')}</div>
      </div>`;
    const footer=`
      <div class="danger-zone"><button class="btn danger" onclick="OPS.suspendMember(${id})">회원 정지</button></div>
      <span class="spacer"></span>
      <button class="btn" onclick="OPS.changeGrade(${id})">등급 변경</button>
      <button class="btn" data-detail-close>닫기</button>
      <button class="btn primary" onclick="ADMIN.toast('메시지 발송 화면으로 이동','info')">메시지 발송</button>`;
    return { title:'회원 상세', sub:m[0], status:C.badge(m[6],m[7]), body, footer };
  };
  OPS.suspendMember=function(id){
    const m=DATA.members[id];
    ADMIN.confirm({tone:'danger',icon:'ban',danger:true,title:'회원을 정지하시겠습니까?',
      msg:'정지된 회원은 로그인과 주문이 제한됩니다.',
      meta:{target:`${m[1]} (${m[0]})`, effect:'로그인·주문 제한', reversible:true},
      confirmText:'회원 정지', onConfirm:()=>{ ADMIN.closeDetail(true);
        ADMIN.result({status:'success',title:'회원을 정지했습니다.',msg:'처리 내역이 관리 로그에 기록되었습니다.'}); }});
  };
  OPS.changeGrade=function(id){
    const m=DATA.members[id];
    ADMIN.confirm({tone:'primary',icon:'info',title:'등급을 변경하시겠습니까?',
      msg:'회원 등급을 변경합니다.',
      meta:{target:`${m[1]} · 현재 ${m[2]}`, effect:'등급 혜택·쿠폰 적용 변경', reversible:true},
      confirmText:'등급 변경', onConfirm:()=>{ ADMIN._detailDirty=false; ADMIN.floatResult('등급을 변경했습니다.'); }});
  };
})();
