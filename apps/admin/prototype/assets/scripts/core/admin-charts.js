/* ============================================================
   CHARTS — 의존성 없는 경량 SVG 차트
   palette: var(--c1..c4)
   ============================================================ */
(function(){
  const NS='http://www.w3.org/2000/svg';
  const fmt = n => n.toLocaleString('ko-KR');
  const money = n => '₩'+n.toLocaleString('ko-KR');

  function smoothPath(pts){
    if(pts.length<2) return '';
    let d=`M ${pts[0][0]} ${pts[0][1]}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
      const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
      const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
      d+=` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  /* ---------- LINE (one or two series) ---------- */
  function lineChart(opts){
    const W=720,H=250, pl=46,pr=16,pt=16,pb=34;
    const iw=W-pl-pr, ih=H-pt-pb;
    const labels=opts.labels;
    const series=opts.series; // [{name,color,data}]
    let max=0; series.forEach(s=>s.data.forEach(v=>{ if(v>max)max=v; }));
    max=max*1.15||1;
    const nice=niceStep(max,4);
    const ymax=nice.max, step=nice.step;
    const x=i=> pl + (labels.length===1?iw/2: iw*i/(labels.length-1));
    const y=v=> pt + ih - (v/ymax)*ih;
    const uid='lc'+Math.random().toString(36).slice(2,7);

    let grid='', yl='';
    for(let v=0; v<=ymax+1; v+=step){
      const yy=y(v);
      grid+=`<line x1="${pl}" y1="${yy.toFixed(1)}" x2="${W-pr}" y2="${yy.toFixed(1)}" stroke="#EEF1F5"/>`;
      yl+=`<text x="${pl-9}" y="${(yy+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#9CA3AF">${opts.yfmt?opts.yfmt(v):fmt(v)}</text>`;
    }
    let xl='';
    labels.forEach((l,i)=> xl+=`<text x="${x(i).toFixed(1)}" y="${H-12}" text-anchor="middle" font-size="11" fill="#9CA3AF">${l}</text>`);

    let paths='', dots='', areas='';
    series.forEach((s,si)=>{
      const pts=s.data.map((v,i)=>[+x(i).toFixed(1),+y(v).toFixed(1)]);
      const dp=smoothPath(pts);
      const col=s.color;
      if(si===0){
        areas+=`<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${col}" stop-opacity="0.16"/>
          <stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
          <path d="${dp} L ${x(labels.length-1)} ${pt+ih} L ${x(0)} ${pt+ih} Z" fill="url(#${uid})"/>`;
      }
      paths+=`<path d="${dp}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
      pts.forEach((p,i)=>{ if(i===pts.length-1||labels.length<=12) dots+=`<circle cx="${p[0]}" cy="${p[1]}" r="${i===pts.length-1?3.5:2.6}" fill="#fff" stroke="${col}" stroke-width="2"/>`; });
    });

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block">
      ${grid}${yl}${areas}${paths}${dots}${xl}</svg>`;
  }

  /* ---------- BAR (categorical) ---------- */
  function barChart(opts){
    const W=720,H=250, pl=46,pr=16,pt=16,pb=34;
    const iw=W-pl-pr, ih=H-pt-pb;
    const items=opts.items; // [{label,value,color}]
    let max=0; items.forEach(it=>{ if(it.value>max)max=it.value; });
    const nice=niceStep(max*1.15||1,4); const ymax=nice.max, step=nice.step;
    const y=v=> pt+ih-(v/ymax)*ih;
    const band=iw/items.length, bw=Math.min(54, band*0.5);
    let grid='',yl='';
    for(let v=0; v<=ymax+1; v+=step){ const yy=y(v);
      grid+=`<line x1="${pl}" y1="${yy.toFixed(1)}" x2="${W-pr}" y2="${yy.toFixed(1)}" stroke="#EEF1F5"/>`;
      yl+=`<text x="${pl-9}" y="${(yy+4).toFixed(1)}" text-anchor="end" font-size="11" fill="#9CA3AF">${opts.yfmt?opts.yfmt(v):fmt(v)}</text>`;
    }
    let bars='',xl='';
    items.forEach((it,i)=>{
      const cx=pl+band*i+band/2, h=(it.value/ymax)*ih, yy=pt+ih-h;
      bars+=`<rect x="${(cx-bw/2).toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h,0).toFixed(1)}" rx="5" fill="${it.color||'#2563EB'}"/>`;
      bars+=`<text x="${cx.toFixed(1)}" y="${(yy-7).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#475569">${fmt(it.value)}</text>`;
      xl+=`<text x="${cx.toFixed(1)}" y="${H-12}" text-anchor="middle" font-size="11" fill="#6B7280">${it.label}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" style="display:block">${grid}${yl}${bars}${xl}</svg>`;
  }

  /* ---------- DONUT ---------- */
  function donutChart(opts){
    const size=opts.size||180, r=size/2-14, cx=size/2, cy=size/2, C=2*Math.PI*r, sw=opts.sw||22;
    const total=opts.segments.reduce((a,s)=>a+s.value,0)||1;
    let off=0, arcs='';
    opts.segments.forEach(s=>{
      const frac=s.value/total, len=frac*C;
      arcs+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
        stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}"
        transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>`;
      off+=len;
    });
    const center = opts.centerTop!=null ? `
      <text x="${cx}" y="${cy-2}" text-anchor="middle" font-size="20" font-weight="800" fill="#111827">${opts.centerTop}</text>
      <text x="${cx}" y="${cy+16}" text-anchor="middle" font-size="11" fill="#9CA3AF">${opts.centerSub||''}</text>` : '';
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="flex:0 0 auto">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F1F3F6" stroke-width="${sw}"/>${arcs}${center}</svg>`;
  }

  /* ---------- SPARKLINE ---------- */
  function sparkline(data,color,w,h){
    w=w||90; h=h||30; color=color||'#2563EB';
    const max=Math.max(...data), min=Math.min(...data), rng=(max-min)||1;
    const pts=data.map((v,i)=>[ (w*i/(data.length-1)).toFixed(1), (h-2-((v-min)/rng)*(h-4)).toFixed(1) ]);
    const d=smoothPath(pts.map(p=>[+p[0],+p[1]]));
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block">
      <path d="${d}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="${pts[pts.length-1][0]}" cy="${pts[pts.length-1][1]}" r="2" fill="${color}"/></svg>`;
  }

  function niceStep(max,target){
    const raw=max/target;
    const mag=Math.pow(10,Math.floor(Math.log10(raw)));
    const norm=raw/mag;
    let step;
    if(norm<1.5)step=1; else if(norm<3)step=2; else if(norm<7)step=5; else step=10;
    step*=mag;
    return { step, max:Math.ceil(max/step)*step };
  }

  window.CHARTS = { lineChart, barChart, donutChart, sparkline, money, fmt };
})();
