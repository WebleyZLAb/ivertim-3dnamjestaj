import json,struct
from pathlib import Path
class Dfm:
 def __init__(self,b):self.b=b;self.i=4
 def take(self,n):
  if self.i+n>len(self.b):raise ValueError('EOF')
  v=self.b[self.i:self.i+n];self.i+=n;return v
 def u8(self):return self.take(1)[0]
 def short(self):return self.take(self.u8()).decode('cp1250',errors='replace')
 def value(self):
  t=self.u8()
  if t==0:return None
  if t==1:
   a=[]
   while self.b[self.i]!=0:a.append(self.value())
   self.i+=1;return a
  if t in (2,3,4):return struct.unpack({2:'<b',3:'<h',4:'<i'}[t],self.take({2:1,3:2,4:4}[t]))[0]
  if t==5:return {'extendedRaw':self.take(10).hex()}
  if t in (6,7):return self.short()
  if t in (8,9):return t==9
  if t==10:return {'binaryBytes':len(self.take(struct.unpack('<I',self.take(4))[0]))}
  if t==11:
   a=[]
   while self.b[self.i]:a.append(self.short())
   self.i+=1;return a
  if t in (12,18,20):
   n=struct.unpack('<I',self.take(4))[0];return self.take(n*2 if t==18 else n).decode('utf-16le' if t==18 else 'utf-8' if t==20 else 'cp1250',errors='replace')
  if t==13:return None
  if t==14:
   a=[]
   while self.b[self.i]!=0:
    if self.u8()!=1:raise ValueError('collection')
    a.append(self.props())
   self.i+=1;return a
  if t==15:return struct.unpack('<f',self.take(4))[0]
  if t in (16,17,19,21):return {'numericRaw':self.take(8).hex()}
  raise ValueError(f'type {t} at {self.i-1}')
 def props(self):
  p={}
  while self.b[self.i]:
   key=self.short();p[key]=self.value()
  self.i+=1;return p
 def obj(self):
  if self.b[self.i]&0xf0==0xf0:
   flags=self.u8()
   if flags&2:self.value()
  cls=self.short();name=self.short();props=self.props();kids=[]
  while self.b[self.i]:kids.append(self.obj())
  self.i+=1;return {'class':cls,'name':name,'props':props,'children':kids}
def summary(o):
 p=o['props'];out=[]
 if any(k in p for k in ['Caption','Hint','Filter','Items.Strings']):out.append({'class':o['class'],'name':o['name'],**{k:v for k,v in p.items() if k in ['Caption','Hint','Filter','Items.Strings','Text','OnClick','OnChange']}})
 for c in o['children']:out+=summary(c)
 return out
results=[]
for p in Path('.local-corpus-archive/analysis/material-editor-resources').glob('*.bin'):
 if not p.read_bytes().startswith(b'TPF0'):continue
 try:
  d=Dfm(p.read_bytes());o=d.obj();results.append({'file':p.name,'consumed':d.i,'bytes':len(d.b),'object':o,'summary':summary(o)})
 except Exception as e:results.append({'file':p.name,'error':str(e)})
Path('.local-corpus-archive/analysis/material-editor-forms.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'file':r['file'],'error':r.get('error'),'controls':len(r.get('summary',[]))} for r in results]))
for r in results:
 if r['file'].startswith(('10-TFORM1-','10-TMATERIALIMPORT','10-TMATERIALPROPERTY','10-TOPTIMIZATION','10-TMATERIALINTEGRITY','10-TMATERIALDODATNO')):print(json.dumps({'file':r['file'],'controls':r.get('summary',[])},ensure_ascii=True))
