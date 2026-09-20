/* Archivio M2: disposable design/motion prototype. No archive writes, fetches or uploads.
   All interactions except theme preference are deliberately session-only. */
(() => {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shapes={
 search:'<circle cx="10.8" cy="10.8" r="6.4"/><path d="m16 16 4.3 4.3"/>',
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
 note:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
 photo:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
 file:'<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"/><path d="M13 3v7h7M8 15h8M8 18h5"/>',
 folder:'<path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 8h18"/>',
 star:'<path d="m12 3 2.8 5.8 6.4 1-4.6 4.5 1 6.4-5.6-3-5.6 3 1-6.4-4.6-4.5 6.4-1Z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 settings:'<path d="m9.5 3-.7 2.4-2.1 1.2-2.4-.6-2.4 4.1 1.8 1.8v2.4l-1.8 1.8 2.4 4.1 2.4-.6 2.1 1.2.7 2.4h5l.7-2.4 2.1-1.2 2.4.6 2.4-4.1-1.8-1.8v-2.4l1.8-1.8L19.7 6l-2.4.6-2.1-1.2-.7-2.4Z" transform="translate(1,-1) scale(.92)"/><circle cx="12" cy="12" r="3"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',x:'<path d="m6 6 12 12M18 6 6 18"/>',
 chevron:'<path d="m9 5 7 7-7 7"/>',down:'<path d="m6 9 6 6 6-6"/>',back:'<path d="m14 5-7 7 7 7"/>',
 arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',check:'<path d="m5 12 4 4L19 6"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
 moon:'<path d="M21 13.1A9 9 0 0 1 10.9 3a9 9 0 1 0 10.1 10.1Z"/>',
 monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 pin:'<path d="m9 3 6 0-1 5 4 5H6l4-5ZM12 13v8"/>',
 expand:'<path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M3 3l5 5m13-5-5 5m5 13-5-5M3 21l5-5"/>',
 shrink:'<path d="M3 8h5V3m8 0v5h5M21 16h-5v5M8 21v-5H3M8 8 3 3m13 5 5-5m-5 13 5 5M8 16l-5 5"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 edit:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-5-5L4 15Z"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 zoom:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6M10 7v6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.5"/>',
 layers:'<path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5m-18 5 9 5 9-5"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 return:'<path d="M20 5v8H5m5-5-5 5 5 5"/>',
 motion:'<path d="M2 8h6m-4 4h4m-2 4h2"/><rect x="11" y="5" width="10" height="14" rx="3"/>',
 tag:'<path d="M3 3v8l10 10 8-8L11 3Z"/><circle cx="7.5" cy="7.5" r="1"/>',
 sort:'<path d="M4 6h16M4 12h12M4 18h8"/>',
 leaf:'<path d="M4 19C-1 8 10 3 21 3c0 11-5 19-14 17M3 22C5 13 10 8 17 6"/>',
 fish:'<path d="M4 12c5-8 12-8 16 0-4 8-11 8-16 0Zm0 0-3-4v8Z"/><circle cx="15" cy="11" r=".8"/>',
 bulb:'<path d="M9 18h6M10 21h4M8 15c-7-7 0-16 7-11 4 3 3 8 1 10l-1 2H9Z"/>',
 compass:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2 6-6 2 2-6Z"/>',
 heart:'<path d="M12 21C-4 11 3-4 12 6c9-10 16 5 0 15Z"/>',
 book:'<path d="M12 5v16M3 3c4 0 7 1 9 3 2-2 5-3 9-3v16c-4 0-7 0-9 2-2-2-5-2-9-2Z"/>'
};
const icon=(name,cls='')=>`<svg class="${esc(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name]||shapes.note}</svg>`;
const leaf=()=>'<svg class="leaf-mark" viewBox="0 0 46 52" aria-hidden="true"><path d="M9 37C-1 19 21 7 42 3c-1 21-5 40-24 41-3 0-5-1-7-3 4-11 12-21 24-30C21 19 13 29 8 45L5 51" fill="currentColor"/><path d="M8 46c5-17 13-27 27-35" fill="none" stroke="var(--sidebar)" stroke-width="1.4"/></svg>';
const art=window.ARCHIVIO_ART;
const photo=(key,alt,extra='')=>`<img src="${art[key]||art.leaf}" alt="${esc(alt)}" ${extra} draggable="false">`;
const ib=(name,label,action,extra='')=>`<button class="icon-btn" type="button" aria-label="${esc(label)}" title="${esc(label)}" data-action="${action}" ${extra}>${icon(name)}</button>`;
const folders=[
 {id:'plants',name:'Pflanzen',icon:'folder',color:'#6e8e65',parent:null},
 {id:'zimmer',name:'Zimmerpflanzen',icon:'folder',color:'#6e8e65',parent:'plants'},
 {id:'aquarium',name:'Aquarium',icon:'fish',color:'#7d9f9c',parent:null},
 {id:'recipes',name:'Rezepte',icon:'book',color:'#be8c72',parent:null},
 {id:'travel',name:'Reisen',icon:'compass',color:'#9691af',parent:null},
 {id:'ideas',name:'Ideen',icon:'bulb',color:'#b89b5a',parent:null}
];
const seed=[
 {id:'monstera',title:'Monstera pflegen',summary:'Meine Notizen zu Licht, Pflege und den kleinen Veränderungen.',folder:'zimmer',image:'leaf',tags:['Pflege','Licht','Zimmerpflanze'],star:true,pin:true,time:'Heute, 10:24',body:'Ein Platz für alles, was ich über meine Monstera festhalten möchte. Beobachtungen, kleine Routinen und neue Ideen – gesammelt an einem Ort.',checks:['Einen hellen Platz am Fenster auswählen','Wachstum mit einem Foto dokumentieren','Meine Beobachtungen ergänzen','Einen schönen Übertopf aussuchen'],done:[true,true,false,false],images:['leaf','room'],pdf:true},
 {id:'philodendron',title:'Philodendron – meine Sammlung',summary:'Neue Blätter, Lieblingsplätze und kleine Beobachtungen.',folder:'zimmer',image:'canopy',tags:['Sammlung','Beobachtungen'],star:false,pin:false,time:'Gestern, 18:10',body:'Die kleinen Veränderungen sieht man oft erst im Rückblick. Hier sammle ich Bilder und Notizen zu meinen grünen Mitbewohnern.',checks:['Ein neues Foto ergänzen','Den Standort notieren','Meine Lieblingsblätter markieren'],done:[true,false,false],images:['canopy'],pdf:false},
 {id:'repot',title:'Zeit zum Umtopfen',summary:'Was ich vorbereiten möchte. Eine kleine Materialliste.',folder:'zimmer',image:'room',tags:['Projekt','Frühling'],star:true,pin:false,time:'18. September',body:'Ein freier Nachmittag, ein bisschen Erde und Zeit für meine Pflanzen. Mit dieser Liste behalte ich im Blick, was ich vorbereiten möchte.',checks:['Töpfe zusammenstellen','Materialliste schreiben','Vorher-Foto aufnehmen'],done:[false,true,false],images:['room'],pdf:false},
 {id:'light',title:'Licht & Lieblingsplätze',summary:'Fensterplätze vergleichen und neue Ideen festhalten.',folder:'zimmer',image:'leaf',tags:['Wohnen','Inspiration'],star:false,pin:false,time:'17. September',body:'Manchmal macht schon ein anderer Platz einen Raum ganz neu. Meine Sammlung von Fensterplätzen, schönen Ecken und Ideen für mehr Grün.',checks:['Das Arbeitszimmer fotografieren','Ideen für das Regal sammeln'],done:[true,false],images:['leaf','room'],pdf:false},
 {id:'setup',title:'Mein grünes Zuhause',summary:'Ein Regal, viele Ideen und ein bisschen mehr Natur.',folder:'zimmer',image:'room',tags:['Zuhause','Ideen'],star:true,pin:true,time:'15. September',body:'Weniger Dinge, die herumliegen. Mehr Dinge, die Freude machen. Hier entsteht mein kleines Moodboard für ein grünes Zuhause.',checks:['Den Platz am Bücherregal ausmessen','Eine kleine Skizze machen','Die Sammlung ergänzen'],done:[false,false,false],images:['room','canopy'],pdf:false},
 {id:'cuttings',title:'Kleine Anfänge',summary:'Meine Stecklinge und alles, was noch wachsen darf.',folder:'zimmer',image:'canopy',tags:['Stecklinge','Tagebuch'],star:false,pin:false,time:'12. September',body:'Ein kleines Tagebuch für meine Stecklinge. Jedes neue Blatt ist ein guter Grund, kurz innezuhalten und genauer hinzuschauen.',checks:['Gläser beschriften','Ein Foto für das Tagebuch machen'],done:[true,false],images:['canopy'],pdf:false},
 {id:'travel-note',title:'Ein Wochenende draussen',summary:'Orte, an denen ich einmal durchatmen möchte.',folder:'travel',image:null,tags:['Unterwegs','Ideen'],star:true,pin:false,time:'10. September',body:'Ein freies Wochenende ohne Eile. Ein paar Wege, ein gutes Buch und ein Platz mit Aussicht. Hier sammle ich meine Ideen.',checks:['Eine Route auswählen','Eine kleine Packliste schreiben'],done:[false,false],images:[],pdf:false},
 {id:'ideas-note',title:'Gedanken für später',summary:'Noch nicht fertig gedacht. Aber zu gut, um sie zu vergessen.',folder:'ideas',image:null,tags:['Gedanken'],star:false,pin:false,time:'8. September',body:'Manche Gedanken brauchen keinen fertigen Plan. Nur einen Ort, an dem sie bleiben können, bis die Zeit dafür richtig ist.',checks:['Die Idee für das Fotobuch ergänzen'],done:[false],images:[],pdf:false}
];
const state={notes:structuredClone(seed),view:'notes',folder:'zimmer',selected:'monstera',detail:false,focus:false,sort:'recent',favorites:false,theme:window.ARCHIVIO_THEME||'system',reduce:false,dialog:null,searchType:'all',searchIndex:0};
const osReduced=matchMedia('(prefers-reduced-motion: reduce)'), osDark=matchMedia('(prefers-color-scheme: dark)'), mobile=matchMedia('(max-width:760px)');
const reduced=()=>osReduced.matches||state.reduce;
const app=$('#app'), overlay=$('#overlay');
let dialogToken=0,closing=false,opener=null,photoOrigin=null,toastTimer,selectedColor='#6e8e65',sequence=0;
const animations=new WeakMap();
const note=()=>state.notes.find(n=>n.id===state.selected&&!n.deleted);
const folderName=id=>folders.find(f=>f.id===id)?.name||'Ohne Ordner';
function belongs(n,id){if(id==='unfiled')return !n.folder;return !id||n.folder===id||folders.find(f=>f.id===n.folder)?.parent===id;}
function visibleNotes(){return state.notes.filter(n=>state.view==='trash'?n.deleted:!n.deleted&&belongs(n,state.folder)&&(!(state.view==='favorites'||state.favorites)||n.star)).sort((a,b)=>state.sort==='az'?a.title.localeCompare(b.title,'de'):0);}
function countFolder(id){return state.notes.filter(n=>!n.deleted&&belongs(n,id)).length;}
/* Sampled, critically restrained spring. This animates transforms, never layout per frame. */
function springFrames(from={x:0,y:10,sx:.965,sy:.965},to={x:0,y:0,sx:1,sy:1}){
 const frames=[];for(let i=0;i<=40;i++){const t=i/40, p=i===40?1:1-Math.exp(-8*t)*(Math.cos(9*t)+(8/9)*Math.sin(9*t));
 const v=k=>(from[k]??to[k])+(to[k]-(from[k]??to[k]))*p;
 frames.push({offset:t,transform:`translate(${v('x')}px,${v('y')}px) scale(${v('sx')},${v('sy')})`});}return frames;
}
function animate(el,frames,options={}){
 if(!el?.animate)return Promise.resolve();animations.get(el)?.cancel();
 const a=el.animate(frames,{duration:reduced()?1:240,easing:'cubic-bezier(.2,.8,.2,1)',...options,...(reduced()?{duration:1}:{} )});animations.set(el,a);return a.finished.catch(()=>{});
}
function reveal(el){if(!el||reduced())return;animate(el,[{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:230});}
function render(animateContent=false){
 const previousLine=$('.tab-line')?.getBoundingClientRect();
 const listScroll=$('.rows')?.scrollTop||0,editorScroll=$('.editor-scroll')?.scrollTop||0;
 const counts={notes:state.notes.filter(n=>!n.deleted).length,star:state.notes.filter(n=>!n.deleted&&n.star).length,trash:state.notes.filter(n=>n.deleted).length};
 app.innerHTML=`<div class="app-shell">
 <aside class="sidebar" id="sidebar" aria-label="Archivnavigation"><button class="brand" data-action="view" data-view="overview" aria-label="Archivio – Start">${leaf()}<span class="brand-word">Archivio<small>Wissen bleibt.</small></span></button>${ib('x','Navigation schliessen','close-sidebar','class="mobile-close mobile-only"')}
 <button class="search-trigger" data-action="search">${icon('search')}<span>Suche in Archivio …</span><kbd>⌘ K</kbd></button>
 <nav class="nav-block" aria-label="Bibliothek">${nav('home','Übersicht','overview')}${nav('note','Notizen','notes',counts.notes)}${nav('photo','Fotos','photos')}${nav('file','Dateien','files')}${nav('star','Favoriten','favorites',counts.star)}</nav>
 <div class="sidebar-label"><span>Meine Ordner</span><button data-action="new-folder" title="Ordner erstellen" aria-label="Ordner erstellen">${icon('plus')}</button></div><nav class="folder-list" aria-label="Ordner">${folders.map(f=>`<button class="nav-row ${state.folder===f.id?'active':''} ${f.parent?'folder-child':'folder-parent'}" data-action="folder" data-id="${f.id}" ${state.folder===f.id?'aria-current="page"':''} style="--folder:${f.color}">${f.id==='plants'?icon('down','chevron'):''}${icon(f.icon,'folder-icon')}<span>${esc(f.name)}</span><span class="count">${countFolder(f.id)}</span></button>`).join('')}<button class="nav-row" data-action="folder" data-id="unfiled">${icon('folder')}<span>Ohne Ordner</span><span class="count">${state.notes.filter(n=>!n.deleted&&!n.folder).length}</span></button></nav>
 <div class="sidebar-bottom">${nav('trash','Papierkorb','trash',counts.trash)}<button class="nav-row" data-action="settings">${icon('settings')}Einstellungen</button><div class="sidebar-quote">${photo('leaf','')}<p>Kleine Dinge.<br>Grosse<br>Gedanken.</p></div><div class="sidebar-footnote"><span class="status-dot"></span>M2 · Designstudie</div></div></aside>
 <button class="sidebar-scrim" data-action="close-sidebar" aria-label="Navigation schliessen" tabindex="-1"></button>
 <div class="main-shell"><header class="topbar"><button class="brand mobile-only" data-action="view" data-view="overview" aria-label="Archivio – Start">${leaf()}<span class="brand-word">Archivio</span></button><div class="breadcrumbs desktop-only">${icon('folder')}<button data-action="view" data-view="folders">Meine Bibliothek</button>${icon('chevron')}<span>${esc(state.folder?folderName(state.folder):viewTitle())}</span></div><div class="topbar-right"><button class="demo-badge" data-action="about" aria-label="Über diese Design-Demo">${icon('layers')}<span>Design-Demo</span></button><div class="theme-strip desktop-only" aria-label="Darstellung">${['light','dark'].map((v,i)=>`<button class="icon-btn ${document.documentElement.dataset.theme===v?'chosen':''}" data-action="theme" data-theme="${v}" aria-label="${i?'Darkmode':'Lightmode'}" aria-pressed="${document.documentElement.dataset.theme===v}">${icon(i?'moon':'sun')}</button>`).join('')}</div><div class="theme-strip mobile-only">${ib(document.documentElement.dataset.theme==='dark'?'sun':'moon','Darstellung wechseln','toggle-theme')}</div><button class="primary desktop-only" data-action="quick">${icon('plus')}Neu${icon('down')}</button></div></header>
 <button class="mobile-search mobile-only" data-action="search">${icon('search')}<span>Suche in Archivio …</span><span>⌘ K</span></button>
 <nav class="tabs" aria-label="Inhaltsansicht">${[['overview','Übersicht','home'],['notes','Notizen','note'],['photos','Fotos','photo'],['files','Dateien','file']].map(([v,t,i])=>`<button class="tab ${activeTab()===v?'active':''}" data-action="tab" data-view="${v}" ${activeTab()===v?'aria-current="page"':''}>${icon(i)}${t}</button>`).join('')}<span class="tabs-meta">Dein Wissen. Dein Rhythmus.</span><i class="tab-line" aria-hidden="true"></i></nav>
 <main class="stage ${state.detail?'is-detail':''} ${state.focus?'focused':''}" id="stage" tabindex="-1">${stageContent()}</main>
 <footer class="status-bar"><span>${icon('layers')}Design-Demo · Änderungen nur in dieser Sitzung</span><button data-action="motion">Bewegung erleben ${icon('arrow')}</button></footer></div>
 <nav class="mobile-nav" aria-label="Hauptnavigation">${[['overview','home','Start'],['folders','folder','Ordner']].map(([v,i,t])=>`<button data-action="view" data-view="${v}" class="${state.view===v?'active':''}">${icon(i)}${t}</button>`).join('')}<button class="mobile-plus" data-action="quick" aria-label="Neu hinzufügen">${icon('plus')}</button><button data-action="search">${icon('search')}Suche</button><button data-action="settings">${icon('more')}Mehr</button></nav></div>`;
 // The desktop close control is only present for mobile drawer use.
 const close=$('[data-action="close-sidebar"]', $('#sidebar'));if(close){close.classList.add('mobile-close','mobile-only');}
 if($('.rows'))$('.rows').scrollTop=listScroll;if($('.editor-scroll'))$('.editor-scroll').scrollTop=editorScroll;
 moveTabLine(false);
 if(previousLine&&!reduced()){const line=$('.tab-line'),tabs=$('.tabs'),r=line.getBoundingClientRect();if(Math.abs(r.left-previousLine.left)>1){animate(line,[{transform:`translateX(${previousLine.left-tabs.getBoundingClientRect().left-parseFloat(getComputedStyle(tabs).paddingLeft)}px)`,width:previousLine.width+'px'},{transform:line.style.transform,width:line.style.width}],{duration:290});}}
 if(animateContent)reveal($('#stage'));
}
function nav(i,t,v,c){return `<button class="nav-row ${state.view===v?'active':''}" data-action="view" data-view="${v}" ${state.view===v?'aria-current="page"':''}>${icon(i)}<span>${t}</span>${typeof c==='number'?`<span class="count">${c}</span>`:''}</button>`;}
function viewTitle(){return {overview:'Übersicht',notes:'Alle Notizen',photos:'Fotos',files:'Dateien',favorites:'Favoriten',folders:'Meine Ordner',trash:'Papierkorb'}[state.view]||'Bibliothek';}
function activeTab(){return ['notes','photos','files','overview'].includes(state.view)?state.view:'notes';}
function moveTabLine(smooth=true){const tabs=$('.tabs'),target=$('.tab.active'),line=$('.tab-line');if(!tabs||!target||!line)return;const old=smooth?line.style.transform:null;line.style.transition=smooth?'':'none';line.style.width=target.offsetWidth+'px';line.style.transform=`translateX(${target.offsetLeft-tabs.clientLeft-parseFloat(getComputedStyle(tabs).paddingLeft)}px)`;line.style.left=getComputedStyle(tabs).paddingLeft;if(!smooth)requestAnimationFrame(()=>line.style.transition='');}
function stageContent(){
 if(state.view==='overview')return overview();if(state.view==='folders')return folderView();if(state.view==='photos')return mediaView();if(state.view==='files')return filesView();if(state.view==='trash')return trashView();
 const ns=visibleNotes();return `<div class="notes-layout"><section class="note-list" aria-label="Notizliste"><div class="list-heading"><div><h2>${esc(state.folder?folderName(state.folder):viewTitle())}</h2><p>${ns.length} ${ns.length===1?'Notiz':'Notizen'} · Beispielsammlung</p></div>${ib('plus','Neue Demo-Notiz','new-note')}</div><div class="list-tools"><button class="sort-button" data-action="sort">${state.sort==='az'?'Titel A–Z':'Zuletzt bearbeitet'}${icon('down')}</button>${ib(state.favorites?'star':'sort',state.favorites?'Alle Notizen zeigen':'Nur Favoriten zeigen','filter')}</div><div class="rows">${ns.length?ns.map(n=>row(n)).join(''):`<div class="empty-state">${icon('note')}<p>Hier beginnt etwas Neues.</p><button class="secondary" data-action="new-note">Notiz anlegen</button></div>`}</div></section>${note()&&ns.some(n=>n.id===note().id)?editor(note()):`<article class="editor"><div class="empty-state">${leaf()}<h2>Raum für Gedanken.</h2><p>Wähle eine Notiz oder lege eine neue Demo-Notiz an.</p><button class="primary" data-action="new-note">${icon('plus')}Neue Notiz</button></div></article>`}</div>`;
}
function row(n){return `<button class="note-row ${state.selected===n.id?'active':''}" data-action="select" data-id="${n.id}" ${state.selected===n.id?'aria-current="true"':''}><span class="note-thumb">${n.image?photo(n.image,''):icon('note')}</span><span class="note-copy"><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><time>${esc(n.time)}</time></span>${n.pin?icon('pin','pin-symbol'):''}</button>`;}
function editor(n){return `<article class="editor" aria-label="Geöffnete Notiz"><div class="editor-bar"><div class="bar-left">${ib('back','Zurück zur Notizliste','back','data-back-button="true"')}<span class="doc-location">${icon('note')}<span>${esc(folderName(n.folder))}</span></span></div><div class="bar-right">${ib('star',n.star?'Aus Favoriten entfernen':'Zu Favoriten hinzufügen','favorite',`aria-pressed="${n.star}" data-id="${n.id}"`)}${ib('edit','Demo-Notiz bearbeiten','edit',`data-id="${n.id}"`)}${ib(state.focus?'shrink':'expand',state.focus?'Fokusmodus beenden':'Fokusmodus öffnen','focus','data-focus-button="true"')}${ib('more','Notizaktionen','note-menu')}</div></div><div class="editor-scroll"><p class="note-kicker">Gedanken, die bleiben.</p><h1>${esc(n.title)}</h1><div class="tags">${n.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}<button class="tag-add" data-action="edit" aria-label="Stichwörter bearbeiten">${icon('plus')}</button></div><p class="intro-text">${esc(n.body).replace(/\n/g,'<br>')}</p>${n.checks.length?`<h2>Meine kleine Checkliste</h2><ul class="checklist">${n.checks.map((c,i)=>`<li><label class="checkline"><input type="checkbox" data-check="${i}" ${n.done[i]?'checked':''}><span class="check-box">${icon('check')}</span><span>${esc(c)}</span></label></li>`).join('')}</ul>`:''}
 <div class="attachment-heading"><h2>Bilder & Unterlagen</h2><span>${n.images.length+(n.pdf?1:0)} Anhänge</span></div><div class="attachments">${n.images.map((key,i)=>`<button class="photo-tile" data-action="photo" data-key="${key}" aria-label="${i?'Pflanze am Fenster':'Monstera-Blatt'} vergrössern">${photo(key,i?'Pflanze am Fenster':'Monstera-Blatt')}<span class="photo-zoom">${icon('expand')}</span></button>`).join('')}${n.pdf?`<button class="pdf-card" data-action="pdf"><span class="pdf-icon">PDF</span><strong>Meine Pflanzennotizen</strong><small>Beispieldatei</small></button>`:''}</div><button class="add-attachment" data-action="attachments">${icon('plus')}Anhang hinzufügen</button></div><footer class="editor-footer"><span>${icon('info')}Demo-Inhalt · nicht dauerhaft gespeichert</span><button data-action="history">${icon('clock')}Versionen</button></footer></article>`;}
function overview(){return `<div class="overview"><div class="overview-heading"><div><p class="eyebrow">Deine persönliche Bibliothek</p><h1>Wissen bleibt.</h1><p>Ein ruhiger Ort für alles, was dir wichtig ist.</p></div><span class="date-label">Blättere durch deine Beispielsammlung</span></div><div class="overview-grid"><section class="overview-section"><div class="section-heading"><h2>Zuletzt geöffnet</h2><button class="text-link" data-action="view" data-view="notes">Alle Notizen${icon('arrow')}</button></div><div class="recent-grid">${state.notes.filter(n=>!n.deleted).slice(0,4).map(n=>`<button class="recent-card" data-action="select" data-id="${n.id}">${n.image?photo(n.image,'','class="cover"'):`<span class="cover">${icon('note')}</span>`}<div class="card-text"><h3>${esc(n.title)}</h3><p>${esc(folderName(n.folder))} · ${esc(n.time)}</p></div></button>`).join('')}</div></section><div class="overview-aside"><section class="overview-section"><div class="section-heading"><h2>Deine Themen</h2><button class="text-link" data-action="view" data-view="folders">Alle${icon('arrow')}</button></div><div class="folder-shortcuts">${folders.filter(f=>!f.parent).slice(0,4).map(folderCard).join('')}</div></section><button class="quote-card" data-action="motion" aria-label="Bewegung und Design ausprobieren">${photo('canopy','')}<p>Mehr Raum.<br>Für deine Gedanken.</p></button></div></div></div>`;}
function folderCard(f){return `<button class="folder-shortcut" style="--folder:${f.color}" data-action="folder" data-id="${f.id}">${icon(f.icon)}<strong>${esc(f.name)}</strong><small>${countFolder(f.id)} Notizen</small></button>`;}
function folderView(){return `<div class="media-view"><div class="media-heading"><p class="eyebrow">Zusammenhalten</p><h1>Deine Themen.</h1><p>Gib deinen Gedanken einen Platz.</p></div><div class="folder-grid">${folders.filter(f=>!f.parent).map(folderCard).join('')}<button class="folder-shortcut" data-action="new-folder">${icon('plus')}<strong>Neuer Ordner</strong><small>Ein neues Thema beginnen</small></button></div></div>`;}
function mediaView(){const media=state.notes.filter(n=>!n.deleted&&belongs(n,state.folder)).flatMap(n=>n.images.map((key,i)=>({n,key,i})));return `<div class="media-view"><div class="media-heading"><p class="eyebrow">Momente bewahren</p><h1>Deine Bilder.</h1><p>${media.length} Bilder in ${state.folder?esc(folderName(state.folder)):'deiner Beispielsammlung'}.</p></div><div class="photo-gallery">${media.map(({n,key,i})=>`<article class="gallery-card"><button class="photo-tile" data-action="photo" data-key="${key}" aria-label="Bild ${i+1} von ${esc(n.title)} vergrössern">${photo(key,'Bild aus '+n.title)}<span class="photo-zoom">${icon('expand')}</span></button><div class="gallery-caption"><div>${esc(n.title)}<small>${esc(folderName(n.folder))}</small></div>${ib('arrow','Zur zugehörigen Notiz','select',`data-id="${n.id}"`)}</div></article>`).join('')}</div>${!media.length?empty('photo','Noch keine Bilder.','Füge einer Demo-Notiz ein Beispielbild hinzu.'):''}</div>`;}
function filesView(){const ns=state.notes.filter(n=>!n.deleted&&n.pdf&&belongs(n,state.folder));return `<div class="media-view"><div class="media-heading"><p class="eyebrow">Alles beisammen</p><h1>Deine Unterlagen.</h1><p>Dokumente und die Gedanken dahinter.</p></div>${ns.map(n=>`<button class="file-row" data-action="pdf"><span class="pdf-icon">PDF</span><div>Meine Pflanzennotizen<small>${esc(n.title)} · Beispiel für eine Dateikarte</small></div>${icon('chevron')}</button>`).join('')}${!ns.length?empty('file','Noch keine Unterlagen.','Die Dateikarten zeigen später die Anhänge deiner Notizen.'):''}</div>`;}
function empty(i,h,p){return `<div class="empty-state">${icon(i)}<h2>${h}</h2><p>${p}</p></div>`;}
function trashView(){const ns=state.notes.filter(n=>n.deleted);return `<div class="media-view"><div class="media-heading"><p class="eyebrow">Nichts überstürzen</p><h1>Papierkorb.</h1><p>Demo-Notizen kannst du hier zurückholen.</p></div>${ns.length?ns.map(n=>`<button class="file-row" data-action="restore" data-id="${n.id}">${icon('note')}<div>${esc(n.title)}<small>Zum Wiederherstellen anklicken</small></div>${icon('return')}</button>`).join(''):empty('trash','Alles an seinem Platz.','Noch keine Demo-Notizen im Papierkorb.')}</div>`;}
function header(title){return `<div class="sheet-handle" aria-hidden="true"></div><div class="dialog-header"><h2 id="dialog-title" tabindex="-1">${title}</h2>${ib('x','Schliessen','close')}</div>`;}
function modalContent(kind){
 if(kind==='quick')return `${header('Etwas Neues festhalten')}<div class="quick-actions">${[['new-note','note','Neue Notiz','Ein Gedanke, eine Idee, eine kleine Liste.'],['new-folder','folder','Neuer Ordner','Ein Platz für ein neues Thema.'],['attachments','photo','Bild oder Datei','Beispielanhänge ausprobieren.']].map(([a,i,h,p])=>`<button class="quick-action" data-action="${a}"><span class="action-icon">${icon(i)}</span><span><strong>${h}</strong><small>${p}</small></span>${icon('chevron')}</button>`).join('')}</div><p class="form-hint">Design-Demo · keine dauerhafte Speicherung</p>`;
 if(kind==='new-note'||kind==='edit'){const n=kind==='edit'?note():null;return `${header(n?'Notiz bearbeiten':'Ein neuer Gedanke')}<form id="note-form" data-edit="${n?esc(n.id):''}"><input class="note-edit-title" name="title" placeholder="Titel deiner Notiz" aria-label="Titel deiner Notiz" maxlength="120" required value="${esc(n?.title||'')}" data-autofocus><div class="field-row"><label><span class="field-label">Ordner</span><select class="field" name="folder"><option value="">Ohne Ordner</option>${folders.map(f=>`<option value="${f.id}" ${(n?.folder||state.folder)===f.id?'selected':''}>${f.parent?'↳ ':''}${esc(f.name)}</option>`).join('')}</select></label><label><span class="field-label">Stichwörter</span><input class="field" name="tags" value="${esc(n?.tags.join(', ')||'')}" placeholder="Ideen, Gedanken" maxlength="180"></label></div><label><span class="field-label">Deine Gedanken</span><textarea class="field" name="body" placeholder="Hier ist Raum für deine Gedanken …" maxlength="6000">${esc(n?.body||'')}</textarea></label><p class="form-hint">Nur zum Ausprobieren. Ein Neuladen setzt diese Demo zurück.</p><div class="dialog-actions"><button class="secondary" type="button" data-action="close">Abbrechen</button><button class="primary" type="submit">${icon(n?'check':'plus')}${n?'In Demo übernehmen':'Demo-Notiz erstellen'}</button></div></form>`;}
 if(kind==='new-folder')return `${header('Ein Platz für deine Ideen')}<div class="dialog-icon">${icon('folder')}</div><form id="folder-form"><label><span class="field-label">Ordnername</span><input class="field" name="name" placeholder="Zum Beispiel: Kleine Projekte" maxlength="60" required data-autofocus></label><label><span class="field-label">Übergeordneter Ordner</span><select class="field" name="parent"><option value="">Meine Bibliothek</option>${folders.filter(f=>!f.parent).map(f=>`<option value="${f.id}">${esc(f.name)}</option>`).join('')}</select></label><div class="folder-colors" aria-label="Ordnerfarbe">${['#6e8e65','#7d9f9c','#be8c72','#9691af','#b89b5a'].map((c,i)=>`<button type="button" class="folder-color ${selectedColor===c?'chosen':''}" style="--color:${c}" data-action="color" data-color="${c}" aria-label="${['Salbei','Teal','Terrakotta','Lavendel','Gold'][i]}" aria-pressed="${selectedColor===c}"></button>`).join('')}</div><p class="form-hint">Der neue Demo-Ordner wird direkt geöffnet.</p><div class="dialog-actions"><button type="button" class="secondary" data-action="close">Abbrechen</button><button type="submit" class="primary">Ordner erstellen</button></div></form>`;
 if(kind==='search')return `<div class="search-top">${icon('search')}<h2 id="dialog-title" class="sr-only">Archivio durchsuchen</h2><input id="search-input" type="search" aria-label="Suche in der Beispielsammlung" placeholder="Was möchtest du wiederfinden?" autocomplete="off" data-autofocus>${ib('x','Suche schliessen','close')}</div><div class="search-chips">${[['all','Alles'],['notes','Notizen'],['folders','Ordner']].map(([t,l])=>`<button class="search-chip ${state.searchType===t?'chosen':''}" data-action="search-type" data-type="${t}" aria-pressed="${state.searchType===t}">${l}</button>`).join('')}</div><div class="search-results" id="search-results" aria-label="Suchergebnisse"></div><footer class="search-footer"><span><kbd>↑ ↓</kbd>Navigieren</span><span><kbd>↵</kbd>Öffnen</span><span><kbd>esc</kbd>Schliessen</span></footer>`;
 if(kind==='settings')return `${header('Ganz dein Archivio.')}<p class="lead">Weniger Ablenkung. Mehr du.</p><label class="field-label">Darstellung</label><div class="theme-preview">${['light','dark'].map((v,i)=>`<button data-action="theme" data-theme="${v}" class="${state.theme===v?'chosen':''}" aria-pressed="${state.theme===v}"><span class="mini-window ${v}"><span class="mini-side"></span><span class="mini-content"><i></i><i></i><i></i></span></span><small>${i?'Dunkel':'Hell'}</small></button>`).join('')}</div><div class="segmented settings-theme" aria-label="Darstellung">${[['light','sun','Hell'],['dark','moon','Dunkel'],['system','monitor','System']].map(([v,i,l])=>`<button data-action="theme" data-theme="${v}" class="${state.theme===v?'chosen':''}" aria-pressed="${state.theme===v}">${icon(i)}${l}</button>`).join('')}</div><div class="setting-row"><div><strong>Bewegung reduzieren</strong><p>${osReduced.matches?'Die Systemeinstellung ist aktiv und wird respektiert.':'Weniger Zoom und Verschiebung, dieselbe Klarheit.'}</p></div><button class="switch" role="switch" aria-label="Bewegung reduzieren" aria-checked="${reduced()}" data-action="reduce" ${osReduced.matches?'disabled':''}><i></i></button></div><button class="setting-row" style="width:100%;text-align:left" data-action="motion"><div><strong>Bewegung erleben</strong><p>Vergrössern, öffnen, zurückkehren.</p></div>${icon('chevron')}</button><button class="setting-row" style="width:100%;text-align:left" data-action="about"><div><strong>Über diese Designstudie</strong><p>M2 · keine Archiv- oder Cloudspeicherung</p></div>${icon('chevron')}</button>`;
 if(kind==='motion')return `${header('Es fühlt sich leicht an.')}<p class="lead">Bewegung verbindet. Probier die kleinen Übergänge aus – vom ersten Klick bis zum Zurückkehren.</p><div class="motion-demos"><button class="motion-demo" data-action="sample">${icon('layers')}<strong>Popup öffnen</strong><span>Sanft wachsen. Ruhig ankommen.</span></button><button class="motion-demo" data-action="photo" data-key="leaf">${icon('expand')}<strong>Bild vergrössern</strong><span>Ein Detail wird zum Mittelpunkt.</span></button><button class="motion-demo" data-action="quick">${icon('plus')}<strong>Schnell hinzufügen</strong><span>Eine klare Auswahl. Ohne Umweg.</span></button><button class="motion-demo" data-action="settings">${icon('sun')}<strong>Licht wechseln</strong><span>Hell, dunkel oder mit dem System.</span></button></div><div class="setting-row"><div><strong>Reduzierte Bewegung</strong><p>Auch ohne Zoom vollständig bedienbar.</p></div><button class="switch" role="switch" aria-label="Bewegung reduzieren" aria-checked="${reduced()}" data-action="reduce" ${osReduced.matches?'disabled':''}><i></i></button></div>`;
 if(kind==='sample')return `${header('Ein kleiner Moment.')}<div class="sample-popup"><div class="dialog-icon">${leaf()}</div><h3>Platz für neue Gedanken.</h3><p>Ein Fenster, das ruhig erscheint – und genauso selbstverständlich wieder verschwindet.</p><button class="primary" data-action="close">Zurück zum Wesentlichen${icon('arrow')}</button></div>`;
 if(kind==='about')return `${header('Wissen bleibt.')}<div class="dialog-icon">${leaf()}</div><p class="lead">Archivio verbindet Notizen, Bilder und Unterlagen. Diese Version zeigt ausschliesslich das neue Design und seine Bewegung.</p><p class="lead"><strong>Alles hier ist Demo.</strong> Du kannst die Beispielsammlung bearbeiten. Nach einem Neuladen beginnt sie wieder von vorn. Nur deine Darstellungsauswahl wird gemerkt.</p><p class="lead">Kein Zugriff auf dein bestehendes Archiv. Keine Verbindung zu Supabase. Keine Uploads. Die Bilder sind Details aus den freigegebenen Designreferenzen.</p><div class="about-grid"><div><span>Meilenstein</span><strong>M2 · Design & Bewegung</strong></div><div><span>Ausgabe</span><strong>3.0.0-design.1</strong></div></div><div class="dialog-actions"><button class="primary" data-action="close">Verstanden</button></div>`;
 if(kind==='history')return `${header('Ein Gedanke entwickelt sich.')}<p class="lead">Hier wird später der Versionsverlauf dieser Notiz erscheinen. In der Designstudie werden noch keine Versionen dauerhaft gespeichert.</p><div class="quick-action"><span class="action-icon">${icon('clock')}</span><span><strong>Aktuelle Demo-Sitzung</strong><small>Zum Ausprobieren, nicht zur Datensicherung.</small></span></div><div class="dialog-actions"><button class="primary" data-action="close">Zurück zur Notiz</button></div>`;
 if(kind==='pdf')return `${header('Eine Unterlage. Ein Zusammenhang.')}<div class="dialog-icon">${icon('file')}</div><h3 style="font-size:16px;margin-bottom:13px">Meine Pflanzennotizen.pdf</h3><p class="lead">Dies ist eine gestaltete Dateikarte, noch keine echte PDF-Datei. Später findest du hier Dateivorschau, Originaldownload und die zugehörige Notiz.</p><div class="dialog-actions"><button class="primary" data-action="close">Alles klar</button></div>`;
 if(kind==='attachments')return `${header('Deine Gedanken, in Bildern.')}<p class="lead">Wähle einen Beispielanhang für die geöffnete Demo-Notiz. Persönliche Dateien werden in dieser Designstudie nicht angefordert oder hochgeladen.</p><div class="attach-demo">${['leaf','room'].map((k,i)=>`<button data-action="attach-example" data-key="${k}">${photo(k,i?'Pflanze am Fenster':'Blattdetail')}<span>${i?'Pflanze am Fenster':'Blattdetail'}</span></button>`).join('')}</div>`;
 if(kind==='note-menu'){const n=note();return `${header('Notizaktionen')}<button class="menu-item" data-action="edit">${icon('edit')}Bearbeiten</button><button class="menu-item" data-action="pin">${icon('pin')}${n?.pin?'Anheften lösen':'Notiz anheften'}</button><button class="menu-item" data-action="focus">${icon('expand')}${state.focus?'Fokusmodus beenden':'Im Fokus öffnen'}</button><hr><button class="menu-item danger-text" data-action="delete">${icon('trash')}In den Papierkorb</button>`;}
 if(kind==='sort')return `${header('Sortieren nach')}<button class="menu-item" data-action="set-sort" data-sort="recent">${icon('clock')}Zuletzt bearbeitet ${state.sort==='recent'?icon('check'):''}</button><button class="menu-item" data-action="set-sort" data-sort="az">${icon('sort')}Titel A–Z ${state.sort==='az'?icon('check'):''}</button>`;
 return '';
}
function openDialog(kind,trigger=null,options={}){
 const token=++dialogToken;closing=false;state.dialog=kind;
 if(!overlay.open)opener=trigger||document.activeElement;
 const origin=trigger?.getBoundingClientRect?.();
 overlay.innerHTML=`<div class="dialog-shade" data-action="close"></div><section class="dialog-panel ${kind==='search'?'search-panel':kind==='photo'?'lightbox-panel':['sort','note-menu'].includes(kind)?'menu-panel':kind==='quick'?'quick-panel':''}">${kind==='photo'?`${header('Ein genauerer Blick.')}<div class="lightbox-photo">${photo(options.key||'leaf','Detail aus der freigegebenen Designreferenz','id="lightbox-image"')}</div><div class="lightbox-controls"><span>Beispielbild · Designreferenz</span><button data-action="zoom" aria-label="Bild weiter vergrössern">${icon('zoom')}<span>Vergrössern</span></button></div>`:modalContent(kind)}</section>`;
 if(!overlay.open)overlay.showModal();overlay.classList.add('visible');
 const panel=$('.dialog-panel',overlay);
 if(!mobile.matches&&['sort','note-menu'].includes(kind)&&origin){panel.style.position='absolute';panel.style.left=Math.max(16,Math.min(origin.right-panel.offsetWidth,innerWidth-panel.offsetWidth-16))+'px';panel.style.top=Math.min(origin.bottom+9,innerHeight-panel.offsetHeight-20)+'px';}
 const isSheet=mobile.matches&&!['search','photo','sort','note-menu'].includes(kind);
 panel.style.transformOrigin=origin&&!isSheet?`${Math.max(15,Math.min(85,(origin.x-panel.getBoundingClientRect().x)/panel.offsetWidth*100))}% ${origin.y>innerHeight/2?'90%':'20%'}`:'center bottom';
 if(kind==='photo'){
  photoOrigin=trigger?.querySelector?.('img')||null;
  animate(panel,[{opacity:0},{opacity:1}],{duration:240});
  const img=$('#lightbox-image');const box=$('.lightbox-photo').getBoundingClientRect(),ratio=options.key==='canopy'?344/155:143/139; const w=Math.min(box.width,box.height*ratio);img.style.width=w+'px';img.style.height=(w/ratio)+'px';const target=img.getBoundingClientRect();const source=photoOrigin?.getBoundingClientRect();
  if(source&&target.width&&target.height&&!reduced()){img.style.transformOrigin='top left';animate(img,springFrames({x:source.x-target.x,y:source.y-target.y,sx:source.width/target.width,sy:source.height/target.height}),{duration:440,easing:'linear'}).then(()=>{if(img.isConnected)img.style.transformOrigin='center';});}
 }else{
  animate(panel,springFrames({x:0,y:isSheet?75:10,sx:isSheet?1:.965,sy:isSheet?1:.965}),{duration:isSheet?420:360,easing:'linear'});
  // Separate fade avoids ghosting text during spring settling.
  panel.animate([{opacity:0},{opacity:1}],{duration:reduced()?1:150,easing:'ease-out'});
 }
 requestAnimationFrame(()=>{if(dialogToken!==token)return;const focus=$('[data-autofocus]',overlay)||$('#dialog-title',overlay);focus?.focus({preventScroll:true});});
 if(kind==='search'){state.searchIndex=0;renderSearch('');}
}
async function closeDialog(){
 if(!overlay.open||closing)return;closing=true;const token=++dialogToken;
 overlay.classList.remove('visible');const panel=$('.dialog-panel',overlay);const current=getComputedStyle(panel).transform;
 if(state.dialog==='photo'&&photoOrigin?.isConnected&&!reduced()){
  const img=$('#lightbox-image'),a=img.getBoundingClientRect(),b=photoOrigin.getBoundingClientRect();img.style.transformOrigin='top left';
  animate(img,[{transform:'none',opacity:1},{transform:`translate(${b.x-a.x}px,${b.y-a.y}px) scale(${b.width/a.width},${b.height/a.height})`,opacity:.25}],{duration:200});
 }
 await animate(panel,[{transform:current==='none'?'translateY(0) scale(1)':current,opacity:1},{transform:mobile.matches&&state.dialog!=='photo'?'translateY(35px) scale(.99)':'translateY(6px) scale(.965)',opacity:0}],{duration:180});
 if(token!==dialogToken)return;overlay.close();overlay.innerHTML='';state.dialog=null;closing=false;
 if(opener?.isConnected)opener.focus({preventScroll:true});else $('#stage')?.focus({preventScroll:true});
}
function setTheme(preference){
 state.theme=preference;const appearance=preference==='system'?(osDark.matches?'dark':'light'):preference;
 document.documentElement.dataset.theme=appearance;
 $('meta[name="theme-color"]').content=appearance==='dark'?'#101c19':'#f6f7f4';
 try{localStorage.setItem('archivio-m2-theme',preference);}catch{}
 $$('[data-action="theme"]').forEach(b=>{const active=b.closest('.dialog-panel')?b.dataset.theme===preference:b.dataset.theme===appearance;b.classList.toggle('chosen',active);b.setAttribute('aria-pressed',String(active));});
 const t=$('[data-action="toggle-theme"]');if(t)t.innerHTML=icon(appearance==='dark'?'sun':'moon');
}
function setView(v,keepFolder=false){state.view=v;if(!keepFolder)state.folder=null;state.detail=false;state.focus=false;state.favorites=false;const ns=visibleNotes();if(!ns.some(n=>n.id===state.selected))state.selected=ns[0]?.id||null;render(true);}
function selectNote(id){const n=state.notes.find(n=>n.id===id&&!n.deleted);if(!n)return;const prev=state.selected;state.selected=id;state.view='notes';if(!belongs(n,state.folder))state.folder=n.folder;state.detail=true;render();if(prev!==id||mobile.matches){if($('.editor-scroll'))$('.editor-scroll').scrollTop=0;animate($('.editor'),[{opacity:.45,transform:`translateX(${mobile.matches?16:5}px)`},{opacity:1,transform:'translateX(0)'}],{duration:240});}if(mobile.matches)$('#stage').scrollTop=0;}
function selectFolder(id){state.folder=id==='unfiled'?'unfiled':id;state.view='notes';state.favorites=false;state.focus=false;state.detail=false;state.selected=visibleNotes()[0]?.id||null;render(true);}
function toast(message){clearTimeout(toastTimer);const region=$('#toast-region');region.innerHTML=`<div class="toast">${icon('check')}<span>${esc(message)}</span></div>`;reveal($('.toast'));toastTimer=setTimeout(async()=>{const e=$('.toast');if(!e)return;await animate(e,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'}],{duration:180});if(e.isConnected)e.remove();},3200);}
function toggleFocus(){if(mobile.matches){toast('Am Handy ist die Notiz bereits im Lesefokus.');return;}const el=$('.editor');if(!el)return;const from=el.getBoundingClientRect();state.focus=!state.focus;$('#stage').classList.toggle('focused',state.focus);const to=el.getBoundingClientRect();el.style.transformOrigin='top left';animate(el,springFrames({x:from.x-to.x,y:from.y-to.y,sx:from.width/to.width,sy:from.height/to.height}),{duration:420,easing:'linear'}).then(()=>el.style.transformOrigin='');const b=$('[data-focus-button]');if(b){b.innerHTML=icon(state.focus?'shrink':'expand');b.setAttribute('aria-label',state.focus?'Fokusmodus beenden':'Fokusmodus öffnen');b.title=b.getAttribute('aria-label');}}
function renderSearch(q){
 const normalized=q.trim().toLocaleLowerCase('de');let items=[];
 if(state.searchType!=='folders')items.push(...state.notes.filter(n=>!n.deleted&&(!normalized||[n.title,n.body,...n.tags].join(' ').toLocaleLowerCase('de').includes(normalized))).map(n=>({id:n.id,title:n.title,sub:`Notiz · ${folderName(n.folder)}`,type:'note',image:n.image})));
 if(state.searchType!=='notes')items.push(...folders.filter(f=>!normalized||f.name.toLocaleLowerCase('de').includes(normalized)).map(f=>({id:f.id,title:f.name,sub:`Ordner · ${countFolder(f.id)} Notizen`,type:'folder'})));
 items=items.slice(0,8);state.searchIndex=Math.min(state.searchIndex,Math.max(0,items.length-1));
 $('#search-results').innerHTML=items.length?items.map((item,i)=>`<button class="search-result ${i===state.searchIndex?'chosen':''}" data-action="search-open" data-id="${item.id}" data-type="${item.type}" ${i===state.searchIndex?'aria-current="true"':''}>${item.image?photo(item.image,''):`<span class="result-icon">${icon(item.type==='folder'?'folder':'note')}</span>`}<span><strong>${esc(item.title)}</strong><small>${esc(item.sub)}</small></span>${icon('return')}</button>`).join(''):`<div class="search-empty">Keine Ergebnisse für „${esc(q)}“.<br>Versuche einen anderen Begriff.</div>`;
}
async function action(a,el){
 switch(a){
 case 'view':return setView(el.dataset.view);
 case 'tab':return setView(el.dataset.view,true);
 case 'folder':return selectFolder(el.dataset.id);
 case 'select':return selectNote(el.dataset.id);
 case 'back':if(!mobile.matches){if(state.focus)toggleFocus();else setView('overview');return;}state.detail=false;state.focus=false;render(true);return;
 case 'close':return closeDialog();
 case 'theme':return setTheme(el.dataset.theme);
 case 'toggle-theme':return setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
 case 'new-note':case 'new-folder':case 'search':case 'settings':case 'quick':case 'about':case 'motion':case 'sample':case 'pdf':case 'history':case 'sort':case 'note-menu':case 'attachments':case 'edit':return openDialog(a,el);
 case 'photo':return openDialog('photo',el,{key:el.dataset.key});
 case 'zoom':{const img=$('#lightbox-image');const on=img.dataset.zoom==='true';img.dataset.zoom=String(!on);img.style.transform=on?'scale(1)':'scale(1.65)';animate(img,[{transform:on?'scale(1.65)':'scale(1)'},{transform:on?'scale(1)':'scale(1.65)'}],{duration:370});el.innerHTML=icon(on?'zoom':'shrink')+`<span>${on?'Vergrössern':'Einpassen'}</span>`;el.setAttribute('aria-label',on?'Bild weiter vergrössern':'Ganzes Bild einpassen');return;}
 case 'reduce':state.reduce=!state.reduce;document.documentElement.dataset.reduce=String(state.reduce);$$('[data-action="reduce"]').forEach(b=>b.setAttribute('aria-checked',String(reduced())));return;
 case 'color':selectedColor=el.dataset.color;$$('.folder-color').forEach(b=>{b.classList.toggle('chosen',b===el);b.setAttribute('aria-pressed',String(b===el));});return;
 case 'search-type':state.searchType=el.dataset.type;state.searchIndex=0;$$('.search-chip').forEach(b=>{b.classList.toggle('chosen',b===el);b.setAttribute('aria-pressed',String(b===el));});renderSearch($('#search-input').value);return;
 case 'search-open':await closeDialog();return el.dataset.type==='folder'?selectFolder(el.dataset.id):selectNote(el.dataset.id);
 case 'filter':state.favorites=!state.favorites;state.selected=visibleNotes()[0]?.id||null;render(true);return;
 case 'set-sort':state.sort=el.dataset.sort;await closeDialog();render(true);return;
 case 'favorite':{const n=note();if(!n)return;n.star=!n.star;render();const b=$('[data-action="favorite"]');b?.focus({preventScroll:true});if(b)animate(b,[{transform:'scale(.9)'},{transform:'scale(1.15)'},{transform:'scale(1)'}],{duration:280});toast(n.star?'Zur Demo-Favoritenliste hinzugefügt':'Aus der Demo-Favoritenliste entfernt');return;}
 case 'pin':{const n=note();if(!n)return;n.pin=!n.pin;await closeDialog();render();toast(n.pin?'Demo-Notiz angeheftet':'Anheften gelöst');return;}
 case 'focus':if(overlay.open)await closeDialog();return toggleFocus();
 case 'delete':{const n=note();if(!n)return;n.deleted=true;await closeDialog();state.selected=visibleNotes()[0]?.id||null;state.detail=false;state.focus=false;render(true);toast('Demo-Notiz im Papierkorb · dort wiederherstellbar');return;}
 case 'restore':{const n=state.notes.find(n=>n.id===el.dataset.id);if(n)n.deleted=false;render(true);toast('Demo-Notiz wiederhergestellt');return;}
 case 'attach-example':{let n=note();if(!n){n=state.notes.find(n=>!n.deleted);if(n)state.selected=n.id;}if(!n){await closeDialog();toast('Lege zuerst eine Demo-Notiz an.');return;}n.images.push(el.dataset.key);await closeDialog();selectNote(n.id);toast('Beispielbild in dieser Sitzung hinzugefügt');return;}
 case 'open-sidebar':$('#sidebar').classList.add('open');$('.sidebar-scrim').classList.add('open');return;
 case 'close-sidebar':$('#sidebar').classList.remove('open');$('.sidebar-scrim').classList.remove('open');return;
 }
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-action]');if(!el||el.disabled)return;if(closing&&overlay.contains(el))return;action(el.dataset.action,el).catch(err=>{console.error(err);toast('Diese Aktion konnte nicht ausgeführt werden.');});});
document.addEventListener('change',e=>{if(e.target.matches('[data-check]')){const n=note();if(n)n.done[Number(e.target.dataset.check)]=e.target.checked;}});
document.addEventListener('input',e=>{if(e.target.id==='search-input'){state.searchIndex=0;renderSearch(e.target.value);}});
document.addEventListener('submit',async e=>{
 if(!['note-form','folder-form'].includes(e.target.id))return;e.preventDefault();const data=new FormData(e.target);
 if(e.target.id==='folder-form'){
  const name=String(data.get('name')||'').trim();if(!name)return;
  const id='demo-folder-'+(++sequence);folders.push({id,name,icon:'folder',color:selectedColor,parent:String(data.get('parent')||'')||null});await closeDialog();selectFolder(id);toast('Demo-Ordner erstellt');
 }else{
  const title=String(data.get('title')||'').trim();if(!title)return;
  const edit=e.target.dataset.edit;let n=state.notes.find(n=>n.id===edit);
  if(!n){n={id:'demo-note-'+(++sequence),checks:[],done:[],images:[],pdf:false,image:null,star:false,pin:false};state.notes.unshift(n);}
  Object.assign(n,{title,body:String(data.get('body')||''),summary:String(data.get('body')||'Ein neuer Gedanke in deiner Sammlung.').slice(0,160),folder:String(data.get('folder')||''),tags:String(data.get('tags')||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,6),time:'Gerade eben'});
  await closeDialog();state.folder=n.folder||null;selectNote(n.id);toast('In die Demo übernommen · nur in dieser Sitzung');
 }
});
overlay.addEventListener('cancel',e=>{e.preventDefault();closeDialog();});
document.addEventListener('keydown',e=>{
 if(e.key==='Tab'&&overlay.open){
  const controls=$$('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],[tabindex="0"]',overlay).filter(el=>el.getClientRects().length>0);
  const first=controls[0],last=controls.at(-1),active=document.activeElement;
  if(first&&((e.shiftKey&&(active===first||!controls.includes(active)))||(!e.shiftKey&&active===last))){e.preventDefault();(e.shiftKey?last:first).focus();return;}
 }
 if(e.key==='Escape'&&overlay.open){e.preventDefault();closeDialog();return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openDialog('search',document.activeElement);return;}
 if(e.key==='Escape'&&!overlay.open){if(state.focus)toggleFocus();return;}
 if(!overlay.open||state.dialog!=='search')return;
 const result=$$('.search-result',overlay);
 if(['ArrowDown','ArrowUp'].includes(e.key)&&result.length){e.preventDefault();state.searchIndex=(state.searchIndex+(e.key==='ArrowDown'?1:-1)+result.length)%result.length;result.forEach((b,i)=>{b.classList.toggle('chosen',i===state.searchIndex);b.setAttribute('aria-current',String(i===state.searchIndex));});result[state.searchIndex].scrollIntoView({block:'nearest',behavior:'auto'});}
 if(e.key==='Enter'&&e.target.id==='search-input'){e.preventDefault();result[state.searchIndex]?.click();}
});
osDark.addEventListener('change',()=>{if(state.theme==='system')setTheme('system');});
osReduced.addEventListener('change',()=>{$$('[data-action="reduce"]').forEach(b=>{b.setAttribute('aria-checked',String(reduced()));b.disabled=osReduced.matches;});});
let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>moveTabLine(false),80);});
// Native pointer capture for a sheet's optional downward dismissal gesture.
let drag=null;
overlay.addEventListener('pointerdown',e=>{
 if(!e.target.matches('.sheet-handle')||!mobile.matches||closing)return;
 const panel=$('.dialog-panel');animations.get(panel)?.cancel();
 drag={y:e.clientY,time:performance.now(),dy:0,panel};e.target.setPointerCapture(e.pointerId);
});
overlay.addEventListener('pointermove',e=>{
 if(!drag)return;drag.dy=Math.max(0,e.clientY-drag.y);
 drag.panel.style.transform=`translateY(${drag.dy}px)`;
 $('.dialog-shade').style.opacity=String(Math.max(.2,1-drag.dy/350));
});
async function finishDrag(cancelled=false){
 if(!drag)return;const d=drag;drag=null;
 if(!cancelled&&(d.dy>75||(d.dy>25&&d.dy/Math.max(1,performance.now()-d.time)>.6))){await closeDialog();return;}
 d.panel.style.transform='';const shade=$('.dialog-shade');if(shade)shade.style.opacity='';
 animate(d.panel,springFrames({x:0,y:d.dy,sx:1,sy:1}),{duration:340,easing:'linear'});
}
overlay.addEventListener('pointerup',()=>finishDrag());
overlay.addEventListener('pointercancel',()=>finishDrag(true));
render();setTheme(state.theme);
})();
