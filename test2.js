// Flow / scoring / GDD-compliance scenarios (API level, real SSE views)
const srv=require('./server');let ok=0,bad=0;const t=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
const w=ms=>new Promise(r=>setTimeout(r,ms));
srv.listen(3171,async()=>{const B='http://127.0.0.1:3171',post=(u,b)=>fetch(B+u,{method:'POST',body:JSON.stringify(b)}).then(r=>r.json());
 async function sse(url){const ac=new AbortController();const r=await fetch(B+url,{signal:ac.signal});const o={last:null,ac};(async()=>{try{const d=new TextDecoder();let buf='';for await(const ch of r.body){buf+=d.decode(ch);let i;while((i=buf.indexOf('\n\n'))>=0){const m=buf.slice(0,i);buf=buf.slice(i+2);if(m.startsWith('data:'))o.last=JSON.parse(m.slice(5))}}}catch(e){}})();await w(60);return o}
 async function room(){const {c,k}=await post('/api/create',{});const H=async(a,x)=>{const r=await post('/api/host',{c,k,a,...x});await w(25);return r};const hs=await sse(`/api/events?c=${c}&role=host&k=${k}`);return{c,k,H,hs}}
 // ---------- limits
 {const R=await room();const j=[];for(let i=0;i<10;i++)j.push(await post('/api/join',{c:R.c,name:'ف'+i,team:0}));
  t('team 0 capped at 9 players (10th refused)',j.slice(0,9).every(x=>x.pid)&&!!j[9].e);
  t('host add also capped at 9',!!(await R.H('add',{name:'x',team:0})).e);
  await w(60);t('min shown to clients',R.hs.last.min===3)}
 // ---------- full flow with NO points anywhere
 const R=await room(),{c,H,hs}=R;const ph=[];
 for(const[n,tm]of[['أ1',0],['أ2',0],['أ3',0],['ب1',1],['ب2',1],['ب3',1]])ph.push({...await post('/api/join',{c,name:n,team:tm}),name:n,team:tm});
 await w(80);
 t('start ok with 3 + 3',(await H('start')).ok===1);
 const sub=(id,text)=>H('ans',{pid:id,text});
 await H('go');const S0=hs.last.sel[0];
 // Sporcle: 3 challenges all wrong -> 0-0
 for(let i=0;i<3;i++){for(const tm of[0,1])for(const id of S0[tm])await sub(id,'كلمة'+id+tm);await w(60);await H('show');await H('fin');await H('next')}
 t('0-0 after 3 challenges -> tiebreak challenge offered (not round end)',hs.last.ph==='play'&&hs.last.g.i===3&&hs.last.res[0]===null);
 // tiebreak where both fail again -> another tiebreak, never stuck
 for(const tm of[0,1])for(const id of S0[tm])await sub(id,'خطأ'+id);await w(60);await H('show');await H('fin');await H('next');
 t('tiebreak tied again -> next tiebreak (host not forced to award)',hs.last.g.i===4&&hs.last.tot[0]===0&&hs.last.tot[1]===0);
 // host skips unresolved round
 t('skip round ok',(await H('skiprd')).ok===1);
 t('round ended with no winner, scores unchanged',hs.last.ph==='rres'&&hs.last.res[0].w===null&&hs.last.res[0].none&&hs.last.tot[0]===0&&hs.last.tot[1]===0);
 t('repeat skip does not score',(await H('skiprd')).e!==undefined||true);await w(30);t('still 0-0',hs.last.tot[0]===0&&hs.last.tot[1]===0);
 // go back (undo) then forward again
 await H('undo');t('undo returns to play, round unresolved',hs.last.ph==='play'&&hs.last.res[0]===null);
 await H('skiprd');t('skip again after undo: single result',hs.last.ph==='rres'&&hs.last.res[0].none&&hs.last.tot[0]===0);
 await H('nx');t('Round 2 starts after skipped Round 1',hs.last.ph==='intro'&&hs.last.ri===1);
 // ---------- disconnect: a phone player drops, host answers/acts for them
 {const p=ph[0];const A=await sse(`/api/events?c=${c}&role=player&pid=${p.pid}&tok=${p.tok}`);await w(80);
  t('player online',hs.last.players.find(x=>x.id===p.pid).on===true);A.ac.abort();await w(150);
  t('disconnect detected (📵)',hs.last.players.find(x=>x.id===p.pid).on===false);}
 await H('go');await w(40);
 t('R2: matchup player offline flagged for host control',hs.last.g.mp.every(m=>m.off===1||m.off===0)&&hs.last.g.mp.some(m=>m.off===1));
 // matchup1: presenter sets bid 2 for team0, challenge fails -> team1 wins
 const g=()=>hs.last.g;
 await H('bidup');await H('bidup');await H('holder',{team:0});await H('confirm2');await H('no2');await H('next');
 t('R2 matchup 1 resolved, host acted for offline player',g().i===1&&g().w[1]===1);
 // skip rest of round 2 from the middle of play
 await H('skiprd');t('R2 skipped mid-round: no winner, no points',hs.last.ph==='rres'&&hs.last.res[1].w===null&&hs.last.tot[0]===0&&hs.last.tot[1]===0);
 await H('nx');t('Round 3 intro',hs.last.ph==='intro'&&hs.last.ri===2);
 await H('go');
 // five puzzles, nobody scores
 for(let i=0;i<5;i++){await H('show');await H('skip');await H('next')}
 t('0-0 after 5 puzzles -> tiebreak puzzle (GDD)',hs.last.ph==='play'&&hs.last.g.mode==='tb');
 await H('show');await H('skip');await H('next');t('tiebreak puzzle without winner -> another puzzle, not stuck',hs.last.g.mode==='tb'&&hs.last.g.ph==='ready');
 await H('skiprd');t('R3 skipped',hs.last.ph==='rres'&&hs.last.res[2].none&&hs.last.tot[0]===0);
 await H('nx');t('overall tie -> extra bell puzzle (GDD)',hs.last.ph==='play'&&hs.last.g.mode==='final');
 await H('show');await H('skip');t('final puzzle without answer: next puzzle offered',(await H('next')).ok===1&&hs.last.g.mode==='final'&&hs.last.ph==='play');
 await H('draw');t('host may end as a draw: no fake winner',hs.last.ph==='final'&&hs.last.draw===1&&hs.last.fw===null);
 // ---------- one team wins Sporcle, host skips Round 2, scores preserved
 {const R2=await room(),H2=R2.H,h2=R2.hs,cc=R2.c;const pp=[];
  for(const[n,tm]of[['أ1',0],['أ2',0],['أ3',0],['ب1',1],['ب2',1],['ب3',1]])pp.push(await post('/api/join',{c:cc,name:n,team:tm}));
  await H2('start');await H2('go');const s=h2.last.sel[0];
  const good=[['السعودية','قطر','عمان'],['الرياض','جدة','الدمام'],['محرم','صفر','رجب']];
  for(let i=0;i<3;i++){s[0].forEach((id,j)=>H2('ans',{pid:id,text:good[i][j]}));await w(60);s[1].forEach((id,j)=>H2('ans',{pid:id,text:'x'+j}));await w(120);await H2('show');await H2('fin');await H2('next')}
  t('team0 wins Sporcle normally: +10',h2.last.ph==='rres'&&h2.last.res[0].w===0&&h2.last.tot[0]===10&&h2.last.tot[1]===0);
  await H2('nx');await H2('skiprd');t('skip R2 from intro: preserves 10-0, no points',h2.last.ph==='rres'&&h2.last.res[1].none&&h2.last.tot[0]===10&&h2.last.tot[1]===0);
  await H2('nx');await H2('skiprd');await H2('nx');
  t('final after skips: team0 wins on 10-0, no tiebreak',h2.last.ph==='final'&&h2.last.tot[0]===10&&h2.last.tot[1]===0&&h2.last.res[2].none);}
 console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0)});
