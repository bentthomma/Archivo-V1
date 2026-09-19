/* Small Archivo-only ZIP reader/writer. No network, dependencies or executable imports.
 * Writes STORE entries; reads STORE/DEFLATE with size, path, SHA (in storage.js) and CRC checks.
 * ZIP64, encrypted and multi-volume archives are intentionally rejected. */
const utf8 = new TextEncoder();
const decode = new TextDecoder('utf-8', {fatal:true});
const table = Uint32Array.from({length:256}, (_,n) => {
  for(let k=0;k<8;k++) n = n&1 ? 0xedb88320^(n>>>1) : n>>>1;
  return n>>>0;
});
export function crc32(data) {
  let crc=0xffffffff; for(const b of data) crc=table[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
export function writeZip(entries) {
  const parts=[], central=[]; let offset=0, centralSize=0;
  if(entries.size>20001)throw new Error('Zu viele Dateien für eine Sicherung.');
  for(const [name,raw] of entries) {
    const bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw), file=utf8.encode(name);
    const crc=crc32(bytes), local=new Uint8Array(30+file.length), v=new DataView(local.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);
    v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);
    v.setUint32(22,bytes.length,true);v.setUint16(26,file.length,true);local.set(file,30);
    parts.push(local,bytes);
    const c=new Uint8Array(46+file.length), cv=new DataView(c.buffer);
    cv.setUint32(0,0x02014b50,true);cv.setUint16(4,20,true);cv.setUint16(6,20,true);
    cv.setUint16(8,0x800,true);cv.setUint16(14,33,true);cv.setUint32(16,crc,true);
    cv.setUint32(20,bytes.length,true);cv.setUint32(24,bytes.length,true);cv.setUint16(28,file.length,true);
    cv.setUint32(42,offset,true);c.set(file,46);central.push(c);centralSize+=c.length;
    offset+=local.length+bytes.length;
    if(offset+centralSize>256*1048576)throw new Error('Backup über 256 MiB. Bitte das Archiv aufteilen.');
  }
  const end=new Uint8Array(22), ev=new DataView(end.buffer);
  ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.size,true);ev.setUint16(10,entries.size,true);
  ev.setUint32(12,centralSize,true);ev.setUint32(16,offset,true);
  return new Blob([...parts,...central,end],{type:'application/zip'});
}
export async function readZip(bytes) {
  const invalid=() => new Error('Ungültiges ZIP-Datenbackup. Benötigt werden archiv.json und dateien/ – nicht die Programm-ZIP.');
  if(bytes.length<22||bytes.length>256*1048576)throw invalid();
  const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let e=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
    if(v.getUint32(i,true)===0x06054b50&&i+22+v.getUint16(i+20,true)===bytes.length){e=i;break;}
  }
  if(e<0||v.getUint16(e+4,true)||v.getUint16(e+6,true))throw invalid();
  const count=v.getUint16(e+10,true), size=v.getUint32(e+12,true), start=v.getUint32(e+16,true);
  if(count>20001||count!==v.getUint16(e+8,true)||start+size!==e)throw invalid();
  const descriptors=[],names=new Set();let p=start, expanded=0;
  for(let i=0;i<count;i++){
    if(p+46>e||v.getUint32(p,true)!==0x02014b50)throw invalid();
    const flags=v.getUint16(p+8,true),method=v.getUint16(p+10,true),checksum=v.getUint32(p+16,true);
    const compressed=v.getUint32(p+20,true),original=v.getUint32(p+24,true);
    const length=v.getUint16(p+28,true),extra=v.getUint16(p+30,true),comment=v.getUint16(p+32,true),off=v.getUint32(p+42,true);
    if(p+46+length+extra+comment>e||v.getUint16(p+34,true)||(flags&1)||![0,8].includes(method))throw invalid();
    const name=decode.decode(bytes.subarray(p+46,p+46+length));
    if(names.has(name))throw invalid();names.add(name);p+=46+length+extra+comment;
    if(name.endsWith('/')&&(name==='dateien/')){if(original!==0)throw invalid();continue;}
    if(name!=='archiv.json'&&!/^dateien\/[a-f0-9]{64}$/.test(name))throw invalid();
    const max=name==='archiv.json'?64*1048576:25*1048576;
    expanded+=original;
    if(original>max||expanded>480*1048576||off+30>start||v.getUint32(off,true)!==0x04034b50)throw invalid();
    if(v.getUint16(off+8,true)!==method||(v.getUint16(off+6,true)&1))throw invalid();
    const localLength=v.getUint16(off+26,true),localExtra=v.getUint16(off+28,true),begin=off+30+localLength+localExtra;
    if(begin+compressed>start||decode.decode(bytes.subarray(off+30,off+30+localLength))!==name)throw invalid();
    descriptors.push({name,method,checksum,compressed,original,begin});
  }
  if(p!==e||!names.has('archiv.json'))throw invalid();
  const ranges=descriptors.map(d=>[d.begin,d.begin+d.compressed]).sort((a,b)=>a[0]-b[0]);
  for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw invalid();
  const out=new Map();
  for(const d of descriptors){
    let result=bytes.slice(d.begin,d.begin+d.compressed);
    if(d.method===8){
      if(typeof DecompressionStream==='undefined')throw new Error('Dieser Browser kann dieses ZIP nicht entpacken. Bitte einen aktuellen Browser oder ein JSON-Backup verwenden.');
      let stream;try{stream=new DecompressionStream('deflate-raw');}catch{throw new Error('ZIP-Import hier nicht unterstützt. Bitte das JSON-Backup der alten App verwenden.');}
      const reader=new Blob([result]).stream().pipeThrough(stream).getReader(), chunks=[];let total=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;total+=value.length;if(total>d.original){await reader.cancel();throw invalid();}chunks.push(value);}}
      finally{reader.releaseLock();}
      result=new Uint8Array(total);let n=0;for(const chunk of chunks){result.set(chunk,n);n+=chunk.length;}
    }
    if(result.length!==d.original||crc32(result)!==d.checksum)throw new Error('Eine ZIP-Datei ist beschädigt (Prüfsumme oder Länge). Nichts wurde importiert.');
    out.set(d.name,result);
  }
  return out;
}
