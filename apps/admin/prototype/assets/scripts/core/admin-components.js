/* ============================================================
   COMPONENTS — 순수 HTML 빌더 (공통 패턴)
   window.C 네임스페이스
   ============================================================ */
(function(){
  const I = window.ICON;

  const badge = (text,tone='neutral',dot=true)=>
    `<span class="badge ${tone}">${dot?'<span class="bdot"></span>':''}${text}</span>`;

  const pageHeader = (title, sub, actionsHtml='')=>`
    <div class="page-header">
      <div class="ph-l">
        <h1>${title}</h1>
        ${sub?`<div class="ph-sub">${sub}</div>`:''}
      </div>
      ${actionsHtml?`<div class="ph-actions">${actionsHtml}</div>`:''}
    </div>`;

  const btn = (label, {variant='', icon='', sm=false, attr=''}={})=>
    `<button class="btn ${variant} ${sm?'sm':''}" ${attr}>${icon?I(icon,sm?15:16):''}${label?`<span>${label}</span>`:''}</button>`;

  const select = (key, val, attr='')=>
    `<button class="select" ${attr}><span class="sl-k">${key}</span> ${val} ${I('chevronDown',15)}</button>`;

  const searchInput = (ph)=>
    `<div class="search-input">${I('search',16)}<input placeholder="${ph}" /></div>`;

  const filterBar = (inner)=>`<div class="card mb16"><div class="filterbar">${inner}</div></div>`;

  const segtabs = (tabs, activeIdx=0)=>`
    <div class="segtabs">
      ${tabs.map((t,i)=>`<div class="segtab ${i===activeIdx?'active':''}" data-tab="${i}">${t[0]}${t[1]>0?`<span class="cnt">${t[1].toLocaleString('ko-KR')}</span>`:''}</div>`).join('')}
    </div>`;

  const ck = (on=false, cls='')=>`<span class="ck ${on?'on':''} ${cls}">${I('check',12)}</span>`;

  // table: cols=[{h,key,num,sortable,w}], rows=array of <td> html builders via rowFn
  const table = (headHtml, bodyHtml)=>`
    <div class="table-wrap"><table class="dt"><thead>${headHtml}</thead><tbody>${bodyHtml}</tbody></table></div>`;

  const th = (label,{num=false,sortable=false,sorted=''}={})=>
    `<th class="${num?'num':''} ${sortable?'sortable':''}">${label}${sortable?`<span class="sortcaret">${sorted==='asc'?'▲':sorted==='desc'?'▼':'⇅'}</span>`:''}</th>`;

  const checkTh = `<th class="col-check">${ck(false,'js-ckall')}</th>`;
  const checkTd = `<td class="col-check">${ck(false,'js-ckrow')}</td>`;

  const kebab = `<span class="kebab" onclick="event.stopPropagation()">${I('kebab',16)}</span>`;

  const pagination = (info, pages, active=1)=>{
    let pg='';
    pg+=`<span class="pg ${active===1?'dis':''}">${I('chevronLeft',15)}</span>`;
    for(let i=1;i<=pages;i++) pg+=`<span class="pg ${i===active?'active':''}">${i}</span>`;
    pg+=`<span class="pg ${active===pages?'dis':''}">${I('chevronRight',15)}</span>`;
    return `<div class="tablefoot">
      <span class="tf-info">${info}</span>
      <span class="spacer"></span>
      <span class="rows-select">표시 50개 ${I('chevronDown',14)}</span>
      <div class="pager">${pg}</div>
    </div>`;
  };

  const summaryCard = (label, value, {delta, dir, sub, icon, attn}={})=>`
    <div class="kpi ${attn?'attn':''}">
      <div class="k-top">
        <span class="k-label">${label}</span>
        <span class="k-ic">${I(icon||'box',17)}</span>
      </div>
      <div class="k-val">${value}</div>
      <div class="k-foot">
        ${delta!=null?`<span class="delta ${dir}">${I(dir==='up'?'arrowUp':'arrowDown',13)}${Math.abs(delta)}%</span>`:''}
        <span class="vs">${sub||''}</span>
      </div>
    </div>`;

  const cardHead = (title, sub, right='')=>`
    <div class="card-h"><h3>${title}</h3>${sub?`<span class="ch-sub">${sub}</span>`:''}${right?`<span class="ch-r">${right}</span>`:''}</div>`;

  const notice = (text)=>`<div class="notice">${I('info',18)}<div>${text}</div></div>`;

  const empty = (icon,title,text,actionHtml='')=>`
    <div class="empty"><div class="e-ic">${I(icon,26)}</div><h4>${title}</h4><p>${text}</p>${actionHtml}</div>`;

  // key-value list for drawers
  const kv = (pairs)=>`<dl class="kv">${pairs.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;

  window.C = { badge, pageHeader, btn, select, searchInput, filterBar, segtabs, ck,
    table, th, checkTh, checkTd, kebab, pagination, summaryCard, cardHead, notice, empty, kv, I };
})();
