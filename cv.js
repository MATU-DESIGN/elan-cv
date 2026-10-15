/* Un seul moteur de mise en page pour l'aperçu SVG et le PDF vectoriel. */
(() => {
  'use strict';
  const templates = [
    {id:'horizon',name:'Horizon',category:'moderne',tag:'Le sens du détail',color:'#173b65',side:'#10233f',layout:'sidebar',style:'dark',font:'helvetica'},
    {id:'menthe',name:'Équilibre',category:'sobre',tag:'Tout simplement vous',color:'#337d7a',side:'#e7f1ef',layout:'sidebar',style:'light',font:'helvetica'},
    {id:'signature',name:'Signature',category:'moderne',tag:'Une présence affirmée',color:'#43516b',side:'#eef0f5',layout:'sidebar',style:'banner',font:'helvetica'},
    {id:'essentiel',name:'Essentiel',category:'sobre',tag:'La force de la simplicité',color:'#202c3e',side:'#ffffff',layout:'single',style:'minimal',font:'helvetica'},
    {id:'sillage',name:'Sillage',category:'creatif',tag:'Une touche singulière',color:'#a17765',side:'#f2eae5',layout:'single',style:'bands',font:'times'},
    {id:'impact',name:'Impact',category:'creatif',tag:'L’audace de se présenter',color:'#752c38',side:'#752c38',layout:'sidebar',style:'dark',font:'times'}
  ];
  const sample = {
    name:'Aminata Ouédraogo',role:'Chargée de communication',email:'aminata@example.com',phone:'+226 70 00 00 00',city:'Ouagadougou, Burkina Faso',website:'',
    summary:'Créative et rigoureuse, je transforme les idées en actions de communication claires et engageantes. Mon ambition : accompagner des projets qui ont du sens et valoriser les talents de mon équipe.',
    photo:'',experiences:[{title:'Chargée de communication',organization:'Studio Baobab · Exemple fictif',location:'Ouagadougou',start:'2023',end:'Aujourd’hui',description:'Conception des supports de communication et animation des réseaux sociaux.\nCoordination des campagnes et suivi des résultats.\nOrganisation d’événements et relations avec les partenaires.'},{title:'Assistante communication',organization:'Association Horizon · Exemple fictif',location:'Bobo-Dioulasso',start:'2021',end:'2023',description:'Rédaction de contenus et participation à la vie des projets.\nCréation de visuels et préparation des événements.'}],
    education:[{title:'Licence en communication',organization:'Université Joseph Ki-Zerbo',location:'Ouagadougou',start:'2018',end:'2021',description:'Communication des organisations et stratégie éditoriale.'}],
    skills:'Stratégie de communication\nRédaction & création de contenu\nGestion de projet\nCanva · Suite bureautique\nTravail en équipe',languages:'Français — courant\nMooré — langue maternelle\nAnglais — intermédiaire',interests:'Lecture · Photographie\nEngagement associatif',extras:[]
  };
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize = t => String(t ?? '').replace(/\t/g,' ').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').replace(/\u202f/g,' ').replace(/\u00a0/g,' ');
  let metrics;
  function getMetrics() {
    if (!metrics && window.jspdf) metrics = new window.jspdf.jsPDF({unit:'mm',format:'a4'});
    return metrics;
  }
  function compose(data, design = {}) {
    const base=templates.find(t=>t.id===design.template) || templates[0];
    const d={...base,...design};
    d.color=/^#[0-9a-f]{6}$/i.test(d.color)?d.color:base.color;
    d.side=/^#[0-9a-f]{6}$/i.test(d.side)?d.side:base.side;
    d.font=d.font==='times'?'times':'helvetica';
    d.layout=d.layout==='single'?'single':'sidebar';
    const margin=Math.max(10,Math.min(19,Number(d.margin)||14));
    const scale=Math.max(.9,Math.min(1.15,Number(d.scale)||1));
    const compact=d.layout==='single';
    const body=(compact?3:3.15)*scale, lineHeight=(compact?4.2:4.65)*scale;
    const rgb=[1,3,5].map(i=>parseInt(d.side.slice(i,i+2),16));
    const dark=d.layout==='sidebar'&&(rgb[0]*299+rgb[1]*587+rgb[2]*114)/1000<145;
    const pages=[];
    const photo=typeof data.photo==='string'&&data.photo.startsWith('data:image/jpeg;base64,')?data.photo:'';
    const fullName=normalize(data.name)||'Votre nom';
    const role=normalize(data.role)||'Votre profession';
    const metric=getMetrics();
    const ops=(n)=>{while(pages.length<=n)makePage(pages.length);return pages[n];};
    function rect(n,x,y,w,h,fill){ops(n).push({type:'rect',x,y,w,h,fill});}
    function line(n,x,y,x2,y2,color,width=.25){ops(n).push({type:'line',x,y,x2,y2,color,width});}
    function txt(n,text,x,y,size=body,color='#283348',weight='normal'){ops(n).push({type:'text',text:normalize(text),x,y,size,color,weight,font:d.font});}
    function image(n,x,y,w,h){if(photo)ops(n).push({type:'image',data:photo,x,y,w,h});}
    function makePage(n){
      pages.push([]);
      rect(n,0,0,210,297,'#ffffff');
      if(d.layout==='sidebar'){
        rect(n,0,0,65,297,d.side);
        if(d.style==='light')line(n,65,0,65,297,d.color,.4);
      }
      if(d.style==='bands')rect(n,0,0,7,297,d.color);
      if(n>0){txt(n,fullName, d.layout==='sidebar'?78:margin,17,3.3,d.color,'bold');line(n,d.layout==='sidebar'?78:margin,21,210-margin,21,'#dde2e9');}
    }
    makePage(0);
    const mainX=d.layout==='sidebar'?78:margin+(d.style==='bands'?4:0);
    const mainW=210-mainX-margin;
    const contact=[data.email,data.phone,data.city,data.website].filter(Boolean).map(normalize);
    function wrap(text,width,size=body,weight='normal'){
      if(metric){metric.setFont(d.font,weight);metric.setFontSize(size*72/25.4);return metric.splitTextToSize(normalize(text),width);}
      const max=Math.max(8,Math.floor(width/(size*.5)));return normalize(text).split('\n').flatMap(s=>s.match(new RegExp('.{1,'+max+'}(?:\\s|$)|.{1,'+max+'}','g'))||['']);
    }
    const nameLines=wrap(fullName,mainW-(d.layout==='single'&&photo?33:0),8.3,'bold');
    let headerY=25;
    if(d.style==='banner'&&d.layout==='sidebar'){
      rect(0,70,10,140,42,d.color);
      for(const t of nameLines.slice(0,2)){txt(0,t,mainX,headerY,8.3,'#ffffff','bold');headerY+=9;}
      const roleLines=wrap(role,mainW,3.2);roleLines.slice(0,2).forEach((t,i)=>txt(0,t,mainX,headerY+2+i*4,3.2,'#ffffff'));
    }else{
      for(const t of nameLines.slice(0,3)){txt(0,t,mainX,headerY,8.3,d.color,'bold');headerY+=9;}
      const roleLines=wrap(role,mainW,3.5);roleLines.slice(0,2).forEach((t,i)=>txt(0,t,mainX,headerY+1+i*4.6,3.5,d.color));
      headerY+=roleLines.slice(0,2).length*4.6+3;
      line(0,mainX,headerY+2,mainX+Math.min(mainW,28),headerY+2,d.color,.7);
    }
    if(d.layout==='sidebar'){
      if(photo)image(0,14,15,37,37);
      else {rect(0,14,15,37,37,dark?'#ffffff':d.color);txt(0,fullName.split(/\s+/).filter(Boolean).map(s=>s[0]).slice(0,2).join('').toUpperCase(),21,39,11,dark?d.color:'#ffffff','bold');}
    }else if(photo)image(0,166,13,29,29);
    let mainY=d.style==='banner'&&d.layout==='sidebar'?66:Math.max(59,headerY+13);
    if(d.layout==='single'){
      for(const t of wrap(contact.join('  ·  '),mainW,2.7)){if(contact.length){txt(0,t,mainX,mainY,2.7,'#657185');mainY+=4.2;}}
      if(contact.length)mainY+=5;
    }
    function flow(x,width,y,side=false){
      let page=0;
      const color=side&&dark?'#ffffff':'#283348';
      const muted=side&&dark?'#d6e0ef':'#657185';
      const headingColor=side&&dark?'#ffffff':d.color;
      const top=n=>n===0?y:32;
      let cursor=y;
      function reserve(height){if(cursor+height>278){page++;ops(page);cursor=top(page);}}
      function paragraph(text,size=body,weight='normal',ink=color,gap=2){
        if(!text)return;
        const lines=wrap(text,width,size,weight), lh=lineHeight*(size/body);
        for(const t of lines){reserve(lh);txt(page,t,x,cursor+size,size,ink,weight);cursor+=lh;}
        cursor+=gap;
      }
      function heading(label){
        reserve(16);cursor+=compact?2:3;
        if(d.style==='bands'&&!side){rect(page,x-2,cursor-1,width+4,7,d.side);txt(page,label.toUpperCase(),x+1,cursor+4.3,3.15,d.color,'bold');cursor+=compact?8:11;}
        else{txt(page,label.toUpperCase(),x,cursor+3.3,3.15,headingColor,'bold');cursor+=compact?5:6;line(page,x,cursor,x+width,cursor,side&&dark?'#57708c':'#d8dfe7',.22);cursor+=compact?3:5;}
      }
      function entries(label,list){
        const valid=(list||[]).filter(e=>e.title||e.organization||e.description);
        if(!valid.length)return;
        heading(label);
        for(const e of valid){
          reserve(19);paragraph(e.title,body*1.07,'bold',color,0.5);
          paragraph([e.organization,e.location].filter(Boolean).join(' · '),body*.91,'normal',muted,0.5);
          paragraph([e.start,e.end].filter(Boolean).join(' — '),body*.85,'normal',muted,2);
          paragraph(e.description,body,'normal',color,4);
        }
      }
      return {heading,paragraph,entries};
    }
    const primary=flow(mainX,mainW,mainY);
    const secondary=d.layout==='sidebar'?flow(12,41,65,true):primary;
    if(d.layout==='sidebar'&&contact.length){secondary.heading('Contact');contact.forEach(c=>secondary.paragraph(c,2.8,'normal',dark?'#e4ebf6':'#46576c',2.3));}
    const sections={
      summary:()=>{if(data.summary){primary.heading('Profil');primary.paragraph(data.summary,body,'normal','#283348',4);}},
      experiences:()=>primary.entries('Expériences professionnelles',data.experiences),
      education:()=>primary.entries('Formation',data.education),
      skills:()=>{if(data.skills){secondary.heading('Compétences');secondary.paragraph(data.skills,body,'normal',dark?'#ffffff':'#283348',4);}},
      languages:()=>{if(data.languages){secondary.heading('Langues');secondary.paragraph(data.languages,body,'normal',dark?'#ffffff':'#283348',4);}},
      interests:()=>{if(data.interests){secondary.heading('Centres d’intérêt');secondary.paragraph(data.interests,body,'normal',dark?'#ffffff':'#283348',4);}}
    };
    const order=Array.isArray(d.order)?d.order:['summary','experiences','education','skills','languages','interests'];
    for(const key of [...new Set([...order,...Object.keys(sections)])])if(sections[key]&&!(d.hidden||[]).includes(key))sections[key]();
    for(const extra of data.extras||[]){if(extra.title&&extra.text){primary.heading(extra.title);primary.paragraph(extra.text,body,'normal','#283348',4);}}
    pages.forEach((p,n)=>{txt(n,fullName,mainX,289,2.3,'#8390a2');txt(n,`${n+1} / ${pages.length}`,187,289,2.3,'#8390a2');});
    return {pages,design:d};
  }
  function svg(page,label='Aperçu du CV'){
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" role="img" aria-label="${esc(label)}">${page.map(o=>{
      if(o.type==='rect')return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.fill}"/>`;
      if(o.type==='line')return `<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="${o.color}" stroke-width="${o.width}"/>`;
      if(o.type==='image')return `<image href="${o.data}" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" preserveAspectRatio="xMidYMid slice"/>`;
      return `<text x="${o.x}" y="${o.y}" fill="${o.color}" font-family="${o.font==='times'?'Georgia, Times New Roman, serif':'Arial, Helvetica, sans-serif'}" font-weight="${o.weight==='bold'?'700':'400'}" font-size="${o.size}">${esc(o.text)}</text>`;
    }).join('')}</svg>`;
  }
  function pdf(data,design){
    if(!window.jspdf)throw new Error('Le moteur PDF est indisponible. Rechargez la page.');
    const result=compose(data,design);
    const doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
    doc.setProperties({title:`CV — ${data.name}`,subject:data.role||'Curriculum vitae',creator:'Élan CV'});
    result.pages.forEach((p,n)=>{
      if(n)doc.addPage();
      for(const o of p){
        if(o.type==='rect'){doc.setFillColor(o.fill);doc.rect(o.x,o.y,o.w,o.h,'F');}
        else if(o.type==='line'){doc.setDrawColor(o.color);doc.setLineWidth(o.width);doc.line(o.x,o.y,o.x2,o.y2);}
        else if(o.type==='image')doc.addImage(o.data,'JPEG',o.x,o.y,o.w,o.h,undefined,'FAST');
        else{doc.setFont(o.font,o.weight);doc.setFontSize(o.size*72/25.4);doc.setTextColor(o.color);doc.text(o.text,o.x,o.y);}
      }
    });
    return doc;
  }
  window.CV={templates,sample,compose,svg,pdf,esc};
})();
