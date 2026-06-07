/* ============================================================
   SHELL — 사이드바 / 헤더 / 라우팅 + 인터랙션 인프라
   ============================================================ */
(function(){
  const I = window.ICON;
  const SC = window.SCREENS = window.SCREENS || {};
  window.DRAWERS = window.DRAWERS || {};

  const NAV = [
    { sec:'운영', items:[
      { id:'dashboard', icon:'dashboard', label:'대시보드' },
      { id:'orders',    icon:'orders',    label:'주문 관리', badge:74 },
      { id:'products',  icon:'products',  label:'상품 관리' },
      { id:'members',   icon:'members',   label:'회원 관리' },
      { id:'shipping',  icon:'shipping',  label:'배송 관리', soon:true },
    ]},
    { sec:'매출 · 마케팅', items:[
      { id:'settlement',icon:'settlement',label:'정산 관리', soon:true },
      { id:'coupons',   icon:'coupon',    label:'쿠폰·프로모션' },
      { id:'stats',     icon:'stats',     label:'통계·리포트' },
    ]},
    { sec:'고객 · 설정', items:[
      { id:'reviews',   icon:'reviews',   label:'리뷰·문의', badge:18 },
      { id:'settings',  icon:'settings',  label:'쇼핑몰 설정' },
    ]},
  ];
  const TITLES={ dashboard:'대시보드', orders:'주문 관리', products:'상품 관리', members:'회원 관리',
    shipping:'배송 관리', settlement:'정산 관리', coupons:'쿠폰·프로모션', stats:'통계·리포트',
    reviews:'리뷰·문의', settings:'쇼핑몰 설정' };

  function renderSidebar(active){
    return `
      <div class="brand">
        <span class="mark">CO</span>
        <span class="bt">커머스 운영툴<small>COMMERCE OPS</small></span>
      </div>
      <nav class="nav">
        ${NAV.map(g=>`
          <div class="nav-sec">${g.sec}</div>
          ${g.items.map(it=>`
            <div class="nav-item ${it.id===active?'active':''}" data-route="${it.id}" title="${it.label}">
              <span class="ni">${I(it.icon,18)}</span>
              <span class="nl">${it.label}</span>
              ${it.badge?`<span class="nb">${it.badge}</span>`:''}
              ${it.soon?`<span class="soon">예정</span>`:''}
            </div>`).join('')}
        `).join('')}
      </nav>`;
  }

  function renderTopbar(active){
    return `
      <button class="collapse-btn" id="collapseBtn" title="사이드바 접기">${I('panel',18)}</button>
      <div class="shop-switch" id="shopSwitch"><span class="dotmark"></span> ○○ 스토어 ${I('chevronDown',15)}</div>
      <div class="grow"></div>
      <div class="top-search">${I('search',16)}<input placeholder="주문번호, 상품명, 회원명 검색" /></div>
      <div class="top-icon" id="langBtn" title="언어">${I('globe',18)}</div>
      <div class="top-icon" title="알림">${I('bell',18)}<span class="badge-dot"></span></div>
      <div class="me">
        <span class="ava">관</span>
        <span class="mi"><b>관리자</b><span>최고관리자</span></span>
      </div>`;
  }

  /* ---------------- routing ---------------- */
  SC.go = function(route){
    route = route || window.__route || 'dashboard';
    window.__route = route;
    document.getElementById('sidebar').innerHTML = renderSidebar(route);
    document.getElementById('topbar').innerHTML = renderTopbar(route);
    const el = document.getElementById('content');
    const ctype = route==='settings' ? 'c-form'
      : (route==='dashboard' || route==='stats') ? 'c-dashboard'
      : 'c-table';
    el.innerHTML = `<div class="wrap ${ctype}">${(SC[route]||SC.dashboard)()}</div>`;
    el.scrollTop = 0;
    wireChrome();
    if(SC['_after_'+route]) SC['_after_'+route]();
    try{ localStorage.setItem('coRoute', route); }catch(e){}
  };

  function wireChrome(){
    document.querySelectorAll('.nav-item').forEach(n=> n.onclick=()=>SC.go(n.dataset.route));
    const cb=document.getElementById('collapseBtn');
    if(cb) cb.onclick=()=>{ const r=document.documentElement; r.dataset.sidebar = r.dataset.sidebar==='collapsed'?'expanded':'collapsed'; };
    const lang=document.getElementById('langBtn');
    if(lang) lang.onclick=()=>{ const langs=['한국어','English','日本語']; window.__lang=((window.__lang||0)+1)%3; ADMIN.toast(`표시 언어: ${langs[window.__lang]} (관리자 UI 다국어 전환)`,'info'); };
    const ss=document.getElementById('shopSwitch');
    if(ss) ss.onclick=()=>ADMIN.toast('쇼핑몰 선택 — 멀티 스토어 전환 (데모)','info');
  }

  /* ---------------- overlay scrim sync ---------------- */
  const scrim=()=>document.getElementById('scrim');
  const isOpen=(id)=>document.getElementById(id)?.classList.contains('show');
  function syncScrim(){
    const any = isOpen('detailWrap') || isOpen('modal') || isOpen('result');
    scrim().classList.toggle('show', any);
  }
  window.ADMIN = window.ADMIN || {};

  /* ---------------- DETAIL MODAL (중앙) — Drawer 대체 ---------------- */
  // 행에서 열 때 prev/next 컨텍스트 보관
  let navState=null; // { rows:[tr], idx, drawer }

  ADMIN.openDetail = function(cfg){
    const d=document.getElementById('detail');
    d.className = 'detail' + (cfg.wide?' wide':'');
    const nav = cfg.nav;
    d.innerHTML = `
      <div class="detail-h">
        <div class="dh-main">
          <div class="dh-title"><h3>${cfg.title}</h3>${cfg.status||''}</div>
          ${cfg.sub?`<div class="dh-sub">${cfg.sub}</div>`:''}
        </div>
        <div class="dh-nav">
          ${nav?`<button class="dh-step" ${nav.hasPrev?'':'disabled'} data-nav="-1" title="이전 항목">${I('chevronUp',17)}</button>
                 <span class="dh-pos">${nav.pos}</span>
                 <button class="dh-step" ${nav.hasNext?'':'disabled'} data-nav="1" title="다음 항목">${I('chevronDown',17)}</button>`:''}
          <button class="dh-x" data-detail-close title="닫기 (ESC)">${I('x',18)}</button>
        </div>
      </div>
      <div class="detail-b">${cfg.body}</div>
      ${cfg.footer?`<div class="detail-f">${cfg.footer}</div>`:''}`;
    document.getElementById('detailWrap').classList.add('show');
    syncScrim();
    ADMIN._detailDirty=false;
    // 변경 감지 → 닫기 전 확인용
    d.querySelectorAll('input,textarea').forEach(el=>{
      el.addEventListener('input',()=>{ ADMIN._detailDirty=true; });
    });
    d.querySelector('.detail-b').scrollTop=0;
    setTimeout(()=>{ const f=d.querySelector('.detail-b input,.detail-b textarea,.dh-x'); f&&f.focus(); },30);
  };
  // 하위호환: 기존 화면 코드가 호출하던 이름 유지
  ADMIN.openDrawer = ADMIN.openDetail;

  ADMIN.closeDetail = function(force){
    if(!force && ADMIN._detailDirty){
      ADMIN.confirm({tone:'warn',icon:'alert',title:'저장하지 않은 변경사항이 있습니다',
        msg:'지금 닫으면 입력한 내용이 사라집니다. 닫으시겠습니까?',confirmText:'저장 없이 닫기',danger:true,
        onConfirm:()=>ADMIN.closeDetail(true)});
      return;
    }
    document.getElementById('detailWrap').classList.remove('show');
    document.querySelectorAll('tr.row-selected').forEach(r=>r.classList.remove('row-selected'));
    navState=null; ADMIN._detailDirty=false;
    syncScrim();
  };
  ADMIN.closeDrawer = ADMIN.closeDetail; // 하위호환

  // 저장 완료 헬퍼 — dirty 해제 후 닫기 (B: 일반 저장은 floating)
  ADMIN.savedDetail = function(msg, close){
    ADMIN._detailDirty=false;
    if(close!==false) ADMIN.closeDetail(true);
    ADMIN.floatResult(msg||'저장했습니다.');
  };

  function openDetailFromRow(row){
    const tbl=row.closest('table');
    const rows=[...tbl.querySelectorAll('tr[data-drawer]')];
    const idx=rows.indexOf(row);
    const drawer=row.dataset.drawer;
    tbl.querySelectorAll('tr.row-selected').forEach(r=>r.classList.remove('row-selected'));
    row.classList.add('row-selected');
    const fn=window.DRAWERS[drawer];
    if(!fn) return;
    const cfg=fn(row.dataset.id,row); if(!cfg) return;
    cfg.nav={ hasPrev:idx>0, hasNext:idx<rows.length-1, pos:`${idx+1} / ${rows.length}` };
    navState={ rows, idx, drawer };
    ADMIN.openDetail(cfg);
  }
  ADMIN.navDetail = function(delta){
    if(!navState) return;
    const next=navState.idx+delta;
    if(next<0||next>=navState.rows.length) return;
    if(ADMIN._detailDirty){
      ADMIN.confirm({tone:'warn',icon:'alert',title:'저장하지 않은 변경사항이 있습니다',
        msg:'다른 항목으로 이동하면 입력한 내용이 사라집니다. 이동하시겠습니까?',confirmText:'이동',danger:true,
        onConfirm:()=>{ ADMIN._detailDirty=false; openDetailFromRow(navState.rows[next]); }});
      return;
    }
    openDetailFromRow(navState.rows[next]);
  };

  /* ---------------- CONFIRM MODAL (위험/중요 확인) ---------------- */
  // meta: {target, effect, reversible:true|false|'문구'}
  ADMIN.confirm = function({tone='primary',icon='info',title,msg,meta,confirmText='확인',danger=false,onConfirm}){
    const m=document.getElementById('modal');
    let metaHtml='';
    if(meta){
      const rows=[];
      if(meta.target) rows.push(`<li><span class="mm-k">작업 대상</span><span class="mm-v">${meta.target}</span></li>`);
      if(meta.effect) rows.push(`<li><span class="mm-k">작업 결과</span><span class="mm-v">${meta.effect}</span></li>`);
      if(meta.reversible!=null){
        const rev = meta.reversible===true ? '<span class="mm-v rev">되돌릴 수 있습니다</span>'
          : meta.reversible===false ? '<span class="mm-v irrev">되돌릴 수 없습니다</span>'
          : `<span class="mm-v">${meta.reversible}</span>`;
        rows.push(`<li><span class="mm-k">복구 여부</span>${rev}</li>`);
      }
      metaHtml=`<ul class="m-meta">${rows.join('')}</ul>`;
    }
    m.innerHTML=`<div class="mbg" data-modal-cancel></div>
      <div class="modal" role="alertdialog" aria-modal="true">
        <div class="m-ic ${tone}">${I(icon,22)}</div>
        <h3>${title}</h3>
        ${msg?`<p class="${metaHtml?'m-lead':''}">${msg}</p>`:''}
        ${metaHtml}
        <div class="m-actions">
          <button class="btn" data-modal-cancel>취소</button>
          <button class="btn ${danger?'danger':'primary'}" id="modalOk">${confirmText}</button>
        </div>
      </div>`;
    m.classList.add('show'); syncScrim();
    const ok=document.getElementById('modalOk');
    ok.onclick=()=>{ ok.classList.add('loading'); setTimeout(()=>{ ADMIN.closeModal(); if(onConfirm)onConfirm(); },560); };
    setTimeout(()=>ok.focus(),30);
  };
  ADMIN.closeModal = function(){ const m=document.getElementById('modal'); if(m){ m.classList.remove('show'); m.innerHTML=''; } syncScrim(); };

  /* ---------------- RESULT MODAL (중요 작업 완료) ---------------- */
  ADMIN.result = function({status='success',title,msg,confirmText='확인',autoClose=false,onClose}){
    const r=document.getElementById('result');
    r.innerHTML=`<div class="mbg" data-result-close></div>
      <div class="result-modal" role="alertdialog" aria-modal="true">
        <div class="r-ic ${status}">${I(status==='success'?'check':'alert',26)}</div>
        <h3>${title||(status==='success'?'완료되었습니다':'처리하지 못했습니다')}</h3>
        ${msg?`<p>${msg}</p>`:''}
        <div class="m-actions"><button class="btn primary" data-result-close>${confirmText}</button></div>
      </div>`;
    r.classList.add('show'); syncScrim();
    ADMIN._resultOnClose=onClose||null;
    if(autoClose) setTimeout(()=>{ if(isOpen('result')) ADMIN.closeResult(); },1700);
    else setTimeout(()=>r.querySelector('[data-result-close]')?.focus(),30);
  };
  ADMIN.closeResult = function(){ const r=document.getElementById('result'); if(r){ r.classList.remove('show'); r.innerHTML=''; } const cb=ADMIN._resultOnClose; ADMIN._resultOnClose=null; syncScrim(); if(cb)cb(); };

  /* ---------------- FLOATING RESULT (일반 저장, 비차단) ---------------- */
  ADMIN.floatResult = function(msg, status='success'){
    const host=document.getElementById('float-result');
    const el=document.createElement('div'); el.className='float-res '+(status==='info'?'info':'');
    el.innerHTML=`<span class="fr-ic">${I(status==='info'?'info':'check',13)}</span><span>${msg}</span>`;
    host.appendChild(el);
    requestAnimationFrame(()=>el.classList.add('show'));
    setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(),240); },2200);
  };

  /* ---------------- TOAST (데모 info용 유지) ---------------- */
  ADMIN.toast = function(msg,type='success'){
    const stack=document.getElementById('toast-stack');
    const t=document.createElement('div'); t.className='toast';
    const ic = type==='danger'?'x':type==='info'?'info':'check';
    t.innerHTML=`<span class="t-ic ${type}">${I(ic,14)}</span><span>${msg}</span><span class="t-x">${I('x',14)}</span>`;
    stack.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('show'));
    const close=()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),220); };
    t.querySelector('.t-x').onclick=close;
    setTimeout(close,3200);
  };

  /* ---------------- overlay clicks + ESC + focus trap ---------------- */
  document.addEventListener('click',(e)=>{
    if(e.target.closest('[data-detail-close]')) { ADMIN.closeDetail(); return; }
    const nav=e.target.closest('[data-nav]'); if(nav){ ADMIN.navDetail(+nav.dataset.nav); return; }
    if(e.target.closest('[data-modal-cancel]')) { ADMIN.closeModal(); return; }
    if(e.target.closest('[data-result-close]')) { ADMIN.closeResult(); return; }
    // 상세 모달 바깥(백드롭) 클릭 → 닫기 (dirty 가드 포함)
    if(e.target.id==='detailWrap'){ ADMIN.closeDetail(); return; }
    // scrim click closes top-most (detail: with dirty guard)
    if(e.target.id==='scrim'){
      if(isOpen('modal')) ADMIN.closeModal();
      else if(isOpen('result')) ADMIN.closeResult();
      else if(isOpen('detailWrap')) ADMIN.closeDetail();
    }
  });
  document.addEventListener('keydown',(e)=>{
    if(e.key==='Escape'){
      if(isOpen('modal')) ADMIN.closeModal();
      else if(isOpen('result')) ADMIN.closeResult();
      else if(isOpen('detailWrap')) ADMIN.closeDetail();
      return;
    }
    if(e.key==='Tab'){
      const cont = isOpen('modal')?document.querySelector('#modal .modal')
        : isOpen('result')?document.querySelector('#result .result-modal')
        : isOpen('detailWrap')?document.getElementById('detail') : null;
      if(!cont) return;
      const f=[...cont.querySelectorAll('a,button,input,textarea,select,[tabindex]')].filter(x=>!x.disabled&&x.offsetParent!==null);
      if(!f.length) return;
      const first=f[0], last=f[f.length-1];
      if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); }
    }
  });

  /* ---------------- delegated interactions ---------------- */
  document.addEventListener('click', (e)=>{
    // checkbox: select all
    const ckall=e.target.closest('.js-ckall');
    if(ckall){ e.stopPropagation();
      const tbl=ckall.closest('table'); const on=!ckall.classList.contains('on');
      ckall.classList.toggle('on',on);
      tbl.querySelectorAll('.js-ckrow').forEach(c=>c.classList.toggle('on',on));
      updateBulk(tbl); return;
    }
    // checkbox: row
    const ckrow=e.target.closest('.js-ckrow');
    if(ckrow){ e.stopPropagation(); ckrow.classList.toggle('on');
      const tbl=ckrow.closest('table'); updateBulk(tbl); return;
    }
    // segtab toggle (visual)
    const seg=e.target.closest('.segtab');
    if(seg){ seg.parentElement.querySelectorAll('.segtab').forEach(s=>s.classList.remove('active')); seg.classList.add('active'); return; }
    // row → 중앙 상세 Modal (prev/next 컨텍스트 포함)
    const row=e.target.closest('tr[data-drawer]');
    if(row && !e.target.closest('.col-check') && !e.target.closest('.kebab') && !e.target.closest('.inline-edit')){
      openDetailFromRow(row);
      return;
    }
    // inline edit
    const ie=e.target.closest('.inline-edit');
    if(ie && !ie.querySelector('.ie-input')){ e.stopPropagation(); startInlineEdit(ie); return; }
    // bulk actions
    const ba=e.target.closest('[data-bulk]');
    if(ba){ handleBulk(ba); return; }
  });

  function updateBulk(tbl){
    const card=tbl.closest('.card'); if(!card) return;
    let slot=card.querySelector('.bulk-slot'); if(!slot){ slot=document.createElement('div'); slot.className='bulk-slot'; tbl.closest('.table-wrap').before(slot); }
    const n=tbl.querySelectorAll('.js-ckrow.on').length;
    const ckall=tbl.querySelector('.js-ckall'); const total=tbl.querySelectorAll('.js-ckrow').length;
    if(ckall) ckall.classList.toggle('on', n>0 && n===total);
    if(n===0){ slot.innerHTML=''; return; }
    const kind=card.dataset.kind||'';
    let acts='';
    if(kind==='products') acts=`<button class="bb-btn" data-bulk="hide">판매중지</button><button class="bb-btn" data-bulk="soldout">품절 처리</button><button class="bb-btn danger" data-bulk="del">삭제</button>`;
    else if(kind==='orders') acts=`<button class="bb-btn" data-bulk="invoice">일괄 송장 등록</button><button class="bb-btn" data-bulk="status">상태 변경</button>`;
    else acts=`<button class="bb-btn" data-bulk="export">엑셀 내보내기</button>`;
    slot.innerHTML=`<div class="bulkbar"><span class="bb-n"><b>${n}</b>개 선택됨</span><span class="spacer"></span>${acts}<button class="bb-btn" data-bulk="clear">선택 해제</button></div>`;
  }
  function handleBulk(ba){
    const slot=ba.closest('.bulk-slot'); const card=ba.closest('.card'); const tbl=card.querySelector('table');
    const act=ba.dataset.bulk; const n=tbl.querySelectorAll('.js-ckrow.on').length;
    const clear=()=>{ tbl.querySelectorAll('.js-ckrow.on,.js-ckall.on').forEach(c=>c.classList.remove('on')); updateBulk(tbl); };
    if(act==='clear'){ clear(); return; }
    if(act==='del'){ ADMIN.confirm({tone:'danger',icon:'alert',danger:true,title:`${n}개 상품 삭제`,msg:'선택한 상품을 삭제합니다. 이 작업은 되돌릴 수 없습니다.',confirmText:'삭제',onConfirm:()=>{ ADMIN.toast(`${n}개 상품을 삭제했습니다`); clear(); }}); return; }
    const labels={hide:'판매중지',soldout:'품절 처리',invoice:'송장 등록',status:'상태 변경',export:'엑셀 내보내기'};
    ADMIN.confirm({tone:'primary',icon:'info',title:`${n}건 ${labels[act]||''}`,msg:`선택한 ${n}건을 ${labels[act]||'처리'}하시겠습니까?`,confirmText:'처리',onConfirm:()=>{ ADMIN.toast(`${n}건을 ${labels[act]||'처리'}했습니다`); clear(); }});
  }

  function startInlineEdit(ie){
    const valEl=ie.querySelector('.ie-val'); const cur=valEl.dataset.raw||valEl.textContent.replace(/[^\d]/g,'');
    const prefix=ie.dataset.prefix||'';
    const inp=document.createElement('input'); inp.className='ie-input'; inp.value=cur;
    valEl.style.display='none'; ie.querySelector('.ie-pen')?.style.setProperty('display','none');
    ie.appendChild(inp); inp.focus(); inp.select();
    const done=(save)=>{
      if(save){ const num=parseInt(inp.value.replace(/[^\d]/g,''))||0; valEl.dataset.raw=num; valEl.textContent=prefix+num.toLocaleString('ko-KR'); ADMIN.floatResult('저장했습니다.'); }
      inp.remove(); valEl.style.display=''; ie.querySelector('.ie-pen')?.style.removeProperty('display');
    };
    inp.onkeydown=(ev)=>{ if(ev.key==='Enter') done(true); if(ev.key==='Escape') done(false); };
    inp.onblur=()=>done(true);
  }

  /* ---------------- boot ---------------- */
  window.addEventListener('DOMContentLoaded', ()=>{
    let start='dashboard'; try{ start=localStorage.getItem('coRoute')||'dashboard'; }catch(e){}
    SC.go(start);
  });
})();
