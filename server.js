// Team game show: zero-dependency server (HTTP + Server-Sent Events). The server owns the game state, timers and buzzer order.
const http=require('http'),fs=require('fs'),cr=require('crypto'),path=require('path');
const PORT=process.env.PORT||3000,MIN=+process.env.MIN_PLAYERS||3,PUB=n=>fs.readFileSync(path.join(__dirname,'public',n));
const N=s=>(s||'').replace(/[ً-ٟـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/\s+/g,' ').trim().replace(/^(نادي |ال)/,'').replace(/ ال/g,' ');
const G=s=>s.split(',').map(x=>x.split('|').map(N));
const R1=[{lv:'سهل',q:'اذكر دولة عربية تقع في قارة آسيا',g:G('السعودية,الإمارات,قطر,الكويت,البحرين,عمان,اليمن,العراق,سوريا,لبنان,الأردن,فلسطين')},
{lv:'سهل',q:'اذكر مدينة سعودية',g:G('الرياض,جدة,مكة|مكة المكرمة,المدينة|المدينة المنورة,الدمام,الخبر,الطائف,تبوك,أبها,بريدة,حائل,جازان,نجران,الجبيل,ينبع,الهفوف|الأحساء,الظهران,عرعر,سكاكا,الباحة,خميس مشيط,القطيف,الخرج,الدرعية,العلا')},
{lv:'متوسط',q:'اذكر شهراً من أشهر السنة الهجرية',g:G('محرم,صفر,ربيع الأول,ربيع الآخر|ربيع الثاني,جمادى الأولى,جمادى الآخرة|جمادى الثانية,رجب,شعبان,رمضان,شوال,ذو القعدة,ذو الحجة')}];
const T1=[{lv:'فاصل',q:'اذكر كوكباً في المجموعة الشمسية',g:G('عطارد,الزهرة,الأرض,المريخ,المشتري,زحل,أورانوس,نبتون')},
{lv:'فاصل',q:'اذكر عاصمة دولة عربية',g:G('الرياض,القاهرة,بغداد,دمشق,بيروت,عمان,الكويت,المنامة,الدوحة,أبوظبي,مسقط,صنعاء,الرباط,الجزائر,تونس,طرابلس,الخرطوم,نواكشوط,مقديشو,جيبوتي,موروني')}];
const R2=[{lv:'سهل',q:'اذكر نادياً سعودياً لكرة القدم',g:G('الهلال,النصر,الاتحاد,الأهلي,الشباب,الاتفاق,الفتح,الرائد,الفيحاء,الخليج,الحزم,الأخدود,ضمك,الرياض,التعاون,العروبة,الوحدة,أبها,الطائي,الباطن,النهضة,الفيصلي,الخلود,العدالة')},
{lv:'متوسط',q:'اذكر دولة عربية',g:G('السعودية,الإمارات,قطر,الكويت,البحرين,عمان,اليمن,العراق,سوريا,لبنان,الأردن,فلسطين,مصر,السودان,ليبيا,تونس,الجزائر,المغرب,موريتانيا,الصومال,جيبوتي,جزر القمر|القمر')},
{lv:'سهل',q:'اذكر فاكهة',g:G('تفاح,موز,برتقال,عنب,فراولة,مانجو|مانجا,بطيخ,شمام,خوخ,كمثرى,رمان,تين,تمر|بلح,ليمون,جوافة,أناناس,كيوي,توت,كرز,مشمش,يوسفي|مندرين,بابايا,جريب فروت,نكترين,دراق')}];
const RB=a=>`<div class=rb>${a}</div>`;
const PZ=[{k:'وقت',h:RB('⏰ <span>¼</span>'),a:'ربع ساعة'},{k:'عنوان كتاب',h:RB('<span>١٠٠٠</span>🌙<span>+ ١</span>🌙'),a:'ألف ليلة وليلة'},
{k:'حالة',h:RB('<div class=stk><span>رأس</span><span>عقب</span></div>'),a:'رأساً على عقب'},{k:'مثل شائع',h:RB('<span class=sea>بحر<small>قطرة</small></span>'),a:'قطرة في بحر'},
{k:'حكمة',h:RB('<span>صبر</span>🔑<span>فرج</span>'),a:'الصبر مفتاح الفرج'},{k:'فاصل',h:RB('⏰ = <span>ذهب</span>'),a:'الوقت من ذهب'},
{k:'فاصل',h:RB('👁 <span>ب</span> 👁'),a:'العين بالعين'},{k:'فاصل',h:RB('<span>½</span><span>حقيقة</span>'),a:'نصف الحقيقة'}];
const rooms=new Map(),rid=n=>cr.randomBytes(n).toString('hex'),now=()=>Date.now();
const mkcode=()=>{let c;do{c=Array.from({length:4},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ'[cr.randomInt(24)]).join('')}while(rooms.has(c));return c};
const team=(r,t)=>[...r.players.values()].filter(p=>p.team===t);
const AR=n=>String(n).replace(/\d/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
const T0=()=>({run:0,dl:0,left:30000});
// ---- timers (server-authoritative)
function arm(r){const T=r.g.T;clearTimeout(r.tm);if(T.run)r.tm=setTimeout(()=>expire(r),Math.max(0,T.dl-now())+30)}
function tstart(r){r.g.T={run:1,dl:now()+30000,left:30000};arm(r)}
function tpause(r){const T=r.g&&r.g.T;if(T&&T.run){T.left=Math.max(0,T.dl-now());T.run=0;clearTimeout(r.tm)}}
function tresume(r){const T=r.g.T;if(!T.run&&T.left>0){T.dl=now()+T.left;T.run=1;arm(r)}}
function expire(r){const g=r.g;if(!g||!g.T.run||g.T.dl-now()>60)return;g.T.run=0;g.T.left=0;
 if(r.ri===1&&g.ph==='ans')g.exp=1;else if(r.ri===2&&g.ph==='run'){g.ph='end';g.who=null}push(r)}
// ---- helpers
const q1=g=>g.i<3?R1[g.i]:T1[(g.i-3)%2];
const mp=r=>[0,1].map(t=>r.sel[1][t][r.g.i]);
const okN=g=>g.ans.filter(x=>x.s==='ok').length;
const pzOf=g=>PZ[g.p];
function evalR1(r){const g=r.g,q=q1(g);return[0,1].map(t=>{const keys=[];const it=r.sel[0][t].map(pid=>{const text=g.sub[pid]||'',n=N(text),gi=q.g.findIndex(x=>x.includes(n));let ok=!!text&&gi>=0;if(g.ov[pid]!==undefined)ok=g.ov[pid];const key=gi>=0?'g'+gi:'t'+n,dup=!!text&&keys.includes(key);if(text)keys.push(key);
 return{pid,name:(r.players.get(pid)||{}).name||'؟',text,ok,dup}});return{it,pass:it.length===3&&it.every(x=>x.text&&x.ok&&!x.dup)}})}
function endRound(r,ri,w,txt){if(r.res[ri])return;r.res[ri]={w,txt};r.tot[w]+=r.pts[ri];r.ph='rres';clearTimeout(r.tm)}
function fill(r){for(const ri of[0,1])for(const t of[0,1]){const s=r.sel[ri][t].filter(id=>r.players.has(id));for(const p of team(r,t)){if(s.length>=3)break;if(!s.includes(p.id))s.push(p.id)}r.sel[ri][t]=s}}
function newG(r){const ri=r.ri;if(ri===0)r.g={kind:1,i:0,wins:[0,0],ph:'in',sub:{},ov:{},show:0,out:null,T:T0()};
 else if(ri===1)r.g={kind:2,i:0,ph:'bid',bid:0,bt:null,w:[0,0],ans:[],exp:0,at:null,sx:0,T:T0()};
 else r.g={kind:3,i:0,p:0,sc:[0,0],ph:'ready',tried:[0,0],bz:null,by:null,bm:0,mode:'reg',who:null,T:T0()}}
function resetPz(r,p){const g=r.g;Object.assign(g,{p,ph:'ready',tried:[0,0],bz:null,by:null,bm:0,who:null,T:T0()});clearTimeout(r.tm)}
// ---- shared actions (phone or host)
function doAns(r,pid,text){const g=r.g;if(r.ph!=='play'||!g||g.kind!==1||g.ph!=='in')return'ليس وقت الإجابة';if(![...r.sel[0][0],...r.sel[0][1]].includes(pid))return'لست من المشاركين في هذه الجولة';
 text=String(text||'').trim().slice(0,40);if(!text)return'اكتب إجابة';if(g.sub[pid])return'تم إرسال إجابتك مسبقاً';g.sub[pid]=text;
 if([...r.sel[0][0],...r.sel[0][1]].every(id=>g.sub[id]))g.ph='rev'}
function doBid(r,t,v){const g=r.g;if(r.ph!=='play'||!g||g.kind!==2||g.ph!=='bid')return'ليست مرحلة المزايدة';v=parseInt(v);if(!(v>g.bid&&v<=30))return'المزايدة يجب أن تكون أعلى من '+AR(g.bid)+' وحتى ٣٠';if(g.bt===t)return'الدور على اللاعب الآخر';g.bid=v;g.bt=t}
function doWd(r,t){const g=r.g;if(r.ph!=='play'||!g||g.kind!==2||g.ph!=='bid')return'ليست مرحلة المزايدة';if(g.bt==null)return'لم تبدأ المزايدة بعد';if(g.bt===t)return'أنت صاحب أعلى مزايدة';g.at=g.bt;g.ph='ans'}
function chk2(r){const g=r.g;if(okN(g)>=g.bid&&!g.exp){tpause(r);g.exp=1}}
function doAdd2(r,text){const g=r.g;if(r.ph!=='play'||!g||g.kind!==2||g.ph!=='ans')return'ليست مرحلة الإجابة';if(!g.T.run||g.exp)return'الوقت غير جارٍ';text=String(text||'').trim().slice(0,40);if(!text)return'اكتب إجابة';
 const n=N(text),gi=R2[g.i].g.findIndex(x=>x.includes(n)),d=g.ans.some(x=>x.n===n||(gi>=0&&x.g===gi));g.ans.push({a:text,n,g:gi,s:d?'d':gi>=0?'ok':'p'});chk2(r)}
function doBuzz(r,t,by,manual){const g=r.g;if(r.ph!=='play'||!g||g.kind!==3||g.ph!=='run'||!g.T.run)return'ليس وقت الجرس';if(g.tried[t])return'فريقكم استخدم فرصته';tpause(r);g.ph='buzz';g.bz=t;g.by=by;g.bm=manual?1:0;g.tried[t]=1}
// ---- views (role-filtered)
function view(r,role,pid){const g=r.g,host=role==='host',scr=role==='screen',me=r.players.get(pid);
 const o={c:r.code,names:r.names,ph:r.ph,ri:r.ri,pts:r.pts,tot:r.tot,res:r.res,fw:r.fw,now:now(),min:MIN,sel:r.sel,
  players:[...r.players.values()].map(p=>({id:p.id,name:p.name,team:p.team,on:p.on,manual:!p.tok?1:0}))};
 if(role==='player')o.me=me?{id:me.id,name:me.name,team:me.team}:null;
 if(r.ph!=='play'||!g)return o;const v={kind:g.kind,i:g.i,ph:g.ph,T:g.T};o.g=v;
 if(g.kind===1){const q=q1(g);Object.assign(v,{q:q.q,lv:q.lv,wins:g.wins,show:g.show,subs:Object.keys(g.sub)});
  if(role==='player'){v.mine=g.sub[pid]||null;if(g.ph==='res'){const e=evalR1(r);for(const t of[0,1])for(const x of e[t].it)if(x.pid===pid)v.verdict={ok:x.ok&&!x.dup,dup:x.dup}}}
  if(host&&(g.ph==='rev'||g.ph==='res')||scr&&(g.show||g.ph==='res')&&(g.ph==='rev'||g.ph==='res')){v.eval=evalR1(r);if(!host)v.eval.forEach(t=>t.it.forEach(x=>{delete x.pid}))}}
 if(g.kind===2){Object.assign(v,{q:R2[g.i].q,lv:R2[g.i].lv,bid:g.bid,bt:g.bt,w:g.w,at:g.at,exp:g.exp,sx:g.sx,ans:g.ans.map(x=>({a:x.a,s:x.s})),mp:mp(r).map(id=>{const p=r.players.get(id);return p?{id:p.id,name:p.name,manual:!p.tok?1:0}:null})})}
 if(g.kind===3){const show=['run','buzz','end'].includes(g.ph);Object.assign(v,{p:g.p,mode:g.mode,sc:g.sc,tried:g.tried,bz:g.bz,by:g.by,bm:g.bm,who:g.who,puz:show?pzOf(g).h:null});if(host&&show||g.ph==='end')v.answer=pzOf(g).a}
 return o}
function send(c,r){try{c.res.write('data:'+JSON.stringify(view(r,c.role,c.pid))+'\n\n')}catch(e){}}
function push(r){r.t0=now();for(const c of r.clients)send(c,r)}
// ---- host actions
function snap(r){return JSON.stringify({ph:r.ph,ri:r.ri,tot:r.tot,res:r.res,fw:r.fw,sel:r.sel,g:r.g})}
function host(r,b){const a=b.a,g=r.g;
 if(a==='undo'){const s=r.hist.pop();if(!s)return'لا يوجد ما يمكن التراجع عنه';clearTimeout(r.tm);const o=JSON.parse(s);Object.assign(r,{ph:o.ph,ri:o.ri,tot:o.tot,res:o.res,fw:o.fw,sel:o.sel,g:o.g});if(r.g&&r.g.T&&r.g.T.run){r.g.T.left=Math.max(0,r.g.T.dl-now());r.g.T.run=0}return}
 if(a==='reset'){r.hist.push(snap(r));clearTimeout(r.tm);Object.assign(r,{ph:'lobby',ri:0,tot:[0,0],res:[null,null,null],fw:null,g:null,sel:[{0:[],1:[]},{0:[],1:[]}]});return}
 const before=snap(r);let e=hostAct(r,b,a,g);if(!e){r.hist.push(before);if(r.hist.length>40)r.hist.shift()}return e}
function hostAct(r,b,a,g){const L=r.ph;
 if(L==='lobby'){
  if(a==='names'){r.names=[0,1].map(t=>String(b['n'+t]||'').trim().slice(0,20)||r.names[t]);return}
  if(a==='add'){const name=String(b.name||'').trim().slice(0,20),t=b.team;if(!name)return'اكتب اسم اللاعب';if(t!==0&&t!==1)return'اختر الفريق';if(team(r,t).length>=9)return'الفريق ممتلئ (٩ لاعبين)';r.players.set(rid(4),{id:null,name,team:t,tok:null,on:false});const id=[...r.players.keys()].pop();r.players.get(id).id=id;return}
  if(a==='rename'){const p=r.players.get(b.pid),n=String(b.name||'').trim().slice(0,20);if(p&&n)p.name=n;return}
  if(a==='move'){const p=r.players.get(b.pid);if(!p)return;if(team(r,b.team).length>=9)return'الفريق ممتلئ';p.team=b.team;return}
  if(a==='kick'){r.players.delete(b.pid);return}
  if(a==='start'){const n0=team(r,0).length,n1=team(r,1).length;if(n0<MIN||n1<MIN)return`كل فريق يحتاج ${AR(MIN)} لاعبين على الأقل`;if(n0!==n1)return'الفريقان يجب أن يتساويا في العدد';r.ph='intro';r.ri=0;fill(r);return}}
 if(L==='intro'){
  if(a==='pick'){const s=r.sel[r.ri][b.team];if(!s)return;const i=s.indexOf(b.pid);if(i>=0)s.splice(i,1);else if(s.length<3)s.push(b.pid);else return'اخترتم ٣ لاعبين بالفعل';return}
  if(a==='go'){if(r.ri<2&&(r.sel[r.ri][0].length!==3||r.sel[r.ri][1].length!==3))return'اختر ٣ لاعبين من كل فريق';newG(r);r.ph='play';return}
  if(a==='lobby'&&r.ri===0&&!r.res[0]){r.ph='lobby';return}}
 if(L==='rres'&&a==='nx'){if(r.ri<2){r.ri++;r.ph='intro';fill(r)}else if(r.tot[0]===r.tot[1]){r.ph='play';r.g={kind:3,i:7,p:7,sc:[0,0],ph:'ready',tried:[0,0],bz:null,by:null,bm:0,mode:'final',who:null,T:T0()}}else r.ph='final';return}
 if(L!=='play'||!g)return'هذا الإجراء غير متاح الآن';
 if(a==='pause'&&g.T.run){tpause(r);return}if(a==='resume'){tresume(r);return}
 if(g.kind===1){
  if(a==='ans')return doAns(r,b.pid,b.text);
  if(a==='force'&&g.ph==='in'){g.ph='rev';return}
  if(a==='show'&&g.ph==='rev'){g.show=1;return}
  if(a==='ov'&&(g.ph==='rev')){const e=evalR1(r);for(const t of[0,1])for(const x of e[t].it)if(x.pid===b.pid)g.ov[b.pid]=!x.ok;return}
  if(a==='fin'&&g.ph==='rev'&&g.show){const p=evalR1(r).map(x=>x.pass);if(g.i<3)p.forEach((x,t)=>{if(x)g.wins[t]++});g.out=p;g.ph='res';return}
  if(a==='next'&&g.ph==='res'){const p=g.out;let w=null;if(g.i===2&&g.wins[0]!==g.wins[1])w=g.wins[0]>g.wins[1]?0:1;if(g.i>2&&p[0]!==p[1])w=p[0]?0:1;if(w!==null)return void endRound(r,0,w,AR(g.wins[0])+' - '+AR(g.wins[1])+(g.i>2?' (تحدٍّ فاصل)':''));Object.assign(g,{i:g.i+1,ph:'in',sub:{},ov:{},show:0,out:null});return}}
 if(g.kind===2){
  if(a==='bid')return doBid(r,b.team,b.v);if(a==='wd')return doWd(r,b.team);
  if(a==='go2'&&g.ph==='ans'&&!g.exp&&!g.T.run&&g.T.left===30000){tstart(r);return}
  if(a==='add2')return doAdd2(r,b.text);
  if(a==='pv'&&g.ans[b.i]&&g.ans[b.i].s==='p'){g.ans[b.i].s=b.ok?'ok':'x';chk2(r);return}
  if(a==='fail'&&g.ph==='ans'){tpause(r);g.exp=1;return}
  if(a==='fin'&&g.ph==='ans'){if(!g.exp)return'انتظروا انتهاء الوقت أو اضغط إنهاء المحاولة';const s=okN(g)>=g.bid,w=s?g.at:1-g.at;g.w[w]++;g.sx=s;g.ph='done';return}
  if(a==='next'&&g.ph==='done'){if(g.i<2){Object.assign(g,{i:g.i+1,ph:'bid',bid:0,bt:null,ans:[],exp:0,at:null,sx:0,T:T0()});return}return void endRound(r,1,g.w[0]>g.w[1]?0:1,AR(g.w[0])+' - '+AR(g.w[1])+' مواجهات')}}
 if(g.kind===3){
  if(a==='show'&&g.ph==='ready'){g.ph='run';tstart(r);return}
  if(a==='hbuzz'){const p=r.players.get(b.pid);return doBuzz(r,b.team,p?p.name:null,true)}
  if(a==='ok'&&g.ph==='buzz'){g.sc[g.bz]++;g.who=g.bz;g.ph='end';return}
  if(a==='no'&&g.ph==='buzz'){const o=1-g.bz;if(g.tried[o]){g.ph='end';g.who=null}else{g.tried[o]=1;g.bz=o;g.by=null;g.bm=0}return}
  if(a==='skip'&&(g.ph==='run'||g.ph==='buzz')){tpause(r);g.ph='end';g.who=null;return}
  if(a==='w0'||a==='w1'){if(g.mode==='final'&&g.ph==='end'){r.fw=+a[1];r.ph='final'}return}
  if(a==='next'&&g.ph==='end'){const cyc=p=>5+((p-5+1)%3);
   if(g.mode==='final'){if(g.who!==null){r.fw=g.who;r.ph='final';return}return void resetPz(r,cyc(g.p))}
   if(g.mode==='reg'){if(g.i<4){g.i++;return void resetPz(r,g.i)}if(g.sc[0]!==g.sc[1])return void endRound(r,2,g.sc[0]>g.sc[1]?0:1,AR(g.sc[0])+' - '+AR(g.sc[1])+' ألغاز');g.mode='tb';g.i=5;return void resetPz(r,5)}
   if(g.who!==null)return void endRound(r,2,g.who,AR(g.sc[0])+' - '+AR(g.sc[1])+' (لغز فاصل)');return void resetPz(r,cyc(g.p))}}
 return'هذا الإجراء غير متاح الآن'}
// ---- phone actions
function play(r,pl,b){const g=r.g,a=b.a;
 if(a==='ans')return doAns(r,pl.id,b.text);
 if(r.ph==='play'&&g&&g.kind===2){const m=mp(r);
  if(a==='bid'||a==='wd'){if(m[pl.team]!==pl.id)return'لست لاعب هذه المواجهة';return a==='bid'?doBid(r,pl.team,b.v):doWd(r,pl.team)}
  if(a==='add2'){if(g.at==null||m[g.at]!==pl.id)return'ليس دورك';return doAdd2(r,b.text)}}
 if(a==='buzz')return doBuzz(r,pl.team,pl.name,false);
 return'إجراء غير مسموح'}
// ---- HTTP
const json=(res,c,o)=>{res.writeHead(c,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(o))};
const html=(res,n)=>{res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(PUB(n))};
const body=req=>new Promise(ok=>{let s='';req.on('data',d=>{s+=d;if(s.length>8e3)req.destroy()});req.on('end',()=>{try{ok(JSON.parse(s||'{}'))}catch(e){ok({})}})});
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,'http://x'),p=u.pathname,q=u.searchParams;
 if(req.method==='GET'){
  if(p==='/common.css'){res.writeHead(200,{'content-type':'text/css; charset=utf-8'});return res.end(PUB('common.css'))}
  if(p==='/qrcode.js'){res.writeHead(200,{'content-type':'application/javascript'});return res.end(PUB('qrcode.js'))}
  if(p==='/'||p.startsWith('/s/'))return html(res,'app.html');if(p.startsWith('/j/'))return html(res,'play.html');
  if(p==='/health')return json(res,200,{ok:1});
  if(p==='/api/info'){const r=rooms.get(q.get('c'));return r?json(res,200,{names:r.names,ph:r.ph,n:[team(r,0).length,team(r,1).length],free:[...r.players.values()].filter(x=>!x.tok).map(x=>({id:x.id,name:x.name,team:x.team}))}):json(res,404,{e:'الجلسة غير موجودة'})}
  if(p==='/api/events'){const r=rooms.get(q.get('c'));if(!r)return json(res,404,{e:'الجلسة غير موجودة'});const role=q.get('role'),pid=q.get('pid')||'';
   if(role==='host'&&q.get('k')!==r.key)return json(res,403,{e:'غير مصرّح'});
   if(role==='player'){const pl=r.players.get(pid);if(!pl||!pl.tok||pl.tok!==q.get('tok'))return json(res,403,{e:'غير مصرّح'})}
   res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache','x-accel-buffering':'no'});res.write('retry: 1500\n\n');
   const c={res,role,pid};r.clients.add(c);if(role==='player')r.players.get(pid).on=true;send(c,r);if(role==='player')push(r);
   const ka=setInterval(()=>res.write(':\n\n'),15000);
   req.on('close',()=>{clearInterval(ka);r.clients.delete(c);if(role==='player'){const pl=r.players.get(pid);if(pl&&![...r.clients].some(x=>x.pid===pid)){pl.on=false;push(r)}}});return}
  return json(res,404,{e:'غير موجود'})}
 if(req.method==='POST'){const b=await body(req);
  if(p==='/api/create'){const r={code:mkcode(),key:rid(12),names:['الفريق الأول','الفريق الثاني'],players:new Map(),clients:new Set(),ph:'lobby',ri:0,tot:[0,0],res:[null,null,null],pts:[10,20,40],fw:null,g:null,sel:[{0:[],1:[]},{0:[],1:[]}],hist:[],tm:null,t0:now()};rooms.set(r.code,r);return json(res,200,{c:r.code,k:r.key})}
  const r=rooms.get(b.c);if(!r)return json(res,404,{e:'الجلسة غير موجودة'});
  if(p==='/api/join'){if(b.claim){const x=r.players.get(b.claim);if(!x||x.tok)return json(res,200,{e:'هذا الاسم مرتبط بجوال آخر'});x.tok=rid(8);push(r);return json(res,200,{pid:x.id,tok:x.tok})}
   const name=String(b.name||'').trim().slice(0,20);if(!name)return json(res,200,{e:'اكتب اسمك'});if(b.team!==0&&b.team!==1)return json(res,200,{e:'اختر فريقاً'});
   if(r.ph!=='lobby')return json(res,200,{e:'بدأت اللعبة بالفعل'});if(team(r,b.team).length>=9)return json(res,200,{e:'الفريق ممتلئ'});
   const id=rid(4),pl={id,name,team:b.team,tok:rid(8),on:false};r.players.set(id,pl);push(r);return json(res,200,{pid:id,tok:pl.tok})}
  if(p==='/api/play'){const pl=r.players.get(b.pid);if(!pl||!pl.tok||pl.tok!==b.tok)return json(res,403,{e:'غير مصرّح'});const e=play(r,pl,b);push(r);return json(res,200,e?{e}:{ok:1})}
  if(p==='/api/host'){if(b.k!==r.key)return json(res,403,{e:'غير مصرّح'});const e=host(r,b);push(r);return json(res,200,e?{e}:{ok:1})}}
 json(res,404,{e:'غير موجود'})}catch(e){try{json(res,500,{e:'خطأ في الخادم'})}catch(_){}}});
if(require.main===module){server.listen(PORT,()=>console.log('listening on '+PORT));setInterval(()=>{for(const[c,r]of rooms)if(now()-r.t0>12*36e5)rooms.delete(c)},36e5).unref()}
module.exports=server;
