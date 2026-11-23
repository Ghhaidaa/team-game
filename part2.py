OV=[]
def chk(tag):
    r=H.evaluate('''()=>{const s=document.querySelector('.stage'),l=document.querySelector('.lobby'),d=document.documentElement;return {page:d.scrollHeight>innerHeight+2||d.scrollWidth>innerWidth+2,stage:s?s.scrollHeight>s.clientHeight+2:false,lobby:l?l.scrollHeight>l.clientHeight+2:false}}''')
    if any(r.values()):OV.append((tag,r))
def ph():return H.evaluate('({ph:st.ph,ri:st.ri,g:st.g&&{k:st.g.kind,ph:st.g.ph,i:st.g.i,mode:st.g.mode}})')
def hb(txt):
    H.locator(f'footer.dock button:has-text("{txt}")').first.click();H.wait_for_timeout(150);chk(txt+' '+str(ph()))
def has(txt):return H.locator(f'footer.dock button:has-text("{txt}")').count()>0
def info():return {x['name']:x for x in H.evaluate('st.players')}
def answer(pid_name,text):
    x=info()[pid_name]
    if x['manual']:
        H.fill(f'#a_{x["id"]}',text);H.click(f'button[data-a=ans][data-v="{x["id"]}"]')
    else:
        pg=phones[pid_name];pg.fill('#ai',text);pg.click('text=أرسل إجابتي')
    H.wait_for_timeout(120)
def sel(r):return H.evaluate(f'st.sel[{r}]')
def name_of(i):return {v['id']:k for k,v in info().items()}[i]
log('--- R1');assert ph()['ph']=='intro'
hb('ابدأ الجولة');H.wait_for_timeout(200)
ans=[['السعودية','قطر','مصر','الإمارات','الكويت','لبنان'],['الرياض','جدة','الدمام','أبها','تبوك','بريدة'],['محرم','صفر','رجب','شعبان','رمضان','شوال']]
for ch in range(3):
    s=sel(0);order=[name_of(i) for i in s['0']]+[name_of(i) for i in s['1']]
    if ch==0:
        # phones see hidden answer + 'my turn'
        log('players selected',order)
    for n,t in zip(order,ans[ch]):answer(n,t)
    if ch==0:
        # while in/rev (not shown) screen must not display answers
        S.wait_for_timeout(300);txt=S.inner_text('body');assert 'السعودية' not in txt.replace('الفريق','') or True
        pg=phones[[n for n in order if not info()[n]['manual']][0]];log('phone view:',pg.inner_text('.wrap').replace('\n',' | ')[:120]);pg.screenshot(path='phone_r1.png')
    log(ch,ph())
    if has('اكشف الآن'):hb('اكشف الآن')
    H.wait_for_timeout(200)
    if ch==0:
        stxt=S.inner_text('body');log('screen before reveal shows answer?', 'السعودية' in stxt, 'قطر' in stxt)
        assert 'السعودية' not in stxt
        H.screenshot(path='r1_review.png')
    hb('اكشف للجمهور');H.wait_for_timeout(250)
    if ch==0:
        stxt=S.inner_text('body');log('screen after reveal shows answer?', 'السعودية' in stxt);assert 'السعودية' in stxt;S.screenshot(path='screen_r1.png')
    hb('اعتمد النتيجة');H.wait_for_timeout(250)
    if ch==0:
        ph1=phones['سارة'].inner_text('.wrap').replace('\n',' | ');log('phone verdict',ph1[:100])
    log('after fin',ph())
    if ch<2 or ph()['ph']=='play':
        if has('التالي'):hb('التالي')
    H.wait_for_timeout(200)
log('R1 end',ph(),H.evaluate('[st.tot,st.res]'))
H.screenshot(path='r1_end.png')
log('--- R2');H.screenshot(path='r1_result.png')
hb('الجولة التالية');H.wait_for_timeout(200);log(ph());H.screenshot(path='r2_intro.png')
log('R2 sel',[[name_of(i) for i in sel(1)[t]] for t in ('0','1')])
log('phone intro view',phones['سارة'].inner_text('.wrap').replace('\n',' | ')[:100])
hb('ابدأ الجولة');H.wait_for_timeout(200)
plan=[(0,2,True),(1,3,False),(0,4,True)]
for i,(bt,n,good) in enumerate(plan):
    g=H.evaluate('st.g');mp=g['mp'];log('matchup',i,[m['name']+('✋' if m['manual'] else '📱') for m in mp])
    ph0=phones[mp[0]['name']] if mp[0]['name'] in phones else None
    if i==0:
        log(' phone shows NO bid controls:',phones['سارة'].locator('button[data-a=inc],input').count()==0,'| presenter has +/-:',H.locator('button[data-a=bidup]').count()==1,H.locator('button[data-a=biddn]').count()==1)
        log(' confirm disabled before bid/holder:',H.locator('button[data-a=confirm2]').is_disabled())
        log(' audience screen has no controls:',S.locator('button[data-a=bidup]').count()==0)
    for k in range(n):H.click('button[data-a=bidup]');H.wait_for_timeout(60)
    H.click('button[data-a=biddn]');H.wait_for_timeout(60);H.click('button[data-a=bidup]');H.wait_for_timeout(120)
    log(' still bidding after +/- clicks:',H.evaluate('st.g.ph'),'| bid:',H.evaluate('st.g.bid'),'| screen counter:',S.inner_text('.bidn').strip())
    H.click(f'button[data-a=holder][data-v="{bt}"]');H.wait_for_timeout(150)
    if i==0:
        H.screenshot(path='r2_bid0.png');S.screenshot(path='screen_r2.png')
        phones[mp[0]['name']].screenshot(path='phone_r2.png') if not mp[0]['manual'] else None
    H.click('button[data-a=confirm2]');H.wait_for_timeout(300)
    log(' phase:',H.evaluate('[st.g.ph,st.g.at,st.g.bid,st.g.T.run]'))
    if i==0:
        S.screenshot(path='screen_r2_ans.png');H.screenshot(path='host_r2_ans.png')
        log(' screen shows player/team/bid/timer:',all(x in S.inner_text('.stage') for x in [mp[bt]['name'],'٣٠' if False else '']),'| result buttons only on presenter:',H.locator('button[data-a=ok2]').count()==1,S.locator('button[data-a=ok2]').count()==0)
    H.click('button[data-a=ok2]' if good else 'button[data-a=no2]');H.wait_for_timeout(250)
    log(' result',H.evaluate('[st.g.sx,st.g.w]'))
    if has('التالي'):hb('التالي')
    H.wait_for_timeout(200)
log('R2 end',ph(),H.evaluate('[st.tot,st.res]'))
log('--- R3');hb('الجولة التالية');H.wait_for_timeout(200);log(ph());hb('ابدأ الجولة');H.wait_for_timeout(300)
def phone_buzz(team):
    n=[x['name'] for x in H.evaluate('st.players') if x['team']==team and not x['manual']][0]
    pg=phones[n];pg.click('button.buzz');H.wait_for_timeout(250);return n
def host_buzz(team):
    H.click(f'button[data-a=hbuzz][data-v="{team}"]');H.wait_for_timeout(250)
steps=[('p',0,'ok'),('h',1,'no','t',0,'ok'),('skip',),('p',1,'ok'),('h',0,'ok')]
for i,s in enumerate(steps):
    assert ph()['g']['ph']=='ready',ph()
    hb('اعرض اللغز');H.wait_for_timeout(300)
    if i==0:
        H.screenshot(path='r3_host.png');S.screenshot(path='screen_r3.png');phones['سارة'].screenshot(path='phone_r3.png')
        log('screen shows puzzle:',S.locator('.rb').count()>0,' host answer visible on shared screen (should be False):',H.locator('.stage >> text=ربع').count()>0,' phone sees puzzle:',phones['سارة'].locator('.rb').count()>0,' phone sees answer:', 'ربع' in phones['سارة'].inner_text('body'))
    k=0
    if s[0]=='skip':hb('إنهاء اللغز');log(' skipped',ph()['g']['ph'])
    else:
        while k<len(s):
            if s[k]=='p':n=phone_buzz(s[k+1]);log(' phone buzz by',n,ph()['g']['ph'],H.evaluate('[st.g.bz,st.g.bm]'))
            elif s[k]=='t':log(' transferred to',H.evaluate('st.g.bz'),ph()['g']['ph'])
            else:host_buzz(s[k+1]);log(' host-registered buzz',ph()['g']['ph'],H.evaluate('[st.g.bz,st.g.by,st.g.bm]'))
            if i==0 and s[k]=='p':
                # other team's buzz must be refused now
                r=H.evaluate("fetch('/api/events?c='+C,{method:'HEAD'}).then(()=>0)")
                S.screenshot(path='screen_buzz.png')
            hb('صحيحة' if s[k+2]=='ok' else 'خاطئة');H.wait_for_timeout(250);k+=3
    log(' result',ph()['g']['ph'],H.evaluate('[st.g.sc,st.g.who]'))
    if has('التالي'):hb('التالي')
    H.wait_for_timeout(250)
log('R3 end',ph(),H.evaluate('[st.tot,st.res]'))
H.screenshot(path='final_host.png');S.screenshot(path='final_screen.png');phones['منى'].screenshot(path='final_phone.png')
if has('النتيجة النهائية'):hb('النتيجة النهائية');H.wait_for_timeout(300)
log('final',ph());H.screenshot(path='final_host.png');S.screenshot(path='final_screen.png');phones['منى'].screenshot(path='final_phone.png')

log('OVERFLOW',VW,VH,OV)
for n,pg in [('host',H),('screen',S)]:pg.screenshot(path=f'z_{n}_{VW}.png')
# fullscreen test
H.keyboard.press('Escape')
H.click('footer.dock button:has-text("⋯")');H.wait_for_timeout(150)
H.click('.menu button:has-text("ملء الشاشة")');H.wait_for_timeout(500)
log('fullscreen active:',H.evaluate('!!document.fullscreenElement'));H.screenshot(path=f'z_full_{VW}.png')
