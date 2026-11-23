# Navigation test: "الرئيسية" button from every host screen; progress must be preserved; no dead ends
import json
from playwright.sync_api import sync_playwright
B='http://localhost:3100'
def log(*a):print(*a,flush=True)
fails=[]
def check(n,c):
    log(('PASS ' if c else 'FAIL ')+n)
    if not c:fails.append(n)
with sync_playwright() as p:
    br=p.chromium.launch();c=br.new_context(viewport={'width':1366,'height':768});H=c.new_page();err=[]
    H.on('pageerror',lambda e:err.append(str(e)))
    H.goto(B);H.click('text=ابدأ اللعبة >> nth=0');H.wait_for_selector('.qrframe')
    code=H.inner_text('.code').strip()
    for t,ns in[(0,['أ1','أ2','أ3']),(1,['ب1','ب2','ب3'])]:
        for n in ns:H.fill(f'#nn{t}',n);H.click(f'.add button >> nth={t}');H.wait_for_timeout(60)
    def snap():return H.evaluate('({c:C,ph:st.ph,ri:st.ri,tot:st.tot,res:st.res.map(x=>x&&x.w),pl:st.players.map(p=>p.id+p.name+p.team).join(),g:st.g&&{k:st.g.kind,ph:st.g.ph,i:st.g.i,bid:st.g.bid,bt:st.g.bt,run:st.g.T&&st.g.T.run}})')
    def home_test(label):
        before=snap()
        check(label+': الرئيسية button visible',H.locator('footer.dock .homeb').count()==1)
        H.click('footer.dock .homeb');H.wait_for_timeout(300)
        on_home=H.locator('.hero').count()==1
        check(label+': landing page shown with متابعة اللعبة',on_home and H.locator('.live button[data-a=cont]').count()==1)
        check(label+': new game is a separate, labelled option',H.locator('.live button[data-a=newgame]').count()==1 and 'لعبة جديدة' in H.inner_text('.live'))
        after=snap()
        same={k:before[k]==after[k] for k in ('c','ph','ri','tot','res','pl')}
        check(label+': session, players, scores, round preserved',all(same.values()) and (before['g'] is None or (before['g']['k']==after['g']['k'] and before['g']['ph']==after['g']['ph'] and before['g']['i']==after['g']['i'])))
        if before['g'] and before['g']['run']:check(label+': running timer was paused safely',after['g']['run']==0)
        H.click('.live button[data-a=cont]');H.wait_for_timeout(300)
        check(label+': متابعة returns to the same screen',H.locator('footer.dock .homeb').count()==1 and snap()['ph']==before['ph'])
        return before
    A=lambda a,x='{}':H.evaluate(f"A('{a}',{x})")
    home_test('setup (players added)')
    H.screenshot(path='nav_setup.png')
    A('start');H.wait_for_selector('text=الجولة ١')
    home_test('R1 intro');H.screenshot(path='nav_intro.png')
    A('go');H.wait_for_timeout(200)
    home_test('R1 answering')
    for i,id in enumerate(H.evaluate('[...st.sel[0][0],...st.sel[0][1]]')):A('ans',f'{{pid:"{id}",text:"السعودية{i}"}}')
    H.wait_for_timeout(200);home_test('R1 review (answers hidden)')
    A('show');home_test('R1 revealed');A('fin');home_test('R1 challenge result')
    A('skiprd');H.wait_for_timeout(200);home_test('round result (no winner)')
    A('nx');A('go');H.wait_for_timeout(200);home_test('R2 bidding')
    for _ in range(3):A('bidup')
    A('holder','{team:0}');A('confirm2');H.wait_for_timeout(300)
    b=home_test('R2 answering (timer running)')
    check('R2 timer was running before leaving',b['g']['run']==1)
    H.click('footer.dock button:has-text("استئناف")');H.wait_for_timeout(200);check('timer can be resumed after returning',H.evaluate('st.g.T.run')==1)
    A('ok2');A('next');A('skiprd');H.wait_for_timeout(200);A('nx');A('go');H.wait_for_timeout(200)
    home_test('R3 ready');A('show');H.wait_for_timeout(300);b=home_test('R3 puzzle running');check('R3 timer was running before leaving',b['g']['run']==1)
    A('skiprd');H.wait_for_timeout(200);A('nx');H.wait_for_timeout(200)
    # tie 0-0 -> final puzzle
    home_test('final puzzle (tie-break)')
    A('draw');H.wait_for_timeout(250);home_test('final results')
    # new game requires confirmation and creates a different session
    H.click('footer.dock .homeb');H.wait_for_timeout(200)
    H.click('.live button[data-a=newgame]');H.wait_for_timeout(200)
    check('new game asks for confirmation first',H.evaluate('C')==code and 'اضغط للتأكيد' in H.inner_text('.live'))
    H.click('.live button[data-a=newgame]');H.wait_for_timeout(500)
    check('confirmed: a fresh game (new code, empty roster) opens',H.evaluate('C')!=code and H.evaluate('st.players.length')==0 and H.locator('.qrframe').count()==1)
    # refresh while at home keeps session
    H.click('footer.dock .homeb');H.wait_for_timeout(300);code2=H.evaluate('C');H.reload();H.wait_for_timeout(800)
    check('reload while on landing keeps the session (continue card)',H.locator('.live').count()==1 and code2 in H.inner_text('.live'))
    H.click('.live button[data-a=cont]');H.wait_for_timeout(300)
    # hidden-tools mode still reachable
    check('page errors',not err)
    log('failures:',fails)
