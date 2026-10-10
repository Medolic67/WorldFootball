// Shared tournament engine (qualifiers, groups, knockout) + group/bracket card renderers. Used by cup.html and nations.html.
// ---------- Qualifiers -> groups -> knockout ----------
// Engine functions are plain declarations so the Monte Carlo can ship them to Web Workers.
// Stage codes per team: 0 = out in qualifying, 1 = reached the group stage, 2 + r = reached knockout round r,
// 2 + R = champion (R = number of knockout rounds).
// Qualifying plans, like confederation qualifiers: D = teams that skip qualifying (top-ranked), E = how many teams
// enter in qualifying rounds 1, 2, ... (the weakest teams start in round 1, stronger seeds join later). Whoever is left
// enters the last round. Each round is a set of small seeded groups (single round robin); the top 2 of each group go
// through. The last round uses exactly (places to fill)/2 groups so the right number qualify.
//   64-team groups: R1 136 teams (34 groups) -> 68 + 26 seeds = 94 (24 groups) -> 48 + 17 seeds = 65 (16 groups) -> 32
//   32-team groups: R1 140 (35 groups) -> 70 + 30 = 100 (25) -> 50 + 20 = 70 (18) -> 36 + 13 = 49 (12 groups) -> 24
const CUP_PLANS = {32:{D:8, E:[140,30,20]}, 64:{D:32, E:[136,26]}};

// ---- Real mode: every confederation runs its own qualifying ----
const CUP_FMT64 = {
  UEFA:'16 home-and-away groups of 3\u20134 teams. Each group winner qualifies (16). The 16 runners-up plus the 8 best-rated remaining teams (standing in for the Nations League spots) are drawn into 6 play-off paths of 4: semi-finals and a final, one match each. Each path winner qualifies (6) \u2192 22 places.',
  CAF:'14 home-and-away groups of 3\u20134 teams. Each group winner qualifies (14). The 4 best runners-up play African play-offs (2 semi-finals + final); the winner goes to the inter-confederation play-off.',
  AFC:'Round 1: the weakest teams play two-legged ties. Round 2: 5 groups of 4, top 2 advance. Final main stage: 20 teams in 5 groups of 4 (10 seeds + 10 from round 2); top 2 of each group qualify (10). The 3rd and 4th place teams (10) go into 2 groups of 5; each group winner qualifies (2). The 2 runners-up play each other for Asia\u2019s inter-confederation play-off place.',
  CONCACAF:'Early rounds narrow the field to 20 (two-legged ties for the weakest teams, then 5 groups of 4 where the top 2 advance), then 20 teams play in 5 groups of 4. The 5 group winners qualify; the 2 best runners-up go to the inter-confederation play-off.',
  CONMEBOL:'One league table: every team plays every other home and away. The top 7 qualify; 8th place goes to the inter-confederation play-off.',
  OFC:'The lowest-ranked teams play a preliminary knockout round, then the remaining 8 teams play two groups of 4. The top two of each group reach the semi-finals, then the final. The winner qualifies; the runner-up goes to the inter-confederation play-off.'
};
const CUP_CONFS = ['UEFA','CAF','AFC','CONCACAF','CONMEBOL','OFC'];
// s[conf] = [direct places, entrants into the inter-confederation play-off]. One host qualifies automatically;
// the play-off entrants are paired off and each tie sends one team through (po = number of play-off places).
const CUP_REAL = {
  32:{po:2, s:{UEFA:[13,0], CAF:[5,0], AFC:[4,1], CONCACAF:[3,1], CONMEBOL:[4,1], OFC:[0,1]}},
  // 64 teams: each confederation copies its 2026 format, scaled up (see cupConf64). 1 host + 61 direct + 2 play-off winners = 64.
  64:{custom:true, po:2, s:{UEFA:[22,0], CAF:[14,1], AFC:[12,1], CONCACAF:[5,2], CONMEBOL:[7,1], OFC:[1,1]}}
};
// Entry point of every team under a plan: 0 = straight into the groups, q = enters in qualifying round q.
function cupEntryMap(F){
  const plan=CUP_PLANS[F], order=[], entry=new Array(N).fill(0);
  for(let i=0;i<N;i++) order.push(i);
  order.sort((x,y)=>BASE[y].base-BASE[x].base||x-y);
  let end=N;
  plan.E.forEach((e,q)=>{ for(let i=end-e;i<end;i++) entry[order[i]]=q+1; end-=e; });
  for(let i=plan.D;i<end;i++) entry[order[i]]=plan.E.length+1;
  return entry;
}
function cupPlanText(F){
  const plan=CUP_PLANS[F], T=F-plan.D, E=plan.E, parts=[]; let alive=0, left=N-plan.D;
  for(let q=0;q<=E.length;q++){
    const last=(q===E.length), e=last ? left : E[q]; left-=e;
    const pool=alive+e, G=last ? T/2 : Math.max(1,Math.round(pool/4));
    parts.push('Round '+(q+1)+': '+(alive ? alive+' winners + ' : '')+e+(q===0 ? ' lowest-ranked teams' : ' seeded teams')+' = '+pool+' teams in '+G+' groups');
    alive=2*G;
  }
  return parts.join(' → ')+' → '+T+' qualify (top 2 of each group advance).';
}

function cupRoundName(size){ return size===2 ? 'Final' : size===4 ? 'Semi-finals' : size===8 ? 'Quarter-finals' : 'Round of '+size; }
function cupShuffle(arr, rnd){
  for(let i=arr.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); const t=arr[i]; arr[i]=arr[j]; arr[j]=t; }
  return arr;
}
// One neutral-venue match. If ko is true a level score is settled by extra time / penalties
// (treated as a near coin-flip with a small edge to the stronger side).
function cupPlay(C, h, a, ko, ha){
  const r=C.r, rnd=C.rnd, rh0=r[h], ra0=r[a], dr=rh0-ra0+(ha||0);
  const p=outcomeProbs(dr,(rh0+ra0)/2,Math.min(rh0,ra0)), u=rnd();
  let gh, ga, g;
  if(u<p.pw){ g=scoreline('W',p.ge,rnd); gh=g[0]; ga=g[1]; }
  else if(u<p.pw+p.pd){ g=scoreline('D',0,rnd); gh=g[0]; ga=g[1]; }
  else { g=scoreline('W',-p.ge,rnd); gh=g[1]; ga=g[0]; }
  let ph=-1, pa=-1, win=-1;
  if(gh>ga) win=h; else if(ga>gh) win=a;
  else if(ko){
    const hw = rnd() < 0.5+(p.we-0.5)*0.35;
    const w = 3+Math.floor(rnd()*3), l = Math.max(0, w-1-(rnd()<0.4?1:0));
    if(hw){ ph=w; pa=l; win=h; } else { ph=l; pa=w; win=a; }
  }
  let dd=0;
  if(C.cfg.dyn){
    const W=gh>ga?1:gh===ga?0.5:0, d=C.cfg.K*(W-p.we);
    r[h]+=d; r[a]-=d; dd=d;
  }
  return {h:h, a:a, gh:gh, ga:ga, ph:ph, pa:pa, win:win, rh:rh0, ra:ra0, dd:dd};
}
function cupInit(cfg, rnd){
  const N=cfg.base.length, F=cfg.F, r=Float64Array.from(cfg.base), order=[];
  for(let i=0;i<N;i++) order.push(i);
  order.sort((x,y)=>r[y]-r[x]||x-y);
  // pending = teams that still have to enter qualifying (strongest first); alive = winners carried between rounds
  const C={cfg:cfg, rnd:rnd, r:r, exit:new Int8Array(N), direct:order.slice(0,cfg.D), pending:order.slice(cfg.D), alive:[],
          target:F-cfg.D, rounds:cfg.E.length+1, phase:'qual', qualRound:0, groups:[], field:[], gDay:0, koTeams:[], koRound:0, champion:-1, hist:[]};
  if(cfg.real) cupRealInit(C, order);
  return C;
}
// Round-robin schedule for a group of s teams (circle method): a list of matchdays, each a list of [i,j] slot pairs.
function cupSchedule(s){
  const arr=[];
  for(let i=0;i<s;i++) arr.push(i);
  if(s%2===1) arr.push(-1);
  const M=arr.length, days=[];
  for(let d=0;d<M-1;d++){
    const pairs=[];
    for(let i=0;i<M/2;i++){ const a=arr[i], b=arr[M-1-i]; if(a>=0 && b>=0) pairs.push([a,b]); }
    days.push(pairs);
    arr.splice(1,0,arr.pop());
  }
  return days;
}
// Seeded draw into G groups: teams sorted by rating, cut into pots of G, one team from each pot per group.
// (If the team count is not a multiple of G, the last, partial pot fills the first groups.)
function cupMakeGroups(C, list, G){
  const sorted=list.slice().sort((x,y)=>C.r[y]-C.r[x]||x-y), groups=[];
  for(let g=0;g<G;g++) groups.push({teams:[], pts:[], gf:[], ga:[], w:[], d:[], l:[]});
  for(let p=0;p*G<sorted.length;p++){
    const pot=cupShuffle(sorted.slice(p*G,(p+1)*G), C.rnd);
    for(let k=0;k<pot.length;k++){
      const Gr=groups[k];
      Gr.teams.push(pot[k]); Gr.pts.push(0); Gr.gf.push(0); Gr.ga.push(0); Gr.w.push(0); Gr.d.push(0); Gr.l.push(0);
    }
  }
  return groups;
}
// Plays matchday `day` of every group that still has one.
function cupPlayDay(C, groups, day, res){
  const cache={};
  for(let g=0;g<groups.length;g++){
    const Gr=groups[g], s=Gr.teams.length;
    const sch = cache[s] || (cache[s]=cupSchedule(s));
    if(day>=sch.length) continue;
    const pairs=sch[day];
    for(let k=0;k<pairs.length;k++){
      const i=pairs[k][0], j=pairs[k][1], x=cupPlay(C,Gr.teams[i],Gr.teams[j],false);
      x.g=g; x.day=day; res.push(x);
      Gr.gf[i]+=x.gh; Gr.ga[i]+=x.ga; Gr.gf[j]+=x.ga; Gr.ga[j]+=x.gh;
      if(x.gh>x.ga){ Gr.pts[i]+=3; Gr.w[i]++; Gr.l[j]++; }
      else if(x.gh<x.ga){ Gr.pts[j]+=3; Gr.w[j]++; Gr.l[i]++; }
      else { Gr.pts[i]++; Gr.pts[j]++; Gr.d[i]++; Gr.d[j]++; }
    }
  }
}
// Order of the slots of a group: points, goal difference, goals scored, current rating.
function cupGroupOrder(C, Gr){
  const r=C.r, idx=[];
  for(let i=0;i<Gr.teams.length;i++) idx.push(i);
  return idx.sort((i,j)=> Gr.pts[j]-Gr.pts[i] || (Gr.gf[j]-Gr.ga[j])-(Gr.gf[i]-Gr.ga[i]) || Gr.gf[j]-Gr.gf[i] || r[Gr.teams[j]]-r[Gr.teams[i]] || Gr.teams[i]-Gr.teams[j]);
}
// One qualifying round: last round's winners plus this round's new entrants (the weakest teams still waiting; the
// last round takes everyone left) are drawn into small seeded groups that play a single round robin; the top 2 of
// each group advance. The last round uses exactly (places still to fill)/2 groups so the right number come through.
function cupQual(C){
  const q=C.qualRound, last=(q>=C.rounds-1);
  const take = last ? C.pending.length : C.cfg.E[q];
  const entrants = C.pending.splice(C.pending.length-take, take);
  const pool = C.alive.concat(entrants), n=pool.length;
  const G = last ? Math.max(1, Math.floor(C.target/2)) : Math.max(1, Math.round(n/4));
  const groups = cupMakeGroups(C, pool, G), res=[];
  for(let day=0; day<12; day++){
    const before=res.length;
    cupPlayDay(C, groups, day, res);
    if(res.length===before) break;
  }
  const winners=[];
  for(let g=0;g<groups.length;g++){
    const o=cupGroupOrder(C,groups[g]);
    for(let k=0;k<Math.min(2,o.length);k++) winners.push(groups[g].teams[o[k]]);
  }
  if(C.cfg.log) res.sort((a,b)=>a.g-b.g||a.day-b.day);
  C.alive=winners;
  C.qualRound++;
  return {stage:'qual', label:'Qualifying round '+C.qualRound+' of '+C.rounds, matches:res, groups:groups, entrants:entrants.length, pool:n};
}
// Real mode setup: the host is a random team from the top 50; it qualifies automatically and sits out its
// confederation's qualifying. Everyone else is listed by confederation, strongest first.
function cupRealInit(C, order){
  const cfg=C.cfg, host=order[Math.floor(C.rnd()*Math.min(50,order.length))], by={};
  for(let i=0;i<order.length;i++){
    const t=order[i]; if(t===host) continue;
    (by[cfg.conf[t]]||(by[cfg.conf[t]]=[])).push(t);
  }
  C.rhost=host; C.rby=by; C.rq=[host]; C.rp=[]; C.rounds=cfg.confs.length+1;
}
// Shape of a confederation's qualifying, from its team count n and its number of direct places d.
function cupRealFormat(n, d){
  if(n<=12 || d<1) return {kind:'league', legs:n<=10?2:1};
  if(n/d>=6.5) return {kind:'groups', G:2*d, ties:true};
  if(n/d>=3.5) return {kind:'groups', G:d, ties:false};
  return {kind:'groups', G:Math.ceil(d/2), ties:false};
}
// Every group plays a home-and-away (legs=2) or single (legs=1) round robin; matchdays run in parallel across groups.
function cupRealGroups(C, groups, legs, tags, haO){
  const ha=(haO!==undefined ? haO : (C.cfg.ha||0)), cache={}, out=[];
  for(let leg=0; leg<legs; leg++){
    for(let day=0; day<40; day++){
      let any=false;
      for(let g=0; g<groups.length; g++){
        const Gr=groups[g], s=Gr.teams.length, sch=cache[s]||(cache[s]=cupSchedule(s));
        if(day>=sch.length) continue;
        any=true;
        const pairs=sch[day];
        for(let k=0;k<pairs.length;k++){
          let i=pairs[k][0], j=pairs[k][1];
          if(leg===1){ const t=i; i=j; j=t; }
          const x=cupPlay(C,Gr.teams[i],Gr.teams[j],false,ha);
          x.gi=g; x.o=leg*100+day; if(tags) x.tag=tags[g];
          out.push(x);
          Gr.gf[i]+=x.gh; Gr.ga[i]+=x.ga; Gr.gf[j]+=x.ga; Gr.ga[j]+=x.gh;
          if(x.gh>x.ga){ Gr.pts[i]+=3; Gr.w[i]++; Gr.l[j]++; }
          else if(x.gh<x.ga){ Gr.pts[j]+=3; Gr.w[j]++; Gr.l[i]++; }
          else { Gr.pts[i]++; Gr.pts[j]++; Gr.d[i]++; Gr.d[j]++; }
        }
      }
      if(!any) break;
    }
  }
  if(C.cfg.log) out.sort((a,b)=>a.gi-b.gi||a.o-b.o);
  return out;
}
// Two-legged tie (h1 hosts the first leg); level on aggregate goes to penalties. Both legs are pushed onto res.
function cupTie(C, h1, h2, tag, res){
  const ha=C.cfg.ha||0, rnd=C.rnd, r=C.r;
  const x1=cupPlay(C,h1,h2,false,ha), x2=cupPlay(C,h2,h1,false,ha);
  const g1=x1.gh+x2.ga, g2=x1.ga+x2.gh;
  let win=-1, p1=-1, p2=-1;
  if(g1>g2) win=h1; else if(g2>g1) win=h2;
  else {
    const we=outcomeProbs(r[h1]-r[h2],(r[h1]+r[h2])/2,Math.min(r[h1],r[h2])).we;
    const w=3+Math.floor(rnd()*3), l=Math.max(0, w-1-(rnd()<0.4?1:0));
    if(rnd() < 0.5+(we-0.5)*0.35){ p1=w; p2=l; win=h1; } else { p1=l; p2=w; win=h2; }
    x2.ph=p2; x2.pa=p1; x2.win=win;
  }
  if(C.cfg.log){ x1.tag=x2.tag=tag; x1.o=0; x2.o=1; x2.note='agg '+g2+'&ndash;'+g1; }
  res.push(x1, x2);
  return {win:win, g1:g1, g2:g2, p1:p1, p2:p2};
}
// Seeded draw of two-legged ties: the stronger half is paired with the weaker half; seeds host the second leg.
function cupRealTies(C, list, tag, res){
  const r=C.r, sorted=list.slice().sort((x,y)=>r[y]-r[x]||x-y), k=sorted.length>>1;
  const seeded=sorted.slice(0,k), uns=cupShuffle(sorted.slice(k), C.rnd), winners=[], ties=[];
  for(let i=0;i<k;i++){
    const t=cupTie(C,uns[i],seeded[i],tag,res);
    winners.push(t.win);
    if(C.cfg.log) ties.push({h:seeded[i], a:uns[i], gh:t.g2, ga:t.g1, ph:t.p2, pa:t.p1, win:t.win});
  }
  return {winners:winners, ties:ties};
}
// One confederation's whole qualifying campaign.
function cupRealConf(C, conf){
  const cfg=C.cfg, sl=cfg.rs.s[conf], d=sl[0], p=sl[1], log=cfg.log;
  const teams=(C.rby[conf]||[]).slice(), n=teams.length, fmt=cupRealFormat(n,d);
  const res=[], stages=[]; let direct, entr, text='';
  if(fmt.kind==='league'){
    const groups=cupMakeGroups(C,teams,1), Gr=groups[0];
    res.push.apply(res, cupRealGroups(C,groups,fmt.legs,log?[conf+' \u00b7 League']:null));
    const o=cupGroupOrder(C,Gr);
    direct=o.slice(0,d).map(i=>Gr.teams[i]); entr=o.slice(d,d+p).map(i=>Gr.teams[i]);
    if(log){
      text=n+' teams in one '+(fmt.legs===2?'home-and-away':'single round-robin')+' league: the top '+d+' qualify'+(p?', the next '+p+' go to the inter-confederation play-off':'')+'.';
      stages.push({kind:'league', title:'League table', groups:groups, mark:{adv:direct, po:entr}});
    }
  } else {
    const G=fmt.G, groups=cupMakeGroups(C,teams,G); let tags=null;
    if(log){ tags=[]; for(let g=0;g<G;g++) tags.push(conf+' \u00b7 Group '+cupGroupName(g)); }
    res.push.apply(res, cupRealGroups(C,groups,2,tags));
    // everyone ranked by finishing place first, then points per game (groups differ in size), goal difference, goals
    const cand=[];
    for(let g=0;g<G;g++){
      const Gr=groups[g], o=cupGroupOrder(C,Gr);
      for(let k=0;k<o.length;k++){
        const i=o[k], pl=(Gr.w[i]+Gr.d[i]+Gr.l[i])||1;
        cand.push({t:Gr.teams[i], lv:k, ppg:Gr.pts[i]/pl, gd:(Gr.gf[i]-Gr.ga[i])/pl, gf:Gr.gf[i]/pl});
      }
    }
    cand.sort((x,y)=>x.lv-y.lv||y.ppg-x.ppg||y.gd-x.gd||y.gf-x.gf||C.r[y.t]-C.r[x.t]||x.t-y.t);
    if(fmt.ties){
      const winners=cand.filter(x=>x.lv===0).map(x=>x.t);
      entr=cand.filter(x=>x.lv===1).slice(0,p).map(x=>x.t);
      const tr=cupRealTies(C,winners,log?conf+' \u00b7 Play-off ties':null,res);
      direct=tr.winners;
      if(log){
        text=n+' teams in '+G+' home-and-away groups; the '+G+' group winners are drawn into '+d+' two-legged ties for '+d+' places'+(p?', and the '+p+' best runner'+(p>1?'s-up go':'-up goes')+' to the inter-confederation play-off':'')+'.';
        stages.push({kind:'groups', title:G+' groups (home & away)', groups:groups, mark:{adv:winners, po:entr}});
        stages.push({kind:'ties', title:'Two-legged ties between the group winners', ties:tr.ties});
      }
    } else {
      direct=cand.slice(0,d).map(x=>x.t); entr=cand.slice(d,d+p).map(x=>x.t);
      if(log){
        text=n+' teams in '+G+' home-and-away groups; '+(d>G ? 'the top 2 of each group qualify' : 'the winner of each group qualifies')+' ('+d+' places)'+(p?', and the next '+p+' best go to the inter-confederation play-off':'')+'.';
        stages.push({kind:'groups', title:G+' groups (home & away)', groups:groups, mark:{adv:direct, po:entr}});
      }
    }
  }
  C.rq.push.apply(C.rq, direct); C.rp.push.apply(C.rp, entr);
  return {stage:'qual', label:'Qualifying \u2014 '+conf, matches:res, real:{conf:conf, n:n, d:d, p:p, text:text, stages:stages, direct:direct, entr:entr}};
}
// Inter-confederation play-off: single neutral matches, strongest entrants seeded; same-confederation pairs avoided.
function cupRealPlayoff(C){
  const r=C.r, list=C.rp.slice().sort((x,y)=>r[y]-r[x]||x-y), k=list.length>>1, res=[];
  const seeded=list.slice(0,k), uns=list.slice(k);
  for(let tr=0; tr<60; tr++){
    cupShuffle(uns, C.rnd); let ok=true;
    for(let i=0;i<k;i++) if(C.cfg.conf[seeded[i]]===C.cfg.conf[uns[i]]) ok=false;
    if(ok) break;
  }
  for(let i=0;i<k;i++){
    const x=cupPlay(C,seeded[i],uns[i],true);
    if(C.cfg.log) x.tag='Inter-confederation play-off';
    res.push(x); C.rq.push(x.win);
  }
  C.direct=C.rq.slice(); C.alive=[];
  return {stage:'qual', label:'Qualifying \u2014 Inter-confederation play-off', matches:res, real:{playoff:true, entrants:list.length, slots:k}};
}
function cupRealQual(C){
  const q=C.qualRound, confs=C.cfg.confs;
  const cu=C.cfg.rs.custom;
  const out = q<confs.length ? (cu ? cupConf64(C,confs[q]) : cupRealConf(C,confs[q])) : (cu ? cupPlayoff64(C) : cupRealPlayoff(C));
  C.qualRound++;
  return out;
}
// ---- 64-team Real mode: every confederation copies its 2026 format, scaled up ----
// One single-leg knockout match (home advantage only if ha is given); both teams are listed home first.
function cupKoOne(C, h, a, tag, res, ha){
  const x=cupPlay(C,h,a,true,ha||0);
  if(C.cfg.log) x.tag=tag;
  res.push(x); return x;
}
// Four-team mini bracket: semi-finals 1v4 and 2v3 by rating, then the final. Returns the winner.
function cupMini4(C, four, tag, res, ha, rd){
  const s=four.slice().sort((x,y)=>C.r[y]-C.r[x]||x-y);
  const a=cupKoOne(C,s[0],s[3],tag,res,ha), b=cupKoOne(C,s[1],s[2],tag,res,ha), f=cupKoOne(C,a.win,b.win,tag,res,ha);
  if(rd){ rd[0].ms.push(a,b); rd[1].ms.push(f); }
  return f.win;
}
// Teams that finished in place lv (0 = winners) of their groups, best first (points per game, so groups of 3 and 4 compare fairly).
function cupAtPlace(C, groups, lv){
  const out=[];
  for(let g=0;g<groups.length;g++){
    const Gr=groups[g], o=cupGroupOrder(C,Gr);
    if(lv>=o.length) continue;
    const i=o[lv], pl=(Gr.w[i]+Gr.d[i]+Gr.l[i])||1;
    out.push({t:Gr.teams[i], ppg:Gr.pts[i]/pl, gd:(Gr.gf[i]-Gr.ga[i])/pl, gf:Gr.gf[i]/pl});
  }
  out.sort((x,y)=>y.ppg-x.ppg||y.gd-x.gd||y.gf-x.gf||C.r[y.t]-C.r[x.t]||x.t-y.t);
  return out.map(x=>x.t);
}
// Early rounds (AFC / CONCACAF): the top `seeds` teams wait for the final round. Of the rest, the weakest 2k play
// two-legged ties so that the pool is exactly 4*g2 teams; the pool plays g2 home-and-away groups of 4 and the top 2 advance.
function cupPreRounds(C, conf, teams, seeds, g2, stages, res){
  const log=C.cfg.log, s=teams.slice().sort((x,y)=>C.r[y]-C.r[x]||x-y), top=s.slice(0,seeds), rest=s.slice(seeds);
  const k=Math.max(0, rest.length-4*g2);
  let pool=rest;
  if(k>0){
    const low=rest.slice(rest.length-2*k), byes=rest.slice(0,rest.length-2*k);
    const tr=cupRealTies(C, low, log?conf+' \u00b7 Round 1':null, res);
    pool=byes.concat(tr.winners);
    if(log) stages.push({kind:'ties', title:'Round 1 \u2014 two-legged ties between the '+(2*k)+' lowest-ranked teams ('+byes.length+' teams get a bye)', ties:tr.ties});
  }
  const groups=cupMakeGroups(C,pool,g2); let tags=null;
  if(log){ tags=[]; for(let g=0;g<g2;g++) tags.push(conf+' \u00b7 Round 2 \u00b7 Group '+cupGroupName(g)); }
  res.push.apply(res, cupRealGroups(C,groups,2,tags));
  const adv=cupAtPlace(C,groups,0).concat(cupAtPlace(C,groups,1));
  if(log) stages.push({kind:'groups', title:'Round 2 \u2014 '+g2+' home-and-away groups, top 2 advance', groups:groups, mark:{adv:adv, po:[]}});
  return top.concat(adv);
}
function cupGroupTags(conf, label, G){ const t=[]; for(let g=0;g<G;g++) t.push(conf+' \u00b7 '+label+cupGroupName(g)); return t; }
// One confederation's whole 64-team qualifying campaign.
function cupConf64(C, conf){
  const cfg=C.cfg, log=cfg.log, teams=(C.rby[conf]||[]).slice(), n=teams.length, res=[], stages=[], r=C.r, ha=cfg.ha||0;
  let direct=[], entr=[], text='', groups, tags, G;
  if(conf==='UEFA'){
    G=16; groups=cupMakeGroups(C,teams,G);
    res.push.apply(res, cupRealGroups(C,groups,2,log?cupGroupTags(conf,'Group ',G):null));
    const win=cupAtPlace(C,groups,0), run=cupAtPlace(C,groups,1), taken={};
    win.concat(run).forEach(t=>{taken[t]=1;});
    const wild=teams.filter(t=>!taken[t]).sort((x,y)=>r[y]-r[x]||x-y).slice(0,8);
    const all=run.concat(wild).sort((x,y)=>r[y]-r[x]||x-y), np=Math.floor(all.length/4), pots=[];
    for(let p=0;p<4;p++) pots.push(cupShuffle(all.slice(p*np,(p+1)*np), C.rnd));
    if(log) stages.push({kind:'groups', title:G+' home-and-away groups', groups:groups, mark:{adv:win, po:run}});
    const pw=[];
    for(let i=0;i<np;i++){
      const tag='UEFA \u00b7 Play-off path '+cupGroupName(i), rd=[{title:'Semi-finals',ms:[]},{title:'Final',ms:[]}];
      const a=cupKoOne(C,pots[0][i],pots[3][i],tag,res,ha), b=cupKoOne(C,pots[1][i],pots[2][i],tag,res,ha), f=cupKoOne(C,a.win,b.win,tag,res,ha);
      rd[0].ms.push(a,b); rd[1].ms.push(f); pw.push(f.win);
      if(log) stages.push({kind:'ko', title:'Play-off path '+cupGroupName(i), rounds:rd});
    }
    direct=win.concat(pw);
    if(log) text=n+' teams in '+G+' home-and-away groups. The '+G+' group winners qualify. The '+G+' runners-up plus the 8 best-rated other teams (standing in for the Nations League places) fill '+np+' play-off paths of four (semi-finals and a final, one match each, the higher seed hosts); each path winner qualifies \u2014 '+direct.length+' places.';
  } else if(conf==='CAF'){
    G=14; groups=cupMakeGroups(C,teams,G);
    res.push.apply(res, cupRealGroups(C,groups,2,log?cupGroupTags(conf,'Group ',G):null));
    const win=cupAtPlace(C,groups,0), run=cupAtPlace(C,groups,1).slice(0,4), rd=[{title:'Semi-finals',ms:[]},{title:'Final',ms:[]}];
    const w=cupMini4(C,run,log?'CAF \u00b7 African play-offs':null,res,0,rd);
    direct=win; entr=[w];
    if(log){
      stages.push({kind:'groups', title:G+' home-and-away groups', groups:groups, mark:{adv:win, po:run}});
      stages.push({kind:'ko', title:'African play-offs (4 best runners-up, neutral venue)', rounds:rd});
      text=n+' teams in '+G+' home-and-away groups. Each group winner qualifies ('+G+'). The 4 best runners-up play African play-offs (two semi-finals and a final); the winner goes to the inter-confederation play-off.';
    }
  } else if(conf==='CONMEBOL'){
    groups=cupMakeGroups(C,teams,1);
    res.push.apply(res, cupRealGroups(C,groups,2,log?[conf+' \u00b7 League']:null));
    const o=cupGroupOrder(C,groups[0]);
    direct=o.slice(0,7).map(i=>groups[0].teams[i]); entr=o.slice(7,8).map(i=>groups[0].teams[i]);
    if(log){
      stages.push({kind:'league', title:'League table', groups:groups, mark:{adv:direct, po:entr}});
      text=n+' teams in one league; everyone plays everyone home and away ('+(2*(n-1))+' matches each). The top 7 qualify; 8th place goes to the inter-confederation play-off.';
    }
  } else if(conf==='CONCACAF'){
    const field=cupPreRounds(C,conf,teams,10,5,stages,res);
    groups=cupMakeGroups(C,field,5);
    res.push.apply(res, cupRealGroups(C,groups,2,log?cupGroupTags(conf,'Final round \u00b7 Group ',5):null));
    direct=cupAtPlace(C,groups,0); entr=cupAtPlace(C,groups,1).slice(0,2);
    if(log){
      stages.push({kind:'groups', title:'Final round \u2014 20 teams in 5 home-and-away groups of 4', groups:groups, mark:{adv:direct, po:entr}});
      text=n+' teams. Early rounds narrow the field to 20 (10 seeds wait; the weakest teams play two-legged ties; then 5 groups of 4 send the top 2 through). Then 5 groups of 4: the 5 group winners qualify and the 2 best runners-up go to the inter-confederation play-off.';
    }
  } else if(conf==='AFC'){
    const field=cupPreRounds(C,conf,teams,10,5,stages,res);
    groups=cupMakeGroups(C,field,5);
    res.push.apply(res, cupRealGroups(C,groups,2,log?cupGroupTags(conf,'Round 3 \u00b7 Group ',5):null));
    const top2=cupAtPlace(C,groups,0).concat(cupAtPlace(C,groups,1)), pool=cupAtPlace(C,groups,2).concat(cupAtPlace(C,groups,3));
    if(log) stages.push({kind:'groups', title:'Round 3 (final main stage) \u2014 20 teams in 5 home-and-away groups of 4', groups:groups, mark:{adv:top2, po:pool}});
    const g4=cupMakeGroups(C,pool,2);
    res.push.apply(res, cupRealGroups(C,g4,2,log?cupGroupTags(conf,'Round 4 \u00b7 Group ',2):null));
    const w4=cupAtPlace(C,g4,0), r4=cupAtPlace(C,g4,1);
    const tr=cupRealTies(C,r4,log?'AFC \u00b7 Round 5 (runners-up)':null,res);
    direct=top2.concat(w4); entr=tr.winners;
    if(log){
      stages.push({kind:'groups', title:'Round 4 \u2014 3rd and 4th place teams, 2 groups of 5 (winners qualify)', groups:g4, mark:{adv:w4, po:r4}});
      stages.push({kind:'ties', title:'Round 5 \u2014 the two group runners-up, two legs', ties:tr.ties});
      text=n+' teams. Round 1 ties and 5 round-2 groups cut the field to 20; the 20 play 5 groups of 4 and the top 2 of each qualify (10). The 3rd and 4th placed teams (10) play 2 groups of 5 and each winner qualifies (2). The 2 runners-up play each other over two legs for Asia\u2019s inter-confederation play-off place.';
    }
  } else {
    const s=teams.slice().sort((x,y)=>r[y]-r[x]||x-y), k=Math.max(0,n-8), low=s.slice(n-2*k), byes=s.slice(0,n-2*k);
    const seeded=low.slice(0,k), uns=cupShuffle(low.slice(k), C.rnd), pre=[], pw=[];
    for(let i=0;i<k;i++){ const x=cupKoOne(C,seeded[i],uns[i],'OFC \u00b7 Preliminary round',res,0); pre.push(x); pw.push(x.win); }
    groups=cupMakeGroups(C,byes.concat(pw),2);
    res.push.apply(res, cupRealGroups(C,groups,1,log?cupGroupTags(conf,'Group ',2):null,0));
    const oa=cupGroupOrder(C,groups[0]), ob=cupGroupOrder(C,groups[1]);
    const a1=groups[0].teams[oa[0]], a2=groups[0].teams[oa[1]], b1=groups[1].teams[ob[0]], b2=groups[1].teams[ob[1]];
    const s1=cupKoOne(C,a1,b2,'OFC \u00b7 Semi-finals',res,0), s2=cupKoOne(C,b1,a2,'OFC \u00b7 Semi-finals',res,0), f=cupKoOne(C,s1.win,s2.win,'OFC \u00b7 Final',res,0);
    direct=[f.win]; entr=[f.win===f.h ? f.a : f.h];
    if(log){
      if(k>0) stages.push({kind:'ko', title:'Preliminary knockout round', rounds:[{title:'Preliminary round',ms:pre}]});
      stages.push({kind:'groups', title:'Two groups of 4 (single round robin)', groups:groups, mark:{adv:[a1,a2,b1,b2], po:[]}});
      stages.push({kind:'ko', title:'Knockout', rounds:[{title:'Semi-finals',ms:[s1,s2]},{title:'Final',ms:[f]}]});
      text=n+' teams. The '+(2*k)+' lowest-ranked play a preliminary knockout round; the remaining 8 play two groups of 4. The top two of each group reach the semi-finals, then the final. The winner qualifies; the runner-up goes to the inter-confederation play-off.';
    }
  }
  C.rq.push.apply(C.rq, direct); C.rp.push.apply(C.rp, entr);
  return {stage:'qual', label:'Qualifying \u2014 '+conf, matches:res, real:{conf:conf, n:n, d:direct.length, p:entr.length, text:text, stages:stages, direct:direct, entr:entr}};
}
// Inter-confederation play-off: 6 teams in two mini brackets of 3. The two best-rated entrants are seeded into the
// finals; the other four play the semi-finals (same-confederation pairs avoided); neutral venues.
function cupPlayoff64(C){
  const r=C.r, list=C.rp.slice().sort((x,y)=>r[y]-r[x]||x-y), res=[], k=Math.round(list.length/3);
  const seeded=list.slice(0,k), uns=list.slice(k), cf=C.cfg.conf;
  for(let tr=0; tr<80; tr++){
    cupShuffle(uns, C.rnd); let ok=true;
    for(let j=0;j<k;j++) if(cf[uns[2*j]]===cf[uns[2*j+1]]) ok=false;
    if(ok) break;
  }
  const rd=[{title:'Semi-finals',ms:[]},{title:'Finals',ms:[]}], sw=[];
  for(let j=0;j<k;j++){ const x=cupKoOne(C,uns[2*j],uns[2*j+1],'Inter-confederation play-off \u00b7 Bracket '+(j+1)+' semi-final',res,0); rd[0].ms.push(x); sw.push(x.win); }
  for(let j=0;j<k;j++){ const x=cupKoOne(C,seeded[j],sw[j],'Inter-confederation play-off \u00b7 Bracket '+(j+1)+' final',res,0); rd[1].ms.push(x); C.rq.push(x.win); }
  C.direct=C.rq.slice(); C.alive=[];
  return {stage:'qual', label:'Qualifying \u2014 Inter-confederation play-off', matches:res, real:{playoff:true, entrants:list.length, slots:k, rounds:rd}};
}
// Draw for the group stage: 4 seeded pots, groups of 4.
function cupDraw(C){
  const F=C.cfg.F, r=C.r;
  const field=C.direct.concat(C.alive).sort((x,y)=>r[y]-r[x]||x-y).slice(0,F);
  C.groups=cupMakeGroups(C, field, F/4);
  for(let i=0;i<field.length;i++) C.exit[field[i]]=1;
  C.field=field;
}
function cupGroupDay(C){
  const res=[];
  cupPlayDay(C, C.groups, C.gDay, res);
  C.gDay++;
  return {stage:'group', label:'Group stage — matchday '+C.gDay, matches:res};
}
// Top two of each group go through. Winner of group j meets the runner-up of group j+1 (j even) and vice versa,
// so nobody meets a group opponent again before the later rounds.
function cupBuildKo(C){
  const G=C.groups.length, win=[], run=[];
  for(let g=0;g<G;g++){
    const Gr=C.groups[g], o=cupGroupOrder(C,Gr);
    win.push(Gr.teams[o[0]]); run.push(Gr.teams[o[1]]);
  }
  const list=[];
  for(let j=0;j<G;j+=2){ list.push(win[j], run[j+1], win[j+1], run[j]); }
  for(let i=0;i<list.length;i++) C.exit[list[i]]=2;
  C.koTeams=list; C.koRound=0;
}
function cupKo(C){
  const t=C.koTeams, size=t.length, res=[], next=[];
  for(let i=0;i<size;i+=2){
    const x=cupPlay(C,t[i],t[i+1],true);
    res.push(x); next.push(x.win);
  }
  C.koRound++;
  for(let i=0;i<next.length;i++) C.exit[next[i]]=2+C.koRound;
  C.koTeams=next;
  return {stage:'ko', label:cupRoundName(size), matches:res};
}
// Plays exactly one round (a qualifying round, a group matchday or a knockout round).
function cupStep(C){
  if(C.phase==='done') return null;
  let out;
  if(C.phase==='qual'){
    if(C.cfg.real){
      out=cupRealQual(C);
      if(C.qualRound>=C.rounds){ cupDraw(C); C.phase='group'; }
    } else {
      out=cupQual(C);
      if(C.qualRound>=C.rounds && C.alive.length<=C.target){ cupDraw(C); C.phase='group'; }
    }
  } else if(C.phase==='group'){
    out=cupGroupDay(C);
    if(C.gDay>=3){ cupBuildKo(C); C.phase='ko'; }
  } else {
    out=cupKo(C);
    if(C.koTeams.length===1){ C.champion=C.koTeams[0]; C.phase='done'; }
  }
  if(C.cfg.log) C.hist.push(out);
  return out;
}
// Monte Carlo core: many full tournaments, counting each team's final stage code.
function cupMcCore(cfg){
  const N=cfg.base.length, R=Math.round(Math.log2(cfg.F/2)), S=R+3, CAP=cfg.cap||60;
  const cnt=new Int32Array(N*S), sd=new Int32Array(N*S*CAP), sn=new Int32Array(N*S);
  const c2={base:cfg.base, F:cfg.F, D:cfg.D, E:cfg.E, K:cfg.K, dyn:cfg.dyn, log:false,
            real:cfg.real, conf:cfg.conf, confs:cfg.confs, rs:cfg.rs, ha:cfg.ha};
  for(let s=0;s<cfg.count;s++){
    const sim=(cfg.seed+Math.imul(cfg.start+s+1,0x9E3779B1))|0, rnd=mulberry32(sim);
    const C=cupInit(c2,rnd);
    while(C.phase!=='done') cupStep(C);
    for(let i=0;i<N;i++){ const ce=i*S+C.exit[i]; cnt[ce]++; if(sn[ce]<CAP) sd[ce*CAP+sn[ce]++]=sim; }
  }
  return {n:cfg.count, cnt:cnt, sd:sd, sn:sn, cap:CAP};
}
function cupWorkerSource(){
  const fns=[mulberry32, poisson, outcomeProbs, scoreline, cupRoundName, cupShuffle, cupPlay, cupInit, cupSchedule, cupMakeGroups,
             cupPlayDay, cupGroupOrder, cupQual, cupRealInit, cupRealFormat, cupRealGroups, cupTie, cupRealTies, cupRealConf,
             cupRealPlayoff, cupRealQual, cupKoOne, cupMini4, cupAtPlace, cupPreRounds, cupGroupTags, cupConf64, cupPlayoff64, cupGroupName, cupDraw, cupGroupDay, cupBuildKo, cupKo, cupStep, cupMcCore];
  return 'const SCALE='+SCALE+';\n'+fns.map(String).join('\n')+
         '\nself.onmessage=function(e){var o=cupMcCore(e.data);self.postMessage(o,[o.cnt.buffer,o.sd.buffer,o.sn.buffer]);};';
}

function cupGroupName(g){ return g<26 ? String.fromCharCode(65+g) : String.fromCharCode(64+Math.floor(g/26))+String.fromCharCode(65+g%26); }
function cupTeamHtml(t){ return '<a class="tl" data-cteam="'+t+'"><span class="flag">'+BASE[t].flag+'</span>'+BASE[t].name+'</a>'; }
// ---- clickable nations: full results list ----
function cthRow(t, x, label){
  const home=x.h===t, o=home ? x.a : x.h, f=home ? x.gh : x.ga, ag=home ? x.ga : x.gh;
  let res=f>ag ? 'W' : f<ag ? 'L' : 'D';
  if(res==='D' && x.win>=0) res = x.win===t ? 'W' : 'L';
  const pen = x.ph>=0 ? ' <span class="sub">('+(home?x.ph:x.pa)+'&ndash;'+(home?x.pa:x.ph)+' p)</span>' : '';
  const note = x.note ? ' <span class="sub">'+x.note+'</span>' : '';
  return {res:res, f:f, ag:ag, html:'<tr><td class="l">'+label+'</td><td class="l">'+cupTeamHtml(o)+'</td><td>'+(home?'H':'A')+'</td><td class="sc">'+f+'&ndash;'+ag+pen+note+'</td><td><span class="badge '+res+'">'+res+'</span></td></tr>'};
}
const CTH_HEAD='<table><thead><tr><th class="l">Round</th><th class="l">Opponent</th><th></th><th>Score</th><th></th></tr></thead><tbody>';
function cthChip(l,v){ return '<div class="chip"><span>'+l+'</span><b style="font-size:14px">'+v+'</b></div>'; }
function cupMatchRow(x){
  const hw=x.win===x.h, aw=x.win===x.a;
  const pen = (x.ph>=0 ? ' <span class="sub">('+x.ph+'&ndash;'+x.pa+' p)</span>' : '') + (x.note ? ' <span class="sub">'+x.note+'</span>' : '');
  return '<div class="match"><span class="h '+(hw?'w':aw?'n':'')+'">'+cupTeamHtml(x.h)+'</span><span class="s">'+x.gh+'&ndash;'+x.ga+pen+'</span><span class="'+(aw?'w':hw?'n':'')+'">'+cupTeamHtml(x.a)+'</span></div>';
}
function cupGroupCard(C, Gr, g, complete, opt){
  const ord=cupGroupOrder(C,Gr);
  const rows=ord.map((i,k)=>{
    const t=Gr.teams[i], pl=Gr.w[i]+Gr.d[i]+Gr.l[i], gd=Gr.gf[i]-Gr.ga[i];
    const cls = (opt&&opt.mark) ? (opt.mark.adv.indexOf(t)>=0?'adv':opt.mark.po.indexOf(t)>=0?'po':opt.mark.rel&&opt.mark.rel.indexOf(t)>=0?'rel':'') : (complete&&k<2?'adv':'');
    return '<tr class="'+cls+'"><td class="l">'+cupTeamHtml(t)+'</td><td>'+pl+'</td><td>'+Gr.w[i]+'</td><td>'+Gr.d[i]+'</td><td>'+Gr.l[i]+'</td><td>'+(gd>0?'+':'')+gd+'</td><td class="pts">'+Gr.pts[i]+'</td></tr>';
  }).join('');
  return '<div class="gcard"><div class="gh">'+(opt&&opt.title ? opt.title : 'Group '+cupGroupName(g))+'</div><table><thead><tr><th class="l">Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function cupBracketCard(x){
  const hw=x.win===x.h, pen=x.ph>=0;
  const line=(t,g,p,w)=>'<div class="bl'+(w?' bw':'')+'"><span>'+cupTeamHtml(t)+'</span><b>'+g+(pen?' <small>('+p+')</small>':'')+'</b></div>';
  return '<div class="bm">'+line(x.h,x.gh,x.ph,hw)+line(x.a,x.ga,x.pa,!hw)+'</div>';
}
