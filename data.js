// Shared data + model: teams, flags, rating model, schedule. Loaded by every page.
// ---------- Teams: "Name|Confederation|FIFA points, live ranking 6 Oct 2026" ----------
const RAW = [
// UEFA (55)
"Spain|UEFA|2007.86","France|UEFA|1958.86","England|UEFA|1923.43","Portugal|UEFA|1807.69","Belgium|UEFA|1779.17","Netherlands|UEFA|1778.61",
"Germany|UEFA|1717.52","Croatia|UEFA|1718.45","Italy|UEFA|1713.04","Switzerland|UEFA|1722.46","Denmark|UEFA|1619.62","Austria|UEFA|1600.66",
"Norway|UEFA|1637.89","Ukraine|UEFA|1535.27","Turkey|UEFA|1563.54","Poland|UEFA|1514.58","Serbia|UEFA|1482.24","Hungary|UEFA|1511.24",
"Sweden|UEFA|1543.80","Wales|UEFA|1510.37","Czechia|UEFA|1459.28","Scotland|UEFA|1491.75","Romania|UEFA|1428.88","Slovakia|UEFA|1475.12",
"Greece|UEFA|1498.71","Slovenia|UEFA|1444.30","Russia|UEFA|1537.15","Ireland|UEFA|1438.62","Albania|UEFA|1374.66","Bosnia and Herzegovina|UEFA|1429.32",
"Northern Ireland|UEFA|1383.86","Finland|UEFA|1349.78","Iceland|UEFA|1352.27","Georgia|UEFA|1345.88","Montenegro|UEFA|1315.49","Bulgaria|UEFA|1255.49",
"Israel|UEFA|1325.52","North Macedonia|UEFA|1353.84","Kosovo|UEFA|1328.14","Belarus|UEFA|1240.55","Luxembourg|UEFA|1225.87","Armenia|UEFA|1183.26",
"Kazakhstan|UEFA|1166.65","Cyprus|UEFA|1142.43","Azerbaijan|UEFA|1138.96","Faroe Islands|UEFA|1139.71","Estonia|UEFA|1144.28","Latvia|UEFA|1069.33",
"Lithuania|UEFA|1059.28","Moldova|UEFA|1017.78","Malta|UEFA|1006.80","Andorra|UEFA|927.53","Liechtenstein|UEFA|790.18","Gibraltar|UEFA|829.49",
"San Marino|UEFA|717.04",
// CAF (54)
"Morocco|CAF|1805.34","Senegal|CAF|1647.35","Egypt|CAF|1585.86","Ivory Coast|CAF|1569.32","Nigeria|CAF|1568.27","Algeria|CAF|1572.99",
"Tunisia|CAF|1415.38","Cameroon|CAF|1485.30","Mali|CAF|1474.14","DR Congo|CAF|1506.37","South Africa|CAF|1468.88","Burkina Faso|CAF|1407.80",
"Cape Verde|CAF|1373.58","Ghana|CAF|1361.27","Guinea|CAF|1296.67","Gabon|CAF|1280.12","Angola|CAF|1272.60","Zambia|CAF|1260.61",
"Uganda|CAF|1278.26","Benin|CAF|1266.64","Mozambique|CAF|1238.23","Equatorial Guinea|CAF|1200.39","Congo|CAF|1102.46","Libya|CAF|1168.89",
"Mauritania|CAF|1176.05","Kenya|CAF|1168.67","Madagascar|CAF|1197.24","Namibia|CAF|1146.48","Tanzania|CAF|1166.82","Comoros|CAF|1193.77",
"Zimbabwe|CAF|1128.05","Niger|CAF|1174.72","Sierra Leone|CAF|1123.20","Gambia|CAF|1182.64","Guinea-Bissau|CAF|1144.03","Togo|CAF|1153.04",
"Sudan|CAF|1156.74","Malawi|CAF|1131.03","Rwanda|CAF|1156.16","Ethiopia|CAF|1064.46","Botswana|CAF|1073.85","Burundi|CAF|1076.75",
"Central African Republic|CAF|1065.15","Liberia|CAF|1064.58","Lesotho|CAF|1053.09","South Sudan|CAF|959.91","Eswatini|CAF|979.01","Chad|CAF|896.85",
"Mauritius|CAF|911.49","Seychelles|CAF|795.63","Djibouti|CAF|853.58","Sao Tome and Principe|CAF|855.10","Eritrea|CAF|890.97","Somalia|CAF|832.14",
// AFC (46)
"Japan|AFC|1684.75","Iran|AFC|1597.31","South Korea|AFC|1558.79","Australia|AFC|1580.52","Uzbekistan|AFC|1420.31","Jordan|AFC|1349.77",
"Saudi Arabia|AFC|1438.71","Qatar|AFC|1416.47","Iraq|AFC|1400.91","UAE|AFC|1381.40","Oman|AFC|1302.77","Bahrain|AFC|1240.30",
"Syria|AFC|1279.94","China|AFC|1247.22","Palestine|AFC|1253.75","Kyrgyzstan|AFC|1199.73","Tajikistan|AFC|1213.56","Thailand|AFC|1251.42",
"Indonesia|AFC|1166.50","Vietnam|AFC|1231.29","Kuwait|AFC|1098.64","Lebanon|AFC|1170.30","North Korea|AFC|1151.05","India|AFC|1087.52",
"Turkmenistan|AFC|1078.65","Philippines|AFC|1095.85","Malaysia|AFC|1102.09","Hong Kong|AFC|1035.23","Yemen|AFC|1067.53","Myanmar|AFC|1008.08",
"Singapore|AFC|1058.95","Afghanistan|AFC|968.07","Chinese Taipei|AFC|923.78","Maldives|AFC|935.93","Cambodia|AFC|920.83","Nepal|AFC|914.54",
"Bangladesh|AFC|893.46","Laos|AFC|880.17","Sri Lanka|AFC|885.39","Mongolia|AFC|874.47","Bhutan|AFC|870.81","Guam|AFC|819.54",
"Macau|AFC|858.03","Timor-Leste|AFC|823.16","Pakistan|AFC|839.03","Brunei|AFC|849.56",
// CONCACAF (35)
"Mexico|CONCACAF|1746.04","USA|CONCACAF|1701.62","Canada|CONCACAF|1579.16","Panama|CONCACAF|1476.97","Costa Rica|CONCACAF|1444.85","Jamaica|CONCACAF|1361.97",
"Honduras|CONCACAF|1375.40","Haiti|CONCACAF|1280.91","Curacao|CONCACAF|1304.98","El Salvador|CONCACAF|1212.40","Guatemala|CONCACAF|1245.10","Trinidad and Tobago|CONCACAF|1198.85",
"Suriname|CONCACAF|1138.46","Cuba|CONCACAF|990.46","Nicaragua|CONCACAF|1090.80","Guyana|CONCACAF|1071.38","Dominican Republic|CONCACAF|1096.58","St Kitts and Nevis|CONCACAF|1041.42",
"Antigua and Barbuda|CONCACAF|986.33","Grenada|CONCACAF|967.71","St Vincent and the Grenadines|CONCACAF|974.89","St Lucia|CONCACAF|975.85","Bermuda|CONCACAF|951.28","Puerto Rico|CONCACAF|1032.97",
"Barbados|CONCACAF|934.52","Belize|CONCACAF|900.38","Aruba|CONCACAF|895.74","Cayman Islands|CONCACAF|836.15","Montserrat|CONCACAF|933.34","Dominica|CONCACAF|884.58",
"Bahamas|CONCACAF|771.83","Turks and Caicos|CONCACAF|812.05","US Virgin Islands|CONCACAF|794.75","Anguilla|CONCACAF|736.67","British Virgin Islands|CONCACAF|752.75",
// CONMEBOL (10)
"Argentina|CONMEBOL|1972.17","Brazil|CONMEBOL|1806.51","Colombia|CONMEBOL|1733.25","Uruguay|CONMEBOL|1634.45","Ecuador|CONMEBOL|1587.07","Paraguay|CONMEBOL|1552.30",
"Chile|CONMEBOL|1451.41","Venezuela|CONMEBOL|1466.97","Peru|CONMEBOL|1453.49","Bolivia|CONMEBOL|1322.19",
// OFC (11)
"New Zealand|OFC|1277.02","New Caledonia|OFC|1026.01","Fiji|OFC|1033.44","Solomon Islands|OFC|1035.95","Papua New Guinea|OFC|969.14","Vanuatu|OFC|1005.90",
"Tahiti|OFC|1016.32","Samoa|OFC|876.41","Cook Islands|OFC|880.25","Tonga|OFC|835.64","American Samoa|OFC|871.61"
];
// ---------- Flags (ISO country codes -> emoji; UK home nations use subdivision tags) ----------
const CODES = ("Spain:ES,France:FR,England:gbeng,Portugal:PT,Belgium:BE,Netherlands:NL,Germany:DE,Croatia:HR,Italy:IT,Switzerland:CH,Denmark:DK,Austria:AT,"+
"Norway:NO,Ukraine:UA,Turkey:TR,Poland:PL,Serbia:RS,Hungary:HU,Sweden:SE,Wales:gbwls,Czechia:CZ,Scotland:gbsct,Romania:RO,Slovakia:SK,Greece:GR,Slovenia:SI,"+
"Russia:RU,Ireland:IE,Albania:AL,Bosnia and Herzegovina:BA,Northern Ireland:GB,Finland:FI,Iceland:IS,Georgia:GE,Montenegro:ME,Bulgaria:BG,Israel:IL,"+
"North Macedonia:MK,Kosovo:XK,Belarus:BY,Luxembourg:LU,Armenia:AM,Kazakhstan:KZ,Cyprus:CY,Azerbaijan:AZ,Faroe Islands:FO,Estonia:EE,Latvia:LV,Lithuania:LT,"+
"Moldova:MD,Malta:MT,Andorra:AD,Liechtenstein:LI,Gibraltar:GI,San Marino:SM,"+
"Morocco:MA,Senegal:SN,Egypt:EG,Ivory Coast:CI,Nigeria:NG,Algeria:DZ,Tunisia:TN,Cameroon:CM,Mali:ML,DR Congo:CD,South Africa:ZA,Burkina Faso:BF,Cape Verde:CV,"+
"Ghana:GH,Guinea:GN,Gabon:GA,Angola:AO,Zambia:ZM,Uganda:UG,Benin:BJ,Mozambique:MZ,Equatorial Guinea:GQ,Congo:CG,Libya:LY,Mauritania:MR,Kenya:KE,Madagascar:MG,"+
"Namibia:NA,Tanzania:TZ,Comoros:KM,Zimbabwe:ZW,Niger:NE,Sierra Leone:SL,Gambia:GM,Guinea-Bissau:GW,Togo:TG,Sudan:SD,Malawi:MW,Rwanda:RW,Ethiopia:ET,Botswana:BW,"+
"Burundi:BI,Central African Republic:CF,Liberia:LR,Lesotho:LS,South Sudan:SS,Eswatini:SZ,Chad:TD,Mauritius:MU,Seychelles:SC,Djibouti:DJ,Sao Tome and Principe:ST,"+
"Eritrea:ER,Somalia:SO,"+
"Japan:JP,Iran:IR,South Korea:KR,Australia:AU,Uzbekistan:UZ,Jordan:JO,Saudi Arabia:SA,Qatar:QA,Iraq:IQ,UAE:AE,Oman:OM,Bahrain:BH,Syria:SY,China:CN,Palestine:PS,"+
"Kyrgyzstan:KG,Tajikistan:TJ,Thailand:TH,Indonesia:ID,Vietnam:VN,Kuwait:KW,Lebanon:LB,North Korea:KP,India:IN,Turkmenistan:TM,Philippines:PH,Malaysia:MY,Hong Kong:HK,"+
"Yemen:YE,Myanmar:MM,Singapore:SG,Afghanistan:AF,Chinese Taipei:TW,Maldives:MV,Cambodia:KH,Nepal:NP,Bangladesh:BD,Laos:LA,Sri Lanka:LK,Mongolia:MN,Bhutan:BT,Guam:GU,"+
"Macau:MO,Timor-Leste:TL,Pakistan:PK,Brunei:BN,"+
"Mexico:MX,USA:US,Canada:CA,Panama:PA,Costa Rica:CR,Jamaica:JM,Honduras:HN,Haiti:HT,Curacao:CW,El Salvador:SV,Guatemala:GT,Trinidad and Tobago:TT,Suriname:SR,Cuba:CU,"+
"Nicaragua:NI,Guyana:GY,Dominican Republic:DO,St Kitts and Nevis:KN,Antigua and Barbuda:AG,Grenada:GD,St Vincent and the Grenadines:VC,St Lucia:LC,Bermuda:BM,"+
"Puerto Rico:PR,Barbados:BB,Belize:BZ,Aruba:AW,Cayman Islands:KY,Montserrat:MS,Dominica:DM,Bahamas:BS,Turks and Caicos:TC,US Virgin Islands:VI,Anguilla:AI,"+
"British Virgin Islands:VG,"+
"Argentina:AR,Brazil:BR,Colombia:CO,Uruguay:UY,Ecuador:EC,Paraguay:PY,Chile:CL,Venezuela:VE,Peru:PE,Bolivia:BO,"+
"New Zealand:NZ,New Caledonia:NC,Fiji:FJ,Solomon Islands:SB,Papua New Guinea:PG,Vanuatu:VU,Tahiti:PF,Samoa:WS,Cook Islands:CK,Tonga:TO,American Samoa:AS")
  .split(",").reduce((m,p)=>{const k=p.lastIndexOf(":");m[p.slice(0,k)]=p.slice(k+1);return m;},{});
function flagOf(name){
  const c = CODES[name]; if(!c) return "\u{1F3F3}";
  if(c.length>2) return "\u{1F3F4}"+[...c].map(ch=>String.fromCodePoint(0xE0000+ch.charCodeAt(0))).join("")+"\u{E007F}";
  return [...c].map(ch=>String.fromCodePoint(0x1F1E6+ch.charCodeAt(0)-65)).join("");
}
const BASE = RAW.map(s => { const [name, conf, r] = s.split("|"); return {name, conf, base:+r, flag:flagOf(name)}; });
const N = BASE.length; // should be 211

// ---------- Model constants ----------
const K = 25;          // Elo update strength (FIFA-style "importance")
const HOME_ADV = 60;   // rating points added to the home side if enabled
const SCALE = 600;     // FIFA ranking uses 600 in the win-expectancy formula

// ---------- Helpers ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const $ = id => document.getElementById(id);

function poisson(l, rnd){ const L=Math.exp(-l); let k=0,p=1; do{k++;p*=rnd()}while(p>L); return k-1; }

// Outcome probabilities from a rating gap (home-side minus away-side).
//  lvl = average rating of the two teams: matches between stronger teams are a little less predictable.
//  lo  = rating of the weaker team: when both teams are in the top ~10 the scale is widened so results are much more even.
//  Lopsided matches (big gap) shrink the scale, so upsets get rarer the bigger the mismatch (a little less sharply than before).
// ge = the gap used for scorelines (positive = home side stronger), kept consistent with those adjustments.
function outcomeProbs(dr, lvl, lo){
  const hi = lvl==null ? 0 : Math.max(0, Math.min(1, (lvl-1400)/600));
  const el = lo==null ? 0 : Math.max(0, Math.min(1, (lo-1650)/100));
  const mm = Math.min(1, Math.abs(dr)/700);
  const sc = SCALE*(1+0.30*hi)*(1+0.9*el)/(1+0.38*mm);
  const we = 1/(1+Math.pow(10,-dr/sc));               // expected score (FIFA/Elo-style formula)
  let pd = 0.29*Math.exp(-Math.pow(dr/450,2));        // draws are likeliest between equals
  pd = Math.min(pd, 2*we, 2*(1-we));
  return {we, pw: we-pd/2, pd, pl: 1-we-pd/2, ge: dr*SCALE/sc};
}

// Scoreline for a decisive result. sdr = winner's gap over the loser (negative when the underdog wins):
// favourites can win big, underdogs only ever win narrowly (never by more than 2).
function scoreline(outcome, sdr, rnd){
  if(outcome==='D'){
    for(let i=0;i<60;i++){ const a=poisson(1.05,rnd), b=poisson(1.05,rnd); if(a===b) return [a,a]; }
    return [1,1];
  }
  if(sdr>=0){
    const s = Math.min(sdr,900)/900;
    const lw = 1.45+1.5*s, ll = Math.max(0.12, 0.95-0.85*s);
    for(let i=0;i<60;i++){ const w=poisson(lw,rnd), l=poisson(ll,rnd); if(w>l) return [w,l]; }
    return [1,0];
  }
  const u = Math.min(-sdr,900)/900;
  const lw = 1.15-0.25*u, ll = 0.55-0.25*u;
  for(let i=0;i<60;i++){ const w=poisson(lw,rnd), l=poisson(ll,rnd); if(w>l && w-l<=2) return [w,l]; }
  return [1,0];
}

// ---------- Schedule: circle method on 212 slots (211 teams + 1 bye slot) ----------
function buildSchedule(double){
  let arr = [...Array(N).keys(), -1];
  const M = arr.length, rounds = [];
  for(let r=0;r<N;r++){
    const pairs=[]; let bye=-1;
    for(let i=0;i<M/2;i++){
      const a=arr[i], b=arr[M-1-i];
      if(a<0||b<0){ bye = a<0 ? b : a; continue; }
      pairs.push(((r+i)%2) ? [a,b] : [b,a]);
    }
    rounds.push({pairs,bye});
    arr = [arr[0], arr[M-1], ...arr.slice(1,M-1)];
  }
  if(double) return rounds.concat(rounds.map(rd=>({pairs:rd.pairs.map(([h,a])=>[a,h]), bye:rd.bye})));
  return rounds;
}

