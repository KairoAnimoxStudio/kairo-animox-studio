const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const BLENDS=[['Normal','source-over'],['Multiply','multiply'],['Screen','screen'],['Overlay','overlay'],['Darken','darken'],['Lighten','lighten'],['Color Dodge','color-dodge'],['Color Burn','color-burn'],['Hard Light','hard-light'],['Soft Light','soft-light'],['Difference','difference'],['Exclusion','exclusion'],['Hue','hue'],['Saturation','saturation'],['Color','color'],['Luminosity','luminosity']];
// name, category, size, opacity(%), hardness(%), mode
const BRUSHES=[['HB Pencil','Sketch',3,70,100,'line'],['2B Pencil','Sketch',5,80,90,'line'],['Charcoal','Sketch',14,60,50,'spray'],['Sketch Liner','Sketch',2,100,100,'line'],['Colour Pencil','Sketch',6,60,80,'line'],
['G-Pen','Ink',6,100,100,'line'],['Maru Pen','Ink',3,100,100,'line'],['Mapping Pen','Ink',2,100,100,'line'],['Brush Pen','Ink',12,100,85,'line'],
['Round Brush','Paint',20,100,80,'line'],['Flat Brush','Paint',30,90,70,'line'],['Soft Airbrush','Paint',60,25,10,'line'],['Gouache','Paint',26,95,90,'line'],['Watercolor','Paint',40,30,40,'line'],
['Spray','Texture',40,80,50,'spray'],['Chalk','Texture',18,70,60,'spray'],['Sponge','Texture',30,50,40,'spray'],['Grain','Texture',24,60,30,'spray'],
['Hard Eraser','Eraser',20,100,100,'line'],['Soft Eraser','Eraser',40,100,20,'line']];
const PALETTE=['#000000','#ffffff','#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#d946ef','#ec4899','#78716c'];
const S={doc:null,tool:'brush',brush:BRUSHES[5],size:10,opacity:100,hard:100,stab:70,stabMode:'basic',
 h:217,s:76,v:96,fg:'#3b82f6',bg:'#ffffff',recent:[],cat:'All',q:'',
 z:1,px:0,py:0,rot:0,fx:1,fy:1,grid:false,sym:false,alphaLock:false,hist:[],redo:[],histMax:20,space:false,nid:1};
const cv=$('#studio-canvas'),ov=$('#overlay-canvas'),cx=cv.getContext('2d'),ox=ov.getContext('2d'),vp=$('#canvas-viewport');
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toast-container').append(t);setTimeout(()=>t.remove(),2600)};
const hsv2hex=(h,s,v)=>{s/=100;v/=100;const f=n=>{const k=(n+h/60)%6;return Math.round(255*(v-v*s*Math.max(0,Math.min(k,4-k,1))))};return'#'+[f(5),f(3),f(1)].map(x=>x.toString(16).padStart(2,'0')).join('')};
const hex2hsv=x=>{const n=parseInt(x.slice(1),16),r=(n>>16)/255,g=(n>>8&255)/255,b=(n&255)/255,M=Math.max(r,g,b),m=Math.min(r,g,b),d=M-m;let h=0;if(d){h=M==r?((g-b)/d)%6:M==g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360}return[Math.round(h),Math.round(M?d/M*100:0),Math.round(M*100)]};
const hex2rgb=x=>{const n=parseInt(x.slice(1),16);return[n>>16,n>>8&255,n&255,255]};

/* ---------- document / layers ---------- */
const mkLayer=(name,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return{id:S.nid++,name,c,x:c.getContext('2d',{willReadFrequently:true}),vis:true,op:100,blend:'source-over'}};
function newDoc(o={}){const w=+o.w||1280,h=+o.h||720,n=Math.max(1,+o.layers||2);
 S.doc={name:o.name||'Kairo Artwork',w,h,bg:o.bg||'#ffffff',transparent:!!o.transparent,layers:[],active:0};
 for(let i=0;i<n;i++)S.doc.layers.push(mkLayer(i?'Layer '+(i+1):'Layer 1',w,h));
 S.doc.active=n-1;cv.width=ov.width=w;cv.height=ov.height=h;S.hist=[];S.redo=[];
 $('#status-doc-info').textContent=`${w} × ${h} px · ${o.dpi||150} DPI`;fit();renderAll();}
const L=()=>S.doc.layers[S.doc.active];
function composite(ctx,w,h,bg=true){ctx.clearRect(0,0,w,h);if(bg&&!S.doc.transparent){ctx.fillStyle=S.doc.bg;ctx.fillRect(0,0,w,h)}
 for(const l of S.doc.layers){if(!l.vis)continue;ctx.globalAlpha=l.op/100;ctx.globalCompositeOperation=l.blend;ctx.drawImage(l.c,0,0,w,h)}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';}
function render(){composite(cx,S.doc.w,S.doc.h);const n=$('#navigator-canvas');if(n&&!$('#dock-pane-nav-history').hidden)composite(n.getContext('2d'),n.width,n.height)}
function renderAll(){render();renderLayers();renderOverlay()}
function renderOverlay(){ox.clearRect(0,0,ov.width,ov.height);if(S.grid){const g=+($('#set-grid-size').value)||32;ox.strokeStyle='rgba(128,128,128,.4)';ox.lineWidth=1;ox.beginPath();for(let x=0;x<=ov.width;x+=g){ox.moveTo(x,0);ox.lineTo(x,ov.height)}for(let y=0;y<=ov.height;y+=g){ox.moveTo(0,y);ox.lineTo(ov.width,y)}ox.stroke()}
 if(S.sym){ox.strokeStyle='rgba(59,130,246,.7)';ox.beginPath();ox.moveTo(ov.width/2,0);ox.lineTo(ov.width/2,ov.height);ox.stroke()}}
function renderLayers(){const list=$('#layer-list');list.innerHTML='';
 [...S.doc.layers].map((l,i)=>[l,i]).reverse().forEach(([l,i])=>{const r=document.createElement('div');r.className='layer-row'+(i==S.doc.active?' active':'');r.dataset.i=i;
  r.innerHTML=`<span class="eye${l.vis?'':' off'}" data-eye="${i}">👁</span><span style="flex:1">${l.name}</span><small>${l.op}%</small>`;list.append(r)});
 $('#layer-opacity').value=L().op;$('#layer-opacity-val').textContent=L().op+'%';$('#layer-blend').value=L().blend;
 $('#doc-tabs').innerHTML=`<div class="doc-tab active">${S.doc.name}</div>`;}
$('#layer-blend').innerHTML=BLENDS.map(b=>`<option value="${b[1]}">${b[0]}</option>`).join('');
$('#layer-list').onclick=e=>{const eye=e.target.closest('[data-eye]');if(eye){const l=S.doc.layers[+eye.dataset.eye];l.vis=!l.vis;return renderAll()}const r=e.target.closest('.layer-row');if(r){S.doc.active=+r.dataset.i;renderLayers()}};
$('#layer-blend').onchange=e=>{L().blend=e.target.value;render()};
$('#layer-opacity').oninput=e=>{L().op=+e.target.value;$('#layer-opacity-val').textContent=L().op+'%';render()};
$('#btn-add-layer').onclick=()=>{S.doc.layers.splice(S.doc.active+1,0,mkLayer('Layer '+S.nid,S.doc.w,S.doc.h));S.doc.active++;renderAll()};
$('#btn-dup-layer').onclick=()=>{const o=L(),n=mkLayer(o.name+' copy',S.doc.w,S.doc.h);n.x.drawImage(o.c,0,0);n.op=o.op;n.blend=o.blend;S.doc.layers.splice(S.doc.active+1,0,n);S.doc.active++;renderAll()};
$('#btn-del-layer').onclick=()=>{if(S.doc.layers.length<2)return toast('Keep at least one layer');S.doc.layers.splice(S.doc.active,1);S.doc.active=Math.max(0,S.doc.active-1);renderAll()};
$('#btn-merge-layer').onclick=()=>{const i=S.doc.active;if(!i)return toast('No layer below to merge into');const t=S.doc.layers[i-1],l=L();t.x.globalAlpha=l.op/100;t.x.globalCompositeOperation=l.blend;t.x.drawImage(l.c,0,0);t.x.globalAlpha=1;t.x.globalCompositeOperation='source-over';S.doc.layers.splice(i,1);S.doc.active=i-1;renderAll()};
const mv=d=>{const i=S.doc.active,j=i+d;if(j<0||j>=S.doc.layers.length)return;[S.doc.layers[i],S.doc.layers[j]]=[S.doc.layers[j],S.doc.layers[i]];S.doc.active=j;renderAll()};
$('#btn-up-layer').onclick=()=>mv(1);$('#btn-down-layer').onclick=()=>mv(-1);
$('#btn-alpha-lock').onclick=e=>{S.alphaLock=!S.alphaLock;e.target.classList.toggle('active',S.alphaLock)};

/* ---------- history (active-layer snapshots) ---------- */
function snap(){const l=L();S.hist.push({id:l.id,img:l.x.getImageData(0,0,S.doc.w,S.doc.h)});if(S.hist.length>S.histMax)S.hist.shift();S.redo=[];histUI()}
function swap(from,to){const e=from.pop();if(!e)return;const l=S.doc.layers.find(l=>l.id==e.id);if(!l)return;to.push({id:l.id,img:l.x.getImageData(0,0,S.doc.w,S.doc.h)});l.x.putImageData(e.img,0,0);renderAll();histUI()}
const undo=()=>swap(S.hist,S.redo),redo=()=>swap(S.redo,S.hist);
const histUI=()=>{$('#history-list').innerHTML=S.hist.map((_,i)=>`<div>Step ${i+1}</div>`).reverse().join('')||'No history'};
$('#btn-undo').onclick=undo;$('#btn-redo').onclick=redo;

/* ---------- color ---------- */
const wc=$('#color-wheel-canvas'),wx=wc.getContext('2d');
function drawWheel(){const r=56;wx.clearRect(0,0,112,112);if(wx.createConicGradient){const g=wx.createConicGradient(-Math.PI/2,r,r);for(let i=0;i<=360;i+=30)g.addColorStop(i/360,`hsl(${i},${S.s}%,${100-S.v/2}%)`);wx.fillStyle=g;wx.beginPath();wx.arc(r,r,r-2,0,7);wx.fill()}
 const a=S.h*Math.PI/180-Math.PI/2;wx.strokeStyle='#fff';wx.lineWidth=2;wx.beginPath();wx.arc(r+Math.cos(a)*(r*.7),r+Math.sin(a)*(r*.7),5,0,7);wx.stroke()}
wc.onpointerdown=wc.onpointermove=e=>{if(e.type=='pointermove'&&!e.buttons)return;const b=wc.getBoundingClientRect(),x=e.clientX-b.left-b.width/2,y=e.clientY-b.top-b.height/2;S.h=Math.round((Math.atan2(y,x)*180/Math.PI+90+360)%360);setHSV()};
function setHSV(){S.fg=hsv2hex(S.h,S.s,S.v);syncColor()}
function setFg(hex){S.fg=hex;[S.h,S.s,S.v]=hex2hsv(hex);syncColor()}
function syncColor(){$('#fg-swatch').style.background=S.fg;$('#bg-swatch').style.background=S.bg;$('#hex-input').value=S.fg;
 for(const k of'hsv'){$('#slider-'+k).value=S[k];$('#val-'+k).textContent=S[k]+(k=='h'?'°':'%')}drawWheel()}
for(const k of'hsv')$('#slider-'+k).oninput=e=>{S[k]=+e.target.value;setHSV()};
$('#hex-input').onchange=e=>{if(/^#[0-9a-f]{6}$/i.test(e.target.value))setFg(e.target.value.toLowerCase())};
$('#btn-swap-colors').onclick=()=>{const t=S.fg;S.bg=S.fg=S.bg;S.bg=t;setFg(S.fg)};
$('#btn-reset-colors').onclick=()=>{S.bg='#ffffff';setFg('#000000')};
$('#palette-select').innerHTML='<option>Default</option>';
const sw=(el,list)=>{el.innerHTML=list.map(c=>`<div class="swatch" data-c="${c}" style="background:${c}" title="${c}"></div>`).join('')};
const swClick=e=>{const c=e.target.dataset.c;if(c)setFg(c)};$('#palette-swatches').onclick=$('#recent-swatches').onclick=swClick;
$('#btn-save-color').onclick=()=>{if(!PALETTE.includes(S.fg)){PALETTE.push(S.fg);sw($('#palette-swatches'),PALETTE)}};
const pushRecent=()=>{S.recent=[S.fg,...S.recent.filter(c=>c!=S.fg)].slice(0,12);sw($('#recent-swatches'),S.recent)};

/* ---------- brushes ---------- */
function brushUI(){const q=S.q.toLowerCase();$('#brush-list').innerHTML=BRUSHES.filter(b=>(S.cat=='All'||b[1]==S.cat)&&b[0].toLowerCase().includes(q)).map(b=>`<div class="brush-item${b==S.brush?' active':''}" data-n="${b[0]}">${b[0]}<small>${b[1]}</small></div>`).join('')}
$('#brush-list').onclick=e=>{const n=e.target.closest('.brush-item')?.dataset.n;if(!n)return;S.brush=BRUSHES.find(b=>b[0]==n);[,,S.size,S.opacity,S.hard]=S.brush;sliders();brushUI();if(S.brush[1]=='Eraser')setTool('eraser');else if(S.tool=='eraser')setTool('brush')};
$$('[data-brush-cat]').forEach(b=>b.onclick=()=>{S.cat=b.dataset.brushCat;$$('[data-brush-cat]').forEach(x=>x.classList.toggle('active',x==b));brushUI()});
$('#brush-search').oninput=e=>{S.q=e.target.value;brushUI()};
const SL={size:['brush-size','size',' px'],opacity:['brush-opacity','opacity','%'],hard:['brush-hardness','hard','%'],stab:['brush-stab','stab','%']};
function sliders(){for(const k in SL){const[id,,u]=SL[k];$('#'+id).value=S[k];$('#'+id+'-val').textContent=S[k]+u}}
for(const k in SL){$('#'+SL[k][0]).oninput=e=>{S[k]=+e.target.value;sliders()}}
$('#brush-stab-mode').value=S.stabMode;$('#brush-stab-mode').onchange=e=>S.stabMode=e.target.value;
$('#btn-dup-brush').onclick=()=>{const b=[...S.brush];b[0]+=' copy';b[2]=S.size;b[3]=S.opacity;b[4]=S.hard;BRUSHES.push(b);S.brush=b;brushUI()};

/* ---------- view ---------- */
function applyView(){const t=`translate(-50%,-50%) translate(${S.px}px,${S.py}px) rotate(${S.rot}deg) scale(${S.z*S.fx},${S.z*S.fy})`;cv.style.transform=ov.style.transform=t;
 $('#status-zoom').textContent=Math.round(S.z*100)+'%';$('#status-rot').textContent=S.rot%360+'°';$('#nav-zoom-val').textContent=Math.round(S.z*100)+'%';$('#nav-zoom-slider').value=Math.round(S.z*100)}
function fit(){const b=vp.getBoundingClientRect();S.z=Math.min(1,(b.width-40)/S.doc.w,(b.height-40)/S.doc.h)||1;S.px=S.py=0;S.rot=0;S.fx=S.fy=1;applyView()}
const zoomTo=z=>{S.z=Math.max(.1,Math.min(8,z));applyView()};
function toDoc(e){const b=cv.getBoundingClientRect(),cX=b.left+b.width/2,cY=b.top+b.height/2,r=-S.rot*Math.PI/180;
 const dx=e.clientX-cX,dy=e.clientY-cY,x=dx*Math.cos(r)-dy*Math.sin(r),y=dx*Math.sin(r)+dy*Math.cos(r);
 return[x/(S.z*S.fx)+S.doc.w/2,y/(S.z*S.fy)+S.doc.h/2]}
$('#btn-fit-canvas').onclick=fit;$('#btn-actual-size').onclick=()=>zoomTo(1);$('#btn-reset-view').onclick=fit;
$('#btn-rot-left').onclick=()=>{S.rot-=15;applyView()};$('#btn-rot-right').onclick=()=>{S.rot+=15;applyView()};
$('#btn-flip-h').onclick=()=>{S.fx*=-1;applyView()};$('#btn-flip-v').onclick=()=>{S.fy*=-1;applyView()};
$('#btn-toggle-grid').onclick=()=>{S.grid=!S.grid;renderOverlay()};$('#btn-toggle-symmetry').onclick=()=>{S.sym=!S.sym;renderOverlay()};
$('#nav-zoom-slider').oninput=e=>zoomTo(e.target.value/100);
vp.addEventListener('wheel',e=>{e.preventDefault();zoomTo(S.z*(e.deltaY<0?1.1:.9))},{passive:false});

/* ---------- tools ---------- */
function setTool(t){S.tool=t;$$('.tool-btn').forEach(b=>b.classList.toggle('active',b.dataset.tool==t));$('#status-tool').textContent=t.toUpperCase();
 vp.style.cursor=t=='hand'?'grab':t=='move'?'move':'crosshair';
 $('#tool-props-body').innerHTML=`<p class="muted-note">Tool: <b>${t}</b>. Size, opacity and stabilizer sliders in the Brushes panel apply.</p>`}
$$('.tool-btn').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
$$('.dock-subtab').forEach(b=>b.onclick=()=>{$$('.dock-subtab').forEach(x=>x.classList.toggle('active',x==b));$$('.dock-pane').forEach(p=>p.hidden=p.id!='dock-pane-'+b.dataset.dockTab);render()});

function stroke(ctx,a,b,p){const erase=S.tool=='eraser',sz=Math.max(1,S.size*p);
 ctx.save();ctx.globalAlpha=S.opacity/100;ctx.globalCompositeOperation=erase?'destination-out':S.alphaLock?'source-atop':'source-over';
 ctx.strokeStyle=ctx.fillStyle=S.fg;ctx.lineCap=ctx.lineJoin='round';
 if(S.tool=='pencil'){ctx.lineWidth=Math.max(1,sz/3)}else ctx.lineWidth=sz;
 if(S.hard<95){ctx.shadowColor=erase?'#000':S.fg;ctx.shadowBlur=sz*(1-S.hard/100)}
 if(S.brush[5]=='spray'&&!erase){const n=Math.ceil(sz/2);for(let i=0;i<n;i++){const an=Math.random()*6.283,r=Math.random()*sz/2;ctx.fillRect(b[0]+Math.cos(an)*r,b[1]+Math.sin(an)*r,1.5,1.5)}}
 else{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}ctx.restore()}
const segment=(a,b,p)=>{const c=L().x;stroke(c,a,b,p);if(S.sym)stroke(c,[S.doc.w-a[0],a[1]],[S.doc.w-b[0],b[1]],p);render()};

function flood(x,y){x|=0;y|=0;const{w,h}=S.doc,c=L().x,im=c.getImageData(0,0,w,h),d=im.data,i0=(y*w+x)*4,t=[d[i0],d[i0+1],d[i0+2],d[i0+3]],f=hex2rgb(S.fg);
 if(t.every((v,i)=>v==f[i]))return;const ok=i=>Math.abs(d[i]-t[0])+Math.abs(d[i+1]-t[1])+Math.abs(d[i+2]-t[2])+Math.abs(d[i+3]-t[3])<=48,st=[[x,y]];
 while(st.length){let[px,py]=st.pop(),i=(py*w+px)*4;if(!ok(i))continue;let l=px;while(l>0&&ok((py*w+l-1)*4))l--;let r=px;while(r<w-1&&ok((py*w+r+1)*4))r++;
  let up=false,dn=false;for(let k=l;k<=r;k++){const j=(py*w+k)*4;d[j]=f[0];d[j+1]=f[1];d[j+2]=f[2];d[j+3]=255;
   if(py>0){const o=ok(((py-1)*w+k)*4);if(o&&!up)st.push([k,py-1]);up=o}if(py<h-1){const o=ok(((py+1)*w+k)*4);if(o&&!dn)st.push([k,py+1]);dn=o}}}
 c.putImageData(im,0,0)}
function pick(x,y){const d=composite&&(()=>{const t=document.createElement('canvas');t.width=S.doc.w;t.height=S.doc.h;const c=t.getContext('2d');composite(c,t.width,t.height);return c.getImageData(x|0,y|0,1,1).data})();setFg('#'+[...d].slice(0,3).map(v=>v.toString(16).padStart(2,'0')).join(''))}

let drag=null;
vp.addEventListener('pointerdown',e=>{if(!S.doc||e.button>1&&e.button!==0)return;vp.setPointerCapture(e.pointerId);const p=toDoc(e);
 if(S.tool=='hand'||S.space||e.button==1){drag={k:'pan',sx:e.clientX,sy:e.clientY,px:S.px,py:S.py};return}
 if(S.tool=='zoom'){zoomTo(S.z*(e.altKey?.8:1.25));return}
 if(S.tool=='eyedropper'){pick(...p);return}
 if(!L().vis)return toast('Layer is hidden');
 if(S.tool=='fill'){snap();flood(...p);pushRecent();render();return}
 if(S.tool=='text'){const t=prompt('Text:');if(t){snap();const c=L().x;c.fillStyle=S.fg;c.font=`${S.size*3}px sans-serif`;c.fillText(t,p[0],p[1]);render()}return}
 if(S.tool=='comic'){const t=prompt('Speech bubble text:');if(t){snap();const c=L().x,w=Math.max(120,t.length*14),h=70;c.fillStyle='#fff';c.strokeStyle='#000';c.lineWidth=3;c.beginPath();c.ellipse(p[0],p[1],w/2,h/2,0,0,7);c.fill();c.stroke();
  c.beginPath();c.moveTo(p[0]-12,p[1]+h/2-4);c.lineTo(p[0]-30,p[1]+h/2+28);c.lineTo(p[0]+8,p[1]+h/2-6);c.closePath();c.fill();c.stroke();c.fillStyle='#000';c.font='bold 20px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(t,p[0],p[1]);c.textAlign='start';c.textBaseline='alphabetic';render()}return}
 snap();pushRecent();
 if(['brush','pencil','eraser'].includes(S.tool)){const pr=e.pointerType=='pen'?Math.max(.1,e.pressure*1.5):1;drag={k:'draw',last:p,sm:p};segment(p,p,pr)}
 else if(S.tool=='move'){drag={k:'move',s:p,img:L().x.getImageData(0,0,S.doc.w,S.doc.h)}}
 else drag={k:S.tool,s:p}});
vp.addEventListener('pointermove',e=>{if(!S.doc)return;const p=toDoc(e);$('#status-coords').textContent=`${p[0]|0}, ${p[1]|0} px`;if(!drag)return;
 if(drag.k=='pan'){S.px=drag.px+e.clientX-drag.sx;S.py=drag.py+e.clientY-drag.sy;applyView()}
 else if(drag.k=='draw'){const f=S.stabMode=='none'?1:1-Math.min(.92,S.stab/100*({basic:.6,moving_avg:.8,weighted:.9,advanced:1}[S.stabMode]||.6));
  const pr=e.pointerType=='pen'?Math.max(.1,e.pressure*1.5):1;const n=[drag.sm[0]+(p[0]-drag.sm[0])*f,drag.sm[1]+(p[1]-drag.sm[1])*f];segment(drag.last,n,pr);drag.last=drag.sm=n}
 else if(drag.k=='move'){const c=L().x;c.clearRect(0,0,S.doc.w,S.doc.h);const t=document.createElement('canvas');t.width=S.doc.w;t.height=S.doc.h;t.getContext('2d').putImageData(drag.img,0,0);c.drawImage(t,p[0]-drag.s[0],p[1]-drag.s[1]);render()}
 else{ox.clearRect(0,0,ov.width,ov.height);renderOverlay();ox.strokeStyle=S.fg;ox.lineWidth=2;ox.setLineDash(['selection'].includes(drag.k)?[6,4]:[]);prim(ox,drag.k,drag.s,p,true);ox.setLineDash([])}});
function prim(c,k,a,b,prev){const[x,y,w,h]=[Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1])];
 if(k=='shape'||k=='selection'){c.beginPath();c.rect(x,y,w,h);c.stroke()}
 else if(k=='gradient'&&!prev){const g=c.createLinearGradient(a[0],a[1],b[0],b[1]);g.addColorStop(0,S.fg);g.addColorStop(1,S.bg);c.globalAlpha=S.opacity/100;c.fillStyle=g;c.fillRect(0,0,S.doc.w,S.doc.h);c.globalAlpha=1}
 else if(k=='gradient'){c.beginPath();c.moveTo(...a);c.lineTo(...b);c.stroke()}}
vp.addEventListener('pointerup',e=>{if(!drag)return;const p=toDoc(e);if(['shape','gradient'].includes(drag.k)){const c=L().x;c.strokeStyle=S.fg;c.lineWidth=Math.max(1,S.size/2);prim(c,drag.k,drag.s,p,false);renderOverlay()}drag=null;renderAll()});

/* ---------- files ---------- */
const dl=(blob,name)=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
const toKas=()=>JSON.stringify({v:1,name:S.doc.name,w:S.doc.w,h:S.doc.h,bg:S.doc.bg,transparent:S.doc.transparent,layers:S.doc.layers.map(l=>({name:l.name,vis:l.vis,op:l.op,blend:l.blend,data:l.c.toDataURL()}))});
const saveKas=()=>{dl(new Blob([toKas()],{type:'application/json'}),S.doc.name+'.kas');toast('Saved .kas')};
async function loadKas(txt){try{const j=JSON.parse(txt);newDoc({name:j.name,w:j.w,h:j.h,bg:j.bg,transparent:j.transparent,layers:1});S.doc.layers=[];
 for(const d of j.layers){const l=mkLayer(d.name,j.w,j.h);Object.assign(l,{vis:d.vis,op:d.op,blend:d.blend});await new Promise(r=>{const im=new Image();im.onload=()=>{l.x.drawImage(im,0,0);r()};im.src=d.data});S.doc.layers.push(l)}
 S.doc.active=S.doc.layers.length-1;renderAll();toast('Project loaded')}catch{toast('Invalid .kas file')}}
const pickFile=(btn,inp,fn)=>{$(btn).onclick=()=>$(inp).click();$(inp).onchange=e=>{const f=e.target.files[0];if(f)fn(f);e.target.value=''}};
pickFile('#btn-open-kas','#input-open-kas',f=>f.text().then(loadKas));pickFile('#welcome-open-kas','#input-open-kas',f=>f.text().then(loadKas));
pickFile('#btn-import-img','#input-import-img',f=>{const im=new Image();im.onload=()=>{snap();const k=Math.min(1,S.doc.w/im.width,S.doc.h/im.height);L().x.drawImage(im,0,0,im.width*k,im.height*k);renderAll()};im.src=URL.createObjectURL(f)});
$('#btn-save-kas').onclick=saveKas;
$('#btn-open-export').onclick=()=>$('#export-modal').hidden=false;
$('#btn-do-export').onclick=()=>{const f=$('#export-format').value;if(f=='kas'){saveKas();return}
 if(!['png','jpeg','webp'].includes(f))return toast('GIF / PNG sequence not available yet');
 const t=document.createElement('canvas');t.width=S.doc.w;t.height=S.doc.h;const c=t.getContext('2d');if(f=='jpeg'){c.fillStyle='#fff';c.fillRect(0,0,t.width,t.height)}
 composite(c,t.width,t.height,f=='jpeg'||!S.doc.transparent);t.toBlob(b=>dl(b,`${S.doc.name}.${f=='jpeg'?'jpg':f}`),'image/'+f,$('#export-quality').value/100);$('#export-modal').hidden=true};

/* ---------- modals / workspace ---------- */
$$('[data-close-modal]').forEach(b=>b.onclick=()=>$('#'+b.dataset.closeModal).hidden=true);
$('#btn-open-settings').onclick=()=>$('#settings-modal').hidden=false;
$('#btn-save-settings').onclick=()=>{S.histMax=Math.min(100,+$('#set-history-depth').value||20);$('#settings-modal').hidden=true;renderOverlay()};
$('#btn-toggle-timeline').onclick=()=>$('#timeline-panel').hidden=!$('#timeline-panel').hidden;
$$('[data-workspace-btn]').forEach(b=>b.onclick=()=>{$$('[data-workspace-btn]').forEach(x=>x.classList.toggle('active',x==b));$('#kas-root').dataset.workspace=b.dataset.workspaceBtn;
 $('#timeline-panel').hidden=b.dataset.workspaceBtn!='animation';$('.kas-right-dock').hidden=b.dataset.workspaceBtn=='minimal';$('#left-tools').hidden=false;if(b.dataset.workspaceBtn=='comic')setTool('comic');fit()});
const PRESETS={'HD 1920×1080':[1920,1080],'Canvas 1280×720':[1280,720],'Square 2048×2048':[2048,2048],'Manga B5 2149×3035':[2149,3035]};
$('#new-doc-preset').innerHTML=Object.keys(PRESETS).map(k=>`<option>${k}</option>`).join('');
$('#new-doc-preset').onchange=e=>{[$('#new-doc-width').value,$('#new-doc-height').value]=PRESETS[e.target.value]};
$('#new-doc-form').onsubmit=e=>{e.preventDefault();newDoc({name:$('#new-doc-name').value,w:$('#new-doc-width').value,h:$('#new-doc-height').value,layers:$('#new-doc-layers').value,bg:$('#new-doc-bg').value,transparent:$('#new-doc-transparent').checked,dpi:$('#new-doc-dpi').value});$('#new-doc-modal').hidden=true};
const start=(ws,o)=>{newDoc(o);$('#welcome-modal').hidden=true;$(`[data-workspace-btn=${ws}]`).click()};
$('#welcome-start-ill').onclick=()=>start('illustration',{});
$('#welcome-start-anim').onclick=()=>start('animation',{});
$('#welcome-start-comic').onclick=()=>start('comic',{w:1075,h:1517,name:'Comic Page'});

/* ---------- keys ---------- */
const KEYS={b:'brush',p:'pencil',e:'eraser',g:'fill',i:'eyedropper',m:'selection',v:'move',u:'shape',t:'text',c:'comic',h:'hand',z:'zoom'};
addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const k=e.key.toLowerCase();
 if(e.ctrlKey||e.metaKey){if(k=='z'){e.preventDefault();e.shiftKey?redo():undo()}else if(k=='y'){e.preventDefault();redo()}else if(k=='s'){e.preventDefault();saveKas()}else if(k=='0'){e.preventDefault();fit()}return}
 if(k==' '){S.space=true;e.preventDefault();return}
 if(KEYS[k])setTool(KEYS[k]);else if(k=='x')$('#btn-swap-colors').click();else if(k=='d')$('#btn-reset-colors').click();
 else if(k=='['){S.size=Math.max(1,S.size-(S.size>20?5:1));sliders()}else if(k==']'){S.size=Math.min(160,S.size+(S.size>=20?5:1));sliders()}});
addEventListener('keyup',e=>{if(e.key==' ')S.space=false});
addEventListener('resize',applyView);

/* ---------- boot ---------- */
sw($('#palette-swatches'),PALETTE);sliders();brushUI();setTool('brush');setFg('#3b82f6');
$('#fps-select').innerHTML=[8,12,24,30,60].map(f=>`<option ${f==24?'selected':''}>${f}</option>`).join('');
newDoc({});histUI();$('#welcome-modal').hidden=false;
