import json,sys,time,re
from playwright.sync_api import sync_playwright
import cv2,numpy as np
B='http://localhost:3100'
def log(*a):print(*a,flush=True)
with sync_playwright() as p:
    br=p.chromium.launch()
    import os
    VW,VH=int(os.environ.get('VW',1366)),int(os.environ.get('VH',768))
    hc=br.new_context(viewport={'width':VW,'height':VH});H=hc.new_page()
    errs=[]
    H.on('pageerror',lambda e:errs.append(('host',str(e))))
    H.goto(B);H.click('text=ابدأ اللعبة >> nth=0')
    H.wait_for_selector('.qrframe svg');code=H.inner_text('.code').strip();log('code',code)
    H.screenshot(path='lobby0.png')
    # decode QR from screenshot
    H.locator('.qrframe').screenshot(path='qr.png')
    img=cv2.imread('qr.png');img=cv2.resize(img,None,fx=2,fy=2,interpolation=cv2.INTER_NEAREST)
    d,_,_=cv2.QRCodeDetector().detectAndDecode(img);log('QR decodes to',d)
    assert d==f'{B}/j/{code}' ,d
    # screen
    S=hc.new_page();S.on('pageerror',lambda e:errs.append(('screen',str(e))));S.goto(f'{B}/s/{code}')
    phones={}
    def phone(name,team,claim=None):
        c=br.new_context(viewport={'width':390,'height':780},is_mobile=True,has_touch=True);pg=c.new_page()
        pg.on('pageerror',lambda e:errs.append((name,str(e))))
        pg.goto(d)   # open the URL decoded from the QR
        if claim:
            pg.click(f'text={claim}')
        else:
            pg.fill('#nm',name);pg.click(f'.tp button >> nth={team}');pg.click('text=انضم')
        pg.wait_for_selector('text=أنت داخل');phones[name]=pg;return pg
    phone('سارة',0);phone('منى',0);phone('ليان',1)
    # manual players
    for t,n in[(0,'نورة'),(1,'ريم'),(1,'دانة')]:
        H.fill(f'#nn{t}',n);H.click(f'.add button >> nth={t}')
    H.wait_for_timeout(300)
    log('roster',[(x['name'],x['team'],x['manual']) for x in H.evaluate('st.players')])
    # claim: phone for ريم
    phone('ريم',1,claim='ريم')
    H.wait_for_timeout(300)
    pl=H.evaluate('st.players');log('after claim',[(x['name'],x['team'],x['manual']) for x in pl]);assert len(pl)==6
    # rename/move check via host buttons skipped (API-tested)
    H.screenshot(path='lobby1.png');S.screenshot(path='screen_lobby.png')
    H.click('text=/ابدأ المنافسة/');H.wait_for_selector('text=الجولة ١')
    log('started');H.screenshot(path='intro.png')
    json.dump({'code':code},open('state.json','w'))
    # keep browser: continue in same script
    exec(open('part2.py').read())
    log('errors',errs)
    br.close()
