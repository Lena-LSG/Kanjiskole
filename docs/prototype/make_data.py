import json, csv, re, sys
src = sys.argv[1]; vocdir = sys.argv[2]; out = sys.argv[3]
d = json.load(open(f"{src}/kanji.json"))
joyo = {k:v for k,v in d.items() if v.get('grade') in (1,2,3,4,5,6,8)}
def kata(s):
    return ''.join(chr(ord(c)+0x60) if 'ぁ'<=c<='ゖ' else c for c in s)
# vocab
words = {}
for n in (5,4,3,2,1):
    with open(f"{vocdir}/n{n}.csv", encoding='utf-8') as f:
        for row in csv.DictReader(f):
            e = row['expression'].strip()
            if not e or e in words or '～' in e or '~' in e: continue
            m = row['meaning'].strip()
            m = re.sub(r'\s*\(.*?\)\s*', ' ', m).strip()
            parts = [p.strip() for p in re.split(r'[;,]', m) if p.strip()]
            words[e] = (row['reading'].strip(), ', '.join(parts[:2]), n)
freq = {k:(v.get('freq') or 9999) for k,v in joyo.items()}
def score(w, lvl):
    ks = [c for c in w if c in d]
    return (-lvl*10) + len(w)*3 + sum(min(freq.get(c, 4000),4000) for c in ks)/1000
bykanji = {}
for w,(r,m,lvl) in words.items():
    for c in set(w):
        if c in joyo:
            bykanji.setdefault(c, []).append((score(w,lvl), w, r, m))
FF = json.load(open(sys.argv[4])); ff = FF['runs']; ff_k = FF['kanji']
def ffread(key):
    parts=[]
    for seg in key.split(';'):
        pos,r=seg.split(':',1); parts.append((int(pos.split('-')[0]),r))
    return ''.join(r for _,r in sorted(parts))
extra = {}
for w,rd in ff.items():
    if len(w)>3: continue
    best = max(rd.items(), key=lambda x:x[1][0])
    sc, src = best[1]
    good = len(w)>1 and sc >= 55 and (src & (2|4|32))
    if len(w)==1: continue
    if not (src & 1) or (src & (128|512|2048)): continue
    for c in set(w):
        if c in joyo: extra.setdefault(c,[]).append((0 if good else 1, -sc, w, ffread(best[0]), ''))
recs = []
for k,v in joyo.items():
    means = [m for m in v.get('meanings',[]) if 'radical' not in m.lower()][:3] or v.get('meanings',[])[:2]
    ws = sorted(bykanji.get(k, []))[:4]
    if len(ws) < 3:
        have = {x[1] for x in ws}
        solo = ff_k.get(k, {})
        if not ws and solo:
            rd, (sc, src) = max(solo.items(), key=lambda x: x[1][0])
            if sc >= 50: ws.append((0, k, rd, '')); have.add(k)
        ws += [x[1:] for x in sorted(extra.get(k, [])) if x[2] not in have][:3-len(ws)]
    recs.append({
      'k':k, 'm':means, 'on':[kata(x) for x in (v.get('readings_on') or [])][:4],
      'kun':(v.get('readings_kun') or [])[:4], 's':v.get('strokes'),
      'f':v.get('freq'), 'j':v.get('jlpt_new'), 'g':v.get('grade'),
      'c':v.get('wk_radicals') or [],
      'w':[[w,r,m] for _,w,r,m in ws]})
PREF = {"茨":("茨城","いばらき","Ibaraki (prefecture)"),"栃":("栃木","とちぎ","Tochigi (prefecture)"),
"媛":("愛媛","えひめ","Ehime (prefecture)"),"梨":("山梨","やまなし","Yamanashi (prefecture)"),"埼":("埼玉","さいたま","Saitama (prefecture)"),
"岐":("岐阜","ぎふ","Gifu (prefecture)"),"阜":("岐阜","ぎふ","Gifu (prefecture)"),"潟":("新潟","にいがた","Niigata (prefecture)"),
"奈":("奈良","なら","Nara (prefecture)"),"沖":("沖縄","おきなわ","Okinawa (prefecture)"),"縄":("沖縄","おきなわ","Okinawa (prefecture)"),
"熊":("熊本","くまもと","Kumamoto (prefecture)"),"崎":("長崎","ながさき","Nagasaki (prefecture)"),"鹿":("鹿児島","かごしま","Kagoshima (prefecture)"),
"滋":("滋賀","しが","Shiga (prefecture)"),"阪":("大阪","おおさか","Osaka"),"鶴":("千羽鶴","せんばづる","a thousand paper cranes"),
"朕":("朕","ちん","We (imperial first person)"),"浦":("浦安","うらやす","Urayasu (city)")}
for r in recs:
    if r['k'] in PREF:
        w = list(PREF[r['k']])
        r['w'] = [w] + [x for x in r['w'] if x[0] != w[0]][:3]
# order: frequency first, unranked after by grade
recs.sort(key=lambda r:(r['f'] is None, r['f'] or 0, r['g']))
for i,r in enumerate(recs): r['i']=i
json.dump(recs, open(out,'w'), ensure_ascii=False, separators=(',',':'))
nw = sum(1 for r in recs if not r['w']); print('with <2 words:', sum(1 for r in recs if len(r['w'])<2))
print(len(recs), 'kanji;', nw, 'without example words;', len(words), 'words')
print(json.dumps(recs[0],ensure_ascii=False)); print(json.dumps(recs[500],ensure_ascii=False)); print(json.dumps(recs[2000],ensure_ascii=False))
