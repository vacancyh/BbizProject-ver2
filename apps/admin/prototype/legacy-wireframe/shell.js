/* ============================================================
   APP SHELL — 사이드바 / 상단바 / 라우팅
   ============================================================ */
(function(){
  const SC = window.SCREENS = window.SCREENS || {};

  const NAV = [
    { group:'운영', items:[
      { id:'dashboard', ic:'▦', label:'대시보드' },
      { id:'orders',    ic:'🧾', label:'주문 관리', badge:74 },
      { id:'products',  ic:'🏷', label:'상품 관리' },
      { id:'members',   ic:'👤', label:'회원 관리' },
    ]},
    { group:'매출 · 마케팅', items:[
      { id:'settlement',ic:'₩', label:'정산 · 매출' },
      { id:'promotion', ic:'🎟', label:'프로모션 · 쿠폰' },
      { id:'stats',     ic:'📊', label:'통계 · 리포트' },
    ]},
    { group:'고객 · 설정', items:[
      { id:'cs',        ic:'💬', label:'리뷰 · 문의', badge:18 },
      { id:'settings',  ic:'⚙', label:'쇼핑몰 설정' },
    ]},
  ];
  const TITLES = {
    dashboard:'대시보드', orders:'주문 관리', products:'상품 관리', members:'회원 관리',
    settlement:'정산 · 매출', promotion:'프로모션 · 쿠폰', stats:'통계 · 리포트',
    cs:'리뷰 · 문의', settings:'쇼핑몰 설정',
  };

  function renderSidebar(active){
    const groups = NAV.map(g=>`
      <div class="nav-group-label">${g.group}</div>
      ${g.items.map(it=>`
        <div class="nav-item ${it.id===active?'active':''}" data-route="${it.id}">
          <span class="ic">${it.ic}</span>
          <span class="label">${it.label}</span>
          ${it.badge?`<span class="tag accent" style="margin-left:auto; font-size:11px; padding:1px 7px;">${it.badge}</span>`:''}
        </div>`).join('')}
    `).join('');
    return `
      <div class="brand">
        <span class="logo">▦</span>
        <span class="name">○○ 스토어 <span style="font-size:12px; color:var(--ink-faint); font-family:'Gowun Dodum';">Admin</span></span>
      </div>
      <div class="nav">${groups}</div>
      <div style="padding:12px 14px; border-top:2px dashed var(--line); font-family:'Gowun Dodum'; font-size:11px; color:var(--ink-faint); white-space:nowrap;">
        <span class="label">v0.1 · 와이어프레임</span>
      </div>`;
  }

  function renderTopbar(active){
    return `
      <span class="crumb">관리자 / <b>${TITLES[active]||''}</b></span>
      <div class="spacer"></div>
      <div class="sk-soft searchbar" style="border-radius:var(--radius-sm);">🔍 통합 검색 (주문·상품·회원)</div>
      <div class="sk-soft lang-switch" style="border-radius:var(--radius-sm);" id="langBtn">🌐 한국어 ▾</div>
      <div class="icon-btn" title="알림">🔔<span class="dot"></span></div>
      <div class="avatar">관</div>`;
  }

  SC._render = function(route){
    route = route || window.__route || 'dashboard';
    window.__route = route;
    document.getElementById('sidebar').innerHTML = renderSidebar(route);
    document.getElementById('topbar').innerHTML = renderTopbar(route);
    const fn = SC[route] || SC.dashboard;
    const el = document.getElementById('content');
    el.innerHTML = fn();
    el.scrollTop = 0;

    document.querySelectorAll('.nav-item').forEach(n=>{
      n.onclick = ()=> SC._render(n.dataset.route);
    });
    const lang = document.getElementById('langBtn');
    if(lang) lang.onclick = ()=>{
      const langs = ['🌐 한국어 ▾','🌐 English ▾','🌐 日本語 ▾'];
      const cur = langs.indexOf(lang.textContent.trim());
      lang.textContent = langs[(cur+1)%langs.length];
    };
    try{ localStorage.setItem('adminRoute', route); }catch(e){}
  };

  window.addEventListener('DOMContentLoaded', ()=>{
    let start = 'dashboard';
    try{ start = localStorage.getItem('adminRoute') || 'dashboard'; }catch(e){}
    window.__dashLayout = (()=>{ try{ return localStorage.getItem('dashLayout')||'A'; }catch(e){ return 'A'; } })();
    SC._render(start);
  });

  // persist dash layout when changed
  const _origRender = SC._render;
  SC._render = function(r){ try{ localStorage.setItem('dashLayout', window.__dashLayout||'A'); }catch(e){} return _origRender(r); };
})();
