import json,zipfile,xml.etree.ElementTree as ET
from pathlib import Path
base=Path('.local-corpus-archive');out=[]
for folder in ['config','Template']:
 for p in (base/folder).rglob('*'):
  if not p.is_file():continue
  if p.suffix.lower() in ['.xlsx','.ods']:
   try:
    with zipfile.ZipFile(p) as z:
     n='xl/workbook.xml' if p.suffix.lower()=='.xlsx' else 'content.xml';r=ET.fromstring(z.read(n));tables=[]
     for e in r.iter():
      if e.tag.split('}')[-1] in ['sheet','table']:
       a={k.split('}')[-1]:v for k,v in e.attrib.items()};tables.append(a.get('name',''))
     out.append({'file':str(p),'kind':'spreadsheet','tables':tables})
   except Exception as e:out.append({'file':str(p),'error':str(e)})
  elif p.suffix.lower()=='.fr3':
   try:
    r=ET.parse(p).getroot();out.append({'file':str(p),'kind':'FastReport','datasets':[e.attrib.get('DataSetName') for e in r.iter() if e.tag=='item' and 'DataSetName' in e.attrib],'pages':sum(e.tag=='TfrxReportPage' for e in r.iter()),'scripts':r.attrib.get('ScriptLanguage','')})
   except Exception as e:out.append({'file':str(p),'error':str(e)})
Path('.local-corpus-archive/analysis/document-template-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'files':len(out),'errors':[x for x in out if 'error' in x],'spreadsheets':[x for x in out if x.get('kind')=='spreadsheet']},ensure_ascii=True))
