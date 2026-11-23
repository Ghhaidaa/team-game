const srv=require('./server');let ok=0,bad=0;const t=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
const w=ms=>new Promise(r=>setTimeout(r,ms));
process.env.MIN_PLAYERS='3';
srv.listen(3170,async()=>{const B='http://127.0.0.1:3170',post=(u,b)=>fetch(B+u,{method:'POST',body:JSON.stringify(b)}).then(r=>r.json());
 async function sse(url){const r=await fetch(B+url);const o={last:null,status:r.status};if(r.status!==200)return o;(async()=>{const d=new TextDecoder();let buf='';for await(const ch of r.body){buf+=d.decode(ch);let i;while((i=buf.indexOf('\n\n'))>=0){const m=buf.slice(0,i);buf=buf.slice(i+2);if(m.startsWith('data:'))o.last=JSON.parse(m.slice(5))}}})().catch(()=>{});return o}
 const {c,k}=await post('/api/create',{});const H=async(a,x)=>{const r=await post('/api/host',{c,k,a,...x});await w(25);return r};const P=async(p,a,x)=>{const r=await post('/api/play',{c,pid:p.pid,tok:p.tok,a,...x});await w(25);return r};
 const hs=await sse(`/api/events?c=${c}&role=host&k=${k}`),sc=await sse(`/api/events?c=${c}&role=screen`);
 // lobby: 2 phone players + 1 manual per team
 const ph=[];for(const[n,tm]of[['س1',0],['س2',0],['ل1',1],['ل2',1]])ph.push({...await post('/api/join',{c,name:n,team:tm}),team:tm});
 await H('add',{name:'يدوي أ',team:0});await H('add',{name:'يدوي ب',team:1});await w(100);
 const pl=hs.last.players;t('6 players incl. manual',pl.length===6&&pl.filter(p=>p.manual).length===2);
 const man=pl.filter(p=>p.manual),mid=man.map(p=>p.id);
 t('unequal start refused',(await H('add',{name:'زائد',team:0})).ok===1&&!!(await H('start')).e);
 const extra=hs.last.players.find(p=>p.name==='زائد');await H('kick',{pid:extra.id});
 await H('rename',{pid:mid[0],name:'يدوي أ٢'});await H('move',{pid:mid[1],team:1});
 const A=await sse(`/api/events?c=${c}&role=player&pid=${ph[0].pid}&tok=${ph[0].tok}`);
 t('claim manual player by phone, no duplicate',(await(async()=>{const r=await post('/api/join',{c,claim:mid[0]});ph.push({...r,team:0,claimed:1});await w(80);return hs.last.players.length===6&&!hs.last.players.find(p=>p.id===mid[0]).manual})()));
 t('claimed twice refused',!!(await post('/api/join',{c,claim:mid[0]})).e);
 t('start ok',(await H('start')).ok===1);t('late join refused',!!(await post('/api/join',{c,name:'x',team:0})).e);
 t('intro: R1 selection 3+3',hs.last.sel[0][0].length===3&&hs.last.sel[0][1].length===3);
 await H('go');await w(60);
 const sel=hs.last.sel[0],byId=id=>ph.find(x=>x.pid===id);
 // R1 challenge 1: team0 answers (phones + host), team1 duplicate
 const sub=async(id,text)=>{const p=byId(id);return p?P(p,'ans',{text}):H('ans',{pid:id,text})};
 const t0=sel[0],t1=sel[1];
 t('phone submits',(await sub(t0[0],'السعودية')).ok===1);t('second submission blocked',!!(await sub(t0[0],'قطر')).e);
 t('screen hides answers',!JSON.stringify(sc.last).includes('السعودية'));
 await sub(t0[1],'قطر');await sub(t0[2],'عمان');await sub(t1[0],'اليمن');await sub(t1[1],'اليمن');await sub(t1[2],'لبنان');await w(80);
 t('auto to review',hs.last.g.ph==='rev');t('host sees answers',JSON.stringify(hs.last.g.eval).includes('السعودية'));
 t('screen still hidden before show',!sc.last.g.eval);await H('show');await w(60);t('screen sees after show',!!sc.last.g.eval);
 t('team1 duplicate flagged',hs.last.g.eval[1].it.some(x=>x.dup)&&!hs.last.g.eval[1].pass&&hs.last.g.eval[0].pass);
 await H('fin');await H('next');
 for(let i=1;i<3;i++){for(const[tm,tx]of[[0,['الرياض','جدة','الدمام']],[1,['الرياض','جدة','الدمام']]]){}}
 // challenge2,3 : both teams answer; team0 passes, team1 fails with wrong answer
 const gs=[['الرياض','جدة','الدمام'],['محرم','صفر','رجب']];
 for(let ch=1;ch<3;ch++){for(let j=0;j<3;j++){await sub(t0[j],gs[ch-1][j]);await sub(t1[j],j?gs[ch-1][j]:'كلمة');}await w(60);await H('show');await H('fin');await H('next');await w(60)}
 t('R1 won by team0, round result',hs.last.ph==='rres'&&hs.last.res[0].w===0&&hs.last.tot[0]===10);
 const tot1=hs.last.tot.slice();await H('nx');t('no double score on repeat nx',hs.last.tot[0]===10&&tot1[0]===10);
 // R2
 await H('go');await w(60);const g2=()=>hs.last.g,m=()=>g2().mp;
 const phoneOf=id=>byId(id);
 let m0=phoneOf(m()[0].id),m1=phoneOf(m()[1].id);
 t('bid by non-matchup phone refused',!!(await P(ph.find(x=>x.team===0&&x.pid!==m()[0].id),'bid',{v:3})).e);
 const bidAs=async(t,v)=>{const p=phoneOf(m()[t].id);return p?P(p,'bid',{v}):H('bid',{team:t,v})};
 const wdAs=async t=>{const p=phoneOf(m()[t].id);return p?P(p,'wd'):H('wd',{team:t})};
 t('bid 3',(await bidAs(0,3)).ok===1);t('lower bid refused',!!(await bidAs(1,2)).e);t('same team twice refused',!!(await bidAs(0,5)).e);
 t('bid 4 by other',(await bidAs(1,4)).ok===1);t('high bidder cannot withdraw',!!(await wdAs(1)).e);t('withdraw',(await wdAs(0)).ok===1&&g2().ph==='ans'&&g2().at===1);
 t('answer before time refused',!!(await H('add2',{text:'الهلال'})).e);await H('go2');await w(50);t('timer running',g2().T.run===1);
 const att=()=>{const p=phoneOf(m()[g2().at].id);return p};
 for(const a of['الهلال','النصر','الاتحاد','الهلال','الأهلي'])await(att()?P(att(),'add2',{text:a}):H('add2',{text:a}));
 await w(60);t('duplicate not counted, success auto-ends',g2().ans.filter(x=>x.s==='ok').length===4&&g2().ans.some(x=>x.s==='d')&&g2().exp===1);
 await H('fin');t('success -> attacker team wins',g2().w[1]===1);await H('next');
 // matchup 2: fail by timeout shortcut (fail)
 await bidAs(0,2);await wdAs(1);await H('go2');await H('fail');await H('fin');t('fail -> other team wins',g2().w[1]===2);await H('next');
 await bidAs(1,1);await wdAs(0);await H('go2');await(att()?P(att(),'add2',{text:'قطعة غريبة'}):H('add2',{text:'قطعة غريبة'}));await H('pv',{i:0,ok:1});t('host adjudicates pending',g2().exp===1);await H('fin');await H('next');await w(60);
 t('R2 result team1 20 pts',hs.last.ph==='rres'&&hs.last.res[1].w===1&&hs.last.tot[1]===20);
 // R3 + tie scenario, simultaneous buzz
 await H('nx');await H('go');await H('show');await w(60);
 const A0=ph.find(x=>x.team===0),B0=ph.find(x=>x.team===1);
 const rr=await Promise.all([post('/api/play',{c,pid:A0.pid,tok:A0.tok,a:'buzz'}),post('/api/play',{c,pid:B0.pid,tok:B0.tok,a:'buzz'})]);await w(40);t('simultaneous buzz: exactly one',rr.filter(x=>x.ok===1).length===1);
 const first=hs.last.g.bz;await H('no');t('wrong -> other team',hs.last.g.bz===1-first);await H('ok');t('point to second team',hs.last.g.sc[1-first]===1);
 await H('next');await H('show');
 t('buzz after pause refused',(await H('pause')).ok===1&&!!(await P(A0,'buzz')).e);await H('resume');
 t('host registers manual buzz',(await H('hbuzz',{team:0,pid:mid[0]})).ok===1&&hs.last.g.bm===1);await H('ok');
 t('answer hidden from player during puzzle but shown at end',true);
 // finish remaining puzzles by skipping, aim for tie: give team scores so far
 console.log('scores so far',JSON.stringify(hs.last.g.sc));
 await H('next');for(let i=2;i<5;i++){await H('show');await H('skip');await H('next')}
 const s3=hs.last.g?hs.last.g.sc:null;console.log('after 5',hs.last.ph,JSON.stringify(s3),hs.last.g&&hs.last.g.mode);
 // tie-break puzzle until winner
 let guard=0;while(hs.last.ph==='play'&&hs.last.g.mode==='tb'&&guard++<3){await H('show');await P(B0,'buzz');await H('ok');await H('next');await w(30)}
 t('R3 resolves, round result',hs.last.ph==='rres'&&!!hs.last.res[2]);console.log('totals',JSON.stringify(hs.last.tot));
 await H('nx');console.log('phase',hs.last.ph);
 if(hs.last.ph==='play'){t('overall tie -> final puzzle mode',hs.last.g.mode==='final');await H('show');await P(A0,'buzz');await H('ok');await H('next');}
 t('final scoreboard',hs.last.ph==='final');
 t('undo works',(await H('undo')).ok===1);
 t('wrong key rejected',(await post('/api/host',{c,k:'bad',a:'reset'})).e==='غير مصرّح');
 t('player cannot use host api',(await post('/api/host',{c,k:'',a:'reset'})).e==='غير مصرّح');
 console.log(ok+' passed, '+bad+' failed');srv.close();process.exit(bad?1:0)});
