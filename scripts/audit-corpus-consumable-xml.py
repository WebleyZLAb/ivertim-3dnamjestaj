from pathlib import Path
import json,xml.etree.ElementTree as ET
rows=[]
for p in Path('public/local-corpus/Potrosni').rglob('*'):
 if not p.is_file() or p.suffix.lower() not in ('.cxm','.pxm','.dat'):continue
 b=p.read_bytes()
 try:t=b.decode('utf8')
 except UnicodeDecodeError:t=b.decode('cp1250')
 if not t.lstrip().startswith('<'):continue
 try:
  r=ET.fromstring(t);keys={};refs=[]
  for e in r.iter():
   for k,v in e.attrib.items():
    keys[k]=keys.get(k,0)+1
    if any(x in k.lower() for x in ['pic','model','file','image']) and v and len(refs)<5:refs.append({'key':k,'value':v})
  rows.append({'file':str(p),'root':r.tag,'nodes':sum(1 for _ in r.iter()),'attributes':keys,'referenceExamples':refs})
 except Exception as e:rows.append({'file':str(p),'error':str(e)})
Path('.local-corpus-archive/analysis/consumable-xml-audit.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(rows),'errors':[r for r in rows if 'error' in r],'examples':[r for r in rows if r.get('root') in ['Potrosni','Param']][:2]},ensure_ascii=True)[:7000])
