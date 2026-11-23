# Browser check of the skip / tie / counters flow (host page only, manual players)
import os
from playwright.sync_api import sync_playwright
B='http://localhost:3100'
def log(*a):print(*a,flush=True)
with sync_playwright() as p:
    br=p.chromium.launch();c=br.new_context(viewport={'width':1366,'height':768});H=c.new_page();err=[]
    H.on('pageerror',lambda e:err.append(str(e)))
    H.goto(B);H.click('text=ابدأ اللعبة >> nth=0');H.wait_for_selector('.qrframe')
    body=H.inner_text('body');log('no "لوبي" in UI:', 'لوبي' not in body, '| الرئيسية shown:', 'الرئيسية' in body, '| requirement text:', 'من ٣ إلى ٩ لاعبين لكل فريق' in body)
    for t,n in [(0,'أ1'),(0,'أ2'),(1,'ب1'),(1,'ب2'),(1,'ب3')]:
        H.fill(f'#nn{t}',n);H.click(f'.add button >> nth={t}');H.wait_for_timeout(80)
    log('counters:',[x for x in H.inner_text('.tms').split('\n') if 'لاعبين' in x][:4])
    log('start disabled (2 vs 3):',H.locator('button[data-a=start]').is_disabled(),'| reason:',H.inner_text('.why'))
    H.fill('#nn0','أ3');H.click('.add button >> nth=0');H.wait_for_timeout(150)
    log('start enabled (3 vs 3):',not H.locator('button[data-a=start]').is_disabled())
    H.click('button[data-a=start]');H.wait_for_selector('text=الجولة ١')
    def hb(t):H.locator(f'footer.dock button:has-text("{t}")').first.click();H.wait_for_timeout(150)
    hb('ابدأ الجولة')
    for i in range(3):
        hb('اكشف الآن');hb('اكشف للجمهور');hb('اعتمد النتيجة')
        if i==2:log('tiebreak label on dock:',H.locator('footer.dock button:has-text("تحدٍّ فاصل")').count()>0,'| skip button:',H.locator('footer.dock button:has-text("إنهاء الجولة بلا نقاط")').count()>0)
        hb('تحدٍّ فاصل' if i==2 else 'التالي')
    log('now',H.evaluate('[st.g.i,st.tot]'))
    hb('⋯');H.screenshot(path='skip_menu.png');H.click('.menu button:has-text("إنهاء الجولة بلا فائز")');H.wait_for_timeout(150)
    log('needs confirm:',H.locator('.menu button:has-text("اضغط للتأكيد")').count()>0);H.click('.menu button:has-text("اضغط للتأكيد")');H.wait_for_timeout(250)
    log('result screen:',H.inner_text('.stage').replace('\n',' | '));H.screenshot(path='skip_result.png')
    log('scores:',H.evaluate('st.tot'))
    hb('الجولة التالية');log('R2 intro reached:',H.evaluate('[st.ph,st.ri]'))
    log('page errors:',err)
