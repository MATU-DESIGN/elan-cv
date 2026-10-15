(() => {
  'use strict';
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], esc=CV.esc;
  const STORE='elan-cv.documents.v1', ACTIVE='elan-cv.active.v1';
  const steps=['Coordonnées','Profil','Expériences','Formation','Compétences','Design','Vérification'];
  const sectionNames={summary:'Profil',experiences:'Expériences',education:'Formation',skills:'Compétences',languages:'Langues',interests:'Centres d’intérêt'};
  const order=Object.keys(sectionNames);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const uuid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  const str=(x,max=10000)=>typeof x==='string'?x.slice(0,max):'';
  let docs=[],current=null,step=0,saveTimer,toastTimer,zoom=100,filter='all',photoWorking=false,storageIssue='';
  function safeDocument(raw){
    if(!raw||typeof raw!=='object'||!raw.data||typeof raw.data!=='object')throw new Error('Format de CV non reconnu.');
    const data=raw.data, design=raw.design||{}, cleaned={};
    const limits={name:160,role:160,email:180,phone:60,city:180,website:250};
    for(const k of ['name','role','email','phone','city','website','summary','skills','languages','interests'])cleaned[k]=str(data[k],limits[k]||10000);
    cleaned.photo=typeof data.photo==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.photo)&&data.photo.length<600000?data.photo:'';
    for(const key of ['experiences','education'])cleaned[key]=(Array.isArray(data[key])?data[key]:[]).slice(0,50).filter(v=>v&&typeof v==='object').map(e=>Object.fromEntries(['title','organization','location','start','end','description'].map(k=>[k,str(e[k],k==='description'?10000:180)])));
    cleaned.extras=(Array.isArray(data.extras)?data.extras:[]).slice(0,15).filter(v=>v&&typeof v==='object').map(e=>({title:str(e.title,100),text:str(e.text,10000)}));
    const template=CV.templates.find(t=>t.id===design.template)||CV.templates[0];
    const normalized={...template,...{template:template.id},order:[...order],hidden:[],margin:14,scale:1};
    if(design.template==='personnel'){normalized.template='personnel';normalized.style='minimal';normalized.layout='single';}
    if(/^#[0-9a-f]{6}$/i.test(design.color))normalized.color=design.color;
    if(/^#[0-9a-f]{6}$/i.test(design.side))normalized.side=design.side;
    if(['single','sidebar'].includes(design.layout))normalized.layout=design.layout;
    if(['dark','light','banner','minimal','bands'].includes(design.style))normalized.style=design.style;
    normalized.font=design.font==='times'?'times':'helvetica';
    normalized.margin=Math.max(10,Math.min(19,Number(design.margin)||14));
    normalized.scale=Math.max(.9,Math.min(1.15,Number(design.scale)||1));
    if(Array.isArray(design.order))normalized.order=[...new Set([...design.order.filter(k=>order.includes(k)),...order])];
    if(Array.isArray(design.hidden))normalized.hidden=[...new Set(design.hidden.filter(k=>order.includes(k)))];
    return {id:typeof raw.id==='string'&&/^[a-z0-9-]{5,70}$/i.test(raw.id)?raw.id:uuid(),title:str(raw.title,80)||'Mon CV',updatedAt:Number.isFinite(raw.updatedAt)&&raw.updatedAt>0&&raw.updatedAt<253402300799999?raw.updatedAt:Date.now(),data:cleaned,design:normalized};
  }
  try{const saved=localStorage.getItem(STORE);if(saved){const raw=JSON.parse(saved);if(!Array.isArray(raw))throw Error();docs=raw.slice(0,50).map(safeDocument);}}
  catch(e){storageIssue='Le stockage local est indisponible ou contient des données illisibles. Exportez une sauvegarde avant de quitter cette page.';}
  function toast(message){clearTimeout(toastTimer);$('#toast').textContent=message;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,5000);}
  function persist(){
    clearTimeout(saveTimer);
    if(current){current.updatedAt=Date.now();const at=docs.findIndex(d=>d.id===current.id);if(at<0)docs.unshift(current);else docs[at]=current;}
    try{localStorage.setItem(STORE,JSON.stringify(docs));storageIssue='';if($('#save-state')){$('#save-state').textContent='Enregistré sur cet appareil';$('#save-state').classList.remove('error');}return true;}
    catch(e){storageIssue='Enregistrement impossible : stockage plein ou désactivé. Téléchargez une sauvegarde depuis Mes CV.';if($('#save-state')){$('#save-state').textContent='Non enregistré — sauvegardez vos données';$('#save-state').classList.add('error');}toast(storageIssue);return false;}
  }
  function scheduleSave(){if($('#save-state'))$('#save-state').textContent='Enregistrement…';clearTimeout(saveTimer);saveTimer=setTimeout(persist,350);}
  function blankData(){return {name:'',role:'',email:'',phone:'',city:'',website:'',summary:'',photo:'',experiences:[],education:[],skills:'',languages:'',interests:'',extras:[]};}
  function newDocument(templateId='horizon',custom=false){
    if(docs.length>=50){toast('Vous avez déjà 50 CV sur cet appareil. Sauvegardez vos données et libérez une place.');return;}
    if(current)persist();
    const base=CV.templates.find(t=>t.id===templateId)||CV.templates[0];
    current={id:uuid(),title:custom?'Mon CV sur mesure':'Mon CV',updatedAt:Date.now(),data:blankData(),design:{...base,template:base.id,margin:14,scale:1,order:[...order],hidden:[]}};
    if(custom)current.design={...current.design,template:'personnel',layout:'single',style:'minimal',color:'#173b65',side:'#edf2fa'};
    docs.unshift(current);step=custom?5:0;zoom=100;persist();rememberCurrent();closeModal();
    const target='#editeur/'+current.id;if(location.hash===target)showEditor();else location.hash=target;
  }
  function rememberCurrent(){try{sessionStorage.setItem(ACTIVE,current.id);}catch(e){}}
  function modal(html){$('#modal-content').innerHTML=html;const d=$('#modal');if(!d.open)d.showModal();}
  function closeModal(){if($('#modal').open)$('#modal').close();}
  function modalHeader(icon,kicker,title){return `<div class="modal-icon" aria-hidden="true">${icon}</div><div class="modal-kicker">${kicker}</div><h2 id="modal-title">${title}</h2>`;}
  function galleryCard(t){
    const preview=CV.svg(CV.compose(CV.sample,{...t,template:t.id}).pages[0],`Modèle ${t.name}, exemple fictif`);
    const cats={sobre:'SOBRE',moderne:'MODERNE',creatif:'CRÉATIF'};
    return `<article class="model-card"><div class="model-frame"><span class="model-badge">${cats[t.category]}</span><div class="cv-thumbnail">${preview}</div><div class="model-hover"><button class="button button-primary" data-create="${t.id}" aria-label="Personnaliser le modèle ${t.name}">Personnaliser ce modèle <span>↗</span></button></div></div><div class="model-info"><div><h3>${t.name}</h3><p>${t.tag}</p></div><button class="model-arrow" data-template-preview="${t.id}" aria-label="Voir le modèle ${t.name}">↗</button></div></article>`;
  }
  function renderCollection(){const list=CV.templates.filter(t=>filter==='all'||t.category===filter);$('#all-models').innerHTML=list.map(galleryCard).join('');$('#model-count').textContent=`${list.length} modèle${list.length>1?'s':''} · exemples fictifs`;$$('[data-filter]').forEach(b=>{const active=b.dataset.filter===filter;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function initHome(){
    $('#hero-cv').innerHTML=CV.svg(CV.compose(CV.sample,{...CV.templates[0],template:'horizon'}).pages[0],'Exemple fictif de CV : Aminata Ouédraogo');
    $('#home-models').innerHTML=[CV.templates[0],CV.templates[1],CV.templates[4]].map(galleryCard).join('');
  }
  function route(){
    if(current)persist();
    const parts=(location.hash||'#accueil').slice(1).split('/'),page=parts[0];
    const chosen=['accueil','modeles','editeur','espace'].includes(page)?page:'accueil';
    $$('.view').forEach(v=>v.hidden=true);
    document.body.classList.toggle('editing',chosen==='editeur');
    $('#site-footer').hidden=chosen==='editeur';
    $('.mobile-nav').hidden=true;$('.menu-button').setAttribute('aria-expanded','false');
    $$('[data-nav]').forEach(a=>a.classList.toggle('active',a.dataset.nav===chosen));
    if(chosen==='editeur'){
      let id=parts[1];
      if(!id)try{id=sessionStorage.getItem(ACTIVE);}catch(e){}
      const doc=docs.find(d=>d.id===id);
      if(!doc){toast('Choisissez un modèle pour commencer votre CV.');location.hash='#modeles';return;}
      if(!current||current.id!==doc.id){current=doc;step=0;zoom=100;}
      rememberCurrent();$('#editor-view').hidden=false;showEditor();
      document.title=`${current.title} — Élan CV`;
    }else if(chosen==='modeles'){$('#models-view').hidden=false;renderCollection();document.title='La collection — Élan CV';}
    else if(chosen==='espace'){$('#space-view').hidden=false;renderSpace();document.title='Mes CV — Élan CV';}
    else{$('#home-view').hidden=false;document.title='Élan CV — Votre talent mérite un CV à sa hauteur';}
    window.scrollTo({top:0,behavior:'instant'});
    if(chosen==='accueil'&&['tarif','parcours'].includes(parts[1]))requestAnimationFrame(()=>$('#'+parts[1]).scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
  }
  function completion(){
    const d=current.data;
    const checks=[!!d.name.trim(),!!d.role.trim(),!!(d.email.trim()||d.phone.trim()),!!d.summary.trim(),d.experiences.some(e=>e.title.trim()),d.education.some(e=>e.title.trim()),!!d.skills.trim()];
    return {checks,percent:Math.round(checks.filter(Boolean).length/checks.length*100)};
  }
  function updateProgress(){const c=completion();$('#progress-label').textContent=c.percent+' %';$('#progress-bar').style.width=c.percent+'%';}
  function updatePreview(){
    if(!current)return;
    try{const rendered=CV.compose(current.data,current.design);$('#live-preview').innerHTML=rendered.pages.map((p,i)=>`<div class="cv-page">${CV.svg(p,`Aperçu de votre CV, page ${i+1}`)}</div>`).join('');$('#page-count').textContent=rendered.pages.length+' page'+(rendered.pages.length>1?'s':'');setZoom(zoom);updateProgress();}
    catch(e){$('#live-preview').innerHTML='<div class="error-banner">L’aperçu ne peut pas être affiché. Sauvegardez vos données et rechargez la page.</div>';console.error(e);}
  }
  function setZoom(value){zoom=Math.max(70,Math.min(150,value));$('#live-preview').style.width=zoom+'%';$('#live-preview').style.maxWidth=(535*zoom/100)+'px';$('#zoom-label').textContent=zoom+' %';}
  function showEditor(){
    $('#doc-title').value=current.title;
    $('#editor-tabs').innerHTML=steps.map((s,i)=>`<button class="step-tab ${step===i?'active':''}" data-step="${i}" ${step===i?'aria-current="step"':''} title="${s}"><span>${String(i+1).padStart(2,'0')}</span><span>${s}</span></button>`).join('');
    renderForm();updatePreview();
    $('#save-state').textContent=storageIssue?'Non enregistré — sauvegardez vos données':'Enregistré sur cet appareil';$('#save-state').classList.toggle('error',!!storageIssue);
    $('#preview-toggle').textContent=document.body.classList.contains('preview-open')?'Modifier':'Aperçu';
  }
  function field(label,path,value,placeholder='',type='text',full=false,hint=''){
    return `<label class="field ${full?'full':''}"><span>${label}</span><input data-path="${path}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="${['data.name','data.role'].includes(path)?160:180}" ${type==='email'?'autocomplete="email"':type==='tel'?'autocomplete="tel"':''}>${hint?`<small>${hint}</small>`:''}</label>`;
  }
  function textarea(label,path,value,placeholder='',tall=false,hint=''){
    return `<label class="field full"><span>${label}</span><textarea data-path="${path}" maxlength="10000" class="${tall?'tall':''}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>${hint?`<small>${hint}</small>`:''}</label>`;
  }
  function intro(kicker,title,description){return `<div class="form-kicker">${kicker}</div><h2>${title}</h2><p class="form-intro">${description}</p>`;}
  function renderForm(){
    const d=current.data;let html='';
    if(step===0){
      html=intro('01 / FAISONS CONNAISSANCE','Tout commence avec vous.','Les informations utiles pour vous présenter et vous contacter.');
      html+=`<div class="photo-row"><div class="photo-circle">${d.photo?`<img src="${d.photo}" alt="Votre photo de CV">`:'＋'}</div><div class="photo-controls"><div><label class="button button-outline photo-upload">${d.photo?'Changer la photo':'Ajouter une photo'}<input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" hidden></label>${d.photo?'<button class="photo-remove" data-action="remove-photo">Retirer</button>':''}</div><span>Facultatif · JPG, PNG ou WebP · 5 Mo max.</span><span>Recadrage carré centré automatique</span></div></div>`;
      html+=`<div class="field-grid">${field('Prénom et nom *','data.name',d.name,'Ex. Aminata Ouédraogo','text',true)}${field('Profession ou poste recherché *','data.role',d.role,'Ex. Chargée de communication','text',true)}${field('Adresse e-mail','data.email',d.email,'vous@exemple.com','email',true)}${field('Téléphone','data.phone',d.phone,'+226 70 00 00 00','tel',true)}${field('Ville et pays','data.city',d.city,'Ouagadougou, Burkina Faso','text',true)}${field('Site ou lien professionnel','data.website',d.website,'linkedin.com/in/votre-profil','text',true)}<p class="field-hint full">* Informations nécessaires à l’export. Renseignez au moins un moyen de contact. La photo reste facultative.</p></div><button class="text-link form-sample" data-action="sample-dialog">Voir le résultat avec un exemple fictif ↗</button>`;
    }
    if(step===1){
      html=intro('02 / VOTRE FIL CONDUCTEUR','Quelques mots qui comptent.','Présentez votre profil en trois ou quatre phrases. Ce qui vous anime, ce que vous savez faire et ce que vous recherchez.');
      html+=`<div class="form-section">${textarea('Votre profil','data.summary',d.summary,'Ex. Rigoureuse et organisée, je souhaite mettre mes compétences en gestion au service d’une équipe engagée…',true,'Privilégiez des phrases précises. Évitez les informations confidentielles.')}</div><div class="inline-note">Un bon départ : votre métier, vos points forts, puis ce que vous souhaitez apporter à votre prochain poste.</div>`;
    }
    if(step===2||step===3){
      const exp=step===2,key=exp?'experiences':'education';
      html=intro(exp?'03 / LE CHEMIN PARCOURU':'04 / VOS FONDATIONS',exp?'Votre expérience a de la valeur.':'Ce que vous avez appris.',exp?'Emplois, stages, missions ou bénévolat : chaque expérience peut raconter quelque chose de vous.':'Diplômes, formations et certifications. Commencez par les plus récents.');
      html+=`<div class="form-section">${d[key].map((e,i)=>entryForm(key,e,i)).join('')}<button class="add-entry" data-add="${key}">＋ Ajouter ${exp?'une expérience':'une formation'}</button></div><p class="field-hint">Vous pouvez laisser cette rubrique vide si elle ne correspond pas à votre parcours.</p>`;
    }
    if(step===4){
      html=intro('05 / VOS POINTS FORTS','Ce qui fait la différence.','Des compétences concrètes, des langues et les centres d’intérêt que vous souhaitez partager.');
      html+=`<div class="form-section field-grid">${textarea('Compétences','data.skills',d.skills,'Gestion de projet\nSuite bureautique\nRelation client',false,'Une compétence par ligne.')}${textarea('Langues et niveaux','data.languages',d.languages,'Français — courant\nMooré — langue maternelle\nAnglais — intermédiaire')}${textarea('Centres d’intérêt','data.interests',d.interests,'Lecture · Sport · Engagement associatif')}</div><h3 class="design-heading">Rubriques personnelles</h3><p class="field-hint">Ajoutez vos projets, certifications ou références si vous le souhaitez.</p><div class="form-section">${d.extras.map((e,i)=>`<div class="entry-card"><div class="entry-heading"><span>Rubrique ${i+1}</span><button class="icon-button" data-remove="extras:${i}" aria-label="Supprimer la rubrique ${i+1}">×</button></div><div class="field-grid">${field('Titre de la rubrique',`data.extras.${i}.title`,e.title,'Ex. Projets personnels','text',true)}${textarea('Contenu',`data.extras.${i}.text`,e.text,'Présentez les informations utiles…')}</div></div>`).join('')}<button class="add-entry" data-add="extras">＋ Ajouter une rubrique</button></div>`;
    }
    if(step===5)html=designForm();
    if(step===6){
      const c=completion();const labels=['Votre nom','Votre profession','Un moyen de contact','Votre profil','Une expérience (facultative)','Une formation (facultative)','Vos compétences'];
      html=intro('07 / LE DERNIER REGARD','Prêt pour la suite ?','Relisez votre CV dans l’aperçu. Vérifiez les coordonnées, les dates et l’orthographe avant de l’envoyer.');
      html+=`<ul class="review-list">${labels.map((s,i)=>`<li><span>${s}</span><span class="${c.checks[i]?'complete':'missing'}">${c.checks[i]?'✓ Renseigné':'À compléter'}</span></li>`).join('')}</ul><button class="button button-primary review-export" data-action="export-dialog">Télécharger mon PDF <span>↓</span></button><div class="inline-note"><strong>Version d’essai</strong><br>Tarif prévu : 2 000 FCFA par CV. L’export est accessible sans paiement pendant cette version. Le paiement Mobile Money n’est pas encore activé.</div>`;
    }
    $('#editor-form').innerHTML=html;
    $('[data-action="previous-step"]').disabled=step===0;
    $('[data-action="next-step"]').textContent=step===6?'Télécharger le PDF ↓':'Continuer →';
    $$('[data-step]').forEach(b=>{b.classList.toggle('active',Number(b.dataset.step)===step);if(Number(b.dataset.step)===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});
  }
  function entryForm(key,e,i){
    const exp=key==='experiences';
    return `<div class="entry-card"><div class="entry-heading"><span>${exp?'Expérience':'Formation'} ${i+1}</span><div><button class="icon-button" data-entry-up="${key}:${i}" aria-label="Monter ${exp?'l’expérience':'la formation'} ${i+1}" ${i===0?'disabled':''}>↑</button><button class="icon-button" data-remove="${key}:${i}" aria-label="Supprimer ${exp?'l’expérience':'la formation'} ${i+1}">×</button></div></div><div class="field-grid">${field(exp?'Poste occupé':'Diplôme ou formation',`data.${key}.${i}.title`,e.title,exp?'Ex. Assistante administrative':'Ex. Licence en gestion','text',true)}${field(exp?'Entreprise ou organisation':'Établissement',`data.${key}.${i}.organization`,e.organization,exp?'Nom de l’organisation':'Nom de l’établissement','text',true)}${field('Lieu',`data.${key}.${i}.location`,e.location,'Ville','text',true)}${field('Début',`data.${key}.${i}.start`,e.start,'Ex. 2022')}${field('Fin',`data.${key}.${i}.end`,e.end,'Ex. Aujourd’hui')}${textarea(exp?'Missions et réalisations':'Précisions (facultatif)',`data.${key}.${i}.description`,e.description,exp?'Décrivez vos missions et résultats…':'Spécialité, projets, mention…',false,exp?'Une réalisation par ligne, avec un résultat concret si possible.':'')}</div></div>`;
  }
  function designForm(){
    const d=current.design;
    const swatches=['#173b65','#2758ed','#337d7a','#43516b','#a17765','#752c38','#272727'];
    return intro('06 / VOTRE SIGNATURE','Le style vous appartient.','Changez de modèle sans perdre votre contenu, ou créez votre propre combinaison.')+
      `<h3 class="design-heading">Modèle de départ ${d.template==='personnel'?'<span class="muted">· création libre</span>':''}</h3><div class="design-templates">${CV.templates.map(t=>`<button class="design-template ${d.template===t.id?'active':''}" data-design-template="${t.id}" aria-label="Appliquer le modèle ${t.name}" aria-pressed="${d.template===t.id}">${CV.svg(CV.compose(CV.sample,{...t,template:t.id}).pages[0],`Modèle ${t.name}`)}<span>${t.name}</span></button>`).join('')}</div><h3 class="design-heading">Disposition et police</h3><div class="field-grid"><label class="field"><span>Mise en page</span><select data-path="design.layout"><option value="sidebar" ${d.layout==='sidebar'?'selected':''}>Avec colonne</option><option value="single" ${d.layout==='single'?'selected':''}>Une colonne</option></select></label><label class="field"><span>Police de caractères</span><select data-path="design.font"><option value="helvetica" ${d.font==='helvetica'?'selected':''}>Moderne</option><option value="times" ${d.font==='times'?'selected':''}>Classique</option></select></label><label class="field full"><span>Style des en-têtes</span><select data-path="design.style"><option value="minimal" ${d.style==='minimal'?'selected':''}>Minimaliste</option><option value="light" ${d.style==='light'?'selected':''}>Colonne claire</option><option value="dark" ${d.style==='dark'?'selected':''}>Colonne sombre</option><option value="banner" ${d.style==='banner'?'selected':''}>Bandeau de titre</option><option value="bands" ${d.style==='bands'?'selected':''}>Rubriques en bandeaux</option></select></label></div><h3 class="design-heading">Votre couleur principale</h3><div class="swatches">${swatches.map(c=>`<button class="swatch ${d.color===c?'active':''}" style="background:${c}" data-color="${c}" aria-label="Choisir la couleur ${c}" aria-pressed="${d.color===c}"></button>`).join('')}<label class="color-field"><input type="color" value="${d.color}" data-path="design.color" aria-label="Couleur principale personnalisée"> Autre</label></div><h3 class="design-heading">Fond de la colonne ou des bandeaux</h3><label class="color-field"><input type="color" value="${d.side}" data-path="design.side" aria-label="Couleur de fond">Personnaliser le fond</label><p class="field-hint">Pour une colonne sombre, choisissez un fond foncé qui contraste avec le texte blanc.</p><label class="range-field">Taille du texte<input type="range" min="90" max="115" step="5" value="${Math.round(d.scale*100)}" data-range="scale" aria-label="Taille du texte"><span id="scale-value">${Math.round(d.scale*100)} %</span></label><label class="range-field">Marges<input type="range" min="10" max="19" step="1" value="${d.margin}" data-range="margin" aria-label="Marges du CV"><span id="margin-value">${d.margin} mm</span></label><h3 class="design-heading">Vos rubriques, dans votre ordre</h3><div class="section-order">${d.order.map((k,i)=>`<div class="section-order-row"><label><input type="checkbox" data-section-toggle="${k}" ${d.hidden.includes(k)?'':'checked'}>${sectionNames[k]}</label><div><button class="icon-button" data-order="${k}:-1" aria-label="Monter la rubrique ${sectionNames[k]}" ${i===0?'disabled':''}>↑</button><button class="icon-button" data-order="${k}:1" aria-label="Descendre la rubrique ${sectionNames[k]}" ${i===d.order.length-1?'disabled':''}>↓</button></div></div>`).join('')}</div><p class="field-hint">Les compétences, langues et intérêts occupent la colonne latérale lorsque cette disposition est choisie.</p>`;
  }
  function gotoStep(next){step=Math.max(0,Math.min(6,next));document.body.classList.remove('preview-open');$('#preview-toggle').textContent='Aperçu';renderForm();window.scrollTo({top:0,behavior:'instant'});const active=$('.step-tab.active');if(active)active.scrollIntoView({block:'nearest',inline:'nearest'});}
  function setPath(path,value){
    const parts=path.split('.');if(!['data','design'].includes(parts[0]))return;
    let ref=current;for(const key of parts.slice(0,-1)){if(['__proto__','constructor','prototype'].includes(key)||ref[key]===undefined)return;ref=ref[key];}
    const last=parts.at(-1);if(['__proto__','constructor','prototype'].includes(last))return;ref[last]=value;
  }
  function changed(){updatePreview();scheduleSave();}
  async function addPhoto(file){
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('Choisissez une photo JPG, PNG ou WebP.');return;}
    if(file.size>5*1024*1024){toast('Cette photo dépasse 5 Mo. Choisissez une image plus légère.');return;}
    const targetId=current.id;photoWorking=true;toast('Préparation de votre photo…');
    try{
      const source=URL.createObjectURL(file);
      try{
        const img=new Image();img.src=source;await img.decode();
        if(!img.naturalWidth||!img.naturalHeight)throw Error();
        const size=480,canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);
        const side=Math.min(img.naturalWidth,img.naturalHeight);ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,size,size);
        if(current.id!==targetId)return;
        current.data.photo=canvas.toDataURL('image/jpeg',.83);changed();renderForm();toast('Photo ajoutée. Elle reste sur cet appareil.');
      }finally{URL.revokeObjectURL(source);}
    }catch(e){toast('Cette photo ne peut pas être ouverte. Essayez une autre image.');}finally{photoWorking=false;}
  }
  function exportDialog(){
    if(photoWorking){toast('Attendez la fin de la préparation de la photo.');return;}
    const d=current.data;
    if(!d.name.trim()||!d.role.trim()||!(d.email.trim()||d.phone.trim())){toast('Ajoutez votre nom, votre profession et au moins un moyen de contact.');gotoStep(0);return;}
    if(d.email&& !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)){toast('Vérifiez votre adresse e-mail avant l’export.');gotoStep(0);return;}
    persist();
    modal(`${modalHeader('↓','VOTRE PROCHAIN PAS','Votre CV, prêt à vous suivre.')}<div class="modal-price">2 000 <span>FCFA / CV</span></div><p>Le tarif de lancement est de <strong>2 000 FCFA par CV</strong>. Le paiement Mobile Money sera proposé après son activation.</p><div class="modal-callout"><strong>Vous utilisez la version d’essai.</strong><br>Aucun paiement n’est disponible ou demandé. Vous pouvez télécharger le PDF pour tester cette première version.</div><button class="button button-outline" disabled>Paiement Mobile Money — bientôt</button><button class="button button-primary" data-action="download-pdf">Télécharger le PDF d’essai <span>↓</span></button><p class="trial-note">Aucune transaction effectuée. Aucun paiement marqué comme validé.</p>`);
  }
  function downloadPdf(){
    if(!window.ELAN_CONFIG.trialExportEnabled){toast('L’export d’essai est désactivé. Le service de paiement doit être configuré.');return;}
    const button=$('[data-action="download-pdf"]');if(button){button.disabled=true;button.textContent='Préparation du PDF…';}
    try{const pdf=CV.pdf(current.data,current.design);pdf.save(`CV-${current.data.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9-]+/g,'-')||'elan'}.pdf`);closeModal();toast('PDF téléchargé. Bonne chance pour votre prochaine candidature !');}
    catch(e){toast(e.message||'Le PDF n’a pas pu être créé. Réessayez.');if(button){button.disabled=false;button.textContent='Réessayer le téléchargement';}}
  }
  function renderSpace(){
    $('#doc-count').textContent=`${docs.length} CV sur cet appareil`;
    if(!docs.length){$('#saved-docs').innerHTML='<div class="empty-state"><div class="empty-icon">↗</div><h2>Votre prochaine histoire commence ici.</h2><p>Choisissez un modèle, personnalisez-le, puis retrouvez votre CV dans cet espace.</p><a href="#modeles" class="button button-primary">Créer mon premier CV <span>↗</span></a></div>';return;}
    $('#saved-docs').innerHTML=[...docs].sort((a,b)=>b.updatedAt-a.updatedAt).map(d=>{
      const preview=CV.svg(CV.compose(d.data,d.design).pages[0],d.title);
      const date=new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',year:'numeric'}).format(new Date(d.updatedAt));
      return `<article class="saved-card"><a class="saved-preview" href="#editeur/${d.id}" aria-label="Ouvrir ${esc(d.title)}" style="display:block">${preview}</a><div class="saved-content"><h3>${esc(d.title)}</h3><p>Modifié le ${date} · sur cet appareil</p><div class="saved-actions"><a class="button button-outline" href="#editeur/${d.id}">Reprendre <span>↗</span></a><div><button class="icon-button" data-duplicate="${d.id}" aria-label="Dupliquer ${esc(d.title)}" title="Dupliquer">⧉</button><button class="icon-button" data-delete="${d.id}" aria-label="Supprimer ${esc(d.title)}" title="Supprimer">×</button></div></div></div></article>`;
    }).join('');
  }
  function backup(){
    if(current)persist();
    const blob=new Blob([JSON.stringify({format:'elan-cv',version:1,exportedAt:new Date().toISOString(),documents:docs},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='elan-cv-sauvegarde.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Sauvegarde téléchargée. Conservez ce fichier dans un endroit sûr.');
  }
  async function importBackup(file){
    if(!file)return;
    if(file.size>15*1024*1024){toast('La sauvegarde dépasse 15 Mo.');return;}
    try{
      const parsed=JSON.parse(await file.text());
      if(parsed.format!=='elan-cv'||parsed.version!==1||!Array.isArray(parsed.documents)||parsed.documents.length>50)throw Error();
      const imported=parsed.documents.map(safeDocument);
      if(docs.length+imported.length>50){toast('Cette importation dépasserait la limite de 50 CV sur cet appareil.');return;}
      if(current)persist();
      for(const d of imported){d.id=uuid();d.title=d.title+' (importé)';docs.unshift(d);}
      const saved=persist();renderSpace();toast(saved?`${imported.length} CV importé${imported.length>1?'s':''}.`:storageIssue);
    }catch(e){toast('Ce fichier n’est pas une sauvegarde Élan CV valide.');}
    finally{if($('#import-file'))$('#import-file').value='';}
  }
  const actions={
    menu:()=>{const nav=$('.mobile-nav');nav.hidden=!nav.hidden;$('.menu-button').setAttribute('aria-expanded',String(!nav.hidden));},
    'close-modal':closeModal,'new-custom':()=>newDocument('essentiel',true),
    preview:()=>{document.body.classList.toggle('preview-open');$('#preview-toggle').textContent=document.body.classList.contains('preview-open')?'Modifier':'Aperçu';},
    'previous-step':()=>gotoStep(step-1),'next-step':()=>step===6?exportDialog():gotoStep(step+1),
    'zoom-in':()=>setZoom(zoom+10),'zoom-out':()=>setZoom(zoom-10),
    'remove-photo':()=>{current.data.photo='';changed();renderForm();},
    'export-dialog':exportDialog,'download-pdf':downloadPdf,backup,
    privacy:()=>modal(`${modalHeader('⌁','CONFIDENTIALITÉ','Votre parcours vous appartient.')}<p>Élan CV est accessible directement, sans compte. Cette version conserve vos CV et vos photos dans le stockage local de ce navigateur. L’éditeur ne les envoie pas à un serveur. Les fichiers PDF et les sauvegardes sont créés sur votre appareil.</p><p>Le service d’hébergement peut traiter les données techniques nécessaires à l’accès au site. Aucun outil de mesure d’audience n’est ajouté dans cette version.</p><div class="modal-callout">Sur un appareil partagé, téléchargez une sauvegarde puis supprimez vos CV de « Mes CV ». Effacer les données du navigateur supprime aussi les CV locaux. Ils ne sont pas synchronisés entre appareils. Le paiement Mobile Money n’est pas encore activé.</div><button class="button button-primary" data-action="close-modal">J’ai compris</button>`),
    about:()=>modal(`${modalHeader('↗','À PROPOS D’ÉLAN CV','Du potentiel à la première impression.')}<p>Élan CV est un créateur de CV en français, pensé pour le Burkina Faso. Six modèles personnalisables, la création libre, un éditeur et un export PDF sont disponibles sans inscription.</p><p>Les modèles sont des créations originales inspirées de votre sélection visuelle. Les profils présentés dans la collection sont fictifs.</p><div class="modal-callout">Tarif prévu : <strong>2 000 FCFA par CV</strong>.<br>Le paiement Mobile Money sera disponible après intégration du prestataire. Cette version permet l’export d’essai sans transaction. Aucun compte Google n’est nécessaire.</div><button class="button button-primary" data-action="close-modal">C’est parti</button>`),
    'sample-dialog':()=>modal(`${modalHeader('✦','EXEMPLE FICTIF','Voir un CV prendre forme.')}<p>Les informations actuelles de ce CV seront remplacées par un profil fictif de démonstration. Vous pourrez ensuite les modifier.</p><div class="modal-actions"><button class="button button-outline" data-action="close-modal">Garder mon contenu</button><button class="button button-primary" data-action="load-sample">Utiliser l’exemple</button></div>`),
    'load-sample':()=>{current.data=clone(CV.sample);current.title='CV de démonstration';$('#doc-title').value=current.title;changed();renderForm();closeModal();toast('Exemple fictif chargé. Remplacez-le par vos informations.');}
  };
  document.addEventListener('click',e=>{
    const action=e.target.closest('[data-action]');if(action){const fn=actions[action.dataset.action];if(fn&&!action.disabled)fn();return;}
    const create=e.target.closest('[data-create]');if(create){newDocument(create.dataset.create);return;}
    const preview=e.target.closest('[data-template-preview]');if(preview){const t=CV.templates.find(t=>t.id===preview.dataset.templatePreview);modal(`${modalHeader('✦','LA COLLECTION ÉLAN',t.name)}<p>${t.tag}. Votre contenu, vos couleurs, votre photo.</p><div class="modal-preview">${CV.svg(CV.compose(CV.sample,{...t,template:t.id}).pages[0],`Modèle ${t.name}`)}</div><p class="trial-note">Exemple fictif · le formulaire commence vide.</p><button class="button button-primary" data-create="${t.id}">Personnaliser ce modèle <span>↗</span></button>`);return;}
    const filterEl=e.target.closest('[data-filter]');if(filterEl){filter=filterEl.dataset.filter;renderCollection();return;}
    const st=e.target.closest('[data-step]');if(st){gotoStep(Number(st.dataset.step));return;}
    const add=e.target.closest('[data-add]');if(add){const key=add.dataset.add;const limit=key==='extras'?15:50;if(current.data[key].length>=limit){toast('Le nombre maximal de rubriques est atteint.');return;}current.data[key].push(key==='extras'?{title:'',text:''}:{title:'',organization:'',location:'',start:'',end:'',description:''});changed();renderForm();return;}
    const remove=e.target.closest('[data-remove]');if(remove){const [key,i]=remove.dataset.remove.split(':');modal(`${modalHeader('×','MODIFIER VOTRE PARCOURS','Supprimer cette entrée ?')}<p>Les informations de cette entrée seront retirées de votre CV.</p><div class="modal-actions"><button class="button button-outline" data-action="close-modal">Annuler</button><button class="button destructive" data-confirm-remove="${key}:${i}">Supprimer</button></div>`);return;}
    const confirmRemove=e.target.closest('[data-confirm-remove]');if(confirmRemove){const [key,i]=confirmRemove.dataset.confirmRemove.split(':');current.data[key].splice(Number(i),1);closeModal();changed();renderForm();return;}
    const up=e.target.closest('[data-entry-up]');if(up&&!up.disabled){const [key,index]=up.dataset.entryUp.split(':');const i=Number(index);if(i>0)[current.data[key][i],current.data[key][i-1]]=[current.data[key][i-1],current.data[key][i]];changed();renderForm();return;}
    const templateEl=e.target.closest('[data-design-template]');if(templateEl){const t=CV.templates.find(t=>t.id===templateEl.dataset.designTemplate);current.design={...current.design,...t,template:t.id};changed();renderForm();return;}
    const color=e.target.closest('[data-color]');if(color){current.design.color=color.dataset.color;if(current.design.style==='dark')current.design.side=color.dataset.color;changed();renderForm();return;}
    const orderEl=e.target.closest('[data-order]');if(orderEl&&!orderEl.disabled){const [key,delta]=orderEl.dataset.order.split(':');const list=current.design.order,i=list.indexOf(key),j=i+Number(delta);if(j>=0&&j<list.length)[list[i],list[j]]=[list[j],list[i]];changed();renderForm();return;}
    const duplicate=e.target.closest('[data-duplicate]');if(duplicate){if(docs.length>=50){toast('La limite de 50 CV est atteinte.');return;}const d=clone(docs.find(d=>d.id===duplicate.dataset.duplicate));d.id=uuid();d.title=(d.title+' — copie').slice(0,80);d.updatedAt=Date.now();docs.unshift(d);persist();renderSpace();toast('CV dupliqué.');return;}
    const del=e.target.closest('[data-delete]');if(del){const d=docs.find(d=>d.id===del.dataset.delete);modal(`${modalHeader('×','VOTRE ESPACE','Supprimer ce CV ?')}<p>« ${esc(d.title)} » sera supprimé de cet appareil. Une sauvegarde téléchargée restera disponible.</p><div class="modal-actions"><button class="button button-outline" data-action="close-modal">Annuler</button><button class="button destructive" data-confirm-delete="${d.id}">Supprimer</button></div>`);return;}
    const confirmDelete=e.target.closest('[data-confirm-delete]');if(confirmDelete){const id=confirmDelete.dataset.confirmDelete;docs=docs.filter(d=>d.id!==id);if(current?.id===id)current=null;persist();closeModal();renderSpace();toast('CV supprimé de cet appareil.');return;}
  });
  document.addEventListener('input',e=>{
    const el=e.target;
    if(el.id==='doc-title'&&current){current.title=el.value.slice(0,80)||'Mon CV';scheduleSave();return;}
    if(el.dataset.path&&current){setPath(el.dataset.path,el.value);changed();if(el.dataset.path==='design.color')$$('[data-color]').forEach(b=>{const active=b.dataset.color===el.value;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});return;}
    if(el.dataset.range&&current){const key=el.dataset.range;current.design[key]=key==='scale'?Number(el.value)/100:Number(el.value);$('#'+key+'-value').textContent=el.value+(key==='scale'?' %':' mm');changed();}
  });
  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.id==='photo-file')addPhoto(el.files[0]);
    if(el.id==='import-file')importBackup(el.files[0]);
    if(el.dataset.sectionToggle&&current){const key=el.dataset.sectionToggle;current.design.hidden=current.design.hidden.filter(k=>k!==key);if(!el.checked)current.design.hidden.push(key);changed();}
    if(el.tagName==='SELECT'&&el.dataset.path&&current){setPath(el.dataset.path,el.value);changed();}
  });
  $('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
  window.addEventListener('hashchange',route);
  window.addEventListener('pagehide',()=>{if(current)persist();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&current)persist();});
  initHome();route();if(storageIssue)toast(storageIssue);
})();
