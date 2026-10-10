// Shared shell: nav, options bar, live Elo leaderboard, modal. Used by every page.
const fmtPct = (c,n)=>{ if(!c) return '<span class="eq">0</span>'; const v=c/n*100; return v>=10?v.toFixed(1):v>=1?v.toFixed(2):v.toFixed(3); };
const randSeed = () => 1 + Math.floor(Math.random()*999999999);
const isSpace = e => (e.key===' ' || e.code==='Space') && !e.ctrlKey && !e.metaKey && !e.altKey;
const spaceBlocked = e => { const t=e.target, g=t && t.tagName; return g==='INPUT' || g==='TEXTAREA' || g==='SELECT' || (t && t.isContentEditable) || $('modal').style.display==='flex'; };
function closeModal(){ $('modal').style.display='none'; }

const PAGES = [['index.html','Round robin','rr'],['montecarlo.html','Monte Carlo','mc'],['cup.html','Groups + knockout','cup'],['nations.html','Nations League','nl']];
const OPT_HTML = {
  dyn:'<label><input type="checkbox" id="oDyn" checked> Update Elo after every match</label>',
  double:'<label><input type="checkbox" id="oDouble" checked> Double round robin</label>',
  home:'<label><input type="checkbox" id="oHome" checked> Home advantage (+60)</label>',
  seed:'<label>Seed <input type="number" id="oSeed" value="2026" style="width:110px"></label><button id="bDice" title="New random seed">&#127922;</button><label><input type="checkbox" id="oRandSeed" checked> New seed each run</label>'
};
const OPT_IDS = ['oDyn','oDouble','oHome','oRandSeed'];
function saveOpts(){
  try{
    const o=JSON.parse(localStorage.getItem('wrr_opts2')||'{}');
    OPT_IDS.forEach(id=>{ if($(id)) o[id]=$(id).checked; });
    if($('oSeed')) o.oSeed=$('oSeed').value;
    localStorage.setItem('wrr_opts2',JSON.stringify(o));
  }catch(e){}
}
function loadOpts(){
  try{
    const o=JSON.parse(localStorage.getItem('wrr_opts2')||'{}');
    OPT_IDS.forEach(id=>{ if($(id) && id in o) $(id).checked=!!o[id]; });
    if($('oSeed') && o.oSeed) $('oSeed').value=o.oSeed;
  }catch(e){}
  document.addEventListener('change',e=>{ if(e.target && (OPT_IDS.indexOf(e.target.id)>=0 || e.target.id==='oSeed')) saveOpts(); });
}

const NOTE_COMMON = 'Starting ratings are the FIFA/Coca-Cola Men’s World Ranking points for all 211 teams as shown on 6 Oct 2026 (provisional until the next official update). Results are simulated from FIFA/Elo-style win expectancy, with scorelines from a goal model scaled by the rating gap; matches between stronger teams are slightly less predictable. This is not an official ranking.';

function mountShell(cfg){
  const app=$('app'), par=app.parentNode;
  const top=document.createElement('header'); top.className='top';
  top.innerHTML='<h1>World Round Robin<small>211 teams</small></h1><nav>'+PAGES.map(p=>'<a href="'+p[0]+'"'+(p[2]===cfg.page?' class="on"':'')+'>'+p[1]+'</a>').join('')+'</nav>';
  const shell=document.createElement('div'); shell.className='shell';
  const main=document.createElement('main');
  main.innerHTML='<div class="tools">'+cfg.opts.map(k=>OPT_HTML[k]).join('')+
    '<input type="text" id="filter" placeholder="Filter teams&hellip;"><select id="confSel"><option value="">All confederations</option>'+
    ['UEFA','CAF','AFC','CONCACAF','CONMEBOL','OFC'].map(c=>'<option>'+c+'</option>').join('')+'</select></div>';
  par.insertBefore(top,app); par.insertBefore(shell,app);
  main.appendChild(app);
  const about=document.createElement('details'); about.className='about';
  about.innerHTML='<summary>About the data and model</summary><div>'+NOTE_COMMON+(cfg.note?' '+cfg.note:'')+'</div>';
  main.appendChild(about);
  const board=document.createElement('aside'); board.className='panel board'; board.id='board';
  board.innerHTML='<h2><span>Live Elo</span><span class="sub" id="boardSub"></span></h2><div class="scroll"><table><thead><tr><th>#</th><th></th><th class="l">Team</th><th>Elo</th><th>&plusmn;</th><th id="boardX"></th></tr></thead><tbody id="boardBody"></tbody></table></div>';
  shell.appendChild(main); shell.appendChild(board);
  const modal=document.createElement('div'); modal.className='modal'; modal.id='modal';
  modal.innerHTML='<div class="mbox"><div class="mhead"><b id="mtitle"></b><button id="mclose">&#10005;</button></div><div class="mcontent" id="mcontent"></div></div>';
  document.body.appendChild(modal);
  document.title=cfg.title+' — World Round Robin';
  loadOpts();
  $('mclose').onclick=()=>closeModal();
  modal.addEventListener('click',e=>{ if(e.target.id==='modal') closeModal(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeModal(); });
  board.addEventListener('click',e=>{ const el=e.target.closest('[data-bt]'); if(el && window.onBoardClick) window.onBoardClick(+el.dataset.bt); });
}

// Live leaderboard. rows: [{i, r (current Elo), base (start rating), x (optional extra)}]
const BOARD_RANK0 = (()=>{ const o=new Array(N); BASE.map((t,i)=>i).sort((a,b)=>BASE[b].base-BASE[a].base||a-b).forEach((i,k)=>{ o[i]=k+1; }); return o; })();
function renderBoard(rows, cfg){
  cfg=cfg||{};
  const filt=$('filter').value.trim().toLowerCase(), cs=$('confSel').value;
  rows=rows.slice().sort((a,b)=>b.r-a.r||b.base-a.base||a.i-b.i);
  let h='';
  rows.forEach((x,k)=>{
    const t=BASE[x.i];
    if(filt && t.name.toLowerCase().indexOf(filt)<0) return;
    if(cs && t.conf!==cs) return;
    const mv=BOARD_RANK0[x.i]-(k+1), d=x.r-x.base;
    const arrow = mv>0 ? '<span class="up">&#9650;'+mv+'</span>' : mv<0 ? '<span class="dn">&#9660;'+(-mv)+'</span>' : '<span class="eq">&ndash;</span>';
    const dt = Math.abs(d)<0.5 ? '&ndash;' : (d>0?'+':'')+Math.round(d);
    h+='<tr data-bt="'+x.i+'"><td class="rank">'+(k+1)+'</td><td class="mvc">'+arrow+'</td><td class="l"><span class="flag">'+t.flag+'</span>'+t.name+'</td><td class="pts">'+Math.round(x.r)+'</td><td class="'+(d>=0.5?'up':d<=-0.5?'dn':'eq')+'">'+dt+'</td>'+(cfg.xFmt ? '<td>'+cfg.xFmt(x)+'</td>' : '')+'</tr>';
  });
  $('boardBody').innerHTML=h;
  $('boardSub').textContent=cfg.sub||'';
  $('boardX').textContent=cfg.xHead||'';
}
