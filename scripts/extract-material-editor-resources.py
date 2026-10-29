import struct,json,re
from pathlib import Path
b=Path(r'C:\CorpusSoftware64\CorpusSolutions\MaterialEditor.exe').read_bytes()
p=struct.unpack_from('<I',b,0x3c)[0]; n=struct.unpack_from('<H',b,p+6)[0]; opt=p+24; olen=struct.unpack_from('<H',b,p+20)[0]; magic=struct.unpack_from('<H',b,opt)[0]
dirs=opt+(112 if magic==0x20b else 96);rrva,rsize=struct.unpack_from('<II',b,dirs+16)
sects=[]
for i in range(n):
 o=opt+olen+i*40; vs,va,rs,rp=struct.unpack_from('<IIII',b,o+8);sects.append((va,max(vs,rs),rp))
def off(rva):
 for va,sz,rp in sects:
  if va<=rva<va+sz:return rp+rva-va
 raise ValueError(rva)
root=off(rrva);result=[]
def name(v):
 if v&0x80000000:
  o=root+(v&0x7fffffff);l=struct.unpack_from('<H',b,o)[0];return b[o+2:o+2+l*2].decode('utf-16le')
 return str(v)
def walk(rel,parts):
 o=root+rel;a,c=struct.unpack_from('<HH',b,o+12)
 for i in range(a+c):
  nm,d=struct.unpack_from('<II',b,o+16+i*8);ns=parts+[name(nm)]
  if d&0x80000000:walk(d&0x7fffffff,ns)
  else:
   dr,sz,cp,_=struct.unpack_from('<IIII',b,root+d);data=b[off(dr):off(dr)+sz]
   if ns[0]=='10':
    out=Path('.local-corpus-archive/analysis/material-editor-resources');out.mkdir(parents=True,exist_ok=True)
    dest=out/('-'.join(ns)+'.bin');dest.write_bytes(data)
    strings=[s.decode('cp1250',errors='replace') for s in re.findall(rb'[\x20-\x7e\x80-\xff]{5,}',data)]
    result.append({'resource':ns,'bytes':sz,'dfm':data.startswith(b'TPF0'),'strings':strings})
walk(0,[])
Path('.local-corpus-archive/analysis/material-editor-resources.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps([{'resource':r['resource'],'bytes':r['bytes'],'dfm':r['dfm']} for r in result],ensure_ascii=False))
for r in result:
 if any('MATEDIT' in v.upper() for v in r['resource']):print(json.dumps(r,ensure_ascii=False)[:24000])
