// Sporcle spelling tolerance / duplicate detection (matcher unit checks via the real round logic)
const srv=require('./server');let ok=0,bad=0;const t=(n,c)=>{c?ok++:bad++;console.log((c?'PASS ':'FAIL ')+n)};
const w=ms=>new Promise(r=>setTimeout(r,ms));
srv.listen(3172,async()=>{const B='http://127.0.0.1:3172',post=(u,b)=>fetch(B+u,{method:'POST',body:JSON.stringify(b)}).then(r=>r.json());
 async function sse(url){const r=await fetch(B+url);const o={last:null};(async()=>{const d=new TextDecoder();let buf='';for await(const ch of r.body){buf+=d.decode(ch);let i;while((i=buf.indexOf('\n\n'))>=0){const m=buf.slice(0,i);buf=buf.slice(i+2);if(m.startsWith('data:'))o.last=JSON.parse(m.slice(5))}}})();await w(60);return o}
 const {c,k}=await post('/api/create',{});const H=async(a,x)=>{const r=await post('/api/host',{c,k,a,...x});await w(20);return r};const hs=await sse(`/api/events?c=${c}&role=host&k=${k}`);
 for(const[n,tm]of[['أ1',0],['أ2',0],['أ3',0],['ب1',1],['ب2',1],['ب3',1]])await post('/api/join',{c,name:n,team:tm});
 await w(60);await H('start');await H('go');
 async function round(a0,a1){const s=hs.last.sel[0];for(let j=0;j<3;j++){await H('ans',{pid:s[0][j],text:a0[j]});await H('ans',{pid:s[1][j],text:a1[j]})}await w(200);return hs.last.g.eval}
 const nxt=async()=>{await H('show');await H('fin');await H('next');await w(80)};
 // challenge 1 = Arab countries in Asia
 let e=await round(['السعودية','الامارات','قطر'],['السعوديه','الاردن','الكويط']);
 t('accepts الامارات (missing hamza)',e[0].it[1].ok&&!e[0].it[1].dup);
 t('الامارات / مصر / السعودية style: 3 different valid answers pass',e[0].pass);
 t('ة/ه variant السعوديه and hamza-less الاردن accepted',e[1].it[0].ok&&e[1].it[1].ok);
 t('small typo الكويط (الكويط) accepted and flagged as spelling-corrected -> الكويت',e[1].it[2].ok&&e[1].it[2].fz==='الكويت');
 t('team passes with tolerant spelling',e[1].pass);
 await nxt();
 // challenge 2 = Saudi city
 e=await round(['الرياض','جده','الدمّام'],['مصر','باريس','الريّاض']);
 t('ج ه / shadda variants accepted',e[0].it[1].ok&&e[0].it[2].ok&&e[0].pass);
 t('shadda typo of Riyadh accepted',e[1].it[2].ok);
 t('known-but-wrong answer (مصر) is confidently wrong, not flagged',!e[1].it[0].ok&&!e[1].it[0].unk);
 t('unknown answer (باريس) -> flagged for presenter, not auto-accepted',!e[1].it[1].ok&&e[1].it[1].unk===true);
 await H('show');await H('ov',{pid:hs.last.sel[0][1][1]});await w(60);
 t('presenter approves flagged answer manually',hs.last.g.eval[1].it[1].ok&&hs.last.g.eval[1].it[1].man&&!hs.last.g.eval[1].it[1].unk);
 await H('ov',{pid:hs.last.sel[0][0][0]});await w(60);
 t('presenter rejects an auto-accepted answer',hs.last.g.eval[0].it[0].ok===false&&!hs.last.g.eval[0].pass);
 await H('fin');await H('next');await w(80);
 // challenge 3 = Hijri months: same answer written two ways counts once
 e=await round(['ذو القعدة','ذو القعده','صفر'],['ربيع الأول','ربيع الاول','رجب']);
 t('same month written two ways = duplicate (team0)',e[0].it[1].dup&&!e[0].pass&&e[0].it[1].ok);
 t('ربيع الأول / ربيع الاول duplicate (team1)',e[1].it[1].dup&&!e[1].pass);
 // distinct but similar bank entries are not merged
 await nxt();
 console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0)});
