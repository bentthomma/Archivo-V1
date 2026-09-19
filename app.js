import { api, drafts, preferences, blobToDataURL, ApiError } from './storage.js';

// UI metadata stays in memory; IndexedDB transactions acknowledge successful writes.
let folders = [], notes = [], trash = [], selectedFolder = null, currentNote = null;
let pendingImages = [], pendingFiles = [], folderEditingId = null, searchTerm = '';
let contentMode = 'folders', dirty = false, specialView = 'all', collapsed = new Set();
let gridUrls = [], editorUrls = [], lightboxUrl = null, contextFolderId = null, listHistory = [];
let autosaveTimer = null, searchTimer = null, savingPromise = null, navigationBusy = false;
let editorVersion = 0, draftToken = '', recoveryKey = null, archiveRevision = -1;
let connected = true, stopped = false, polling = false, sessionId = '', lastDrafts = [];
let draftWarningShown = false, saveConflict = false;
const $ = id => document.getElementById(id);
// randomUUID requires a secure context; LAN HTTP must work as well.
const uid = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map(v => v.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
};
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').toLowerCase();
const escapeHtml = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const formatDate = v => { const d = new Date(v); return isNaN(d) ? '' : new Intl.DateTimeFormat('de-CH', { dateStyle:'medium', timeStyle:'short' }).format(d); };
const formatBytes = size => size >= 1048576 ? `${(size / 1048576).toFixed(1)} MiB` : `${Math.max(0, Math.round(size / 1024))} KiB`;
const fileExtension = name => escapeHtml((String(name || '').split('.').pop() || 'Datei').slice(0, 5).toUpperCase());
const searchWords = q => norm(q).split(/\s+/).filter(Boolean).slice(0, 20);
const saveCollapsed = () => preferences.set('collapsed', [...collapsed]);
const revokeAll = list => { list.forEach(url => URL.revokeObjectURL(url)); list.length = 0; };
function toast(message, ms = 4200) {
  $('toast').textContent = message; $('toast').classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('toast').classList.remove('show'), ms);
}
function assetURL(item, urls) {
  if (item.localBlob instanceof Blob) { const url = URL.createObjectURL(item.localBlob); urls.push(url); return url; }
  const blob = api.imageBlob(item); if (!blob) return ''; const url = URL.createObjectURL(blob); urls.push(url); return url;
}
function setConnected(value) {
  if (!$('localStatus')) return;
  connected = value;
  $('localStatus').classList.toggle('offline', !value);
  $('localStatusText').textContent = value ? 'Lokal in diesem Browser' : 'Speicherproblem';
  $('connectionBanner').classList.toggle('hidden', value);
  $('connectionText').textContent = value ? '' : 'Der Browserspeicher ist nicht verfügbar oder voll. Neue Änderungen sind noch nicht bestätigt. Sichere deinen Entwurf, bevor du den Tab schliesst.';
}
function showError(error) { console.error(error); toast(error.message || String(error), 7000); }
function action(fn) {
  return async event => { try { await fn(event); } catch (error) { showError(error); } };
}
async function navigate(fn) {
  if (navigationBusy) return;
  navigationBusy = true;
  try { if (await guardLeave()) await fn(); } catch (error) { showError(error); }
  finally { navigationBusy = false; }
}
function fold(text) {
  let out = ''; const starts = [], ends = [];
  for (let i = 0; i < text.length;) {
    const ch = String.fromCodePoint(text.codePointAt(i)), normalized = norm(ch);
    for (let j = 0; j < normalized.length; j++) { starts.push(i); ends.push(i + ch.length); }
    out += normalized; i += ch.length;
  }
  return { out, starts, ends };
}
function childrenOf(id){return folders.filter(f=>f.parentId===id).sort((a,b)=>a.name.localeCompare(b.name,'de'))}
function folderById(id){return folders.find(f=>f.id===id)}
function folderPath(id){const path=[];let f=folderById(id),guard=0;while(f&&guard++<30){path.unshift(f);f=folderById(f.parentId)}return path}
function descendantIds(id){const out=[id],seen=new Set([id]);for(let i=0;i<out.length;i++)for(const c of childrenOf(out[i]))if(!seen.has(c.id)){seen.add(c.id);out.push(c.id)}return out}
function renderFolderTree(){const make=parentId=>childrenOf(parentId).map(f=>{const kids=childrenOf(f.id),isCollapsed=collapsed.has(f.id),id=escapeHtml(f.id);return `<div class="folder-node"><div class="folder-row ${selectedFolder===f.id?'active':''}" data-id="${id}"><button class="chevron" data-toggle="${id}" ${kids.length?`aria-expanded="${!isCollapsed}" aria-label="${isCollapsed?'Unterordner einblenden':'Unterordner ausblenden'}"`:'aria-label="Keine Unterordner"'}>${kids.length?(isCollapsed?'›':'⌄'):'·'}</button><button class="folder-label" data-folder="${id}">▱ &nbsp;${escapeHtml(f.name)}</button><button class="folder-menu" data-menu="${id}" title="Ordner bearbeiten">•••</button></div>${kids.length&&!isCollapsed?`<div class="folder-children">${make(f.id)}</div>`:''}</div>`}).join('');$('folderTree').innerHTML=make(null)||'<p style="padding:10px;color:var(--muted)">Noch keine Ordner.</p>'}
function renderFolderOptions(){const keep=$('noteFolder').value,flat=[];const walk=(pid,d)=>childrenOf(pid).forEach(f=>{flat.push({f,d});walk(f.id,d+1)});walk(null,0);const opt=({f,d})=>`<option value="${escapeHtml(f.id)}">${'— '.repeat(d)}${escapeHtml(f.name)}</option>`;$('noteFolder').innerHTML='<option value="">Ohne Ordner</option>'+flat.map(opt).join('');if([...$('noteFolder').options].some(o=>o.value===keep))$('noteFolder').value=keep;const blocked=new Set(folderEditingId?descendantIds(folderEditingId):[]);$('folderParent').innerHTML='<option value="">Oberste Ebene</option>'+flat.filter(({f})=>!blocked.has(f.id)).map(opt).join('')}
function renderBreadcrumbs(){const parts=selectedFolder?folderPath(selectedFolder):[];$('breadcrumbs').innerHTML=`<button data-crumb="">Archivo</button>${parts.map(f=>`<span>›</span><button data-crumb="${escapeHtml(f.id)}">${escapeHtml(f.name)}</button>`).join('')}`}
function noteMatches(n,q){const folderNames=folderPath(n.folderId).map(f=>f.name).join(' ');const hay=norm([n.title,n.content,(n.tags||[]).join(' '),folderNames,...(n.images||[]).flatMap(i=>[i.name,i.description||'']),...(n.files||[]).flatMap(f=>[f.name,f.description||''])].join(' '));return searchWords(q).every(w=>hay.includes(w))}
function relevantExcerpt(n,q){const text=n.content||'';if(!q)return text.slice(0,320);const{out,starts}=fold(text);let idx=-1;for(const w of searchWords(q)){const i=out.indexOf(w);if(i>=0){const s=starts?starts[i]:i;if(idx<0||s<idx)idx=s}}if(idx<0)return text.slice(0,320);return `${idx>65?'…':''}${text.slice(Math.max(0,idx-65),idx+145)}${idx+145<text.length?'…':''}`}
function highlight(text,q){text=String(text??'');if(!q)return escapeHtml(text);const words=searchWords(q);if(!words.length)return escapeHtml(text);const{out,starts,ends}=fold(text);const ranges=[];for(const w of words){let i=out.indexOf(w);while(i>=0){ranges.push([starts?starts[i]:i,ends?ends[i+w.length-1]:i+w.length]);i=out.indexOf(w,i+w.length)}}if(!ranges.length)return escapeHtml(text);ranges.sort((a,b)=>a[0]-b[0]);const merged=[ranges[0].slice()];for(const r of ranges.slice(1)){const last=merged[merged.length-1];if(r[0]<=last[1])last[1]=Math.max(last[1],r[1]);else merged.push(r.slice())}let html='',pos=0;for(const[s,e]of merged){html+=escapeHtml(text.slice(pos,s))+'<mark>'+escapeHtml(text.slice(s,e))+'</mark>';pos=e}return html+escapeHtml(text.slice(pos))}
function contextNotes() {
  let list = [...notes];
  if (searchTerm) list = list.filter(n => noteMatches(n, searchTerm));
  else if (selectedFolder) { const ids = new Set(descendantIds(selectedFolder)); list = list.filter(n => ids.has(n.folderId)); }
  else if (specialView === 'unfiled') list = list.filter(n => !n.folderId);
  list.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  if (!searchTerm && !selectedFolder && specialView === 'recent') list = list.slice(0,20);
  return list;
}
function renderContent(){
  const list=contextNotes();
  const subfolders=searchTerm?folders.filter(f=>searchWords(searchTerm).every(w=>norm(f.name).includes(w))):childrenOf(selectedFolder);
  const photos=list.flatMap(note=>(note.images||[]).map(image=>({note,image})));
  const files=list.flatMap(note=>(note.files||[]).map(file=>({note,file})));
  const totals={folders:subfolders.length,notes:list.length,photos:photos.length,files:files.length};
  $('tabFolderCount').textContent=totals.folders + totals.notes;$('tabNoteCount').textContent=totals.notes;$('tabPhotoCount').textContent=totals.photos;$('tabFileCount').textContent=totals.files;
  document.querySelectorAll('.content-tab').forEach(tab=>(tab.classList.toggle('active',tab.dataset.view===contentMode),tab.setAttribute('aria-current',tab.dataset.view===contentMode?'page':'false')));
  $('subfolderGrid').innerHTML=subfolders.map(f=>{const folderIds=new Set(descendantIds(f.id));const directNotes=notes.filter(n=>folderIds.has(n.folderId)).length;const nested=childrenOf(f.id).length;return `<button class="subfolder-card" data-open-folder="${escapeHtml(f.id)}"><span class="folder-card-icon">▱</span><span class="folder-card-copy"><strong>${highlight(f.name,searchTerm)}</strong><span>${nested?`${nested} Unterordner · `:''}${directNotes} Notiz${directNotes===1?'':'en'}${nested?' insgesamt':''}</span></span><span class="folder-card-arrow">→</span></button>`}).join('');
  $('noteGrid').innerHTML=list.map(n=>{const path=folderPath(n.folderId).map(f=>f.name).join(' → ')||'Ohne Ordner';const title=n.title||'Unbenannte Notiz';return `<article class="note-card" data-note="${escapeHtml(n.id)}" tabindex="0" role="button" aria-label="Notiz öffnen: ${escapeHtml(title)}"><div class="note-path">${highlight(path,searchTerm)}</div><h3>${highlight(title,searchTerm)}</h3><p class="excerpt">${highlight(relevantExcerpt(n,searchTerm),searchTerm)}</p><div class="tags">${(n.tags||[]).slice(0,4).map(t=>`<span class="tag">${highlight(t,searchTerm)}</span>`).join('')}</div><footer><span>${formatDate(n.updatedAt)}</span><span class="thumb-count">${n.images?.length?`▧ ${n.images.length}`:''}${n.files?.length?`　⌑ ${n.files.length}`:''}</span></footer></article>`}).join('');
  revokeAll(gridUrls);$('photoGrid').innerHTML=contentMode==='photos'?photos.map(({note,image},index)=>`<button class="photo-browser-card" data-photo-note="${escapeHtml(note.id)}" data-photo-index="${index}"><img src="${assetURL(image,gridUrls)}" alt="${escapeHtml(image.description||image.name)}" loading="lazy" decoding="async"><div><strong>${escapeHtml(image.description||image.name)}</strong><small>${escapeHtml(note.title)}</small></div></button>`).join(''):'';
  $('fileGrid').innerHTML=files.map(({note,file},index)=>`<div class="file-browser-card" data-file-note="${escapeHtml(note.id)}"><span class="file-type-icon">${fileExtension(file.name)}</span><span class="file-copy"><strong>${highlight(file.name,searchTerm)}</strong><small>${escapeHtml(note.title)} · ${formatBytes(file.size||file.localBlob?.size||0)}</small></span><span class="file-actions"><button class="icon-button" data-download-file="${index}" title="Herunterladen">⇩</button><button class="icon-button" data-open-file-note="${escapeHtml(note.id)}" title="Notiz öffnen">→</button></span></div>`).join('');
  $('subfolderSection').classList.toggle('hidden',contentMode!=='folders'||subfolders.length===0);$('notesSectionHeading').classList.toggle('hidden',!['folders','notes'].includes(contentMode)||list.length===0||!!searchTerm);$('noteGrid').classList.toggle('hidden',!['folders','notes'].includes(contentMode));$('photoGrid').classList.toggle('hidden',contentMode!=='photos');$('fileGrid').classList.toggle('hidden',contentMode!=='files');
  $('subfolderCount').textContent=`${subfolders.length} Ordner`;$('visibleNoteCount').textContent=`${list.length} ${list.length===1?'Notiz':'Notizen'}`;
  const activeCount=contentMode==='folders'?totals.folders+totals.notes:totals[contentMode];$('emptyState').classList.toggle('hidden',activeCount>0);const labels={folders:['Dieser Bereich ist leer','Lege eine Notiz oder einen Unterordner an.'],notes:['Keine Notizen hier','Lege eine Notiz an oder wähle einen anderen Ordner.'],photos:['Keine Fotos hier','Füge Bilder in einer Notiz hinzu.'],files:['Keine Dateien hier','Füge Dateien in einer Notiz hinzu.']};$('emptyTitle').textContent=labels[contentMode][0];$('emptyText').textContent=labels[contentMode][1];$('emptyNewNote').textContent='＋ Neue Notiz';
  $('allCount').textContent=notes.length;$('searchSummary').classList.toggle('hidden',!searchTerm);if(searchTerm)$('searchSummary').innerHTML=`<strong>${activeCount} Treffer</strong> bei ${contentMode==='folders'?'Ordner und Notizen':contentMode==='notes'?'Notizen':contentMode==='photos'?'Fotos':'Dateien'} für „${escapeHtml(searchTerm)}“`;
  const folder=folderById(selectedFolder),modeLabel={folders:'Übersicht',notes:'Notizen',photos:'Fotos',files:'Dateien'}[contentMode];$('listTitle').textContent=searchTerm?'Suchergebnisse':folder?.name||(specialView==='recent'?'Zuletzt bearbeitet':specialView==='unfiled'?'Ohne Ordner':modeLabel);$('listEyebrow').textContent=searchTerm?'Globale Suche':modeLabel;$('listSubtitle').textContent=searchTerm?`${modeLabel} im gesamten Archiv durchsucht.`:folder?`Notizen und Medien in ${folder.name}, einschliesslich Unterordnern.`:specialView==='recent'?'Deine zuletzt geänderten Notizen.':'Dein gesamtes Archivo nach Inhaltsart sortiert.';$('folderAction').classList.toggle('hidden',contentMode!=='folders'||!!searchTerm);document.querySelectorAll('[data-special]').forEach(b=>b.classList.toggle('active',!selectedFolder&&!searchTerm&&b.dataset.special===specialView))
}
function renderAll(){renderFolderTree();renderFolderOptions();renderBreadcrumbs();renderContent();$('trashCount').textContent=trash.length;}


async function refreshData() {
  const data = await api.request('/api/state');
  if (stopped) return;
  folders = data.folders; notes = data.notes; trash = data.trash || [];
  archiveRevision = data.revision;
  if (selectedFolder && !folderById(selectedFolder)) selectedFolder = null;
  renderAll();
}
function listState() { return { selectedFolder, searchTerm, contentMode, specialView }; }
function pushListHistory() {
  const s = listState(); if (JSON.stringify(s) !== JSON.stringify(listHistory.at(-1))) listHistory.push(s);
  if (listHistory.length > 60) listHistory.shift();
}
function showList() {
  clearTimeout(autosaveTimer);
  $('editorView').classList.add('hidden'); $('listView').classList.remove('hidden'); $('contentTabs').classList.remove('hidden');
  currentNote = null; pendingImages = []; pendingFiles = []; dirty = false; recoveryKey = null; saveConflict = false;
  revokeAll(editorUrls); $('saveError').classList.add('hidden');
}
function selectFolder(id = null, special = 'all') {
  return navigate(async () => {
    pushListHistory(); selectedFolder = id || null; specialView = selectedFolder ? 'all' : special;
    if (selectedFolder) for (const f of folderPath(selectedFolder)) collapsed.delete(f.id);
    saveCollapsed(); searchTerm = ''; $('globalSearch').value = '';
    // A folder always opens its complete contents, never an invisible media filter.
    contentMode = selectedFolder ? 'folders' : 'notes';
    showList(); renderAll(); closeMobileNav();
  });
}
function goBack() {
  return navigate(async () => {
    if (currentNote) {
      // On return, reveal the note in its actual (possibly changed) folder.
      const destination = currentNote.folderId || null;
      if (notes.some(n => n.id === currentNote.id)) {
        selectedFolder = folderById(destination) ? destination : null;
        searchTerm = ''; $('globalSearch').value = ''; specialView = selectedFolder ? 'all' : 'unfiled';
        contentMode = selectedFolder ? 'folders' : 'notes';
      }
      showList(); renderAll(); return;
    }
    showList();
    const previous = listHistory.pop();
    if (previous) { ({ selectedFolder, searchTerm, contentMode, specialView } = previous); }
    else if (selectedFolder) selectedFolder = folderById(selectedFolder)?.parentId || null;
    else { searchTerm = ''; contentMode = 'folders'; specialView = 'all'; }
    if (selectedFolder && !folderById(selectedFolder)) selectedFolder = null;
    $('globalSearch').value = searchTerm; renderAll();
  });
}
function newNote() {
  return navigate(async () => {
    const date = new Date().toISOString();
    openEditor({ id: uid(), title:'', content:'', folderId:selectedFolder, tags:[], images:[], files:[], createdAt:date, updatedAt:date });
  });
}
function openEditor(note, recovered = null) {
  clearTimeout(autosaveTimer); revokeAll(editorUrls);
  currentNote = { ...note }; pendingImages = (note.images || []).map(a => ({ ...a })); pendingFiles = (note.files || []).map(a => ({ ...a }));
  editorVersion = 0; dirty = false; draftToken = uid(); recoveryKey = recovered; saveConflict = false;
  $('noteTitle').value = note.title || ''; $('noteContent').value = note.content || ''; $('noteTags').value = (note.tags || []).join(', ');
  renderFolderOptions(); $('noteFolder').value = folderById(note.folderId) ? note.folderId : '';
  $('saveStatus').textContent = note.revision ? 'Im Browser gespeichert' : 'Neue Notiz';
  $('deleteNoteButton').classList.toggle('hidden', !note.revision); $('saveError').classList.add('hidden');
  $('noteDates').textContent = note.revision ? `Erstellt ${formatDate(note.createdAt)} · Geändert ${formatDate(note.updatedAt)}` : 'Wird nach deiner ersten Eingabe automatisch gespeichert.';
  renderImages(); renderFiles();
  $('editorView').classList.remove('hidden'); $('listView').classList.add('hidden'); $('contentTabs').classList.add('hidden');
  $('noteTitle').focus();
  if (recovered) markDirty();
}
function collectNote() {
  return {
    ...currentNote, title: $('noteTitle').value.trim() || 'Unbenannte Notiz', content: $('noteContent').value,
    folderId: $('noteFolder').value || null, tags: $('noteTags').value.split(',').map(t => t.trim()).filter(Boolean),
    images: pendingImages.map(a => ({ ...a })), files: pendingFiles.map(a => ({ ...a }))
  };
}
function currentDraftKey(id) { return `${api.session.archiveId}:${id}`; }
async function saveDraft() {
  if (!currentNote || !dirty) return;
  const note = collectNote(); const token = draftToken;
  try {
    await drafts.put({ key: currentDraftKey(note.id), archiveId: api.session.archiveId, note, token, savedAt: new Date().toISOString() });
  } catch (error) {
    if (!draftWarningShown) { draftWarningShown = true; toast('Browser-Notfallkopie nicht verfügbar. Warte vor dem Schliessen unbedingt auf „Im Browser gespeichert“.', 9000); }
  }
}
function markDirty() {
  if (!currentNote) return;
  editorVersion++; dirty = true; draftToken = uid();
  $('saveStatus').textContent = connected ? 'Änderungen noch nicht gespeichert …' : 'Nur Entwurf – Speicher nicht verfügbar';
  saveDraft(); clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => saveNote(true), 800);
}
async function serializeNote(note) {
  const output = { ...note };
  for (const key of ['images', 'files']) {
    output[key] = [];
    for (const file of note[key] || []) {
      const item = { id:file.id, name:file.name, type:file.type || file.localBlob?.type || 'application/octet-stream', description:file.description || '', size:file.size || file.localBlob?.size || 0 };
      if (file.localBlob instanceof Blob) item.blob = await blobToDataURL(file.localBlob);
      output[key].push(item);
    }
  }
  return output;
}
async function saveNote(silent = false) {
  clearTimeout(autosaveTimer);
  if (savingPromise) return savingPromise;
  if (!currentNote || !dirty) return true;
  savingPromise = (async () => {
    try {
      while (currentNote && dirty) {
        const snapshot = collectNote(), version = editorVersion, token = draftToken, oldRecoveryKey = recoveryKey;
        $('saveStatus').textContent = 'Speichert auf diesem Gerät …';
        const result = await api.request('/api/notes', { method:'PUT', body: await serializeNote(snapshot) });
        const index = notes.findIndex(n => n.id === result.id);
        if (index < 0) notes.push(result); else notes[index] = result;
        // Never put an old save result into a different note or overwrite newer typing.
        if (currentNote?.id === snapshot.id) {
          currentNote = { ...result };
          const merge = (live, saved, original) => live.map(a => {
            const old = original.find(x => x.id === a.id), remote = saved.find(x => x.id === a.id);
            if (old && remote && old.localBlob === a.localBlob) { const { localBlob, ...metadata } = a; return { ...remote, description:metadata.description || '' }; }
            return a;
          });
          pendingImages = merge(pendingImages, result.images, snapshot.images);
          pendingFiles = merge(pendingFiles, result.files, snapshot.files);
          if (version === editorVersion) { dirty = false; $('saveStatus').textContent = 'Im Browser gespeichert'; }
          $('deleteNoteButton').classList.remove('hidden'); $('saveError').classList.add('hidden'); saveConflict = false;
          $('noteDates').textContent = `Erstellt ${formatDate(result.createdAt)} · Geändert ${formatDate(result.updatedAt)}`;
        }
        await drafts.remove(currentDraftKey(snapshot.id), token).catch(() => {});
        if (oldRecoveryKey && oldRecoveryKey !== currentDraftKey(snapshot.id)) await drafts.remove(oldRecoveryKey).catch(() => {});
        recoveryKey = null;
      }
      renderFolderTree(); $('allCount').textContent = notes.length;
      if (!silent) toast('Notiz lokal in diesem Browser gespeichert.');
      await updateDraftIndicator(); return true;
    } catch (error) {
      saveConflict = error.status === 409;
      $('saveStatus').textContent = saveConflict ? 'Speicherkonflikt – Entwurf erhalten' : 'Nicht im Browser gespeichert';
      $('saveErrorText').textContent = error.message; $('saveError').classList.remove('hidden');
      await saveDraft();
      if (!silent) toast(error.message, 9000);
      return false;
    }
  })();
  try { return await savingPromise; } finally { savingPromise = null; }
}
async function guardLeave() {
  if (!currentNote) return true;
  // Wait for the complete save queue, not just the first outstanding request.
  if (savingPromise && !await savingPromise) return false;
  if (dirty && !await saveNote(true)) { toast('Bitte zuerst speichern oder den Entwurf als Kopie sichern. Deine Eingaben bleiben geöffnet.', 6500); return false; }
  return !dirty;
}
async function saveAsCopy() {
  if (!currentNote) return;
  clearTimeout(autosaveTimer);
  if (savingPromise) await savingPromise;
  await exclusive(async () => {
    const oldKey = currentDraftKey(currentNote.id), copy = collectNote();
    // Preserve the form while downloading original files; no typing can race this copy.
    for (const key of ['images','files']) for (const item of copy[key]) {
      if (!(item.localBlob instanceof Blob)) item.localBlob = await api.request(item.url, { responseType:'blob' });
      item.id = uid(); delete item.hash; delete item.url;
    }
    copy.id = uid(); copy.title = [...(copy.title + ' – Kopie')].slice(0,180).join(''); delete copy.revision;
    copy.createdAt = new Date().toISOString(); openEditor(copy, oldKey); await saveNote(false);
  });
}
function renderImages() {
  revokeAll(editorUrls);
  $('imageGrid').innerHTML = pendingImages.map((image,i) => `<div class="image-item"><button class="image-preview" data-view-image="${i}" aria-label="${escapeHtml(image.name)} gross ansehen"><img src="${assetURL(image,editorUrls)}" alt="${escapeHtml(image.description || image.name)}" loading="lazy"></button><div class="image-caption-row"><input class="image-caption" data-caption="${i}" value="${escapeHtml(image.description || '')}" maxlength="500" placeholder="Bildbeschreibung" aria-label="Bildbeschreibung"><button class="remove-image" data-remove-image="${i}" aria-label="Bild entfernen">×</button></div></div>`).join('');
}
function renderFiles() {
  $('attachmentList').innerHTML = pendingFiles.map((file,i) => `<div class="attachment-row"><span class="file-type-icon">${fileExtension(file.name)}</span><span class="file-copy"><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size || file.localBlob?.size || 0)}</small></span><span class="file-actions"><button class="icon-button" data-download-attachment="${i}" aria-label="${escapeHtml(file.name)} herunterladen">⇩</button><button class="icon-button remove-image" data-remove-attachment="${i}" aria-label="Datei entfernen">×</button></span></div>`).join('');
}
function openLightbox(image, caption = '') {
  if (lightboxUrl) URL.revokeObjectURL(lightboxUrl);
  const urls = []; $('lightboxImage').src = assetURL(image, urls); lightboxUrl = urls[0] || null;
  $('lightboxCaption').textContent = caption || image.description || image.name; $('imageDialog').showModal();
}
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name || 'archivo-datei'; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function downloadAttachment(item) {
  const blob = item.localBlob || await api.request(item.url, { responseType:'blob' });
  downloadBlob(blob, item.name);
}
async function addFiles(fileList, images = false) {
  if (!currentNote) return;
  const accepted = [...fileList];
  const all = [...pendingImages,...pendingFiles,...accepted.map(f => ({size:f.size}))];
  if (all.length > 100) throw new Error('Maximal 100 Anhänge je Notiz.');
  if (accepted.some(f => f.size > api.session.maxFileBytes)) throw new Error('Maximal 25 MiB pro Datei. Keine der ausgewählten Dateien wurde hinzugefügt.');
  if (all.reduce((sum,f) => sum + (f.size || f.localBlob?.size || 0), 0) > api.session.maxNoteFileBytes) throw new Error('Maximal 100 MiB Anhänge je Notiz.');
  const supported = ['image/png','image/jpeg','image/webp','image/gif','image/svg+xml','image/avif','image/bmp'];
  if (images && accepted.some(f => !supported.includes(f.type))) throw new Error('Dieses Bildformat kann nicht angezeigt werden. Verwende PNG, JPG, WebP, GIF, SVG, AVIF oder BMP – oder lege es unter Dateien ab.');
  const target = images ? pendingImages : pendingFiles;
  for (const f of accepted) target.push({ id:uid(), name:f.name, type:f.type || 'application/octet-stream', description:'', size:f.size, localBlob:f });
  images ? renderImages() : renderFiles(); markDirty();
}
function closeMobileNav() { $('sidebar').classList.remove('open'); $('scrim').classList.remove('show'); $('menuButton').setAttribute('aria-expanded','false'); }
function closeContextMenu() { contextFolderId = null; $('contextMenu').classList.add('hidden'); }
function folderMenu(id, anchor) {
  contextFolderId = id; const menu = $('contextMenu'), rect = anchor.getBoundingClientRect(); menu.classList.remove('hidden');
  menu.style.left = `${Math.max(8, Math.min(rect.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(rect.bottom + 6, innerHeight - menu.offsetHeight - 8))}px`;
  menu.querySelector('button').focus();
}
function openFolderDialog(parentId = null, editId = null) {
  folderEditingId = editId; renderFolderOptions(); const f = folderById(editId);
  $('folderDialogTitle').textContent = f ? 'Ordner bearbeiten' : 'Neuer Ordner'; $('folderName').value = f?.name || '';
  $('folderParent').value = f?.parentId ?? parentId ?? ''; $('folderDialog').showModal(); $('folderName').focus();
}
async function saveFolder(event) {
  event.preventDefault(); const name = $('folderName').value.trim(); if (!name) return;
  const old = folderById(folderEditingId), parentId = $('folderParent').value || null;
  if (old && parentId && descendantIds(old.id).includes(parentId)) throw new Error('Ein Ordner darf nicht in seinen eigenen Unterordner verschoben werden.');
  const item = old ? {...old,name,parentId} : {id:uid(),name,parentId,createdAt:new Date().toISOString()};
  $('saveFolderButton').disabled = true;
  try {
    const saved = await api.request('/api/folders', {method:'PUT',body:item});
    const i = folders.findIndex(f => f.id === saved.id); if (i < 0) folders.push(saved); else folders[i] = saved;
    $('folderDialog').close(); const created = !folderEditingId; folderEditingId = null;
    // Newly created folders are selected, so the next note inherits this folder.
    if (created && !currentNote) {
      pushListHistory(); selectedFolder = saved.id; contentMode = 'folders'; specialView = 'all';
      searchTerm = ''; $('globalSearch').value = ''; closeMobileNav();
    }
    renderAll(); toast(created ? 'Ordner geöffnet. Neue Notizen werden hier abgelegt.' : 'Ordner gespeichert.');
  } finally { $('saveFolderButton').disabled = false; }
}
async function deleteFolder(id) {
  if (!await guardLeave()) return;
  const f = folderById(id); if (!f) return;
  const children = descendantIds(id), affected = notes.filter(n => children.includes(n.folderId));
  if (!confirm(`Ordner „${f.name}“ und ${children.length - 1} Unterordner löschen?\n\n${affected.length} Notiz(en) bleiben erhalten und werden nach „Ohne Ordner“ verschoben. Zuerst wird ein Sicherungsstand angelegt.`)) return;
  await api.request('/api/folders/' + id, {method:'DELETE',body:{revision:f.revision}});
  showList(); if (children.includes(selectedFolder)) selectedFolder = null; await refreshData(); toast('Ordner entfernt; alle Notizen wurden bewahrt.');
}
async function deleteCurrentNote() {
  if (!await guardLeave() || !currentNote) return;
  if (!confirm(`„${currentNote.title || $('noteTitle').value || 'Unbenannte Notiz'}“ in den Papierkorb verschieben?`)) return;
  await api.request('/api/notes/' + currentNote.id, {method:'POST',body:{action:'trash',revision:currentNote.revision}});
  await drafts.remove(currentDraftKey(currentNote.id)); showList(); await refreshData(); toast('Notiz im Papierkorb. Du kannst sie wiederherstellen.');
}

let operationBusy = false;
async function exclusive(fn) {
  if (operationBusy) return;
  operationBusy = true;
  document.querySelector('.app-shell').inert = true;
  $('storageDialog').inert = true;
  try { return await fn(); }
  finally { operationBusy = false; document.querySelector('.app-shell').inert = false; $('storageDialog').inert = false; }
}
async function exportBackup(format = 'zip') {
  if (!await guardLeave()) return;
  toast('Das vollständige Datenbackup wird erstellt …', 8000);
  const blob = await api.request('/api/export?format=' + format, {responseType:'blob',timeout:300000});
  downloadBlob(blob, `archivo-backup-${new Date().toISOString().slice(0,10)}.${format}`);
  preferences.set('lastBackup', Date.now());
  const expandedEstimate = [...notes,...trash].reduce((sum,n) => sum + [...n.images,...n.files].reduce((total,f) => total + f.size,0),0);
  if (blob.size > api.session.maxImportBytes || expandedEstimate > 480 * 1048576) {
    toast('Grosses Backup: Bewahre die heruntergeladene Datei separat auf. Beachte die Importgrenze von 256 MiB.', 15000);
  } else toast('Backup-Download gestartet. Bewahre die Datei zusätzlich ausserhalb dieses Computers auf.', 7000);
}
async function importBackup(file) {
  if (file.size > api.session.maxImportBytes) throw new Error('Maximal 256 MiB pro importierter Backup-Datei.');
  if (!await guardLeave()) return;
  if (!confirm(`Datenbackup „${file.name}“ importieren?\n\nDas gesamte aktuelle Archiv einschliesslich Papierkorb wird ersetzt, nicht zusammengeführt. Vorher wird automatisch ein Wiederherstellungsstand angelegt. Ungültige Backups werden abgewiesen.`)) return;
  await exclusive(async () => {
    toast('Backup wird geprüft und importiert …', 10000);
    const result = await api.request('/api/import', {method:'POST',body:file,binary:true,timeout:300000});
    showList(); selectedFolder = null; searchTerm = ''; contentMode = 'notes'; specialView = 'all'; listHistory = [];
    $('globalSearch').value = ''; await refreshData(); await updateDraftIndicator();
    toast(`Import abgeschlossen: ${result.notes} Notizen und ${result.folders} Ordner.`, 6500);
  });
}
const reasonLabels = {auto:'Automatisch vor einer Änderung',manuell:'Manueller Sicherungsstand',import:'Vor einem Import',loeschen:'Vor dem Verschieben in den Papierkorb',endgueltig:'Vor endgültigem Löschen',ordner:'Vor dem Löschen eines Ordners',wiederherstellen:'Vor einer Wiederherstellung'};
async function renderSnapshots() {
  const snapshots = await api.request('/api/backups');
  $('snapshotList').innerHTML = snapshots.length ? snapshots.map(s => `<div class="management-row"><div><strong>${escapeHtml(formatDate(s.createdAt))}</strong><small>${escapeHtml(reasonLabels[s.reason] || s.reason)} · ${formatBytes(s.bytes)} Metadaten</small></div><button class="button" data-restore-snapshot="${escapeHtml(s.name)}">Wiederherstellen</button></div>`).join('') : '<p class="muted">Noch keine Sicherungsstände. Lege jetzt den ersten an.</p>';
}
async function openStorage() {
  closeMobileNav();
  $('dataPath').textContent = api.session.dataDirectory;
  const info = await api.storageInfo();
  $('storageInfo').textContent = `Belegt: ${formatBytes(info.usage || 0)}${info.quota ? ' · Browser-Limit: ' + formatBytes(info.quota) : ''} · ${info.persistent ? 'Dauerhafter Speicher vom Browser gewährt' : 'Dauerhafter Speicher noch nicht gewährt'}`;
  await renderSnapshots(); if (!$('storageDialog').open) $('storageDialog').showModal();
}
async function restoreSnapshot(name) {
  if (!await guardLeave()) return;
  if (!confirm('Diesen Sicherungsstand wiederherstellen?\n\nDas aktuelle Archiv wird ersetzt. Dein jetziger Stand wird vorher nochmals gesichert.')) return;
  await exclusive(async () => {
    await api.request('/api/restore',{method:'POST',body:{name},timeout:300000});
    showList(); selectedFolder = null; searchTerm = ''; specialView = 'all'; contentMode = 'notes'; listHistory = [];
    $('globalSearch').value = ''; await refreshData(); await renderSnapshots(); toast('Sicherungsstand wiederhergestellt.');
  });
}
function renderTrash() {
  $('trashList').innerHTML = trash.length ? trash.map(n => `<div class="management-row"><div><strong>${escapeHtml(n.title)}</strong><small>Gelöscht ${escapeHtml(formatDate(n.deletedAt))} · ${n.images.length + n.files.length} Anhänge</small></div><div class="management-actions"><button class="button" data-restore-note="${escapeHtml(n.id)}">Wiederherstellen</button><button class="button danger-ghost" data-purge-note="${escapeHtml(n.id)}">Endgültig löschen</button></div></div>`).join('') : '<p class="muted">Dein Papierkorb ist leer.</p>';
}
async function changeTrash(id, permanent = false) {
  const note = trash.find(n => n.id === id); if (!note) return;
  if (permanent && !confirm(`„${note.title}“ endgültig aus dem Papierkorb entfernen?\n\nFrühere Sicherungen und aufbewahrte Originaldateien werden dadurch nicht gelöscht. Das ist keine sichere Datenvernichtung.`)) return;
  await api.request('/api/notes/' + id,{method:'POST',body:{action:permanent?'purge':'restore',revision:note.revision}});
  await refreshData(); renderTrash(); toast(permanent?'Notiz aus dem Papierkorb entfernt.':'Notiz wiederhergestellt.');
}
async function updateDraftIndicator() {
  lastDrafts = await drafts.all(api.session.archiveId).catch(() => []);
  $('draftCount').textContent = lastDrafts.length;
  $('draftButton').classList.toggle('hidden',lastDrafts.length === 0);
}
async function openDraftManager() {
  await updateDraftIndicator();
  $('draftList').innerHTML = lastDrafts.length ? lastDrafts.map(d => `<div class="management-row"><div><strong>${escapeHtml(d.note.title || 'Neue Notiz')}</strong><small>Browser-Entwurf vom ${escapeHtml(formatDate(d.savedAt))}</small></div><div class="management-actions"><button class="button" data-recover-draft="${escapeHtml(d.key)}">Öffnen</button><button class="button danger-ghost" data-delete-draft="${escapeHtml(d.key)}">Verwerfen</button></div></div>`).join('') : '<p class="muted">Keine offenen Entwürfe in diesem Browser.</p>';
  if (!$('draftDialog').open) $('draftDialog').showModal();
}
async function recoverDraft(key) {
  if (!await guardLeave()) return;
  const d = lastDrafts.find(x => x.key === key); if (!d) return;
  const existing = notes.find(n => n.id === d.note.id);
  $('draftDialog').close();
  openEditor(d.note,d.key);
  if ((existing && existing.revision !== d.note.revision) || (!existing && d.note.revision)) {
    clearTimeout(autosaveTimer); saveConflict = true;
    $('saveErrorText').textContent = 'Der gespeicherte Stand passt nicht mehr zu diesem Entwurf. Speichere ihn als neue Kopie, damit nichts überschrieben wird.';
    $('saveError').classList.remove('hidden'); $('saveStatus').textContent = 'Wiederhergestellt – noch nicht im Archiv';
  } else { await saveNote(false); }
}
async function reloadCurrentNote() {
  if (!currentNote) return;
  if (savingPromise) await savingPromise;
  if (dirty && !confirm('Aktuellen gespeicherten Stand laden und diesen geöffneten Entwurf verwerfen? Nutze „Als neue Kopie speichern“ oder „Entwurf herunterladen“, um deine Eingaben vorher zu sichern.')) return;
  clearTimeout(autosaveTimer);
  const id = currentNote.id; await refreshData(); await drafts.remove(currentDraftKey(id));
  const note = notes.find(n => n.id === id); note ? openEditor(note) : showList(); await updateDraftIndicator();
}
async function exportCurrentDraft() {
  if (!currentNote) return;
  const n = collectNote();
  // This emergency export is complete, even for already saved attachments.
  for (const key of ['images','files']) for (const item of n[key]) if (!item.localBlob) item.localBlob = await api.request(item.url,{responseType:'blob'});
  const note = await serializeNote(n); note.folderId = null; delete note.revision;
  const backup = {app:'Archivo',version:2,exportedAt:new Date().toISOString(),folders:[],notes:[note],trash:[]};
  downloadBlob(new Blob([JSON.stringify(backup)],{type:'application/json'}),'archivo-notfallentwurf.json');
  toast('Entwurf als eigenes JSON-Backup heruntergeladen. Beim Import würde es das Zielarchiv ersetzen.',8000);
}
async function pollStorage() {
  if (polling || stopped || operationBusy || document.hidden) return;
  polling = true;
  try {
    const status = await api.request('/api/status',{timeout:5000});
    if (status.revision !== archiveRevision || status.instance !== sessionId) {
      sessionId = status.instance; await refreshData();
      if (currentNote && !savingPromise) {
        const current = notes.find(n => n.id === currentNote.id);
        if (currentNote.revision && current?.revision !== currentNote.revision) toast('Diese Notiz wurde in einer anderen Ansicht geändert. Neue Eingaben werden nicht ungefragt darübergeschrieben.',6500);
      }
    }
  } catch { setConnected(false); }
  finally { polling = false; }
}
function bindEvents() {
  $('newNoteTop').onclick = $('newNoteButton').onclick = () => newNote();
  $('emptyNewNote').onclick = () => newNote();
  $('newRootFolder').onclick = () => openFolderDialog(); $('folderAction').onclick = () => openFolderDialog(selectedFolder);
  $('listBackButton').onclick = $('backButton').onclick = goBack;
  $('saveNoteButton').onclick = () => saveNote(false); $('deleteNoteButton').onclick = action(deleteCurrentNote);
  $('copyButton').onclick = action(async () => { const n = collectNote(); await copyText(`${n.title}\n\n${n.content}`); toast('Titel und Text kopiert.'); });
  $('retrySaveButton').onclick = () => saveNote(false); $('saveCopyButton').onclick = action(saveAsCopy);
  $('reloadNoteButton').onclick = action(reloadCurrentNote); $('exportDraftButton').onclick = action(exportCurrentDraft);
  $('exportDraftTextButton').onclick = () => {
    if (!currentNote) return;
    const n=collectNote(), names=[...n.images,...n.files].map(f=>f.name);
    const text=n.title+'\n\n'+n.content+'\n\nTags: '+n.tags.join(', ')+'\n\nNur Textkopie. Anhänge nicht enthalten: '+(names.join(', ')||'keine');
    downloadBlob(new Blob([text],{type:'text/plain;charset=utf-8'}),'archivo-notfalltext.txt');
    toast('Nur Text heruntergeladen. Anhänge sind in dieser Textdatei nicht enthalten.',6500);
  };
  document.querySelector('.brand').onclick = event => { event.preventDefault(); navigate(async () => { pushListHistory(); selectedFolder=null;searchTerm='';contentMode='folders';specialView='all';$('globalSearch').value='';showList();renderAll(); }); };
  $('globalSearch').oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => navigate(async () => {
      const query = $('globalSearch').value.trim(); if (query === searchTerm) return;
      pushListHistory(); searchTerm = query; selectedFolder = null; specialView = 'all'; contentMode = 'notes'; showList(); renderAll();
    }),180);
  };
  $('contentTabs').onclick = event => { const tab=event.target.closest('[data-view]');if(tab)navigate(async()=>{pushListHistory();contentMode=tab.dataset.view;renderContent();}); };
  $('noteGrid').onclick = event => { const card=event.target.closest('[data-note]');if(card)navigate(async()=>{const n=notes.find(n=>n.id===card.dataset.note);if(n)openEditor(n);}); };
  $('noteGrid').onkeydown = event => { if(event.key==='Enter'||event.key===' '){const card=event.target.closest('[data-note]');if(card){event.preventDefault();card.click();}} };
  $('subfolderGrid').onclick = event => {const card=event.target.closest('[data-open-folder]');if(card)selectFolder(card.dataset.openFolder);};
  $('photoGrid').onclick = event => {const card=event.target.closest('[data-photo-index]');if(!card)return;const item=contextNotes().flatMap(note=>(note.images||[]).map(image=>({note,image})))[Number(card.dataset.photoIndex)];if(item)openLightbox(item.image,`${item.image.description||item.image.name} · ${item.note.title}`);};
  $('fileGrid').onclick = action(async event => {
    const download=event.target.closest('[data-download-file]'),open=event.target.closest('[data-open-file-note]');
    if(download){const files=contextNotes().flatMap(n=>n.files||[]);const f=files[Number(download.dataset.downloadFile)];if(f)await downloadAttachment(f);}
    if(open)navigate(async()=>{const n=notes.find(n=>n.id===open.dataset.openFileNote);if(n)openEditor(n);});
  });
  $('folderTree').onclick = event => {
    const label=event.target.closest('[data-folder]'),menu=event.target.closest('[data-menu]'),toggle=event.target.closest('[data-toggle]');
    if(label)selectFolder(label.dataset.folder);if(menu)folderMenu(menu.dataset.menu,menu);
    if(toggle){const id=toggle.dataset.toggle;if(childrenOf(id).length){collapsed.has(id)?collapsed.delete(id):collapsed.add(id);saveCollapsed();renderFolderTree();}}
  };
  $('contextMenu').onclick = action(async event => {const act=event.target.dataset.folderAction;if(!act||!contextFolderId)return;const id=contextFolderId;closeContextMenu();if(act==='edit')openFolderDialog(null,id);if(act==='child')openFolderDialog(id);if(act==='delete')await deleteFolder(id);});
  $('breadcrumbs').onclick = event => {const item=event.target.closest('[data-crumb]');if(item)selectFolder(item.dataset.crumb);};
  document.querySelectorAll('[data-special]').forEach(button=>button.onclick=()=>selectFolder(null,button.dataset.special));
  $('folderForm').onsubmit = action(saveFolder);
  document.querySelectorAll('[data-close-folder]').forEach(button=>button.onclick=()=>{$('folderDialog').close();folderEditingId=null;});
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.onclick=()=>$(button.dataset.closeDialog).close());
  $('exportButton').onclick = $('exportZipButton').onclick = action(()=>exportBackup('zip'));
  $('exportJsonButton').onclick = action(()=>exportBackup('json'));
  $('importInput').onchange = action(async event=>{const f=event.target.files[0];event.target.value='';if(f)await importBackup(f);});
  $('imageInput').onchange = action(async event=>{const selected=[...event.target.files];event.target.value='';await addFiles(selected,true);});
  $('fileInput').onchange = action(async event=>{const selected=[...event.target.files];event.target.value='';await addFiles(selected,false);});
  $('imageGrid').onclick = event => {const remove=event.target.closest('[data-remove-image]'),view=event.target.closest('[data-view-image]');if(remove){pendingImages.splice(Number(remove.dataset.removeImage),1);renderImages();markDirty();}if(view){const image=pendingImages[Number(view.dataset.viewImage)];if(image)openLightbox(image);}};
  $('imageGrid').oninput = event => {if(event.target.matches('[data-caption]')){pendingImages[Number(event.target.dataset.caption)].description=event.target.value;markDirty();}};
  $('attachmentList').onclick = action(async event=>{const remove=event.target.closest('[data-remove-attachment]'),download=event.target.closest('[data-download-attachment]');if(remove){pendingFiles.splice(Number(remove.dataset.removeAttachment),1);renderFiles();markDirty();}if(download){const item=pendingFiles[Number(download.dataset.downloadAttachment)];if(item)await downloadAttachment(item);}});
  $('imageDialog').onclick = event=>{if(event.target===$('imageDialog')||event.target.closest('.lightbox-close'))$('imageDialog').close();};
  $('imageDialog').addEventListener('close',()=>{if(lightboxUrl){URL.revokeObjectURL(lightboxUrl);lightboxUrl=null;}$('lightboxImage').removeAttribute('src');});
  ['noteTitle','noteContent','noteTags','noteFolder'].forEach(id=>$(id).addEventListener('input',markDirty));
  $('menuButton').onclick=()=>{$('sidebar').classList.add('open');$('scrim').classList.add('show');$('menuButton').setAttribute('aria-expanded','true');};
  $('closeSidebar').onclick=$('scrim').onclick=closeMobileNav;
  $('storageButton').onclick=action(openStorage);
  $('mobileButton').onclick=action(openMobile);
  $('persistButton').onclick=action(async()=>{const granted=await api.requestPersistent();await openStorage();toast(granted?'Dauerhafter Browserspeicher gewährt. Backups bleiben wichtig.':'Der Browser hat den Schutz nicht gewährt. Normales Speichern funktioniert weiterhin; Backups sind wichtig.',7000);});
  $('installAppButton').onclick=action(async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installAppButton').classList.add('hidden');});
  $('snapshotButton').onclick=action(async()=>{if(!await guardLeave())return;await api.request('/api/backups',{method:'POST'});await renderSnapshots();toast('Sicherungsstand in diesem Browser angelegt.');});
  $('copyPathButton').onclick=action(async()=>{await copyText(api.session.dataDirectory);toast('Speicherort kopiert.');});
  $('snapshotList').onclick=action(async event=>{const b=event.target.closest('[data-restore-snapshot]');if(b)await restoreSnapshot(b.dataset.restoreSnapshot);});
  $('trashButton').onclick=action(async()=>{await refreshData();renderTrash();$('trashDialog').showModal();});
  $('trashList').onclick=action(async event=>{const restore=event.target.closest('[data-restore-note]'),purge=event.target.closest('[data-purge-note]');if(restore)await changeTrash(restore.dataset.restoreNote);if(purge)await changeTrash(purge.dataset.purgeNote,true);});
  $('draftButton').onclick=action(openDraftManager);
  $('draftList').onclick=action(async event=>{const open=event.target.closest('[data-recover-draft]'),remove=event.target.closest('[data-delete-draft]');if(open)await recoverDraft(open.dataset.recoverDraft);if(remove&&confirm('Diesen Browser-Entwurf unwiderruflich verwerfen?')){await drafts.remove(remove.dataset.deleteDraft);await openDraftManager();}});
  $('reconnectButton').onclick=action(async()=>{await connectStorage();setConnected(true);await refreshData();if(dirty&&!saveConflict)await saveNote(false);});
  document.addEventListener('click',event=>{if(!event.target.closest('#contextMenu')&&!event.target.closest('[data-menu]'))closeContextMenu();});
  window.addEventListener('resize',closeContextMenu);
  document.addEventListener('keydown',event=>{
    if(operationBusy)return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='s'&&currentNote){event.preventDefault();saveNote(false);}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();$('globalSearch').focus();}
    if(event.key==='Escape'){closeContextMenu();closeMobileNav();}
  });
  document.addEventListener('archivo-connection',event=>{if(!stopped)setConnected(event.detail);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)saveDraft();else pollStorage();});
  window.addEventListener('beforeunload',event=>{if(dirty||savingPromise){saveDraft();event.preventDefault();event.returnValue='';}});
  const kbd=document.querySelector('.search-wrap kbd');if(!/Mac|iPhone|iPad/.test(navigator.platform||''))kbd.textContent='Strg K';
}
let installPrompt = null;
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt=event; $('installAppButton')?.classList.remove('hidden'); });
async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try { await navigator.clipboard.writeText(text); return; } catch {}
  }
  const area=document.createElement('textarea'); area.value=text;area.readOnly=true;
  area.style.cssText='position:fixed;left:0;top:0;opacity:0';
  const host=[...document.querySelectorAll('dialog')].find(d=>d.open)||document.body;
  host.append(area);area.select();area.setSelectionRange(0,text.length);
  const done=document.execCommand('copy');area.remove();
  if(!done)throw new Error('Kopieren ist in diesem Browser nicht erlaubt. Bitte den Text bzw. die angezeigte Adresse manuell markieren und kopieren.');
}
async function connectStorage() { return api.connect(); }
function configureBrowserUI() { $('appVersion').textContent=api.session.version; }
async function openMobile() { closeMobileNav(); $('installAppButton').classList.toggle('hidden',!installPrompt); $('mobileDialog').showModal(); }
async function init() {
  try {
    if(location.protocol==='file:')throw new Error('Diese Ausgabe wird über Vercel oder einen lokalen Webserver geöffnet, nicht per Doppelklick auf index.html.');
    await connectStorage();
    collapsed=new Set(preferences.get('collapsed',[]));
    await drafts.init().catch(()=>{});await refreshData();bindEvents();setConnected(true);configureBrowserUI();await updateDraftIndicator();
    if(lastDrafts.length)toast(`${lastDrafts.length} ungespeicherte Browser-Entwürfe gefunden. Öffne „Entwürfe wiederherstellen“ in der Seitenleiste.`,10000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(error=>console.warn('Offline-Oberfläche konnte nicht vorbereitet werden.',error));
    setInterval(pollStorage,3500);

  } catch(error) {
    console.error(error);
    document.body.innerHTML=`<main class="connection-stopped"><h1>Archivo konnte den Speicher nicht öffnen.</h1><p>${escapeHtml(error.message)}</p><p>Öffne deine feste Vercel-Adresse mit einem aktuellen Browser. Erlaube Websitedaten und verwende keinen privaten Browsermodus. Lösche vorhandene Websitedaten nicht ohne Backup.</p><button class="button" id="retryStart">Erneut versuchen</button></main>`;
    $('retryStart').onclick=()=>location.reload();
  }
}
init();
