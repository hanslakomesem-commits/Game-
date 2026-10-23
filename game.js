(() => {
'use strict';
const $ = id => document.getElementById(id);
const safeStorage={getItem(k){try{return localStorage.getItem(k)}catch{return null}},setItem(k,v){try{localStorage.setItem(k,v)}catch{}},removeItem(k){try{localStorage.removeItem(k)}catch{}}};
const canvas = $('racingCanvas'), ctx = canvas.getContext('2d', { alpha: false });
const popup = $('giftPopup');
const gifts = {forward:{emoji:'🌹',text:'MAJU 2 DETIK',duration:2000},left:{emoji:'🍦',text:'BELOK KIRI',duration:1350},right:{emoji:'❤️',text:'BELOK KANAN',duration:1350},reverse:{emoji:'🌶️',text:'MUNDUR',duration:2000},nitro:{emoji:'🚀',text:'NITRO!',duration:4000},wake:{emoji:'🌌',text:'WAKE ME UP',duration:2200},changeCar:{emoji:'🐬',text:'GANTI MOBIL',duration:0},pause:{emoji:'🎮',text:'PAUSE / LANJUT',duration:0}};
const demoNames = ['@bmoney337','@putri_madura','@fahrizain','@user_8432','@nabilam'];
const state = {speed:0,x:0,distance:0,crashes:0,nitro:0,forwardEnd:0,backEnd:0,leftEnd:0,rightEnd:0,nitroEnd:0,particles:[],cars:[],worldTime:0,spawn:0,shake:0,dimW:400,dimH:600,last:performance.now(),popupTimer:0,serverSocket:null,serverUrl:'',connected:false,serverConnected:false,streamReady:false,paused:false,pauseStart:0,carIndex:0};
let displayW=400,displayH=600;
function clamp(n,a,b){return Math.min(b,Math.max(a,n))}
function lerp(a,b,t){return a+(b-a)*t}
function resize(){const r=canvas.getBoundingClientRect();displayW=r.width;displayH=r.height;let dpr=Math.min(devicePixelRatio||1,2); canvas.width=Math.max(1,Math.round(r.width*dpr));canvas.height=Math.max(1,Math.round(r.height*dpr));ctx.setTransform(dpr,0,0,dpr,0,0)}
window.addEventListener('resize',resize);resize();
const buildings=Array.from({length:42},(_,i)=>({x:i/42, h:15+Math.sin(i*42.7)*29+Math.random()*30,w:8+Math.random()*25,windows:Math.floor(Math.random()*3)+1}));
function addParticles(x,y,count,color){for(let i=0;i<count;i++)state.particles.push({x,y,vx:(Math.random()-.5)*85,vy:(Math.random()-.7)*105,life:.6+Math.random()*.6,color,size:1+Math.random()*3}); if(state.particles.length>150)state.particles.splice(0,state.particles.length-150)}
function act(action,from='@penonton',amount=1,label='',source='demo'){
  if(!gifts[action])return;
  const n=clamp(Number(amount)||1,1,30),now=performance.now();
  const duration = Math.min(gifts[action].duration*Math.min(n,5),9500);
  // Last directional gift takes precedence over a conflicting earlier gift.
  if(action==='forward'){state.backEnd=now;state.forwardEnd=Math.max(state.forwardEnd,now)+duration}
  if(action==='reverse'){state.forwardEnd=now;state.nitroEnd=now;state.backEnd=Math.max(state.backEnd,now)+Math.min(duration,4000)}
  if(action==='left'){state.rightEnd=now;state.leftEnd=Math.max(state.leftEnd,now)+Math.min(duration,5000)}
  if(action==='right'){state.leftEnd=now;state.rightEnd=Math.max(state.rightEnd,now)+Math.min(duration,5000)}
  if(action==='nitro'||action==='wake'){state.backEnd=now;state.nitroEnd=Math.max(state.nitroEnd,now)+Math.min(duration,9500);state.forwardEnd=Math.max(state.forwardEnd,now)+duration;state.nitro=100}
  if(action==='changeCar')state.carIndex=(state.carIndex+1)%5;
  if(action==='pause'){
    state.paused=!state.paused;
    if(state.paused)state.pauseStart=now;
    else{
      const elapsed=now-state.pauseStart;
      for(const key of ['forwardEnd','backEnd','leftEnd','rightEnd','nitroEnd'])if(state[key]>state.pauseStart)state[key]+=elapsed;
    }
    const indicator=$('pauseIndicator');if(indicator)indicator.hidden=!state.paused;
  }
  const safeName=String(from||'@penonton').slice(0,35);
  const giftLabel=String(label||gifts[action].text).slice(0,45);
  popup.innerHTML='';const icon=document.createElement('span');icon.textContent=gifts[action].emoji;popup.appendChild(icon);popup.appendChild(document.createTextNode(safeName+' ×'+n+' • '+gifts[action].text));popup.classList.add('visible');clearTimeout(state.popupTimer);state.popupTimer=setTimeout(()=>popup.classList.remove('visible'),2200);
  $('screenMessage').textContent=safeName+' → '+gifts[action].text;$('hintMessage').textContent=source==='live'?'Gift TikTok diterima • '+giftLabel:'SIMULASI • '+giftLabel;
  const events=$('events');events.querySelector('.empty')?.remove();const row=document.createElement('div');row.className='event';const left=document.createElement('span');left.className='leftinfo';const who=document.createElement('strong');who.textContent=safeName;const desc=document.createElement('small');desc.textContent=' mengirim '+giftLabel+' ×'+n;left.append(who,desc);const right=document.createElement('span');right.className='tag'+(source==='demo'?' sim':'');right.textContent=gifts[action].emoji+' '+gifts[action].text;row.append(left,right);events.prepend(row);while(events.children.length>8)events.lastChild.remove();
}
function centerX(z){return displayW*.5+Math.sin(state.distance*.0028)*displayW*.02*(1-z)}
function getRoad(y){const h=displayH,horizon=h*.34;const z=clamp((y-horizon)/(h-horizon),0,1); const depth=z*z;return {z,center:centerX(z),width:displayW*(.10+.84*depth)}}
function drawBuilding(x,y,width,height,lighting){ctx.fillStyle=lighting?'#101b35':'#0b152b';ctx.fillRect(x,y-height,width,height);ctx.fillStyle=lighting?'#496383':'#274261'; for(let j=0;j<height/12-1;j++)for(let k=0;k<Math.min(5,Math.floor(width/7));k++){if(((k*13+j*7+Math.floor(x))%3)===1)ctx.fillRect(x+4+k*7,y-height+7+j*10,2.4,3)}}
function background(){const w=displayW,h=displayH,hor=h*.34;let g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#030d25');g.addColorStop(.38,'#1d4a75');g.addColorStop(.53,'#f2778d');g.addColorStop(.54,'#25364c');g.addColorStop(1,'#0a1722');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.globalAlpha=.8;const sunX=w*.54,sunY=hor*.68;const sun=ctx.createRadialGradient(sunX,sunY,6,sunX,sunY,hor*.55);sun.addColorStop(0,'#ffb8ba88');sun.addColorStop(.3,'#ff498555');sun.addColorStop(1,'#ff4c8d00');ctx.fillStyle=sun;ctx.fillRect(0,0,w,hor*1.3);ctx.restore();
 for(let i=0;i<buildings.length;i++){let b=buildings[i],x=(i/42*w+w+state.distance*(i%2?.004:.002))%w;drawBuilding(x,hor+6,b.w,b.h,true)}
 ctx.fillStyle='#182f3d';ctx.fillRect(0,hor,w,h-hor);
 ctx.fillStyle='#1a2c29';ctx.fillRect(0,hor+10,w,h-hor);
 const top=getRoad(hor),bottom=getRoad(h);
 ctx.beginPath();ctx.moveTo(top.center-top.width*.55,hor);ctx.lineTo(bottom.center-bottom.width*.61,h);ctx.lineTo(bottom.center+bottom.width*.61,h);ctx.lineTo(top.center+top.width*.55,hor);ctx.closePath();ctx.fillStyle='#7d294c';ctx.fill();
 ctx.beginPath();ctx.moveTo(top.center-top.width*.5,hor);ctx.lineTo(bottom.center-bottom.width*.56,h);ctx.lineTo(bottom.center+bottom.width*.56,h);ctx.lineTo(top.center+top.width*.5,hor);ctx.closePath();let road=ctx.createLinearGradient(0,hor,0,h);road.addColorStop(0,'#2c3443');road.addColorStop(1,'#18232b');ctx.fillStyle=road;ctx.fill();
 for(let i=0;i<30;i++){let z=((i/30)+(state.distance*.00115%1))%1,y=hor+(h-hor)*z*z,r=getRoad(y),len=2+z*43;
  if(i%3!==0)continue;
  for(let lane of [-.33,.33]){let x=r.center+r.width*lane;ctx.save();ctx.strokeStyle='rgba(203,239,255,'+(.15+.65*z)+')';ctx.lineWidth=1+z*5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+len);ctx.stroke();ctx.restore()}
  for(let side of [-1,1]){let x=r.center+side*r.width*.555;ctx.strokeStyle=i%2===0?'#ff3c78':'#eefbfc';ctx.lineWidth=1+z*5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+side*len*.07,y+len);ctx.stroke()}
 }
 ctx.save();ctx.globalAlpha=.28;for(let i=0;i<20;i++){let z=((i/20)+(state.distance*.001%1))%1,y=hor+(h-hor)*z*z,r=getRoad(y);ctx.strokeStyle='#32f6d5';ctx.lineWidth=.4+z*3;ctx.beginPath();ctx.moveTo(r.center-r.width*.72,y);ctx.lineTo(r.center-r.width*(.74+z*.08),y+3+z*13);ctx.moveTo(r.center+r.width*.72,y);ctx.lineTo(r.center+r.width*(.74+z*.08),y+3+z*13);ctx.stroke()}ctx.restore();
}
function polygon(pts,color){ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);ctx.closePath();ctx.fillStyle=color;ctx.fill()}
function drawCar(cx,base,w,color,enemy=false){let hh=w*.83,top=base-hh;ctx.save();ctx.translate(cx,base);ctx.fillStyle='#0009';ctx.beginPath();ctx.ellipse(0,-1,w*.75,w*.2,0,0,Math.PI*2);ctx.fill();const c=color;polygon([[-w*.51,0],[-w*.46,-hh*.65],[-w*.30,-hh*.98],[w*.30,-hh*.98],[w*.46,-hh*.65],[w*.51,0]],c);
polygon([[-w*.32,-hh*.65],[-w*.24,-hh*.89],[w*.24,-hh*.89],[w*.32,-hh*.65]],'#0d1930');polygon([[-w*.38,-hh*.60],[-w*.45,-hh*.18],[w*.45,-hh*.18],[w*.38,-hh*.60]],'#101e38');polygon([[-w*.45,-hh*.20],[-w*.52,-hh*.09],[-w*.35,-hh*.03],[-w*.28,-hh*.13]],'#ff436a');polygon([[w*.45,-hh*.20],[w*.52,-hh*.09],[w*.35,-hh*.03],[w*.28,-hh*.13]],'#ff436a');ctx.fillStyle='#0c1121';ctx.fillRect(-w*.61,-hh*.45,w*.19,hh*.33);ctx.fillRect(w*.42,-hh*.45,w*.19,hh*.33);
if(!enemy){ctx.fillStyle='#1c2b4b';ctx.fillRect(-w*.6,-hh*.8,w*1.2,hh*.07);ctx.fillStyle='#e7f4ff';ctx.fillRect(-w*.18,-hh*.14,w*.36,hh*.08)}
ctx.restore();}
function update(dt,now){dt=Math.min(dt,.05);if(state.paused)return;const forward=now<state.forwardEnd,back=now<state.backEnd,nitro=now<state.nitroEnd;let wanted=nitro?185:forward?110:back?-38:0;state.speed=lerp(state.speed,wanted,clamp(dt*2.4,0,1));state.x+=(((now<state.rightEnd)?1:0)-((now<state.leftEnd)?1:0))*dt*(.55+Math.abs(state.speed)/190);
state.x=clamp(state.x,-.84,.84);state.nitro=nitro?clamp((state.nitroEnd-now)/gifts.nitro.duration*100,0,100):0;state.distance+=Math.max(0,state.speed)*dt*.65;state.worldTime+=dt;if(Math.abs(state.speed)>12){state.spawn+=dt; if(state.spawn>1.2){state.spawn=0; if(state.cars.length<9)state.cars.push({x:[-.55,0,.55][Math.floor(Math.random()*3)],z:.09,speed:.17+Math.random()*.17,color:['#e4d969','#e25e7e','#5d92ef','#85dc9c'][Math.floor(Math.random()*4)]})}}
for(let i=state.cars.length-1;i>=0;i--){const car=state.cars[i];car.z+=dt*(Math.max(0,state.speed)/110)*car.speed; if(car.z>.87&&car.z<1&&Math.abs(car.x-state.x)<.29&&state.speed>30){state.crashes++;state.shake=.35;state.speed=11;state.forwardEnd=Math.min(state.forwardEnd,now+150);car.z=1.2;addParticles(displayW/2,displayH*.83,22,'#ffc567');$('screenMessage').textContent='💥 MOBIL TABRAKAN!';$('hintMessage').textContent='Kirim gift untuk lanjut balapan'}if(car.z>1.13)state.cars.splice(i,1)}state.shake=Math.max(0,state.shake-dt);
for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;if(p.life<0)state.particles.splice(i,1)} }
function draw(now){let w=displayW,h=displayH;ctx.clearRect(0,0,w,h);ctx.save();if(state.shake>0)ctx.translate((Math.random()-.5)*6*state.shake,(Math.random()-.5)*13*state.shake);background();const hor=h*.34;state.cars.sort((a,b)=>a.z-b.z);for(let c of state.cars){const y=hor+(h-hor)*c.z*c.z,x=centerX(c.z)+c.x*getRoad(y).width*.38;drawCar(x,y,w*(.03+.21*c.z*c.z),c.color,true)}
const carX=w*.5+state.x*getRoad(h*.89).width*.39,carY=h*.885,carW=Math.min(w*.33,158);if(now<state.nitroEnd&&state.speed>20){for(let side of [-1,1]){ctx.fillStyle='#2ceeff';ctx.beginPath();ctx.moveTo(carX+side*carW*.31,carY-9);ctx.lineTo(carX+side*carW*.17,carY+22+Math.random()*36);ctx.lineTo(carX+side*carW*.38,carY+4);ctx.fill()}}drawCar(carX,carY,carW,['#eb2d74','#18c9db','#fac953','#a087f2','#68e49e'][state.carIndex]);
for(let p of state.particles){ctx.globalAlpha=clamp(p.life,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1;ctx.restore();
$('distance').innerHTML=Math.floor(state.distance).toString().padStart(5,'0')+' <span>m</span>';$('speed').innerHTML=Math.abs(Math.round(state.speed))+' <span>KM/J</span>';$('nitroFill').style.width=state.nitro+'%';$('nosValue').textContent=Math.round(state.nitro)+'%';$('crashes').textContent=state.crashes}
function tick(now){let dt=(now-state.last)/1000;state.last=now;update(dt,now);draw(now);requestAnimationFrame(tick)}requestAnimationFrame(tick);
document.querySelectorAll('button[data-action]').forEach(b=>b.addEventListener('click',()=>act(b.dataset.action,demoNames[Math.floor(Math.random()*demoNames.length)],1,'Gift simulasi','demo')));
const keyMap={ArrowUp:'forward',ArrowDown:'reverse',ArrowLeft:'left',ArrowRight:'right',' ':'nitro',w:'forward',s:'reverse',a:'left',d:'right'};let lastKey={};document.addEventListener('keydown',e=>{if(e.target.matches('input'))return;if(keyMap[e.key]){e.preventDefault();if((performance.now()-(lastKey[e.key]||0))<600)return;lastKey[e.key]=performance.now();act(keyMap[e.key],'@keyboard',1,'Kontrol keyboard','demo')}});
function status(label,mode){const elem=$('connectionStatus');elem.textContent='● '+label;elem.className='status'+(mode?' '+mode:'')}
function closeSocket(){clearInterval(state.heartbeat);if(state.serverSocket){state.serverSocket.onclose=null;state.serverSocket.close();state.serverSocket=null}state.connected=false}
function defaultUrl(){if(!/^https?:$/.test(location.protocol)||!location.host)return '';const current=new URL(location.href); if(current.searchParams.has('server'))return current.searchParams.get('server');if(location.hostname==='localhost'||location.hostname==='127.0.0.1')return 'ws://'+location.host+'/events';if(location.hostname.endsWith('github.io'))return '';return location.protocol==='https:'?'wss://'+location.host+'/events':'ws://'+location.host+'/events'}
function connect(url){url=String(url||'').trim().replace(/\/$/,''); if(!/^wss?:\/\//i.test(url)){status('URL WEBSOCKET TIDAK VALID','offline');return}closeSocket();state.serverUrl=url;safeStorage.setItem('zainSocketUrl',url);$('socketUrl').value=url;status('MENGHUBUNGKAN…','');let ws;try{ws=new WebSocket(url);state.serverSocket=ws}catch(e){status('URL TIDAK TERHUBUNG','offline');return}ws.onopen=()=>{state.connected=true;status('SERVER TERHUBUNG','online');clearInterval(state.heartbeat);state.heartbeat=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send('ping')},45000)};ws.onmessage=e=>{let msg;try{msg=JSON.parse(e.data)}catch{return}if(msg.type==='status'){state.streamReady=!!msg.live;status(msg.live?'TIKTOK LIVE TERHUBUNG':'SERVER AKTIF / LIVE BELUM TERHUBUNG',msg.live?'online':'');if(msg.username)$('tiktokAccount').textContent='@'+msg.username.replace(/^@/,'')}
if(msg.type==='gift'){if(gifts[msg.action])act(msg.action,msg.user||'@penonton',msg.count||1,msg.giftName||'', 'live');else{const name=String(msg.giftName||msg.giftId||'tidak dikenal').slice(0,32);$('hintMessage').textContent='Gift belum dipetakan: '+name}}
if(msg.type==='notice'){$('hintMessage').textContent=String(msg.message||'').slice(0,100)}};
ws.onerror=()=>status('GAGAL KONEKSI','offline');ws.onclose=()=>{if(state.serverSocket===ws){clearInterval(state.heartbeat);state.connected=false;status('SERVER TERPUTUS — MENCOBA LAGI','offline');setTimeout(()=>{if(state.serverSocket===ws&&state.serverUrl===url)connect(url)},5000)}};}
$('settingsBtn').addEventListener('click',()=>$('settingsDialog').showModal());$('connectBtn').addEventListener('click',()=>{connect($('socketUrl').value);$('settingsDialog').close()});$('demoBtn').addEventListener('click',()=>{closeSocket();safeStorage.removeItem('zainSocketUrl');status('MODE DEMO','');$('settingsDialog').close()});
const configUrl=new URL(location.href).searchParams.get('server')||safeStorage.getItem('zainSocketUrl')||defaultUrl();if(configUrl){$('socketUrl').value=configUrl;connect(configUrl)}
})();
