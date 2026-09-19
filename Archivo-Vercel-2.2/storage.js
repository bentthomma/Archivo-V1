/* Archivo Web 2.2 — origin-local IndexedDB. No fetch/API/cloud storage calls.
 * Every acknowledged write commits metadata, new blobs and a recovery snapshot
 * in ONE IndexedDB transaction. Optimistic revisions prevent stale-tab writes.
 * Backups preserve the Archivo 2.x JSON/ZIP format. */
import {readZip,writeZip} from './zip.js';
export class ApiError extends Error {constructor(status,message){super(message);this.status=status;}}
const ID=/^[A-Za-z0-9_-]{1,128}$/, HASH=/^[a-f0-9]{64}$/;
const MAX_FILE=25*1048576,MAX_NOTE=100*1048576,MAX_IMPORT=256*1048576;
const DB_NAME='archivo-web-2', DB_VERSION=1;
let dbPromise=null;const imageBlobs=new Map();
const uuid=()=>crypto.randomUUID(), now=()=>new Date().toISOString();
const fail=(message,status=400)=>{throw new ApiError(status,message);};
const validId=(id)=>{if(typeof id!=='string'||!ID.test(id))fail('Ungültige interne ID.');return id;};
const txt=(v,max,label)=>{if(typeof v!=='string'||v.length>max)fail(`${label} ist ungültig oder zu lang.`);return v;};
const initial=()=>({app:'Archivo',version:2,archiveId:uuid(),revision:0,folders:[],notes:[],trash:[]});
function problem(error){
  if(error instanceof ApiError)return error;
  if(error?.name==='QuotaExceededError')return new ApiError(507,'Browserspeicher voll. Nicht gespeichert. Lade ein Backup herunter und schaffe Speicherplatz.');
  return new ApiError(500,error?.message||'Browserspeicher nicht verfügbar. Nicht im privaten Modus verwenden; Browser-Einstellungen prüfen.');
}
function transaction(db,stores,mode){
  try{return db.transaction(stores,mode,mode==='readwrite'?{durability:'strict'}:undefined);}
  catch(error){if(error.name==='TypeError')return db.transaction(stores,mode);throw error;}
}
async function openDB(){
  if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('Dieser Browser unterstützt den lokalen Speicher nicht.'));return;}
    const request=indexedDB.open(DB_NAME,DB_VERSION);let settled=false;
    request.onupgradeneeded=()=>{
      for(const name of ['meta','blobs','snapshots'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name);
    };
    request.onblocked=()=>{settled=true;reject(new Error('Ein anderer Archivo-Tab blockiert den Speicher. Bitte die anderen Tabs schliessen und neu laden.'));};
    request.onerror=()=>reject(request.error);
    request.onsuccess=()=>{
      const db=request.result;if(settled){db.close();return;}
      db.onversionchange=()=>{db.close();dbPromise=null;document.dispatchEvent(new CustomEvent('archivo-connection',{detail:false}));};
      resolve(db);
    };
  }).catch(error=>{dbPromise=null;throw problem(error);});
  return dbPromise;
}
async function read(store,key,all=false){
  const db=await openDB();return new Promise((resolve,reject)=>{
    const tx=transaction(db,[store],'readonly'),object=tx.objectStore(store),req=all?object.getAll():object.get(key);let result;
    req.onsuccess=()=>{result=req.result;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(problem(tx.error));
  });
}
function checkRevision(old,incoming){
  if((old?.revision||'')!==(incoming||''))fail('Diese Notiz oder dieser Ordner wurde in einem anderen Tab verändert. Lade den aktuellen Stand oder speichere deinen Entwurf als neue Kopie.',409);
}
function checkFolders(folders){
  if(!Array.isArray(folders)||folders.length>10000)fail('Ungültige Ordnerliste.');
  const index=new Map();
  for(const f of folders){validId(f.id);txt(f.name,80,'Ordnername');if(!f.name.trim()||index.has(f.id))fail('Leerer oder doppelter Ordner.');index.set(f.id,f);}
  for(const f of folders){const seen=new Set([f.id]);let p=f.parentId,depth=0;while(p){if(!index.has(p)||seen.has(p)||++depth>30)fail('Ungültige oder kreisförmige Ordnerstruktur.');seen.add(p);p=index.get(p).parentId;}}
}
function validateNote(n,folders){
  validId(n.id);txt(n.title,180,'Notiztitel');txt(n.content,2000000,'Notiztext');
  if(n.folderId&&!folders.some(f=>f.id===n.folderId))fail('Dieser Ordner existiert nicht mehr. Bitte einen anderen Ordner auswählen.',409);
  if(!Array.isArray(n.tags)||n.tags.length>200||n.tags.some(t=>typeof t!=='string'||t.length>200))fail('Ungültige Stichwörter.');
  if(!Array.isArray(n.images)||!Array.isArray(n.files)||n.images.length+n.files.length>100)fail('Maximal 100 Anhänge je Notiz.');
  const seen=new Set();let size=0;
  for(const a of [...n.images,...n.files]){
    validId(a.id);if(seen.has(a.id))fail('Doppelter Anhang.');seen.add(a.id);
    txt(a.name,500,'Dateiname');txt(a.description,500,'Beschreibung');
    if(!Number.isSafeInteger(a.size)||a.size<0||a.size>MAX_FILE||!HASH.test(a.hash))fail('Ungültiger oder zu grosser Anhang.');size+=a.size;
  }
  if(size>MAX_NOTE)fail('Maximal 100 MiB Anhänge je Notiz.');
}
function snapshot(tx,state,reason){
  const value={name:uuid(),createdAt:now(),reason,bytes:new Blob([JSON.stringify(state)]).size,state:structuredClone(state)};
  const store=tx.objectStore('snapshots');store.put(value,value.name);
  // Keep latest 20 recovery points. Blobs remain immutable; no automatic garbage collection.
  const request=store.getAll();request.onsuccess=()=>{const list=request.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));for(const item of list.slice(20))store.delete(item.name);};
}
async function mutate(change,reason='auto',blobs=new Map(),expected=null){
  const db=await openDB();return new Promise((resolve,reject)=>{
    const tx=transaction(db,['meta','blobs','snapshots'],'readwrite');let result,caught;
    const req=tx.objectStore('meta').get('archive');req.onsuccess=()=>{
      try{
        const state=req.result||initial();
        if(expected!==null&&expected!==state.revision)fail('Das Archiv wurde während dieses Vorgangs in einem anderen Tab geändert. Bitte erneut versuchen.',409);
        const before=structuredClone(state);result=change(state,tx);
        checkFolders(state.folders);
        state.revision=before.revision+1;
        if(reason&&(reason==='manuell'||before.folders.length||before.notes.length||before.trash.length))snapshot(tx,before,reason);
        for(const [hash,blob] of blobs)tx.objectStore('blobs').put(blob,hash);
        tx.objectStore('meta').put(state,'archive');
      }catch(error){caught=error;tx.abort();}
    };
    tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(problem(caught||tx.error));
  });
}
async function state(){const s=await read('meta','archive');if(s)return s;await mutate(()=>null,null);return read('meta','archive');}
async function digest(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');}
function fromDataURL(s){
  if(typeof s!=='string'||s.length>MAX_FILE*1.4+1024)fail('Ungültiger Dateiinhalt.');
  const m=/^data:([^,;]*)(?:;[^,;=]+=[^,;]*)*;base64,([A-Za-z0-9+/]*={0,2})$/.exec(s);
  if(!m)fail('Ein Anhang enthält keine gültigen Dateidaten.');
  let raw;try{raw=atob(m[2]);}catch{fail('Beschädigter Anhang.');}
  if(raw.length>MAX_FILE)fail('Maximal 25 MiB pro Datei.');
  return {bytes:Uint8Array.from(raw,c=>c.charCodeAt(0)),type:m[1]||'application/octet-stream'};
}
async function prepare(input,existing=null,sources=null,importing=false){
  const n={id:input.id,title:input.title??'',content:input.content??'',folderId:input.folderId||null,
    tags:input.tags||[],createdAt:input.createdAt||now(),updatedAt:input.updatedAt||now(),images:[],files:[]};
  const blobs=new Map();
  for(const key of ['images','files']){
    const list=input[key]??[];if(!Array.isArray(list)||list.length>100)fail('Ungültige Anhangliste.');
    for(const a of list){
      let bytes,type=a.type||'application/octet-stream',hash=a.hash,blob;
      if(typeof a.blob==='string'){const decoded=fromDataURL(a.blob);bytes=decoded.bytes;type=decoded.type;}
      else if(sources&&HASH.test(hash)&&sources.has('dateien/'+hash))bytes=sources.get('dateien/'+hash);
      else if(!importing){
        const old=[...(existing?.images||[]),...(existing?.files||[])].find(b=>b.id===a.id);
        if(!old)fail('Ein Anhang fehlt. Bitte die Originaldatei erneut hinzufügen.');
        hash=old.hash;blob=await read('blobs',hash);if(!(blob instanceof Blob))fail('Gespeicherter Anhang fehlt. Bitte Backup prüfen.');
      }else fail('Im Backup fehlt ein Anhang. Keine Daten wurden ersetzt.');
      if(bytes){
        if(bytes.length>MAX_FILE)fail('Eine Datei im Backup ist grösser als 25 MiB.');
        const calculated=await digest(bytes);if(importing&&hash&&hash!==calculated)fail('Die SHA-256-Prüfsumme eines Anhangs stimmt nicht.');
        hash=calculated;blob=new Blob([bytes],{type});blobs.set(hash,blob);
      }
      n[key].push({id:a.id,name:a.name||'Datei',description:a.description||'',type,size:blob.size,hash});
    }
  }
  if(input.deletedAt)n.deletedAt=input.deletedAt;
  return {note:n,blobs};
}
function decorateNote(note){
  const n=structuredClone(note);
  for(const a of [...n.images,...n.files])a.url='/local-attachment/'+a.hash;
  return n;
}
async function decorateState(s){
  const hashes=new Set([...s.notes,...s.trash].flatMap(n=>n.images.map(a=>a.hash)));
  for(const hash of hashes){if(!imageBlobs.has(hash)){const blob=await read('blobs',hash);if(blob)imageBlobs.set(hash,blob);}}
  for(const hash of imageBlobs.keys())if(!hashes.has(hash))imageBlobs.delete(hash);
  return {...s,notes:s.notes.map(decorateNote),trash:s.trash.map(decorateNote)};
}
async function exportArchive(format){
  const s=await state();s.exportedAt=now();
  const entries=new Map(),hashes=new Set([...s.notes,...s.trash].flatMap(n=>[...n.images,...n.files].map(a=>a.hash)));
  let total=0;
  for(const hash of hashes){
    const blob=await read('blobs',hash);if(!(blob instanceof Blob))fail('Ein Anhang fehlt. Das Backup wurde nicht als vollständig ausgegeben.');
    total+=blob.size;if(total>180*1048576)fail('Dieses Backup ist für den Browser-Export zu gross (180 MiB Dateiinhalte). Bitte das Archiv aufteilen.');
    const bytes=new Uint8Array(await blob.arrayBuffer());if(await digest(bytes)!==hash)fail('Ein gespeicherter Anhang ist beschädigt.');entries.set('dateien/'+hash,bytes);
  }
  if(format==='json'){
    for(const n of [...s.notes,...s.trash])for(const a of [...n.images,...n.files]){
      a.blob=await blobToDataURL(new Blob([entries.get('dateien/'+a.hash)],{type:a.type}));delete a.hash;delete a.url;
    }
    const out=new Blob([JSON.stringify(s)],{type:'application/json'});if(out.size>MAX_IMPORT)fail('JSON-Backup über 256 MiB. Bitte ZIP verwenden.');return out;
  }
  const metadata=new TextEncoder().encode(JSON.stringify(s));if(metadata.length>64*1048576)fail('Archivmetadaten über 64 MiB.');
  entries.set('archiv.json',metadata);return writeZip(entries);
}
async function importArchive(file){
  const before=await state();if(!(file instanceof Blob)||file.size>MAX_IMPORT)fail('Maximal 256 MiB pro Datenbackup.');
  const bytes=new Uint8Array(await file.arrayBuffer());let sources=null,raw;
  if(bytes[0]===0x50&&bytes[1]===0x4b){sources=await readZip(bytes);raw=new TextDecoder('utf-8',{fatal:true}).decode(sources.get('archiv.json'));}
  else raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  let incoming;try{incoming=JSON.parse(raw);}catch{fail('Ungültiges JSON-Datenbackup.');}
  if(incoming.app!=='Archivo'||![1,2].includes(incoming.version)||!Array.isArray(incoming.folders)||!Array.isArray(incoming.notes)||incoming.trash&&!Array.isArray(incoming.trash))fail('Dies ist kein unterstütztes Archivo-Datenbackup.');
  if(incoming.notes.length+(incoming.trash?.length||0)>10000)fail('Maximal 10 000 Notizen pro Import.');
  const folders=incoming.folders.map(f=>({id:f.id,name:f.name,parentId:f.parentId||null,createdAt:f.createdAt||now(),revision:uuid()}));checkFolders(folders);
  const prepared={folders,notes:[],trash:[]},blobs=new Map(),ids=new Set();let expanded=0;
  for(const key of ['notes','trash'])for(const item of incoming[key]||[]){
    if(ids.has(item.id))fail('Doppelte Notiz-ID im Backup.');ids.add(item.id);
    const p=await prepare(item,null,sources,true);validateNote(p.note,folders);p.note.revision=uuid();
    if(key==='trash')p.note.deletedAt=item.deletedAt||now();else delete p.note.deletedAt;
    prepared[key].push(p.note);for(const [hash,blob] of p.blobs){if(!blobs.has(hash))expanded+=blob.size;blobs.set(hash,blob);}
    if(expanded>480*1048576)fail('Entpacktes Backup ist zu gross.');
  }
  await mutate(s=>{Object.assign(s,prepared);return null;},'import',blobs,before.revision);
  return {notes:prepared.notes.length,folders:folders.length};
}
export const api={
  session:null,
  async connect(){
    const s=await state();this.session={archiveId:s.archiveId,version:'2.2.0-web',dataDirectory:location.origin+' · lokaler Browserspeicher (IndexedDB)',maxFileBytes:MAX_FILE,maxNoteFileBytes:MAX_NOTE,maxImportBytes:MAX_IMPORT,mobile:false};return this.session;
  },
  imageBlob(item){return imageBlobs.get(item.hash)||null;},
  async storageInfo(){
    const estimate=await navigator.storage?.estimate?.().catch(()=>({}));const persistent=await navigator.storage?.persisted?.().catch(()=>false);
    return {...estimate,persistent:!!persistent};
  },
  async requestPersistent(){return !!(await navigator.storage?.persist?.());},
  async request(path,options={}){
    const {method='GET',body}=options;
    try{
      let result;
      if(path==='/api/state')result=await decorateState(await state());
      else if(path==='/api/status'){const s=await state();result={revision:s.revision,instance:s.archiveId};}
      else if(path.startsWith('/local-attachment/')){
        const hash=path.slice('/local-attachment/'.length);if(!HASH.test(hash))fail('Ungültiger Anhang.');
        result=await read('blobs',hash);if(!result)fail('Datei nicht gefunden.',404);
      }
      else if(path==='/api/folders'&&method==='PUT'){
        result=await mutate(s=>{
          const old=s.folders.find(f=>f.id===body.id);checkRevision(old,body.revision);
          const f={id:body.id,name:body.name.trim(),parentId:body.parentId||null,createdAt:old?.createdAt||now(),revision:uuid()};
          s.folders=old?s.folders.map(v=>v.id===f.id?f:v):[...s.folders,f];return f;
        });
      }
      else if(path.startsWith('/api/folders/')&&method==='DELETE'){
        const id=path.split('/').pop();result=await mutate(s=>{
          const old=s.folders.find(f=>f.id===id);if(!old)fail('Ordner nicht gefunden.',404);checkRevision(old,body.revision);
          const ids=new Set([id]);for(let i=0;i<s.folders.length;i++)for(const f of s.folders)if(ids.has(f.parentId))ids.add(f.id);
          s.folders=s.folders.filter(f=>!ids.has(f.id));for(const n of [...s.notes,...s.trash])if(ids.has(n.folderId)){n.folderId=null;n.revision=uuid();}return {ok:true};
        },'ordner');
      }
      else if(path==='/api/notes'&&method==='PUT'){
        const before=await state(),existing=before.notes.find(n=>n.id===body.id);checkRevision(existing,body.revision);
        const p=await prepare(body,existing);
        result=await mutate(s=>{
          const old=s.notes.find(n=>n.id===body.id);if(s.trash.some(n=>n.id===body.id))fail('Diese Notiz liegt im Papierkorb.',409);
          checkRevision(old,body.revision);validateNote(p.note,s.folders);
          const n={...p.note,revision:uuid(),createdAt:old?.createdAt||now(),updatedAt:now()};delete n.deletedAt;
          s.notes=old?s.notes.map(v=>v.id===n.id?n:v):[...s.notes,n];return n;
        },'auto',p.blobs);
        for(const a of result.images)if(p.blobs.has(a.hash))imageBlobs.set(a.hash,p.blobs.get(a.hash));result=decorateNote(result);
      }
      else if(path.startsWith('/api/notes/')&&method==='POST'){
        const id=path.split('/').pop(),act=body.action;if(!['trash','restore','purge'].includes(act))fail('Ungültige Aktion.');
        result=await mutate(s=>{
          const key=act==='trash'?'notes':'trash',n=s[key].find(v=>v.id===id);if(!n)fail('Notiz nicht gefunden.',404);checkRevision(n,body.revision);
          s[key]=s[key].filter(v=>v.id!==id);n.revision=uuid();n.updatedAt=now();
          if(act==='trash'){n.deletedAt=now();s.trash.push(n);}else if(act==='restore'){delete n.deletedAt;if(n.folderId&&!s.folders.some(f=>f.id===n.folderId))n.folderId=null;s.notes.push(n);}return {ok:true};
        },act==='purge'?'endgueltig':act==='restore'?'wiederherstellen':'loeschen');
      }
      else if(path==='/api/backups'&&method==='GET')result=(await read('snapshots',null,true)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(({state,...info})=>info);
      else if(path==='/api/backups'&&method==='POST')result=await mutate(()=>({ok:true}),'manuell');
      else if(path==='/api/restore'&&method==='POST'){
        const before=await state(),point=await read('snapshots',body.name);if(!point)fail('Sicherungsstand nicht mehr vorhanden.',404);
        result=await mutate(s=>{
          for(const k of ['folders','notes','trash'])s[k]=structuredClone(point.state[k]);
          for(const n of [...s.folders,...s.notes,...s.trash])n.revision=uuid();return {ok:true};
        },'wiederherstellen',new Map(),before.revision);
      }
      else if(path.startsWith('/api/export?'))result=await exportArchive(new URLSearchParams(path.split('?')[1]).get('format'));
      else if(path==='/api/import'&&method==='POST')result=await importArchive(body);
      else fail('Diese Funktion gehört zum lokalen PC-Server und ist in der Web-Version nicht nötig.',404);
      document.dispatchEvent(new CustomEvent('archivo-connection',{detail:true}));return result;
    }catch(error){const p=problem(error);if(p.status>=500)document.dispatchEvent(new CustomEvent('archivo-connection',{detail:false}));throw p;}
  }
};

export const drafts = {
  db: null,
  async init() {
    this.db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('archivo-web-emergency-drafts', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('drafts', { keyPath: 'key' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Browser-Entwurfsspeicher ist durch einen anderen Tab blockiert.'));
    });
  },
  put(value) {
    if (!this.db) return Promise.reject(new Error('Browser-Entwurfsspeicher nicht verfügbar.'));
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(value);
      tx.oncomplete = resolve;
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  },
  all(archiveId) {
    if (!this.db) return Promise.resolve([]);
    return new Promise((resolve, reject) => {
      const req = this.db.transaction('drafts').objectStore('drafts').getAll();
      req.onsuccess = () => resolve(req.result.filter(d => d.archiveId === archiveId));
      req.onerror = () => reject(req.error);
    });
  },
  remove(key, expectedToken = null) {
    if (!this.db) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('drafts', 'readwrite'); const store = tx.objectStore('drafts');
      const read = store.get(key);
      read.onsuccess = () => { if (!expectedToken || read.result?.token === expectedToken) store.delete(key); };
      tx.oncomplete = resolve; tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }
};
export const preferences = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem('archivo-web-' + key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('archivo-web-' + key, JSON.stringify(value)); } catch {} }
};
export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
  });
}
