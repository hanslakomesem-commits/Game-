// ZAIN AI LIVE RACING — TikTok LIVE to WebSocket bridge.
// TikTok-Live-Connector is unofficial, may stop working following TikTok updates.
import express from 'express';
import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const dir=dirname(fileURLToPath(import.meta.url));
const app=express();const http=createServer(app);const wss=new WebSocketServer({server:http,path:'/events',maxPayload:1024});
const port=Number(process.env.PORT)||3000;
const username=String(process.env.TIKTOK_USERNAME||'').trim().replace(/^@/,'');
const giftMap=JSON.parse(readFileSync(join(dir,'mapping.json'),'utf8'));
let live=false, lastError='',client=null;
const norm=s=>String(s||'').toLocaleLowerCase().normalize('NFKC').trim();
function resolveAction(name,id){return giftMap[norm(name)] || giftMap['id:'+id] || null}
function send(ws,message){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(message))}
function broadcast(msg){for(const ws of wss.clients)send(ws,msg)}
function announce(){broadcast({type:'status',live,username,details:lastError})}
wss.on('connection',ws=>{
  send(ws,{type:'status',live,username,details:lastError});
  const keepalive=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.ping()},30000);
  ws.on('close',()=>clearInterval(keepalive));
  ws.on('message',()=>{/* read-only: no remote commands accepted */});
});
// Only expose the public game files, not Node server files or environment config.
for(const file of ['index.html','style.css','game.js']){
  app.get(file==='index.html'?'/':'/'+file,(_req,res)=>res.sendFile(join(dir,file)));
}
app.get('/index.html',(_req,res)=>res.sendFile(join(dir,'index.html')));
app.get('/health',(_req,res)=>res.json({ok:true,live,username:username||null}));
http.listen(port,'0.0.0.0',()=>console.log('ZAIN AI LIVE RACING http://localhost:'+port));

async function startTikTok(){
 if(!username || username==='akun_tiktok_kamu'){
   console.log('MODE DEMO: set TIKTOK_USERNAME pada hosting untuk menghubungkan LIVE.');return;
 }
 client=new TikTokLiveConnection(username,{enableExtendedGiftInfo:true,processInitialData:false,...(process.env.EULER_API_KEY?{signApiKey:process.env.EULER_API_KEY}:{})});
 client.on(WebcastEvent.GIFT,event=>{
   if(!event || !event.gift)return;
   // Gift streak repeats are cumulative; only process the finished streak.
   if(Number(event.gift.type)===1 && Number(event.repeatEnd)!==1)return;
   const name=event.gift?.name||event.extendedGiftInfo?.name||'';
   const id=String(event.giftId??'');
   const count=Math.max(1,Math.min(30,Number(event.repeatCount)||1));
   const user=String(event.user?.displayId||event.user?.uniqueId||event.user?.nickname||'penonton').slice(0,40);
   const action=resolveAction(name,id);
   console.log('Gift:',user,'name='+name,'id='+id,'x'+count,'=>',action||'unmapped');
   broadcast({type:'gift',action,user:user.startsWith('@')?user:'@'+user,giftName:name,giftId:id,count});
 });
 client.on(ControlEvent.CONNECTED,()=>{live=true;lastError='';announce();console.log('TikTok LIVE connected: @'+username)});
 client.on(ControlEvent.DISCONNECTED,()=>{live=false;announce()});
 client.on(WebcastEvent.STREAM_END,()=>{live=false;announce()});
 client.on(ControlEvent.ERROR,error=>{console.error('TikTok connector error:',error?.message||error)});
 // Automatic retry while user is not live. Keep the backend running.
 for(;;){
   try{if(!client.isConnected){await client.connect();live=true;lastError='';announce()}}
   catch(err){live=false;lastError=String(err?.message||err).slice(0,140);announce();console.error('Connect attempt:',lastError)}
   await new Promise(r=>setTimeout(r,30000));
 }
}
startTikTok().catch(error=>console.error(error));
