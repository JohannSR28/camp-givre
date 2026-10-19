import * as THREE from 'three';
import {
  BELT, CAMERA, CANTEEN, CHAINS, CHAIN_IDS, CHAIN_Z, COUNTERS, COUNTER_IDS, COUNTER_RULES, COURIER, CREWS, FURNACE_CELL, HOUSE_SPOTS, HUB_Z, INCOME, ITEMS,
  MACHINES, MACHINE_LIMITS, PADS, PLAYER, THEME_COLORS, THEME_LINES, WORLD, ZONES, cellPos,
} from './config';
import { counterItem, isProducible, padStatus, validateProgression } from './progression';
import { createOrder, crewStats, houseIncome, incomeTicks, salePrice, stackLayout, switchQueue } from './rules';
import { BELT_LAYOUT, CANTEEN_LAYOUT, COUNTER_LAYOUT, MACHINE_LAYOUT, PAD_SIZE, beltPath, chainBox, queueSlot, viewSize } from './layout';

export function startGame(){
const ac=new AbortController();
const listen=(t,type,fn)=>t.addEventListener(type,fn,{signal:ac.signal});
const timers=new Set();
const later=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},ms);timers.add(id);};
let alive=true,rafId=0;


const PI=Math.PI;
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const rand=(a,b)=>a+Math.random()*(b-a);
const randInt=(a,b)=>Math.floor(rand(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const d2=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const backOut=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
const easeIO=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const angLerp=(a,b,t)=>{let d=((b-a+PI)%(2*PI)+2*PI)%(2*PI)-PI;return a+d*t};

/* ================= Canvas icons ================= */
function rr(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
function drawIcon(x,type,cx,cy,s){
  x.save();x.translate(cx,cy);x.scale(s/100,s/100);x.lineJoin='round';x.lineCap='round';
  const O='#24303d';x.strokeStyle=O;x.lineWidth=6;
  if(type==='wood'){
    x.rotate(-0.35);
    rr(x,-46,-22,80,44,12);x.fillStyle='#a8623a';x.fill();x.stroke();
    x.fillStyle='#86492a';x.fillRect(-36,-9,46,5);x.fillRect(-28,6,36,5);
    x.beginPath();x.ellipse(34,0,16,22,0,0,PI*2);x.fillStyle='#f4c77e';x.fill();x.stroke();
    x.beginPath();x.ellipse(34,0,7,10,0,0,PI*2);x.lineWidth=4;x.strokeStyle='#c98a45';x.stroke();
  }else if(type==='meat'){
    x.rotate(-0.3);
    x.beginPath();x.ellipse(-4,4,46,34,0,0,PI*2);x.fillStyle='#fbe9e2';x.fill();x.stroke();
    x.beginPath();x.ellipse(-4,4,36,25,0,0,PI*2);x.fillStyle='#e24f5e';x.fill();
    x.strokeStyle='#f58b95';x.lineWidth=4;x.beginPath();x.moveTo(-26,-2);x.quadraticCurveTo(-10,8,8,-4);x.moveTo(-20,16);x.quadraticCurveTo(0,22,18,12);x.stroke();
    x.beginPath();x.arc(14,-4,8,0,PI*2);x.fillStyle='#fff';x.fill();x.lineWidth=4;x.strokeStyle=O;x.stroke();
  }else if(type==='gold'){
    x.beginPath();x.moveTo(-46,24);x.lineTo(46,24);x.lineTo(32,-10);x.lineTo(-32,-10);x.closePath();x.fillStyle='#f2b627';x.fill();x.stroke();
    x.beginPath();x.moveTo(-32,-10);x.lineTo(32,-10);x.lineTo(22,-28);x.lineTo(-22,-28);x.closePath();x.fillStyle='#ffe07a';x.fill();x.stroke();
    x.strokeStyle='#fff6c8';x.lineWidth=5;x.beginPath();x.moveTo(-30,14);x.lineTo(-20,-2);x.stroke();
  }else if(type==='cash'){
    x.rotate(-0.2);
    rr(x,-46,-28,92,56,8);x.fillStyle='#3fbf55';x.fill();x.stroke();
    rr(x,-36,-18,72,36,6);x.lineWidth=4;x.strokeStyle='#a6efb0';x.stroke();
    x.beginPath();x.arc(0,0,13,0,PI*2);x.fillStyle='#a6efb0';x.fill();
    x.fillStyle='#24863a';x.font='900 22px Nunito, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('$',0,1);
  }else if(type==='bag'){
    x.beginPath();x.arc(0,-30,14,PI,0);x.lineWidth=12;x.stroke();x.lineWidth=6;x.strokeStyle='#c98245';x.stroke();x.strokeStyle=O;
    rr(x,-34,-28,68,72,18);x.fillStyle='#c98245';x.fill();x.lineWidth=6;x.stroke();
    rr(x,-34,-28,68,32,14);x.fillStyle='#a5632c';x.fill();x.stroke();
    rr(x,-16,14,32,20,6);x.fillStyle='#a5632c';x.fill();x.stroke();
  }else if(type==='axe'){
    x.lineWidth=16;x.beginPath();x.moveTo(-32,42);x.lineTo(20,-30);x.stroke();
    x.lineWidth=9;x.strokeStyle='#a8623a';x.stroke();x.strokeStyle=O;x.lineWidth=6;
    x.beginPath();x.moveTo(4,-44);x.quadraticCurveTo(40,-50,48,-14);x.lineTo(30,-4);x.quadraticCurveTo(24,-22,12,-22);x.closePath();
    x.fillStyle='#d6dee8';x.fill();x.stroke();
  }else if(type==='worker'){
    rr(x,-28,4,56,40,20);x.fillStyle='#f08a3c';x.fill();x.stroke();
    x.beginPath();x.arc(0,-18,24,0,PI*2);x.fillStyle='#f08a3c';x.fill();x.stroke();
    x.beginPath();x.arc(0,-15,14,0,PI*2);x.fillStyle='#fff';x.fill();
    x.beginPath();x.arc(0,-15,10,0,PI*2);x.fillStyle='#f2c7a5';x.fill();
    x.fillStyle='#fff';x.beginPath();x.arc(30,-30,14,0,PI*2);x.fill();x.stroke();
    x.fillStyle=O;x.font='900 22px Nunito, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('+',30,-29);
  }else if(type==='plank'){
    [18,0,-18].forEach((dy,i)=>{x.save();x.translate(i*5-5,dy);x.rotate(-0.18);rr(x,-44,-10,88,20,5);x.fillStyle='#f0b878';x.fill();x.strokeStyle=O;x.lineWidth=6;x.stroke();x.strokeStyle='#c98a4f';x.lineWidth=3;x.beginPath();x.moveTo(-30,0);x.lineTo(20,0);x.stroke();x.restore();});
  }else if(type==='steak'){
    x.rotate(-0.25);x.beginPath();x.ellipse(0,0,46,32,0,0,PI*2);x.fillStyle='#9a3a28';x.fill();x.stroke();
    x.strokeStyle='#3a120c';x.lineWidth=7;[-18,0,18].forEach(o=>{x.beginPath();x.moveTo(o-12,-20);x.lineTo(o+12,20);x.stroke();});
    x.beginPath();x.ellipse(-30,-4,9,13,0,0,PI*2);x.fillStyle='#f3d7b0';x.fill();
  }else if(type==='ingot'){
    x.beginPath();x.moveTo(-44,22);x.lineTo(44,22);x.lineTo(30,-12);x.lineTo(-30,-12);x.closePath();x.fillStyle='#ffc61a';x.fill();x.stroke();
    x.beginPath();x.moveTo(-30,-12);x.lineTo(30,-12);x.lineTo(22,-26);x.lineTo(-22,-26);x.closePath();x.fillStyle='#fff09a';x.fill();x.stroke();
    const sx=34,sy=-38;x.beginPath();x.moveTo(sx,sy-14);x.lineTo(sx+4,sy-4);x.lineTo(sx+14,sy);x.lineTo(sx+4,sy+4);x.lineTo(sx,sy+14);x.lineTo(sx-4,sy+4);x.lineTo(sx-14,sy);x.lineTo(sx-4,sy-4);x.closePath();x.fillStyle='#fff';x.fill();x.lineWidth=3;x.stroke();
  }else if(type==='tool'){
    x.rotate(-0.6);rr(x,-8,-26,16,76,6);x.fillStyle='#a8623a';x.fill();x.stroke();
    rr(x,-36,-46,72,28,6);x.fillStyle='#b8c4d2';x.fill();x.stroke();x.fillStyle='#e6edf5';x.fillRect(-30,-42,58,6);
  }else if(type==='belt'){
    rr(x,-46,6,92,26,13);x.fillStyle='#4b5663';x.fill();x.stroke();
    [-28,0,28].forEach(cx=>{x.beginPath();x.arc(cx,19,6,0,PI*2);x.fillStyle='#9aa6b4';x.fill();});
    rr(x,-34,-34,40,34,6);x.fillStyle='#c98245';x.fill();x.stroke();
    x.beginPath();x.moveTo(16,-36);x.lineTo(40,-17);x.lineTo(16,2);x.closePath();x.fillStyle='#3fdc5e';x.fill();x.stroke();
  }else if(type==='house'){
    rr(x,-30,-8,60,50,4);x.fillStyle='#e0a36a';x.fill();x.stroke();
    x.beginPath();x.moveTo(-42,-4);x.lineTo(0,-44);x.lineTo(42,-4);x.closePath();x.fillStyle='#b5523b';x.fill();x.stroke();
    rr(x,-9,14,18,28,3);x.fillStyle='#6b4430';x.fill();
  }else if(type==='fire'){
    x.beginPath();x.moveTo(0,-46);x.bezierCurveTo(30,-16,40,0,34,18);x.bezierCurveTo(28,40,-28,40,-34,18);x.bezierCurveTo(-40,-2,-14,-10,0,-46);x.closePath();
    x.fillStyle='#ff7a2a';x.fill();x.stroke();
    x.beginPath();x.moveTo(0,-12);x.bezierCurveTo(18,4,20,16,16,24);x.bezierCurveTo(10,36,-10,36,-16,24);x.bezierCurveTo(-20,12,-6,4,0,-12);x.fillStyle='#ffd84a';x.fill();
  }
  x.restore();
}
function iconURL(type){const c=document.createElement('canvas');c.width=c.height=112;drawIcon(c.getContext('2d'),type,56,56,100);return c.toDataURL();}

/* ================= Renderer / scene ================= */
const stage=document.getElementById('stage');
const scene=new THREE.Scene();scene.background=new THREE.Color(0xe3edf5);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);
const camera=new THREE.OrthographicCamera(-10,10,10,-10,1,160);
const CAM_OFF=V(CAMERA.offset.x,CAMERA.offset.y,CAMERA.offset.z);
function resize(){const w=innerWidth,h=innerHeight,{width:vw,height:vh}=viewSize(w,h);camera.left=-vw/2;camera.right=vw/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();renderer.setSize(w,h);}
listen(window,'resize',resize);resize();

scene.add(new THREE.HemisphereLight(0xffffff,0xa9bfd8,0.82));
const sun=new THREE.DirectionalLight(0xfff4e6,0.55);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:90});
sun.shadow.bias=-0.0006;scene.add(sun);scene.add(sun.target);
const SUN_OFF=V(-11.3,24,-1.4);

const matCache={};
function mat(c){return matCache[c]||(matCache[c]=new THREE.MeshLambertMaterial({color:c}));}
function mesh(geo,m,cast=true){const o=new THREE.Mesh(geo,typeof m==='number'?mat(m):m);o.castShadow=cast;return o;}

const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshLambertMaterial({color:0xe8f0f7}));
ground.rotation.x=-PI/2;ground.receiveShadow=true;scene.add(ground);

function decal(w,h,matl,x,z,y=0.01){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),matl);m.rotation.x=-PI/2;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
// sols thématiques : un îlot par chaîne, le village derrière le hub, la route du hub entre les deux
const LAKE={x:-27,z:6};
function softRect(col,w,h){const c=document.createElement('canvas');c.width=256;c.height=Math.max(64,Math.round(256*h/w));const x=c.getContext('2d');
  rr(x,6,6,c.width-12,c.height-12,28);x.globalAlpha=.8;x.fillStyle='#'+col.toString(16).padStart(6,'0');x.fill();return new THREE.CanvasTexture(c);}
const groundMat=(col,w,h)=>new THREE.MeshLambertMaterial({map:softRect(col,w,h),transparent:true,depthWrite:false});
const THEME_NAMES={wood:'BOIS',meat:'VIANDE',gold:'OR'};
for(const id of CHAIN_IDS){const b=chainBox(id),w=b.x1-b.x0+0.8,h=b.z1-b.z0+0.9;decal(w,h,groundMat(THEME_COLORS[CHAINS[id].theme],w,h),(b.x0+b.x1)/2,(b.z0+b.z1)/2+0.05,0.006).renderOrder=-2;}
{const z0=HUB_Z+2.3,z1=WORLD.maxZ-0.3,w=WORLD.maxX-WORLD.minX-1,h=z1-z0;decal(w,h,groundMat(THEME_COLORS.village,w,h),0,(z0+z1)/2,0.006).renderOrder=-2;}
// soft dirt road (hub)
(function(){const c=document.createElement('canvas');c.width=4;c.height=128;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,128);
  g.addColorStop(0,'rgba(233,160,120,0)');g.addColorStop(.18,'rgba(233,160,120,.95)');g.addColorStop(.82,'rgba(233,160,120,.95)');g.addColorStop(1,'rgba(233,160,120,0)');
  x.fillStyle=g;x.fillRect(0,0,4,128);const t=new THREE.CanvasTexture(c);
  decal(WORLD.maxX-WORLD.minX+8,3.4,new THREE.MeshLambertMaterial({map:t,transparent:true,depthWrite:false}),0,HUB_Z,0.012).renderOrder=-1;
})();
// pointillés de la couleur du thème : récolte → machine → comptoir (chevrons dans le sens du flux),
// visibles une fois la zone de récolte de la chaîne ouverte
const chainLines={};
for(const id of CHAIN_IDS){const ch=CHAINS[id],z0=cellPos(ZONES[ch.raw].cell).z,z1=cellPos(COUNTERS[id].cell).z,len=z1-z0;
  const c=document.createElement('canvas');c.width=32;c.height=64;const x=c.getContext('2d');x.fillStyle=THEME_LINES[ch.theme];
  x.beginPath();x.moveTo(4,8);x.lineTo(16,22);x.lineTo(28,8);x.lineTo(28,18);x.lineTo(16,32);x.lineTo(4,18);x.closePath();x.fill();x.fillRect(12,40,8,16);
  const t=new THREE.CanvasTexture(c);t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,len/1.1);
  const m=decal(0.55,len,new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,opacity:.75}),cellPos({col:ch.col,z:0}).x,(z0+z1)/2,0.009);m.renderOrder=-1;m.visible=false;chainLines[ch.raw]=m;}
// frozen lake
(function(){const m1=new THREE.MeshLambertMaterial({color:0xc4d9ec,transparent:true,opacity:.9,depthWrite:false});
  const l=new THREE.Mesh(new THREE.CircleGeometry(7,28),m1);l.rotation.x=-PI/2;l.scale.set(1.5,1,1);l.position.set(LAKE.x,0.011,LAKE.z);l.receiveShadow=true;l.renderOrder=-1;scene.add(l);
  const l2=new THREE.Mesh(new THREE.CircleGeometry(4.5,24),new THREE.MeshLambertMaterial({color:0xd6e6f4,transparent:true,opacity:.9,depthWrite:false}));l2.rotation.x=-PI/2;l2.scale.set(1.5,1,1);l2.position.set(LAKE.x+1,0.013,LAKE.z+0.5);l2.renderOrder=-1;scene.add(l2);
})();
// panneaux en bois en haut de chaque chaîne
const signDraws=[];
for(const id of CHAIN_IDS){const t=CHAINS[id].theme,p=cellPos({col:CHAINS[id].col,z:CHAIN_Z.sign});const g=new THREE.Group();g.position.set(p.x,0,p.z);scene.add(g);
  [-0.85,0.85].forEach(x=>{const post=mesh(new THREE.BoxGeometry(0.14,1.5,0.14),0x8a5530);post.position.set(x,0.75,0);g.add(post);});
  const board=mesh(new THREE.BoxGeometry(2.1,1,0.12),0xb57a48);board.position.y=1.6;g.add(board);
  const c=document.createElement('canvas');c.width=256;c.height=120;const tex=new THREE.CanvasTexture(c);
  const draw=()=>{const x=c.getContext('2d');x.clearRect(0,0,256,120);drawIcon(x,CHAINS[id].raw,62,60,86);x.font='38px "Lilita One", sans-serif';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='#5a3418';x.strokeText(THEME_NAMES[t],112,62);x.fillStyle='#fff6e4';x.fillText(THEME_NAMES[t],112,62);tex.needsUpdate=true;};
  draw();signDraws.push(draw);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(1.95,0.92),new THREE.MeshBasicMaterial({map:tex,transparent:true}));face.position.set(0,1.6,0.065);g.add(face);}

/* ================= Models ================= */
const G={
  log:new THREE.CylinderGeometry(0.13,0.13,0.56,8),
  meat:new THREE.SphereGeometry(0.2,8,6),
  bone:new THREE.CylinderGeometry(0.035,0.035,0.5,5),
  gold:new THREE.BoxGeometry(0.42,0.16,0.24),
  cash:new THREE.BoxGeometry(0.46,0.08,0.26),
  band:new THREE.BoxGeometry(0.1,0.085,0.27),
  chip:new THREE.BoxGeometry(0.12,0.12,0.12),
  puff:new THREE.SphereGeometry(0.3,7,5),
  plank:new THREE.BoxGeometry(0.62,0.09,0.24),plankLine:new THREE.BoxGeometry(0.63,0.095,0.03),
  steak:new THREE.CylinderGeometry(0.22,0.24,0.1,9),grill:new THREE.BoxGeometry(0.36,0.105,0.04),
  ingot:new THREE.BoxGeometry(0.4,0.14,0.22),ingotTop:new THREE.BoxGeometry(0.3,0.04,0.14),toolHead:new THREE.BoxGeometry(0.14,0.15,0.3),
};
const H=t=>t==='cash'?0.09:ITEMS[t].stackH;
const logMats=[mat(0x9a5b34),mat(0xf3c27a),mat(0xf3c27a)];
function makeItem(type){
  const g=new THREE.Group();
  if(type==='wood'){const m=new THREE.Mesh(G.log,logMats);m.rotation.z=PI/2;m.position.y=0.13;g.add(m);}
  else if(type==='meat'){const m=mesh(G.meat,0xe25d6a,false);m.scale.set(1.35,0.55,1);m.position.y=0.1;g.add(m);const b=mesh(G.bone,0xf7efe4,false);b.rotation.z=PI/2;b.position.y=0.1;g.add(b);}
  else if(type==='gold'){const m=mesh(G.gold,0xf6c443,false);m.position.y=0.08;g.add(m);}
  else if(type==='plank'){const m=mesh(G.plank,0xf0b878,false);m.position.y=0.05;g.add(m);const l=mesh(G.plankLine,0xd3955a,false);l.position.y=0.05;g.add(l);}
  else if(type==='steak'){const m=mesh(G.steak,0x8e3426,false);m.scale.set(1.3,1,1);m.position.y=0.06;g.add(m);[-0.1,0.1].forEach(o=>{const f=mesh(G.grill,0x3a120c,false);f.position.set(o,0.062,0);f.rotation.y=0.5;g.add(f);});}
  else if(type==='ingot'){const m=mesh(G.ingot,0xffc61a,false);m.position.y=0.07;g.add(m);const t=mesh(G.ingotTop,0xfff0a0,false);t.position.y=0.16;g.add(t);}
  else if(type==='tool'){const h=mesh(G.bone,0xa8623a,false);h.rotation.z=PI/2;h.position.y=0.05;g.add(h);const hd=mesh(G.toolHead,0xb8c4d2,false);hd.position.set(0.2,0.08,0);g.add(hd);}
  else {const m=mesh(G.cash,0x46c35a,false);m.position.y=0.04;g.add(m);const b=mesh(G.band,0xe6f7d6,false);b.position.y=0.04;g.add(b);}
  return g;
}

const legGeo=new THREE.BoxGeometry(0.15,0.32,0.17);legGeo.translate(0,-0.16,0);
const armGeo=new THREE.CylinderGeometry(0.085,0.085,0.42,6);armGeo.translate(0,-0.21,0);
function makePerson(parka){
  const g=new THREE.Group();
  const body=mesh(new THREE.CylinderGeometry(0.28,0.37,0.64,10),parka);body.position.y=0.62;g.add(body);
  const head=mesh(new THREE.SphereGeometry(0.31,12,10),parka);head.position.y=1.12;head.scale.set(1,1.05,1);g.add(head);
  const face=mesh(new THREE.SphereGeometry(0.19,10,8),0xf2c7a5,false);face.position.set(0,1.1,0.17);g.add(face);
  const trim=mesh(new THREE.TorusGeometry(0.2,0.065,6,14),0xffffff,false);trim.position.set(0,1.1,0.2);g.add(trim);
  const belt=mesh(new THREE.TorusGeometry(0.33,0.04,4,14),0x8a5530,false);belt.rotation.x=PI/2;belt.position.y=0.55;g.add(belt);
  const legL=mesh(legGeo,0x6b4430);legL.position.set(0.13,0.34,0);g.add(legL);
  const legR=mesh(legGeo,0x6b4430);legR.position.set(-0.13,0.34,0);g.add(legR);
  const armL=mesh(armGeo,parka);armL.position.set(0.37,0.86,0);armL.rotation.z=0.12;g.add(armL);
  const armR=mesh(armGeo,parka);armR.position.set(-0.37,0.86,0);armR.rotation.z=-0.12;g.add(armR);
  const anchor=new THREE.Group();anchor.position.set(0,0.42,-0.44);g.add(anchor);
  g.userData={body,legL,legR,armL,armR,anchor,t:Math.random()*6,jump:0};
  return g;
}
function giveAxe(g){
  const axe=new THREE.Group();
  const h=mesh(new THREE.CylinderGeometry(0.035,0.035,0.62,5),0x9a5b34);h.rotation.x=PI/2;h.position.z=0.22;axe.add(h);
  const hd=mesh(new THREE.BoxGeometry(0.05,0.24,0.16),0xcfd8e2);hd.position.set(0,0.1,0.48);axe.add(hd);
  axe.position.set(0,-0.42,0.02);g.userData.armR.add(axe);
}
function animPerson(g,moving,dt,swing=0){
  const u=g.userData;
  if(moving)u.t+=dt*11;
  const s=moving?Math.sin(u.t):0,k=Math.min(1,dt*14);
  u.legL.rotation.x+=(s*0.75-u.legL.rotation.x)*k;
  u.legR.rotation.x+=(-s*0.75-u.legR.rotation.x)*k;
  u.armL.rotation.x+=(-s*0.6-u.armL.rotation.x)*k;
  const ra=swing>0?-Math.sin(swing*PI)*2.3:s*0.6;
  u.armR.rotation.x+=(ra-u.armR.rotation.x)*(swing>0?1:k);
  if(u.jump>0)u.jump=Math.max(0,u.jump-dt*2.4);
  u.body.position.y=0.62+(moving?Math.abs(Math.cos(u.t))*0.05:0);
  g.position.y=u.jump>0?Math.sin(u.jump*PI)*0.7:0;
}

const coneGeos=[new THREE.ConeGeometry(1.05,1.1,7),new THREE.ConeGeometry(0.82,1.0,7),new THREE.ConeGeometry(0.58,0.9,7)];
const capGeo=new THREE.ConeGeometry(0.3,0.42,7);
function makeTree(){
  const g=new THREE.Group();
  const stump=mesh(new THREE.CylinderGeometry(0.2,0.25,0.3,7),0x9a5a3a);stump.position.y=0.15;g.add(stump);
  const top=new THREE.Group();g.add(top);
  const trunk=mesh(new THREE.CylinderGeometry(0.15,0.2,0.75,7),0x9a5a3a);trunk.position.y=0.6;top.add(trunk);
  [[0,1.05,0x76addc],[1,1.68,0x8cc0e8],[2,2.24,0x9fcdef]].forEach(([i,y,c])=>{const m=mesh(coneGeos[i],c);m.position.y=y;m.rotation.y=i*0.4;top.add(m);});
  const cap=mesh(capGeo,0xffffff);cap.position.y=2.6;top.add(cap);
  g.userData.top=top;return g;
}
function makeRock(){
  const g=new THREE.Group();const top=new THREE.Group();g.add(top);
  const r=mesh(new THREE.DodecahedronGeometry(0.78,0),0x8d99a8);r.scale.set(1,0.75,1);r.position.y=0.5;top.add(r);
  const snow=mesh(new THREE.DodecahedronGeometry(0.5,0),0xffffff);snow.scale.set(1,0.35,1);snow.position.y=0.98;top.add(snow);
  for(let i=0;i<5;i++){const a=i*1.3+rand(0,.5),e=rand(-0.2,0.5);const n=mesh(new THREE.BoxGeometry(0.22,0.18,0.2),0xf6c443);
    n.position.set(Math.cos(a)*0.7*Math.cos(e),0.5+Math.sin(e)*0.5,Math.sin(a)*0.7*Math.cos(e));n.rotation.set(rand(0,3),rand(0,3),0);top.add(n);}
  g.userData.top=top;return g;
}
function makeDeer(){
  const g=new THREE.Group();const top=new THREE.Group();g.add(top);const c=0xb07042;
  const body=mesh(new THREE.BoxGeometry(0.44,0.42,0.95),c);body.position.y=0.74;top.add(body);
  const tail=mesh(new THREE.BoxGeometry(0.14,0.16,0.1),0xffffff);tail.position.set(0,0.86,-0.5);top.add(tail);
  const neck=mesh(new THREE.BoxGeometry(0.2,0.42,0.2),c);neck.position.set(0,1.02,0.4);neck.rotation.x=0.4;top.add(neck);
  const head=mesh(new THREE.BoxGeometry(0.27,0.27,0.4),c);head.position.set(0,1.24,0.56);top.add(head);
  const nose=mesh(new THREE.BoxGeometry(0.16,0.14,0.12),0x3a2a22);nose.position.set(0,1.2,0.79);top.add(nose);
  [-1,1].forEach(s=>{const a=mesh(new THREE.CylinderGeometry(0.03,0.04,0.36,4),0xf0dcbc);a.position.set(s*0.12,1.5,0.5);a.rotation.z=-s*0.45;top.add(a);
    const b=mesh(new THREE.CylinderGeometry(0.025,0.03,0.2,4),0xf0dcbc);b.position.set(s*0.22,1.58,0.56);b.rotation.x=0.6;top.add(b);});
  const legs=[];const lg=new THREE.BoxGeometry(0.1,0.54,0.1);lg.translate(0,-0.27,0);
  [[0.15,0.36],[-0.15,0.36],[0.15,-0.36],[-0.15,-0.36]].forEach(([x,z])=>{const l=mesh(lg,0x8e5632);l.position.set(x,0.56,z);top.add(l);legs.push(l);});
  g.userData={top,legs,t:0};return g;
}

/* ================= Tweens / flyers / particles / pops ================= */
const tweens=[];
function tween(dur,fn,done,delay=0){tweens.push({t:-delay,dur,fn,done});}
function popIn(obj,delay=0){obj.scale.setScalar(0.001);obj.visible=true;tween(0.45,e=>obj.scale.setScalar(Math.max(0.001,backOut(e))),null,delay);}

const flyers=[];
function fly(m,from,parent,local,dur,onDone,arc=1.1){
  if(m.parent)m.parent.remove(m);scene.add(m);m.position.copy(from);m.rotation.set(0,0,0);
  flyers.push({m,from:from.clone(),parent,local:local.clone(),t:0,dur,onDone,arc});
}
const _tv=V(0,0,0);
function updFlyers(dt){
  for(let i=flyers.length-1;i>=0;i--){const f=flyers[i];f.t+=dt/f.dur;const e=Math.min(1,f.t);
    if(f.parent)f.parent.localToWorld(_tv.copy(f.local));else _tv.copy(f.local);
    f.m.position.lerpVectors(f.from,_tv,easeIO(e));f.m.position.y+=Math.sin(PI*e)*f.arc;f.m.rotation.y=e*PI*2;
    if(e>=1){scene.remove(f.m);if(f.parent){f.parent.add(f.m);f.m.position.copy(f.local);f.m.rotation.set(0,0,0);}flyers.splice(i,1);f.onDone&&f.onDone();}
  }
}

const parts=[];
function burst(pos,colors,n=6,spd=2.5,up=4,size=1,grav=12,life=0.7){
  for(let i=0;i<n;i++){const m=new THREE.Mesh(G.chip,mat(pick(colors)));m.position.copy(pos);const s=size*rand(.6,1.2);m.scale.setScalar(s);scene.add(m);
    parts.push({m,v:V(rand(-1,1)*spd,rand(.5,1)*up,rand(-1,1)*spd),life:rand(life*.7,life*1.2),s,g:grav});}
}
const smokes=[];
function smoke(pos){const m=new THREE.Mesh(G.puff,new THREE.MeshLambertMaterial({color:0xffffff,transparent:true,opacity:.75,depthWrite:false}));m.position.copy(pos);scene.add(m);smokes.push({m,t:0,life:2.6,dx:rand(-.3,.3)});}
function updParts(dt){
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.v.y-=p.g*dt;p.m.position.addScaledVector(p.v,dt);
    if(p.m.position.y<0.06){p.m.position.y=0.06;p.v.multiplyScalar(0.4);}p.m.rotation.x+=dt*8;p.m.rotation.z+=dt*6;p.life-=dt;
    if(p.life<0.2)p.m.scale.setScalar(Math.max(0.001,p.s*p.life/0.2));if(p.life<=0){scene.remove(p.m);parts.splice(i,1);}}
  for(let i=smokes.length-1;i>=0;i--){const s=smokes[i];s.t+=dt;const e=s.t/s.life;s.m.position.y+=dt*1.6;s.m.position.x+=s.dx*dt;s.m.scale.setScalar(0.6+e*2.2);s.m.material.opacity=0.7*(1-e);
    if(e>=1){scene.remove(s.m);s.m.material.dispose();smokes.splice(i,1);}}
}

const pops=[];
function popText(w,text,cls){const el=document.createElement('div');el.className='pop '+(cls||'');el.textContent=text;document.body.appendChild(el);pops.push({el,w:w.clone(),t:0,life:0.9});}
const _pv=V(0,0,0);
function updPops(dt){
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.t+=dt;p.w.y+=dt*1.6;_pv.copy(p.w).project(camera);
    const x=(_pv.x+1)/2*innerWidth,y=(1-_pv.y)/2*innerHeight,sc=p.t<0.12?0.6+p.t/0.12*0.5:1.1-Math.min(0.1,(p.t-0.12));
    p.el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%) scale(${sc})`;p.el.style.opacity=p.t>p.life-0.25?(p.life-p.t)/0.25:1;
    if(p.t>=p.life){p.el.remove();pops.splice(i,1);}}
}

/* ================= Audio ================= */
let AC=null,muted=false;const lastS={};
function initAudio(){if(AC)return;try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;}}
function tone(type,f1,f2,dur,vol,at=0){const now=AC.currentTime+at;const o=AC.createOscillator(),g=AC.createGain();o.connect(g);g.connect(AC.destination);
  o.type=type;o.frequency.setValueAtTime(f1,now);o.frequency.exponentialRampToValueAtTime(f2,now+dur);g.gain.setValueAtTime(vol,now);g.gain.exponentialRampToValueAtTime(0.0001,now+dur+0.03);o.start(now);o.stop(now+dur+0.06);}
function sfx(k){if(!AC||muted)return;const now=AC.currentTime;if(lastS[k]&&now-lastS[k]<0.05)return;lastS[k]=now;
  try{({chop:()=>tone('square',190,80,0.07,0.06),pick:()=>tone('sine',620,940,0.07,0.07),drop:()=>tone('triangle',440,300,0.06,0.07),
    cash:()=>tone('triangle',1350,1800,0.05,0.045),pay:()=>tone('sine',880,760,0.04,0.04),sell:()=>{tone('sine',700,1100,0.1,0.07);tone('sine',1100,1400,0.1,0.05,0.08)},
    unlock:()=>{tone('triangle',523,523,0.12,0.1);tone('triangle',659,659,0.12,0.1,0.1);tone('triangle',784,1046,0.25,0.1,0.2)},
    max:()=>tone('square',300,220,0.08,0.035)})[k]();}catch(e){}}
const muteBtn=document.getElementById('mute');
listen(muteBtn,'click',e=>{e.stopPropagation();initAudio();muted=!muted;document.getElementById('waves').style.display=muted?'none':'';document.getElementById('cross').style.display=muted?'':'none';muteBtn.setAttribute('aria-label',muted?'Activer le son':'Couper le son');});

/* ================= HUD ================= */
const pill={};['cash','wood','meat','gold','plank','steak','ingot','tool'].forEach(k=>{const el=document.getElementById('p-'+k);el.querySelector('img').src=iconURL(k);pill[k]={el,b:el.querySelector('b'),v:-1};});
let money=0;
function setPill(k,v){const p=pill[k];if(p.v===v)return;p.el.hidden=k!=='cash'&&v===0;const up=v>p.v&&p.v>=0;p.v=v;p.b.textContent=v;if(up){p.el.classList.remove('bump');void p.el.offsetWidth;p.el.classList.add('bump');}}
function updHUD(){setPill('cash',money);const c={wood:0,meat:0,gold:0,plank:0,steak:0,ingot:0,tool:0};player.carry.forEach(i=>c[i.type]++);for(const k in c)setPill(k,c[k]);
  const inc=houseIncome(houses);incomeEl.hidden=inc===0;incomeEl.textContent='+'+inc+' $/s';}
const incomeEl=document.getElementById('income');
const toastEl=document.getElementById('toast');let toastT=0;
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');toastT=2.2;}

/* ================= Agents (player + workers) ================= */
const agents=[];
function makeAgent(color,o){
  const g=makePerson(color);giveAxe(g);g.position.set(o.x,0,o.z);scene.add(g);
  const a={g,pos:g.position,carry:[],cap:o.cap,speed:o.speed,chopRate:o.chopRate,chopCD:0,swing:0,moving:false,filter:o.filter||null,isPlayer:!!o.isPlayer,depCD:0,state:'gather',target:null,lean:0,maxT:0,face:0};
  agents.push(a);return a;
}
// pile sur le dos : une tour, puis 2 ou 3 colonnes côte à côte (rules.stackLayout)
function carryLayout(a){const h=a._h||(a._h=[]);h.length=a.carry.length;for(let i=0;i<a.carry.length;i++)h[i]=H(a.carry[i].type);return stackLayout(h,a._slots||(a._slots=[]));}
function carryTop(a){const s=carryLayout(a);let m=0;for(let i=0;i<s.length;i++)m=Math.max(m,s[i].y+H(a.carry[i].type));return m;}
function addToCarry(a,type,from,m){const it={type,mesh:m||makeItem(type),arrived:false};a.carry.push(it);
  const sl=carryLayout(a)[a.carry.length-1];
  fly(it.mesh,from,a.g.userData.anchor,V(sl.x,sl.y,0),0.32,()=>{it.arrived=true;if(a.isPlayer)updHUD();},1.0);}
function takeFromCarry(a,type){for(let i=a.carry.length-1;i>=0;i--){const it=a.carry[i];if(it.type===type&&it.arrived){a.carry.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);if(it.mesh.parent)it.mesh.parent.remove(it.mesh);return {mesh:it.mesh,w};}}return null;}
function updStack(a,dt){a.lean+=((a.moving?1:0)-a.lean)*Math.min(1,dt*5);
  const sl=carryLayout(a);
  a.carry.forEach((it,i)=>{if(it.arrived){const p=it.mesh.position,k=Math.min(1,dt*16),s=sl[i];p.y+=(s.y-p.y)*k;p.z+=(-a.lean*s.level*s.level*0.004-p.z)*k;p.x+=(s.x-p.x)*k;}});}

/* ================= Piles ================= */
function makePile(anchor,slotFn){return {anchor,items:[],slotFn};}
function pileAdd(p,m,from,extra){const it=Object.assign({mesh:m,arrived:false},extra||{});p.items.push(it);fly(m,from,p.anchor,p.slotFn(p.items.length-1),0.3,()=>{it.arrived=true;},0.9);return it;}
function pilePlace(p,m,extra){const it=Object.assign({mesh:m,arrived:true},extra||{});p.items.push(it);p.anchor.add(m);m.position.copy(p.slotFn(p.items.length-1));return it;}
function pileTake(p){for(let i=p.items.length-1;i>=0;i--){const it=p.items[i];if(it.arrived){p.items.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);p.anchor.remove(it.mesh);return {it,w};}}return null;}
function pileTakeType(p,t){for(let i=p.items.length-1;i>=0;i--){const it=p.items[i];if(it.arrived&&it.type===t){p.items.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);p.anchor.remove(it.mesh);return {it,w};}}return null;}
function pileUpd(p,dt){p.items.forEach((it,i)=>{if(it.arrived)it.mesh.position.lerp(p.slotFn(i),Math.min(1,dt*14));});}

/* ================= World nodes ================= */
const nodes=[];const unlocked={wood:false,meat:false,gold:false};
function addNode(type,g,x,z,o){g.position.set(x,0,z);g.rotation.y=rand(0,PI*2);scene.add(g);
  const n={type,g,pos:g.position,hp:o.hp,maxHp:o.hp,r:o.r,alive:true,respawn:0,respawnTime:o.respawn,shake:0,solid:o.solid,area:o.area||null,wt:null,pause:rand(0,2)};nodes.push(n);return n;}
// une zone de récolte = une grille de nœuds centrée sur sa cellule (les cerfs errent dans ce rectangle)
function openZone(item,anim){
  const Z=ZONES[item],c=cellPos(Z.cell),hx=(Z.grid[0]-1)*Z.spacing[0]/2,hz=(Z.grid[1]-1)*Z.spacing[1]/2;
  const area={x0:c.x-hx,x1:c.x+hx,z0:c.z-hz,z1:c.z+hz},roam=Z.node==='deer';unlocked[item]=true;if(chainLines[item])chainLines[item].visible=true;let i=0;
  for(let gx=0;gx<Z.grid[0];gx++)for(let gz=0;gz<Z.grid[1];gz++){
    const g=Z.node==='tree'?makeTree():Z.node==='rock'?makeRock():makeDeer();
    const x=roam?rand(area.x0,area.x1):area.x0+gx*Z.spacing[0]+rand(-.3,.3),z=roam?rand(area.z0,area.z1):area.z0+gz*Z.spacing[1]+rand(-.3,.3);
    const n=addNode(item,g,x,z,{hp:Z.hp,r:Z.radius,respawn:Z.respawn,solid:Z.solid,area:roam?area:null});if(anim)popIn(n.g,0.06*i++);}
}

// decorative border forest
(function(){const P=WORLD,out=(x,z)=>!(x>P.minX-1.5&&x<P.maxX+1.5&&z>P.minZ-1.5&&z<P.maxZ+1.5);let n=0,tries=0;
  while(n<130&&tries<5000){tries++;const x=rand(-44,44),z=rand(-46,38);if(!out(x,z))continue;if(Math.hypot(x-LAKE.x,z-LAKE.z)<11)continue;
    const t=makeTree();t.position.set(x,0,z);t.scale.setScalar(rand(1.2,1.9));t.rotation.y=rand(0,6);scene.add(t);n++;}
  for(let i=0;i<30;i++){const m=mesh(new THREE.SphereGeometry(rand(.5,1.1),8,6),0xffffff);m.scale.y=0.4;let x,z;do{x=rand(P.minX-7,P.maxX+7);z=rand(P.minZ-7,P.maxZ+7);}while(!out(x,z));m.position.set(x,0,z);m.receiveShadow=true;scene.add(m);}
})();

/* ================= Comptoirs ================= */
// Un comptoir par chaîne (+ les outils au village). Il achète la ressource brute, puis UNIQUEMENT le
// produit dès que la machine de la chaîne est construite (progression.counterItem). Un nouveau client
// demande toujours ce que le comptoir achète en ce moment.
const shops={};const tables=[];const belts={};
const CUST_COLORS=[0x2fa6e6,0x3bb3d6,0x5b8fe8,0x3fc1b6,0x7b7fe6,0xe56f8f,0xf0a23a,0x9b6be0];
function zoneTex(type,col,fil){const c=document.createElement('canvas');c.width=256;c.height=180;const x=c.getContext('2d');
  rr(x,10,10,236,160,26);x.fillStyle=fil||'rgba(120,200,90,.28)';x.fill();x.setLineDash([30,18]);x.lineWidth=12;x.strokeStyle=col||'#4fdc62';x.stroke();x.setLineDash([]);
  (Array.isArray(type)?type:[type]).forEach((t,i,a)=>drawIcon(x,t,128+(i-(a.length-1)/2)*84,92,a.length>1?62:70));return new THREE.CanvasTexture(c);}
function drawCounterSign(s){const x=s.signC.getContext('2d');x.clearRect(0,0,192,80);rr(x,6,6,180,68,18);x.fillStyle='rgba(255,250,240,.96)';x.fill();x.lineWidth=5;x.strokeStyle='#8a5530';x.stroke();
  drawIcon(x,s.type,46,40,58);x.font='38px "Lilita One", sans-serif';x.textAlign='left';x.textBaseline='middle';x.fillStyle='#24863a';x.fillText(ITEMS[s.type].price+' $',86,42);s.signT.needsUpdate=true;}
function counterFor(t){for(const id in shops)if(shops[id].type===t)return shops[id];return null;}
function buildCounter(id,anim){
  const C=COUNTERS[id],d=cellPos(C.cell),L=COUNTER_LAYOUT;const root=new THREE.Group();scene.add(root);
  const s={id,type:counterItem(C,progress),x:d.x,z:d.z,customers:[],leaving:[],serveCD:0,root,hintT:0,hasOld:false};s.stockH=H(s.type);
  const t=new THREE.Group();t.position.set(d.x,0,d.z);root.add(t);
  [0xf2a46b,0xe48a52,0xf2a46b].forEach((c,i)=>{const p=mesh(new THREE.BoxGeometry(2.7,0.14,0.36),c);p.position.set(0,0.72,(i-1)*0.37);p.receiveShadow=true;t.add(p);});
  [[1.15,0.42],[-1.15,0.42],[1.15,-0.42],[-1.15,-0.42]].forEach(([x,z])=>{const l=mesh(new THREE.BoxGeometry(0.15,0.68,0.15),0xc8703c);l.position.set(x,0.34,z);t.add(l);});
  tables.push({x:d.x,z:d.z,hx:1.4,hz:0.62});
  s.stockAnchor=new THREE.Group();s.stockAnchor.position.set(d.x,0.79,d.z);root.add(s.stockAnchor);
  s.stock=makePile(s.stockAnchor,i=>{const Lv=Math.floor(i/6),j=i%6;return V((j%3-1)*0.64,Lv*s.stockH,(Math.floor(j/3)-0.5)*0.42);});
  s.drop={x:d.x+L.drop.dx,z:d.z+L.drop.dz};
  s.dropMat=new THREE.MeshBasicMaterial({map:zoneTex(s.type),transparent:true,depthWrite:false});
  const z=new THREE.Mesh(new THREE.PlaneGeometry(L.drop.w,L.drop.d),s.dropMat);z.rotation.x=-PI/2;z.position.set(s.drop.x,0.02,s.drop.z);root.add(z);
  s.cashPos={x:d.x+L.cash.dx,z:d.z+L.cash.dz};
  const cp=mesh(new THREE.BoxGeometry(L.cash.w,0.06,L.cash.d),0x4b5663,false);cp.receiveShadow=true;cp.position.set(s.cashPos.x,0.03,s.cashPos.z);root.add(cp);
  s.cashAnchor=new THREE.Group();s.cashAnchor.position.set(s.cashPos.x,0.07,s.cashPos.z);root.add(s.cashAnchor);
  s.cash=makePile(s.cashAnchor,i=>{const Lv=Math.floor(i/6),j=i%6;return V((j%2-0.5)*0.5,Lv*0.09,(Math.floor(j/2)-1)*0.3);});
  // crates for flavour
  const cr=mesh(new THREE.BoxGeometry(0.7,0.6,0.7),0xb57a48);cr.position.set(d.x+L.crate.dx,0.3,d.z+L.crate.dz);cr.rotation.y=0.3;root.add(cr);
  const cr2=mesh(new THREE.BoxGeometry(0.5,0.45,0.5),0xc98a55);cr2.position.set(d.x+L.crate.dx-0.05,0.82,d.z+L.crate.dz-0.05);cr2.rotation.y=-0.2;root.add(cr2);
  tables.push({x:d.x+L.crate.dx,z:d.z+L.crate.dz,hx:0.45,hz:0.45});
  // panneau « icône + prix » de ce que le comptoir achète
  s.signC=document.createElement('canvas');s.signC.width=192;s.signC.height=80;s.signT=new THREE.CanvasTexture(s.signC);drawCounterSign(s);
  const sg=new THREE.Sprite(new THREE.SpriteMaterial({map:s.signT,transparent:true}));sg.scale.set(1.3,0.54,1);sg.position.set(d.x+L.sign.dx,L.sign.y,d.z+L.sign.dz);root.add(sg);
  s.entry={x:d.x+L.entry.dx,z:d.z+L.entry.dz};
  shops[id]=s;
  for(let i=0;i<COUNTER_RULES.queueLength;i++)spawnCustomer(s,true);
  if(anim){popIn(t);s.customers.forEach((c,i)=>popIn(c.g,0.15+i*0.07));}
  return s;
}
// apparition des comptoirs et bascule brut → produit quand la machine de la chaîne est construite
function syncCounters(anim){
  for(const id of COUNTER_IDS){const C=COUNTERS[id];
    if(!shops[id]){if(isProducible(C.items[0],progress)){const s=buildCounter(id,anim);if(anim)later(()=>toast('Nouveau comptoir : '+ITEMS[s.type].name),2000);}continue;}
    const t=counterItem(C,progress);if(t!==shops[id].type)switchCounter(shops[id],t);}
}
function switchCounter(s,t){
  const old=s.type;s.type=t;s.stockH=H(t);s.hasOld=true;
  s.dropMat.map.dispose();s.dropMat.map=zoneTex(t);s.dropMat.needsUpdate=true;drawCounterSign(s);
  // le client en cours de service part avec ce qu'il a reçu ; les autres redemandent le nouveau produit
  for(const c of switchQueue(s.customers,t)){
    if(c.got)addCash(s,V(c.pos.x,1.2,c.pos.z),salePrice(old)*c.got);
    if(c.bubble){c.g.remove(c.bubble);c.bubble=null;}c.path=[V(s.x+1.4,0,s.z+1.4),V(s.entry.x,0,s.entry.z)];s.leaving.push(c);}
  s.customers.forEach(c=>{if(c.bubble)drawBubble(c,c.wantType);});
  later(()=>toast('Le comptoir achète maintenant : '+ITEMS[t].name),2000);
}
// stock de l'ancien produit : il part alimenter la machine de la chaîne (ou est vendu s'il n'y a plus de place)
function flushOldStock(s){
  let left=false;const m=machineFor(COUNTERS[s.id].items[0]);
  for(let i=s.stock.items.length-1;i>=0;i--){const it=s.stock.items[i];if(it.type===s.type)continue;if(!it.arrived){left=true;continue;}
    s.stock.items.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);s.stock.anchor.remove(it.mesh);
    if(m&&m.inp.items.length<MACHINE_LIMITS.input)pileAdd(m.inp,it.mesh,w,{type:it.type});else if(m){m.reserve[it.type]=(m.reserve[it.type]||0)+1;fly(it.mesh,w,null,V(m.inPos.x,0.4,m.inPos.z),0.4,null,1);drawReserve(m);}else addCash(s,w,salePrice(it.type));}
  s.hasOld=left;
}
function slotPos(s,i){const q=queueSlot(i);return {x:s.x+q.dx,z:s.z+q.dz};}
function spawnCustomer(s,initial){
  const g=makePerson(pick(CUST_COLORS));const i=s.customers.length;const sp=slotPos(s,i);
  if(initial)g.position.set(sp.x,0,sp.z);else g.position.set(s.entry.x,0,s.entry.z);
  g.rotation.y=PI;scene.add(g);
  const o=createOrder({itemType:s.type},Math.random,initial&&i===0);
  const customer={g,pos:g.position,want:o.want,wantType:o.wantType,got:0,recv:0,moving:false,bubble:null,canvas:null,tex:null,path:null};
  if(process.env.NODE_ENV!=='production')console.assert(customer.wantType===s.type,'client « '+customer.wantType+' » dans la file « '+s.type+' »');
  s.customers.push(customer);
}
function drawBubble(c,type){
  const x=c.canvas.getContext('2d');x.clearRect(0,0,128,160);
  x.beginPath();x.moveTo(50,118);x.lineTo(64,150);x.lineTo(78,118);x.fillStyle='#fff';x.fill();
  x.beginPath();x.arc(64,64,58,0,PI*2);x.fillStyle='#fff';x.fill();x.lineWidth=4;x.strokeStyle='rgba(36,48,61,.25)';x.stroke();
  const f=c.recv/c.want;x.save();x.beginPath();x.arc(64,64,52,0,PI*2);x.clip();x.fillStyle='#5fdc6e';x.fillRect(0,116-104*f,128,104*f);x.fillStyle='rgba(95,220,110,.25)';x.fillRect(0,12,128,104);x.restore();
  drawIcon(x,type,64,46,58);
  x.font='44px "Lilita One", sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=8;x.strokeStyle='#24303d';x.strokeText(String(c.want-c.recv),64,94);x.fillStyle='#fff';x.fillText(String(c.want-c.recv),64,94);
  c.tex.needsUpdate=true;
}
function ensureBubble(c,type){if(c.bubble)return;c.canvas=document.createElement('canvas');c.canvas.width=128;c.canvas.height=160;c.tex=new THREE.CanvasTexture(c.canvas);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:c.tex,depthTest:false,transparent:true}));sp.scale.set(1.25,1.56,1);sp.position.y=2.35;sp.renderOrder=10;c.g.add(sp);c.bubble=sp;drawBubble(c,type);sp.scale.set(0.01,0.01,1);
  tween(0.35,e=>{const k=backOut(e);sp.scale.set(1.25*k,1.56*k,1);});}
function walkTo(c,t,dt,spd){const dx=t.x-c.pos.x,dz=t.z-c.pos.z,d=Math.hypot(dx,dz);if(d<0.05){c.moving=false;return true;}
  const st=Math.min(d,spd*dt);c.pos.x+=dx/d*st;c.pos.z+=dz/d*st;c.moving=true;c.g.rotation.y=angLerp(c.g.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*10));return false;}
function addCash(s,from,val){if(s.cash.items.length>=COUNTER_RULES.cashCap){const it=pick(s.cash.items);it.value+=val;}else pileAdd(s.cash,makeItem('cash'),from,{value:val});}
// bulle « Passe par la scierie ! » avec une flèche vers la machine (en haut de l'écran)
function showHint(s){
  if(!s.hint){const c=document.createElement('canvas');c.width=320;c.height=150;const x=c.getContext('2d');
    rr(x,8,8,304,84,22);x.fillStyle='#fff';x.fill();x.lineWidth=5;x.strokeStyle='#24303d';x.stroke();
    x.font='34px "Lilita One", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#24303d';x.fillText(MACHINES[COUNTERS[s.id].upgrade].hint,160,52);
    x.beginPath();x.moveTo(160,96);x.lineTo(196,128);x.lineTo(176,128);x.lineTo(176,146);x.lineTo(144,146);x.lineTo(144,128);x.lineTo(124,128);x.closePath();x.fillStyle='#3fdc5e';x.fill();x.stroke();
    s.hint=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,transparent:true}));s.hint.scale.set(2.6,1.22,1);s.hint.renderOrder=11;s.hint.position.set(s.drop.x,2.4,s.drop.z);s.root.add(s.hint);}
  if(s.hintT<=0)sfx('max');s.hintT=2.5;s.hint.visible=true;
}
function updShop(s,dt){
  pileUpd(s.stock,dt);pileUpd(s.cash,dt);if(s.hasOld)flushOldStock(s);
  if(s.hint&&s.hintT>0){s.hintT-=dt;if(s.hintT<=0)s.hint.visible=false;}
  const raw=COUNTERS[s.id].items[0];
  // deposit : uniquement ce que le comptoir achète en ce moment ; un livreur ne dépose que s'il vise ce comptoir
  for(const a of agents){if(Math.abs(a.pos.x-s.drop.x)<1.2&&Math.abs(a.pos.z-s.drop.z)<0.85){
    if(a.role==='courier'&&a.zone!=='drop:'+s.id)continue;
    if(a.isPlayer&&raw!==s.type&&countCarry(a,raw)>0&&countCarry(a,s.type)===0)showHint(s);
    a.depCD-=dt;if(a.depCD>0)continue;
    const cap=a.fallback?COUNTER_RULES.hardCap:COUNTER_RULES.stockCap;
    if(s.stock.items.length<cap){const r=takeFromCarry(a,s.type);if(r){a.depCD=0.06;pileAdd(s.stock,r.mesh,r.w,{type:s.type});sfx('drop');if(a.isPlayer)updHUD();}}
    else if(a.fallback){const r=takeFromCarry(a,s.type);if(r){a.depCD=0.06;addCash(s,r.w,Math.max(1,Math.round(salePrice(s.type)*COURIER.wholesaleRatio)));}}}}
  // queue
  s.customers.forEach((c,i)=>{const t=slotPos(s,i);walkTo(c,t,dt,COUNTER_RULES.customerSpeed);if(!c.moving)c.g.rotation.y=angLerp(c.g.rotation.y,PI,Math.min(1,dt*8));animPerson(c.g,c.moving,dt);});
  const f=s.customers[0];
  if(f&&!f.moving&&d2(f.pos,slotPos(s,0))<0.1){
    ensureBubble(f,f.wantType);s.serveCD-=dt;
    if(f.got<f.want&&s.serveCD<=0){const r=pileTakeType(s.stock,f.wantType);if(r){s.serveCD=COUNTER_RULES.serveInterval;f.got++;const m=r.it.mesh;fly(m,r.w,f.g,V(0,0.95,0.35),0.28,()=>{f.g.remove(m);f.recv++;drawBubble(f,f.wantType);},0.8);}}
    if(f.recv>=f.want){
      const val=salePrice(f.wantType);for(let k=0;k<f.want;k++)addCash(s,V(f.pos.x,1.2,f.pos.z),val);
      popText(V(f.pos.x,2.6,f.pos.z),'+$'+(val*f.want),'cash');sfx('sell');
      f.g.remove(f.bubble);f.bubble=null;f.g.userData.jump=1;
      f.path=[V(s.x+1.4,0,s.z+1.4),V(s.entry.x,0,s.entry.z)];s.customers.shift();s.leaving.push(f);
    }
  }
  for(let i=s.leaving.length-1;i>=0;i--){const c=s.leaving[i];if(walkTo(c,c.path[0],dt,3.6)){c.path.shift();if(!c.path.length){scene.remove(c.g);s.leaving.splice(i,1);continue;}}animPerson(c.g,true,dt);}
  while(s.customers.length<COUNTER_RULES.queueLength)spawnCustomer(s,false);
  // collect
  if(d2(player.pos,s.cashPos)<1.35){for(let k=0;k<3;k++){const r=pileTake(s.cash);if(!r)break;const m=r.it.mesh,val=r.it.value;
    fly(m,r.w,player.g,V(0,1.0,0),0.22,()=>{player.g.remove(m);money+=val;updHUD();sfx('cash');},0.7);}}
}
// tapis roulant : la sortie de la machine alimente le comptoir de la chaîne (arrêt à BELT.stopAt en stock)
function buildBelt(chain){
  const p=beltPath(chain),len=p.to.z-p.from.z,g=new THREE.Group();g.position.set(p.from.x,0,(p.from.z+p.to.z)/2);scene.add(g);
  const base=mesh(new THREE.BoxGeometry(BELT_LAYOUT.w,0.22,len),0x4b5663);base.position.y=0.11;base.receiveShadow=true;g.add(base);
  [-1,1].forEach(sd=>{const r=mesh(new THREE.BoxGeometry(0.06,0.1,len),0x9aa6b4);r.position.set(sd*(BELT_LAYOUT.w/2+0.02),0.25,0);g.add(r);});
  const c=document.createElement('canvas');c.width=32;c.height=32;const x=c.getContext('2d');x.fillStyle='#2b3038';x.fillRect(0,0,32,32);x.fillStyle='#454c57';x.fillRect(0,0,32,8);
  const tex=new THREE.CanvasTexture(c);tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,len/0.25);
  const top=new THREE.Mesh(new THREE.PlaneGeometry(BELT_LAYOUT.w-0.06,len),new THREE.MeshLambertMaterial({map:tex}));top.rotation.x=-PI/2;top.position.y=0.225;g.add(top);
  belts[chain]={chain,from:p.from,to:p.to,len,tex,items:[],cd:0};popIn(g);
}
function updBelts(dt){
  for(const id in belts){const b=belts[id],m=machines[CHAINS[id].machine],s=shops[id];
    b.tex.offset.y+=dt*BELT.speed/0.25;
    b.cd-=dt;
    if(b.cd<=0&&m&&s&&s.type===m.out&&s.stock.items.length+b.items.length<BELT.stopAt&&outAvail(m)+COURIER.leaveAtOutput>BELT.leaveAtOutput){const r=pileTake(m.outp);
      if(r){b.cd=BELT.interval;const it={m:r.it.mesh,t:0,on:false};b.items.push(it);fly(it.m,r.w,null,V(b.from.x,0.3,b.from.z),0.2,()=>{scene.add(it.m);it.on=true;},0.4);}}
    for(let i=b.items.length-1;i>=0;i--){const it=b.items[i];if(!it.on)continue;it.t+=dt*BELT.speed/b.len;
      it.m.position.set(b.from.x,0.3,b.from.z+(b.to.z-b.from.z)*Math.min(1,it.t));
      if(it.t>=1){b.items.splice(i,1);pileAdd(s.stock,it.m,it.m.position.clone(),{type:s.type});}}}
}

/* ================= Player & input ================= */
const player=makeAgent(0x29a8e8,{...cellPos(PLAYER.spawn),cap:PLAYER.cap,speed:PLAYER.speed,chopRate:PLAYER.chopRate,isPlayer:true});
player.g.rotation.y=PI*0.75;
const joyEl=document.getElementById('joy'),knob=document.getElementById('knob');
const joy={id:null,sx:0,sy:0,x:0,y:0};const R=56;
function joyRest(){joyEl.style.left='50%';joyEl.style.top=`calc(100% - 26% - env(safe-area-inset-bottom,0px))`;knob.style.transform='';joyEl.classList.remove('on');}
joyRest();
listen(stage,'pointerdown',e=>{initAudio();if(AC&&AC.state==='suspended')AC.resume();if(joy.id!==null)return;joy.id=e.pointerId;joy.sx=e.clientX;joy.sy=e.clientY;joy.x=joy.y=0;
  joyEl.style.left=e.clientX+'px';joyEl.style.top=e.clientY+'px';joyEl.classList.add('on');try{stage.setPointerCapture(e.pointerId);}catch(_){}});
listen(stage,'pointermove',e=>{if(e.pointerId!==joy.id)return;let dx=e.clientX-joy.sx,dy=e.clientY-joy.sy;const l=Math.hypot(dx,dy);if(l>R){dx*=R/l;dy*=R/l;}
  joy.x=dx/R;joy.y=-dy/R;knob.style.transform=`translate(${dx}px,${dy}px)`;});
function joyEnd(e){if(e.pointerId!==joy.id)return;joy.id=null;joy.x=joy.y=0;joyRest();}
listen(stage,'pointerup',joyEnd);listen(stage,'pointercancel',joyEnd);
const keys={};listen(window,'keydown',e=>{keys[e.key.toLowerCase()]=true;initAudio();});listen(window,'keyup',e=>{keys[e.key.toLowerCase()]=false;});
// caméra face aux chaînes : droite de l'écran = +x, haut de l'écran = -z
const SR=V(1,0,0),SF=V(0,0,-1);
let movedT=0;const hintEl=document.getElementById('hint');

function pushOut(a){
  for(const n of nodes){if(!n.solid||!n.alive)continue;const dx=a.pos.x-n.pos.x,dz=a.pos.z-n.pos.z,d=Math.hypot(dx,dz),m=n.r+0.3;if(d<m&&d>1e-4){a.pos.x=n.pos.x+dx/d*m;a.pos.z=n.pos.z+dz/d*m;}}
  for(const t of tables){const cx=clamp(a.pos.x,t.x-t.hx,t.x+t.hx),cz=clamp(a.pos.z,t.z-t.hz,t.z+t.hz);const dx=a.pos.x-cx,dz=a.pos.z-cz,d=Math.hypot(dx,dz);
    if(d<0.3){if(d>1e-4){a.pos.x=cx+dx/d*0.3;a.pos.z=cz+dz/d*0.3;}else{a.pos.z=t.z-t.hz-0.3;}}}
  a.pos.x=clamp(a.pos.x,WORLD.minX,WORLD.maxX);a.pos.z=clamp(a.pos.z,WORLD.minZ,WORLD.maxZ);
}
function nearestNode(p,filter,maxD=1e9){let best=null,bd=maxD;for(const n of nodes){if(!n.alive||!unlocked[n.type])continue;if(filter&&n.type!==filter)continue;const d=d2(p,n.pos)-n.r;if(d<bd){bd=d;best=n;}}return best;}
function hitNode(n,a){
  n.hp--;n.shake=1;sfx('chop');
  const col=n.type==='wood'?[0x9a5b34,0xf3c27a,0xffffff]:n.type==='meat'?[0xffffff,0xb07042]:[0x8d99a8,0xf6c443];
  burst(V(n.pos.x,0.9,n.pos.z),col,5,2.2,3.5,0.8);
  addToCarry(a,n.type,V(n.pos.x,1.1,n.pos.z));if(a.isPlayer)sfx('pick');
  if(n.type==='meat'){n.g.userData.hop=1;n.wt=null;n.pause=0;}
  if(n.hp<=0){n.alive=false;n.respawn=n.respawnTime;const top=n.g.userData.top;
    if(n.type==='wood')tween(0.3,e=>{top.scale.setScalar(Math.max(0.001,1-e));top.rotation.z=e*1.3;});
    else{tween(0.25,e=>top.scale.setScalar(Math.max(0.001,1-e)));burst(V(n.pos.x,0.6,n.pos.z),[0xffffff,0xdfe8f0],10,2.5,3,1.1);}}
}
function harvest(a,dt){
  a.swing=Math.max(0,a.swing-dt/0.26);a.chopCD-=dt;
  const n=nearestNode(a.pos,a.filter,1.25);if(!n)return null;
  if(a.carry.length>=a.cap){if(a.isPlayer){a.maxT-=dt;if(a.maxT<=0){a.maxT=1.2;popText(V(a.pos.x,1.6+carryTop(a),a.pos.z),'MAX','max');sfx('max');}}return null;}
  if(!a.moving)a.g.rotation.y=angLerp(a.g.rotation.y,Math.atan2(n.pos.x-a.pos.x,n.pos.z-a.pos.z),Math.min(1,dt*12));
  if(a.chopCD<=0){a.chopCD=a.chopRate*(a.fedT>0?CANTEEN.fedChopMul:1);a.swing=1;hitNode(n,a);}
  return n;
}
function moveAgentTo(a,t,dt){const dx=t.x-a.pos.x,dz=t.z-a.pos.z,d=Math.hypot(dx,dz);if(d<0.08){a.moving=false;return true;}
  const st=Math.min(d,a.speed*(a.fedT>0?CANTEEN.fedSpeedMul:1)*dt);a.pos.x+=dx/d*st;a.pos.z+=dz/d*st;a.moving=true;a.g.rotation.y=angLerp(a.g.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*10));return false;}
const crews={};
function drawBadge(w,l){const x=w.badgeC.getContext('2d');x.clearRect(0,0,128,56);rr(x,4,4,120,48,24);x.fillStyle=w.fedT>0?'rgba(40,150,70,.95)':'rgba(26,38,54,.85)';x.fill();
  x.font='34px "Lilita One", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffcf3f';x.fillText('★ '+l,64,31);w.badgeT.needsUpdate=true;}
function hireWorker(type,x,z){
  const c=crews[type]||(crews[type]={level:1,members:[]});const st=crewStats(c.level);const col=type==='courier'?0x9b6be0:0xf08a3c;
  const w=makeAgent(col,{x,z,cap:st.cap,speed:st.speed,chopRate:st.chopRate,filter:type==='courier'?'none':type});
  w.role=type==='courier'?'courier':'harvester';w.crew=type;w.slot=((c.members.length%3)-1)*0.55;w.stuckT=0;w.fallback=false;c.members.push(w);
  w.badgeC=document.createElement('canvas');w.badgeC.width=128;w.badgeC.height=56;w.badgeT=new THREE.CanvasTexture(w.badgeC);
  const b=new THREE.Sprite(new THREE.SpriteMaterial({map:w.badgeT,depthTest:false,transparent:true}));b.scale.set(0.8,0.35,1);b.position.y=1.75;b.renderOrder=9;w.g.add(b);drawBadge(w,c.level);
  popIn(w.g);burst(V(x,0.5,z),[0xffffff,col],12,3,4);return w;
}
function levelUpCrew(type){const c=crews[type];c.level++;const st=crewStats(c.level);
  c.members.forEach(w=>{w.cap=st.cap;w.speed=st.speed;w.chopRate=st.chopRate;drawBadge(w,c.level);w.g.userData.jump=1;burst(V(w.pos.x,1,w.pos.z),[0xffcf3f,0xffffff],10,2,4);});
  if(CREWS.extraWorkerAt.includes(c.level)){const f=c.members[0];hireWorker(type,f.pos.x+0.8,f.pos.z+0.6);later(()=>toast('Niveau '+c.level+' : un ouvrier de plus !'),900);}
}
function updWorker(w,dt){
  if(w.role==='courier')return updCourier(w,dt);
  const s=shops[w.filter],mc=machineFor(w.filter);
  if(w.state==='gather'){
    if(w.carry.length>=w.cap)w.state='deliver';
    else{if(!w.target||!w.target.alive)w.target=nearestNode(w.pos,w.filter);
      if(w.target){const d=d2(w.pos,w.target.pos);if(d>w.target.r+0.85){const dx=w.target.pos.x-w.pos.x,dz=w.target.pos.z-w.pos.z,l=Math.hypot(dx,dz)||1,k=w.target.r+0.6;moveAgentTo(w,{x:w.target.pos.x-dx/l*k,z:w.target.pos.z-dz/l*k},dt);}else w.moving=false;}
      else w.moving=false;}
  }
  if(w.state==='deliver'){
    // la ressource brute va à la machine dès qu'elle existe ; avant, au comptoir de la chaîne
    if(!w.carry.some(i=>i.type===w.filter)){w.state='gather';w.target=null;}
    else if(mc)moveAgentTo(w,{x:mc.inPos.x+(w.slot||0)*0.6,z:mc.inPos.z-0.1},dt);
    else moveAgentTo(w,{x:s.drop.x+(w.slot||0),z:s.drop.z-0.1},dt);
  }
}
// Livreur : trajets ENTRE chaînes. 1. steaks → Cantine (moins de CANTEEN.courierFillBelow) ;
// 2. planches et lingots → Atelier (moins de COURIER.workshopFill de chaque) ; 3. produit → comptoir de
// sa chaîne, seulement si elle n'a pas de tapis. Il laisse toujours COURIER.leaveAtOutput objets à une sortie.
function countPile(p,k){let n=0;for(const it of p.items)if(it.type===k)n++;return n;}
function machineByOutput(k){for(const id in machines)if(machines[id].out===k)return machines[id];return null;}
function outAvail(m){let n=0;for(const it of m.outp.items)if(it.arrived)n++;return n-COURIER.leaveAtOutput;}
function courierJob(){
  const g=machines.grill;
  if(canteen&&g&&canteen.inp.items.length<CANTEEN.courierFillBelow&&outAvail(g)>0)return {from:g,item:'steak',to:'canteen',want:CANTEEN.courierFillBelow-canteen.inp.items.length};
  const ws=machines.workshop;
  if(ws)for(const k of ['plank','ingot']){const src=machineByOutput(k),have=countPile(ws.inp,k);if(src&&have<COURIER.workshopFill&&outAvail(src)>0)return {from:src,item:k,to:'workshop',want:COURIER.workshopFill-have};}
  for(const id of COUNTER_IDS){const s=shops[id],m=s&&machineByOutput(s.type);if(!m||belts[id]||outAvail(m)<=0||s.stock.items.length>=COUNTER_RULES.stockCap)continue;return {from:m,item:s.type,to:'drop:'+id,want:99};}
  return null;
}
/** Destination pour ce que porte le livreur : celle de sa mission d'abord, sinon toute destination valide. */
function courierDest(w){
  const slot=w.slot||0,ws=machines.workshop;
  const at={canteen:()=>canteen&&canteen.inp.items.length<CANTEEN.capacity&&{zone:'canteen',x:canteen.inPos.x+slot*0.5,z:canteen.inPos.z},
    workshop:k=>ws&&ws.rec[k]&&countPile(ws.inp,k)<MACHINE_LIMITS.inputPerType&&{zone:'in:workshop',x:ws.inPos.x+slot*0.5,z:ws.inPos.z-0.1},
    counter:s=>s&&s.stock.items.length<COUNTER_RULES.stockCap&&{zone:'drop:'+s.id,x:s.drop.x+slot,z:s.drop.z-0.1}};
  const j=w.job;
  if(j&&w.carry.some(i=>i.type===j.item)){const d=j.to==='canteen'?at.canteen():j.to==='workshop'?at.workshop(j.item):at.counter(shops[j.to.slice(5)]);if(d)return d;}
  for(let i=w.carry.length-1;i>=0;i--){const t=w.carry[i].type;const d=(t==='steak'&&at.canteen())||at.workshop(t)||at.counter(counterFor(t));if(d)return d;}
  return null;
}
function updCourier(w,dt){
  if(w.state==='gather'){
    if(!w.job)w.job=courierJob();
    const j=w.job;
    if(!j){w.zone=null;if(w.carry.length){w.state='deliver';w.stuckT=0;}else w.moving=false;return;}
    w.zone='out:'+j.from.id;
    moveAgentTo(w,{x:j.from.outPos.x+(w.slot||0)*0.5,z:j.from.outPos.z+0.1},dt);
    const there=inZone(w.pos,j.from.outPos,0.9,0.75);
    if(w.carry.length>=w.cap||countCarry(w,j.item)>=j.want||(there&&outAvail(j.from)<=0)){if(w.carry.length){w.state='deliver';w.stuckT=0;}else w.job=null;}
    return;
  }
  if(!w.carry.length){w.state='gather';w.job=null;w.fallback=false;w.stuckT=0;w.zone=null;return;}
  const d=w.fallback?null:courierDest(w);
  if(d){w.stuckT=0;w.zone=d.zone;moveAgentTo(w,d,dt);return;}
  if(!w.fallback){w.stuckT+=dt;w.moving=false;if(w.stuckT>COURIER.stuckTimeout)w.fallback=true;return;}
  // repli : comptoir de l'objet du dessus (plafond absolu, puis vente en gros)
  const s=counterFor(w.carry[w.carry.length-1].type);
  if(s){w.zone='drop:'+s.id;moveAgentTo(w,{x:s.drop.x+(w.slot||0),z:s.drop.z-0.1},dt);}else w.moving=false;
}

/* ================= Machines (transformation) ================= */
const machines={};
const inZone=(p,c,hx,hz)=>Math.abs(p.x-c.x)<hx&&Math.abs(p.z-c.z)<hz;
/** Machine à une seule entrée qui transforme `item` (là où les récolteurs livrent). */
function machineFor(item){for(const k in machines){const ks=Object.keys(machines[k].rec);if(ks.length===1&&ks[0]===item)return machines[k];}return null;}
function buildMachine(id){
  const d=MACHINES[id],c=cellPos(d.cell),IO=MACHINE_LAYOUT.io;const root=new THREE.Group();scene.add(root);
  const m={id,out:d.output,rec:d.recipe,T:d.time,busy:0,anim:0,fxT:0,x:c.x,z:c.z,root,reserve:{}};
  const body=new THREE.Group();body.position.set(c.x,0,c.z);root.add(body);m.body=body;
  const base=mesh(new THREE.BoxGeometry(2,0.9,1.6),d.color);base.position.y=0.45;base.receiveShadow=true;body.add(base);
  const trim=mesh(new THREE.BoxGeometry(2.1,0.12,1.7),0x3a4350);trim.position.y=0.94;body.add(trim);
  if(id==='saw'){const b=mesh(new THREE.CylinderGeometry(0.62,0.62,0.06,18),0xd6dee8);b.rotation.x=PI/2;b.position.set(0,1.3,0);body.add(b);m.spin=b;
    const hub=mesh(new THREE.CylinderGeometry(0.15,0.15,0.1,8),0xc8703c);hub.rotation.x=PI/2;hub.position.set(0,1.3,0);body.add(hub);}
  else if(id==='grill'){const g=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.05,1.3),new THREE.MeshBasicMaterial({color:0xff7a2a}));g.position.y=1.02;body.add(g);m.glow=g;
    for(let i=-3;i<=3;i++){const r=mesh(new THREE.BoxGeometry(0.05,0.06,1.4),0x2b2f36,false);r.position.set(i*0.24,1.06,0);body.add(r);}
    const h=mesh(new THREE.CylinderGeometry(0.12,0.12,1.2,6),0x5f6874);h.position.set(-0.7,1.5,-0.6);body.add(h);m.smokeAt=V(c.x-0.7,2.2,c.z-0.6);}
  else if(id==='forge'){const cr=mesh(new THREE.CylinderGeometry(0.55,0.45,0.5,10),0x5f6874);cr.position.y=1.2;body.add(cr);
    const melt=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.05,10),new THREE.MeshBasicMaterial({color:0xffa52a}));melt.position.y=1.46;body.add(melt);m.glow=melt;
    const ch=mesh(new THREE.CylinderGeometry(0.22,0.28,1.6,8),0x5f6874);ch.position.set(0.65,1.7,-0.5);body.add(ch);m.smokeAt=V(c.x+0.65,2.6,c.z-0.5);}
  else{const anv=mesh(new THREE.BoxGeometry(0.9,0.35,0.5),0x3a4350);anv.position.y=1.2;body.add(anv);
    const horn=mesh(new THREE.ConeGeometry(0.2,0.5,6),0x3a4350);horn.rotation.z=PI/2;horn.position.set(0.68,1.25,0);body.add(horn);
    const hm=new THREE.Group();hm.position.set(-0.2,1.45,0.45);body.add(hm);
    const hh=mesh(new THREE.CylinderGeometry(0.04,0.04,0.7,5),0xa8623a);hh.rotation.x=PI/2;hh.position.z=-0.3;hm.add(hh);
    const hd=mesh(new THREE.BoxGeometry(0.3,0.16,0.16),0xb8c4d2);hd.position.z=-0.62;hm.add(hd);m.hammer=hm;}
  tables.push({x:c.x,z:c.z,hx:1.05,hz:0.85});
  // entrée verte en haut (côté récolte), sortie orange en bas (côté comptoir)
  m.inPos={x:c.x,z:c.z-IO.dz};m.outPos={x:c.x,z:c.z+IO.dz};
  const ins=Object.keys(d.recipe);
  const zi=new THREE.Mesh(new THREE.PlaneGeometry(IO.w,IO.d),new THREE.MeshBasicMaterial({map:zoneTex(ins.length>1?ins:ins[0]),transparent:true,depthWrite:false}));zi.rotation.x=-PI/2;zi.position.set(m.inPos.x,0.02,m.inPos.z);root.add(zi);
  const zo=new THREE.Mesh(new THREE.PlaneGeometry(IO.w,IO.d),new THREE.MeshBasicMaterial({map:zoneTex(d.output,'#ffb03b','rgba(255,176,59,.25)'),transparent:true,depthWrite:false}));zo.rotation.x=-PI/2;zo.position.set(m.outPos.x,0.02,m.outPos.z);root.add(zo);
  m.inAnchor=new THREE.Group();m.inAnchor.position.set(m.inPos.x,0.03,m.inPos.z);root.add(m.inAnchor);
  m.outAnchor=new THREE.Group();m.outAnchor.position.set(m.outPos.x,0.03,m.outPos.z);root.add(m.outAnchor);
  const hi=ins.length>1?0.22:H(ins[0]),ho=H(d.output);
  m.inp=makePile(m.inAnchor,i=>{const L=Math.floor(i/4),j=i%4;return V((j%2-0.5)*0.64,L*hi,(Math.floor(j/2)-0.5)*0.42);});
  m.outp=makePile(m.outAnchor,i=>{const L=Math.floor(i/4),j=i%4;return V((j%2-0.5)*0.66,L*ho,(Math.floor(j/2)-0.5)*0.4);});
  // recette en icônes au-dessus de la machine : entrées → produit
  {const cv=document.createElement('canvas');cv.width=256;cv.height=88;const x=cv.getContext('2d');rr(x,6,6,244,76,24);x.fillStyle='rgba(255,255,255,.92)';x.fill();x.lineWidth=4;x.strokeStyle='rgba(36,48,61,.35)';x.stroke();
    const items=[...ins,'→',d.output],step=228/items.length;items.forEach((t,i)=>{const cx=14+step*(i+0.5);if(t==='→'){x.font='44px "Lilita One", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#24303d';x.fillText('→',cx,46);}else drawIcon(x,t,cx,44,Math.min(62,step*0.95));});
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(cv),transparent:true}));sp.scale.set(1.8,0.62,1);sp.position.y=MACHINE_LAYOUT.recipeY;body.add(sp);}
  machines[id]=m;popIn(body);
}
function drawReserve(m){let n=0;for(const k in m.reserve)n+=m.reserve[k];
  if(!m.resC){m.resC=document.createElement('canvas');m.resC.width=128;m.resC.height=64;m.resT=new THREE.CanvasTexture(m.resC);
    m.resS=new THREE.Sprite(new THREE.SpriteMaterial({map:m.resT,transparent:true,depthTest:false}));m.resS.scale.set(0.9,0.45,1);m.resS.renderOrder=9;m.resS.position.set(m.inPos.x+0.9,1.3,m.inPos.z);m.root.add(m.resS);}
  m.resS.visible=n>0;if(!n)return;const x=m.resC.getContext('2d');x.clearRect(0,0,128,64);rr(x,4,4,120,56,26);x.fillStyle='rgba(26,38,54,.85)';x.fill();
  x.font='38px "Lilita One", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';x.fillText('+'+n,64,34);m.resT.needsUpdate=true;}
function updMachine(m,dt){
  pileUpd(m.inp,dt);pileUpd(m.outp,dt);
  const ins=Object.keys(m.rec);
  for(const a of agents){if(a.role==='courier'&&a.zone!=='in:'+m.id)continue; // les livreurs n'alimentent que la machine qu'ils visent (l'Atelier)
    // l'entrée ne refuse jamais le joueur : au-delà de la pile visible, ses objets vont dans une réserve (« +N »)
    if(inZone(a.pos,m.inPos,0.9,0.75)){a.depCD-=dt;if(a.depCD>0)continue;let r=null,t=null,over=false;
      for(const k of ins){const full=m.inp.items.length>=MACHINE_LIMITS.input||(ins.length>1&&countPile(m.inp,k)>=MACHINE_LIMITS.inputPerType);if(full&&!a.isPlayer)continue;r=takeFromCarry(a,k);if(r){t=k;over=full;break;}}
      if(r){a.depCD=0.06;if(over){m.reserve[t]=(m.reserve[t]||0)+1;fly(r.mesh,r.w,null,V(m.inPos.x,0.4,m.inPos.z),0.3,null,0.8);drawReserve(m);}else pileAdd(m.inp,r.mesh,r.w,{type:t});sfx('drop');if(a.isPlayer)updHUD();}}}
  if(m.busy>0){m.busy-=dt;m.anim+=dt;
    if(m.busy<=0){if(m.outp.items.length<MACHINE_LIMITS.output){const top=V(m.x,1.4,m.z);pileAdd(m.outp,makeItem(m.out),top);burst(top,m.id==='saw'?[0xf3c27a,0xffffff]:[0xffd84a,0xffffff],4,1.5,2.5,0.6);}else m.busy=0.05;}}
  else if(ins.every(k=>(m.reserve[k]||0)>0||m.inp.items.some(i=>i.arrived&&i.type===k))){
    for(const k of ins){if((m.reserve[k]||0)>0){m.reserve[k]--;drawReserve(m);continue;}const r=pileTakeType(m.inp,k);fly(r.it.mesh,r.w,null,V(m.x,1.2,m.z),0.3,null,0.8);}m.busy=m.T;}
  const on=m.busy>0;
  if(m.spin)m.spin.rotation.y+=dt*(on?22:1.5);
  if(m.hammer){m.hammer.rotation.x=on?-Math.abs(Math.sin(m.anim*9))*1.1:m.hammer.rotation.x*0.9;}
  m.body.scale.y=1+(on?Math.sin(m.anim*28)*0.035:0);
  if(m.glow){const k=on?1+Math.sin(m.anim*12)*0.15:0.6;m.glow.scale.set(k,1,k);}
  if(on){m.fxT-=dt;if(m.fxT<=0){m.fxT=0.4;if(m.smokeAt)smoke(m.smokeAt);else burst(V(m.x,1.3,m.z),m.hammer?[0xffd84a,0xff8a2a]:[0xf3c27a,0xe8b070],3,1.5,2,0.5);if(m.hammer)sfx('chop');}}
  for(const a of agents){if(!(a.isPlayer||a.role==='courier'))continue;
    // un livreur ne se sert que pour sa mission et laisse toujours COURIER.leaveAtOutput objets au joueur
    if(a.role==='courier'&&(!a.job||a.job.from!==m||outAvail(m)<=0||countCarry(a,a.job.item)>=a.job.want))continue;
    if(inZone(a.pos,m.outPos,0.9,0.75)&&a.carry.length<a.cap){a.pickCD=(a.pickCD||0)-dt;if(a.pickCD<=0){const r=pileTake(m.outp);if(r){a.pickCD=0.07;addToCarry(a,m.out,r.w,r.it.mesh);sfx('pick');}}}}
}
/* ================= Cantine & maisons ================= */
let canteen=null,houses=0;const houseList=[];
function buildCanteen(){
  const {x,z}=cellPos(CANTEEN.cell);const root=new THREE.Group();scene.add(root);const body=new THREE.Group();body.position.set(x,0,z);root.add(body);
  const w=mesh(new THREE.BoxGeometry(2.6,1.3,2),0xd98c5a);w.position.y=0.65;w.receiveShadow=true;body.add(w);
  const rf=mesh(new THREE.ConeGeometry(2.1,1.1,4),0xb5523b);rf.rotation.y=PI/4;rf.scale.set(1,1,0.8);rf.position.y=1.85;body.add(rf);
  const sn=mesh(new THREE.ConeGeometry(1.1,0.55,4),0xffffff);sn.rotation.y=PI/4;sn.scale.set(1,1,0.8);sn.position.y=2.15;body.add(sn);
  const dr=mesh(new THREE.BoxGeometry(0.5,0.8,0.05),0x6b4430,false);dr.position.set(0,0.4,1.01);body.add(dr);
  const ch=mesh(new THREE.BoxGeometry(0.3,0.9,0.3),0x7d8794);ch.position.set(0.7,2.1,-0.4);body.add(ch);
  tables.push({x,z,hx:1.35,hz:1.05});
  const inPos={x:x+CANTEEN_LAYOUT.input.dx,z};
  const zi=new THREE.Mesh(new THREE.PlaneGeometry(CANTEEN_LAYOUT.input.w,CANTEEN_LAYOUT.input.d),new THREE.MeshBasicMaterial({map:zoneTex('steak'),transparent:true,depthWrite:false}));zi.rotation.x=-PI/2;zi.position.set(inPos.x,0.02,inPos.z);root.add(zi);
  const an=new THREE.Group();an.position.set(inPos.x,0.03,inPos.z);root.add(an);
  canteen={x,z,inPos,inp:makePile(an,i=>{const L=Math.floor(i/4),j=i%4;return V((j%2-0.5)*0.64,L*0.12,(Math.floor(j/2)-0.5)*0.42);}),eatT:2,fxT:0,smokeAt:V(x+0.7,2.8,z-0.4)};
  popIn(body);later(()=>toast('Apporte des steaks : les ouvriers nourris vont plus vite'),900);
}
function updCanteen(dt){
  const c=canteen;pileUpd(c.inp,dt);
  for(const a of agents){if(inZone(a.pos,c.inPos,0.9,0.75)){a.depCD-=dt;if(a.depCD<=0&&c.inp.items.length<CANTEEN.capacity){const r=takeFromCarry(a,'steak');if(r){a.depCD=0.06;pileAdd(c.inp,r.mesh,r.w,{type:'steak'});sfx('drop');if(a.isPlayer)updHUD();}}}}
  c.eatT-=dt;
  if(c.eatT<=0){c.eatT=CANTEEN.eatInterval;let w=null;for(const a of agents){if(a.role&&(a.fedT||0)<=3&&(!w||(a.fedT||0)<(w.fedT||0)))w=a;}
    if(w){const r=pileTake(c.inp);if(r){const m=r.it.mesh;fly(m,r.w,w.g,V(0,1.1,0.3),0.7,()=>{w.g.remove(m);w.fedT=CANTEEN.fedDuration;drawBadge(w,crews[w.crew].level);burst(V(w.pos.x,1.2,w.pos.z),[0x5fdc6e,0xffffff],6,1.5,3,0.7);},2.5);}}}
  if(c.inp.items.length){c.fxT-=dt;if(c.fxT<=0){c.fxT=0.6;smoke(c.smokeAt);}}
}
function buildHouse(income){
  const sp=HOUSE_SPOTS[houses];if(!sp)return;const {x,z}=cellPos(sp);const col=[0xd98c5a,0xc9a06a,0xb87a5a,0xd0a070][houses%4];houses++;
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const w=mesh(new THREE.BoxGeometry(2.2,1.3,1.9),col);w.position.y=0.65;w.receiveShadow=true;g.add(w);
  const rf=mesh(new THREE.ConeGeometry(1.75,1.1,4),0x9a4b3a);rf.rotation.y=PI/4;rf.scale.set(1,1,0.9);rf.position.y=1.85;g.add(rf);
  const sn=mesh(new THREE.ConeGeometry(0.95,0.55,4),0xffffff);sn.rotation.y=PI/4;sn.scale.set(1,1,0.9);sn.position.y=2.15;g.add(sn);
  const dr=mesh(new THREE.BoxGeometry(0.45,0.75,0.05),0x6b4430,false);dr.position.set(0,0.375,0.96);g.add(dr);
  [-0.65,0.65].forEach(x=>{const wi=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.35,0.05),new THREE.MeshBasicMaterial({color:0xffd77a}));wi.position.set(x,0.85,0.96);g.add(wi);});
  const ch=mesh(new THREE.BoxGeometry(0.28,0.8,0.28),0x7d8794);ch.position.set(0.55,2.05,-0.3);g.add(ch);
  tables.push({x,z,hx:1.15,hz:1.0});popIn(g);houseList.push({x,z,income});updHUD();
  later(()=>toast('Maison : +'+income+' $/s de revenu passif'),900);
}
// revenu passif : crédité directement, basé sur le temps réel écoulé (plafonné par frame)
let incomeAcc=0;const _hp=V(0,0,0);
function updIncome(elapsed){
  if(!houseList.length)return;const r=incomeTicks(incomeAcc,elapsed,INCOME.tick,INCOME.maxCatchup);incomeAcc=r.acc;if(!r.ticks)return;
  money+=houseIncome(houses)*r.ticks;updHUD();
  for(const h of houseList){if(time-(h.popAt??-9)<0.9)continue;h.popAt=time;_hp.set(h.x,2.9,h.z);popText(_hp,'+'+h.income*r.ticks+' $','cash');}
}

/* ================= Unlock pads ================= */
// Les cases viennent de PADS (config). État calculé par padStatus : cachée, grisée (matériau
// pas encore produisible), payable ou terminée. Une case à niveaux réapparaît au même endroit.
const pads=[];const padById={};let unlockCount=0,progVer=1,padVer=0;const t0=performance.now();
const progress={level:id=>padById[id]?padById[id].lv:0};
const padLevel=p=>p.def.levels[Math.min(p.lv,p.def.levels.length-1)];
function countCarry(a,k){let n=0;for(const it of a.carry)if(it.type===k)n++;return n;}
function padRem(p){const L=padLevel(p),r=[['cash',Math.max(0,L.cost-p.paid)]];for(const k in L.mats||{})r.push([k,Math.max(0,L.mats[k]-(p.got[k]||0))]);return r;}
function padFrac(p){const L=padLevel(p);let t=p.paid/L.cost,n=1;for(const k in L.mats||{}){t+=Math.min(1,(p.got[k]||0)/L.mats[k]);n++;}return t/n;}
function drawLock(x,cx,cy,s){x.save();x.translate(cx,cy);x.scale(s/100,s/100);x.lineJoin='round';x.lineCap='round';
  x.beginPath();x.arc(0,-12,22,PI,0);x.lineTo(22,4);x.moveTo(-22,4);x.lineTo(-22,-12);x.strokeStyle='#24303d';x.lineWidth=16;x.stroke();x.strokeStyle='#cfd8e2';x.lineWidth=8;x.stroke();
  rr(x,-34,-6,68,52,10);x.fillStyle='#ffcf3f';x.fill();x.strokeStyle='#24303d';x.lineWidth=6;x.stroke();
  x.beginPath();x.arc(0,14,7,0,PI*2);x.fillStyle='#24303d';x.fill();x.fillRect(-3,14,6,16);x.restore();}
function fitLabel(x,text,max,size){let fs=size;do{x.font='900 '+fs+'px Nunito, sans-serif';fs-=2;}while(x.measureText(text).width>max&&fs>14);}
function drawPad(p){
  const x=p.canvas.getContext('2d');x.clearRect(0,0,256,256);const L=padLevel(p),locked=p.status.kind==='locked';
  rr(x,16,16,224,224,36);x.fillStyle=locked?'rgba(96,104,116,.62)':'rgba(36,46,60,.8)';x.fill();
  const f=locked?0:padFrac(p);if(f>0){x.save();rr(x,16,16,224,224,36);x.clip();x.fillStyle='rgba(80,214,104,.9)';x.fillRect(16,240-224*f,224,224*f);x.restore();}
  x.strokeStyle=locked?'rgba(255,255,255,.55)':'#fff';x.lineWidth=9;x.lineCap='round';
  [[30,70,30,30,70,30],[186,30,226,30,226,70],[226,186,226,226,186,226],[70,226,30,226,30,186]].forEach(c=>{x.beginPath();x.moveTo(c[0],c[1]);x.lineTo(c[2],c[3]);x.lineTo(c[4],c[5]);x.stroke();});
  x.textAlign='center';x.textBaseline='middle';
  if(locked){
    x.globalAlpha=.55;drawIcon(x,p.def.icon,128,72,66);x.globalAlpha=1;drawLock(x,128,84,58);
    x.fillStyle='#fff';fitLabel(x,L.label,212,28);x.fillText(L.label,128,150);
    x.font='30px "Lilita One", sans-serif';x.lineWidth=6;x.strokeStyle='#24303d';x.strokeText(p.status.lockedText,128,196);x.fillStyle='#ffe07a';x.fillText(p.status.lockedText,128,196);
    p.tex.needsUpdate=true;return;
  }
  const rows=padRem(p),cp=rows.length>1;
  drawIcon(x,p.def.icon,128,cp?60:80,cp?60:74);
  x.fillStyle='#fff';fitLabel(x,L.label,212,30);x.fillText(L.label,128,cp?108:140);
  if(!cp){const rem=rows[0][1];drawIcon(x,'cash',82,190,40);
    x.font='52px "Lilita One", sans-serif';x.textAlign='left';x.lineWidth=7;x.strokeStyle='#24303d';x.strokeText(String(rem),108,192);x.fillStyle='#fff';x.fillText(String(rem),108,192);}
  else rows.forEach(([k,v],i)=>{const col=i%2,row=Math.floor(i/2),cx=30+col*104,cy=(rows.length<=2?172:150+row*50);
    drawIcon(x,k,cx+18,cy,38);x.font='34px "Lilita One", sans-serif';x.textAlign='left';x.lineWidth=6;x.strokeStyle='#24303d';
    const t=v>0?String(v):'✓';x.strokeText(t,cx+42,cy+2);x.fillStyle=v>0?'#fff':'#8dff9c';x.fillText(t,cx+42,cy+2);});
  p.tex.needsUpdate=true;
}
function addPad(def){const c=document.createElement('canvas');c.width=c.height=256;const tex=new THREE.CanvasTexture(c);tex.anisotropy=4;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(PAD_SIZE,PAD_SIZE),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.rotation.x=-PI/2;
  const {x,z}=cellPos(def.cell);const g=new THREE.Group();g.add(m);g.position.set(x,0.03,z);g.visible=false;scene.add(g);
  const p={def,id:def.id,x,z,lv:0,paid:0,got:{},status:{kind:'hidden'},key:'',canvas:c,tex,g,m,busy:false,payCD:0};pads.push(p);padById[def.id]=p;return p;
}
PADS.forEach(addPad);
// recalculé seulement quand la progression change (progVer), pas à chaque frame
function refreshPads(){padVer=progVer;
  for(const p of pads){if(p.busy)continue;const st=padStatus(p.def,progress),key=st.kind+':'+(st.level??'')+':'+(st.lockedText||'');
    const show=st.kind==='open'||st.kind==='locked';
    if(show&&!p.g.visible)popIn(p.g,0.2);else if(!show)p.g.visible=false;
    if(key!==p.key){p.key=key;p.status=st;if(show)drawPad(p);}}
}
function applyEffect(e,p){
  if(e.kind==='bag')player.cap=e.cap;
  else if(e.kind==='axe'){player.chopRate*=e.chopMul;player.speed*=e.speedMul;}
  else if(e.kind==='crew'){if(p.lv===1)hireWorker(e.crew,p.x,p.z);else levelUpCrew(e.crew);}
  else if(e.kind==='zone')openZone(e.zone,true);
  else if(e.kind==='machine'){buildMachine(e.machine);if(e.machine==='workshop')later(()=>toast('Planche + lingot = outil'),4200);}
  else if(e.kind==='belt'){buildBelt(e.chain);later(()=>toast('Le tapis alimente le comptoir (arrêt à '+BELT.stopAt+' en stock)'),2000);}
  else if(e.kind==='canteen')buildCanteen();
  else if(e.kind==='house')buildHouse(e.income);
  else if(e.kind==='furnace')buildFurnace();
}
function unlockPad(p){const L=padLevel(p);p.lv++;unlockCount++;progVer++;sfx('unlock');toast('Débloqué : '+L.label);
  burst(V(p.x,0.4,p.z),[0xff5a5a,0xffd84a,0x5fdc6e,0x4fb6ff,0xffffff],26,4,7,1,10,1.1);
  p.busy=true;tween(0.25,e=>p.g.scale.setScalar(Math.max(0.001,1-e)),()=>{p.g.visible=false;p.busy=false;p.paid=0;p.got={};p.key='';progVer++;});
  applyEffect(L.effect,p);syncCounters(true);
}
function padReady(p){const L=padLevel(p);if(money<L.cost-p.paid)return false;for(const k in L.mats||{}){const need=L.mats[k]-(p.got[k]||0);if(need>0&&countCarry(player,k)<need)return false;}return true;}
function padComplete(p){const L=padLevel(p);if(p.paid<L.cost)return false;for(const k in L.mats||{})if((p.got[k]||0)<L.mats[k])return false;return true;}
function updPads(dt,time){
  if(padVer!==progVer)refreshPads();
  for(const p of pads){
    if(p.busy||p.status.kind!=='open'||!p.g.visible)continue;const L=padLevel(p);
    p.m.scale.setScalar(padReady(p)?1+Math.sin(time*6)*0.04:1);
    if(d2(player.pos,p)<1.15){p.payCD-=dt;let ch=false;
      while(p.payCD<=0){p.payCD+=0.035;let any=false;
        if(money>0&&p.paid<L.cost){const amt=Math.min(money,L.cost-p.paid,Math.max(1,Math.ceil(L.cost/32)));money-=amt;p.paid+=amt;any=true;
          fly(makeItem('cash'),V(player.pos.x,1.1,player.pos.z),null,V(p.x,0.1,p.z),0.25,null,0.8);sfx('pay');}
        for(const k in L.mats||{}){if((p.got[k]||0)<L.mats[k]){const r=takeFromCarry(player,k);if(r){p.got[k]=(p.got[k]||0)+1;any=true;fly(r.mesh,r.w,null,V(p.x,0.1,p.z),0.3,null,1);sfx('drop');break;}}}
        if(!any){p.payCD=0;break;}ch=true;
        if(padComplete(p)){drawPad(p);updHUD();unlockPad(p);ch=false;break;}}
      if(ch){drawPad(p);updHUD();}
    }else p.payCD=0;
  }
}
let furnace=null;
function buildFurnace(){
  const {x,z}=cellPos(FURNACE_CELL);const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const base=mesh(new THREE.CylinderGeometry(2.3,2.6,0.8,12),0x7d8794);base.position.y=0.4;base.receiveShadow=true;g.add(base);
  for(let i=0;i<12;i++){const a=i/12*PI*2;const b=mesh(new THREE.BoxGeometry(0.7,0.45,0.5),i%2?0x95a0ad:0x86919e);b.position.set(Math.cos(a)*2.35,0.95,Math.sin(a)*2.35);b.rotation.y=-a;g.add(b);}
  const body=mesh(new THREE.CylinderGeometry(1.3,1.7,2.2,10),0x5f6874);body.position.y=1.9;g.add(body);
  const ring=mesh(new THREE.TorusGeometry(1.35,0.14,6,16),0xc8703c);ring.rotation.x=PI/2;ring.position.y=3;g.add(ring);
  const fire=new THREE.Mesh(new THREE.ConeGeometry(0.9,1.6,8),new THREE.MeshBasicMaterial({color:0xff8a2a}));fire.position.y=3.7;g.add(fire);
  const fire2=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.1,8),new THREE.MeshBasicMaterial({color:0xffe066}));fire2.position.y=3.6;g.add(fire2);
  const light=new THREE.PointLight(0xff8a3a,1.6,16);light.position.y=4;g.add(light);
  popIn(g);furnace={g,x,z,fire,fire2,t:0,smokeT:0};tables.push({x,z,hx:2.3,hz:2.3});
  burst(V(x,3,z),[0xff5a5a,0xffd84a,0x5fdc6e,0x4fb6ff,0xb57bff,0xffffff],60,6,10,1.2,9,1.8);
  later(showWin,1600);
}

/* ================= Win ================= */
const winEl=document.getElementById('win');
function showWin(){const s=Math.round((performance.now()-t0)/1000);document.getElementById('winText').textContent=`Le grand fourneau est allumé. Tout le camp est débloqué en ${Math.floor(s/60)} min ${String(s%60).padStart(2,'0')} s.`;winEl.hidden=false;document.getElementById('winBtn').focus();}
listen(document.getElementById('winBtn'),'click',()=>{winEl.hidden=true;});

/* ================= Guide ================= */
const guide=new THREE.Group();
(function(){const m=new THREE.MeshLambertMaterial({color:0x3fdc5e,emissive:0x115522});
  const c=new THREE.Mesh(new THREE.ConeGeometry(0.42,0.6,4),m);c.rotation.x=PI;c.position.y=0.3;guide.add(c);
  const b=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.55,0.28),m);b.position.y=0.85;guide.add(b);})();
guide.visible=false;scene.add(guide);
const gArrow=new THREE.Group();
(function(){const sh=new THREE.Shape();sh.moveTo(0,0.5);sh.lineTo(0.38,-0.1);sh.lineTo(0.14,-0.06);sh.lineTo(0.14,-0.4);sh.lineTo(-0.14,-0.4);sh.lineTo(-0.14,-0.06);sh.lineTo(-0.38,-0.1);sh.closePath();
  const m=new THREE.Mesh(new THREE.ShapeGeometry(sh),new THREE.MeshBasicMaterial({color:0x3fdc5e,transparent:true,opacity:.9,depthWrite:false}));m.rotation.x=-PI/2;gArrow.add(m);})();
gArrow.visible=false;scene.add(gArrow);
// La flèche indique l'étape suivante logique de la chaîne selon ce que porte le joueur :
// ressource brute → machine (ou comptoir s'il n'y a pas encore de machine) ; produit → case de
// construction qui en a besoin, sinon comptoir. Les mains vides : guide de départ (premiers déblocages).
function objective(){
  const top=player.carry.length?player.carry[player.carry.length-1].type:null;
  if(top){
    if(ZONES[top]){const m=machineFor(top);if(m)return {x:m.inPos.x,z:m.inPos.z};const s=counterFor(top);return s?{x:s.drop.x,z:s.drop.z}:null;}
    let best=null,bd=1e9;
    for(const p of pads){if(p.busy||p.status.kind!=='open'||!p.g.visible)continue;const L=padLevel(p);if(((L.mats&&L.mats[top])||0)-(p.got[top]||0)<=0)continue;const d=d2(player.pos,p);if(d<bd){bd=d;best={x:p.x,z:p.z};}}
    if(best)return best;
    const s=counterFor(top);return s?{x:s.drop.x,z:s.drop.z}:null;
  }
  if(unlockCount>=4)return null;
  let best=null,bd=1e9;
  for(const p of pads){if(p.busy||p.status.kind!=='open'||!p.g.visible||!padReady(p))continue;const d=d2(player.pos,p);if(d<bd){bd=d;best={x:p.x,z:p.z};}}
  if(best)return best;
  for(const k in shops){const s=shops[k];if(s.cash.items.some(i=>i.arrived)){const d=d2(player.pos,s.cashPos);if(d<bd){bd=d;best={x:s.cashPos.x,z:s.cashPos.z};}}}
  if(best)return best;
  const n=nearestNode(player.pos,null);return n?{x:n.pos.x,z:n.pos.z,node:true}:null;
}

/* ================= Snow ================= */
const SNOW=500;const snowGeo=new THREE.BufferGeometry();const sp=new Float32Array(SNOW*3);
for(let i=0;i<SNOW;i++){sp[i*3]=rand(-30,30);sp[i*3+1]=rand(0,22);sp[i*3+2]=rand(-30,30);}
snowGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:3*Math.min(window.devicePixelRatio||1,2),sizeAttenuation:false,transparent:true,opacity:.9,depthWrite:false}));scene.add(snow);

/* ================= Boot ================= */
if(process.env.NODE_ENV!=='production')validateProgression();
for(const k in ZONES)if(ZONES[k].startUnlocked)openZone(k,false);
syncCounters(false);
for(let i=0;i<COUNTER_RULES.startCash.bills;i++)pilePlace(shops.wood.cash,makeItem('cash'),{value:COUNTER_RULES.startCash.value});
refreshPads();updHUD();
const camT=V(player.pos.x,0,player.pos.z);
document.fonts&&document.fonts.ready.then(()=>{if(!alive)return;pads.forEach(p=>{if(p.g.visible)drawPad(p);});signDraws.forEach(f=>f());});
// outils de debug (dev uniquement) : captures d'écran, tests manuels
if(process.env.NODE_ENV!=='production')window.__camp={
  teleport(x,z){player.pos.x=x;player.pos.z=z;camT.x=x;camT.z=z;movedT=1;hintEl.classList.add('off');},
  money(v){money=v;updHUD();},
  fill(n,type){const types=type?[type]:['plank','ingot','steak','tool'];player.cap=Math.max(player.cap,n);for(let i=player.carry.length;i<n;i++)addToCarry(player,types[i%types.length],V(player.pos.x,1,player.pos.z));},
  hintVisible(id){return !!(shops[id]&&shops[id].hint&&shops[id].hint.visible);},
  unlockAll(){for(let guard=0;guard<100;guard++){const p=pads.find(q=>padStatus(q.def,progress).kind==='open');if(!p)break;unlockPad(p);}},
  pads(){return pads.map(p=>({id:p.id,lv:p.lv,status:p.status.kind,visible:p.g.visible,scale:+p.g.scale.x.toFixed(3),busy:p.busy,x:p.x,z:p.z}));},
  state(){return {money,cap:player.cap,income:houseIncome(houses),pads:Object.fromEntries(pads.map(p=>[p.id,p.lv])),counters:Object.fromEntries(Object.entries(shops).map(([k,v])=>[k,v.type])),belts:Object.keys(belts),machines:Object.keys(machines),agents:agents.length};},
};

let last=performance.now(),time=0;
function update(dt,elapsed){
  time+=dt;
  // input
  let ix=joy.x,iy=joy.y;
  if(keys['arrowleft']||keys['a']||keys['q'])ix-=1;if(keys['arrowright']||keys['d'])ix+=1;if(keys['arrowup']||keys['w']||keys['z'])iy+=1;if(keys['arrowdown']||keys['s'])iy-=1;
  const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il;}
  const mv=V(0,0,0).addScaledVector(SR,ix).addScaledVector(SF,iy);const ml=mv.length();
  player.moving=ml>0.12;
  if(player.moving){player.pos.addScaledVector(mv,player.speed*dt*Math.min(1,ml*1.4)/ml);
    player.g.rotation.y=angLerp(player.g.rotation.y,Math.atan2(mv.x,mv.z),Math.min(1,dt*14));movedT+=dt;if(movedT>0.6)hintEl.classList.add('off');}
  if(canteen)updCanteen(dt);
  for(const a of agents){if(a.fedT>0){a.fedT-=dt;if(a.fedT<=0&&a.badgeC)drawBadge(a,crews[a.crew].level);}if(!a.isPlayer)updWorker(a,dt);pushOut(a);harvest(a,dt);updStack(a,dt);animPerson(a.g,a.moving,dt,a.swing);}
  for(const k in shops)updShop(shops[k],dt);
  for(const k in machines)updMachine(machines[k],dt);
  updBelts(dt);
  updPads(dt,time);
  updIncome(elapsed);
  // nodes
  for(const n of nodes){const top=n.g.userData.top;
    if(n.shake>0){n.shake=Math.max(0,n.shake-dt*4);if(n.type!=='meat'&&n.alive){top.rotation.z=Math.sin(time*55)*0.09*n.shake;top.rotation.x=Math.cos(time*47)*0.05*n.shake;}}
    if(!n.alive){n.respawn-=dt;if(n.respawn<=0){n.alive=true;n.hp=n.maxHp;
      if(n.type==='wood'){top.rotation.set(0,0,0);tween(0.5,e=>top.scale.setScalar(Math.max(0.001,backOut(e))));}
      else{if(n.area){n.pos.x=rand(n.area.x0,n.area.x1);n.pos.z=rand(n.area.z0,n.area.z1);}top.scale.setScalar(1);popIn(n.g);burst(V(n.pos.x,0.4,n.pos.z),[0xffffff],8,2,3);}}}
    if(n.type==='meat'&&n.alive){const u=n.g.userData;
      if(u.hop>0){u.hop=Math.max(0,u.hop-dt*3);n.g.position.y=Math.sin(u.hop*PI)*0.5;}
      n.pause-=dt;let mov=false;
      if(n.pause<=0){if(!n.wt)n.wt={x:rand(n.area.x0,n.area.x1),z:rand(n.area.z0,n.area.z1)};
        const dx=n.wt.x-n.pos.x,dz=n.wt.z-n.pos.z,d=Math.hypot(dx,dz);
        if(d<0.1){n.wt=null;n.pause=rand(1,3);}else{const st=Math.min(d,1.3*dt);n.pos.x+=dx/d*st;n.pos.z+=dz/d*st;n.g.rotation.y=angLerp(n.g.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*5));mov=true;}}
      u.t+=dt*(mov?10:0);u.legs.forEach((l,i)=>{l.rotation.x=mov?Math.sin(u.t+(i%2?PI:0)+(i>1?PI/2:0))*0.5:l.rotation.x*0.85;});}
  }
  if(furnace){furnace.t+=dt;const s=1+Math.sin(furnace.t*9)*0.08;furnace.fire.scale.set(s,1+Math.sin(furnace.t*7)*0.15,s);furnace.fire2.scale.set(s,1+Math.cos(furnace.t*8)*0.15,s);
    furnace.smokeT-=dt;if(furnace.smokeT<=0){furnace.smokeT=0.3;smoke(V(furnace.x+rand(-.3,.3),4.6,furnace.z+rand(-.3,.3)));}}
  updFlyers(dt);
  for(let i=tweens.length-1;i>=0;i--){const t=tweens[i];t.t+=dt;if(t.t<0)continue;const e=Math.min(1,t.t/t.dur);t.fn(e);if(e>=1){tweens.splice(i,1);t.done&&t.done();}}
  updParts(dt);updPops(dt);
  if(toastT>0){toastT-=dt;if(toastT<=0)toastEl.classList.remove('show');}
  // camera
  camT.x+=(player.pos.x-camT.x)*Math.min(1,dt*6);camT.z+=(player.pos.z-camT.z)*Math.min(1,dt*6);
  camera.position.set(camT.x+CAM_OFF.x,CAM_OFF.y,camT.z+CAM_OFF.z);camera.lookAt(camT.x,0,camT.z);
  sun.position.set(camT.x+SUN_OFF.x,SUN_OFF.y,camT.z+SUN_OFF.z);sun.target.position.set(camT.x,0,camT.z);
  // snow
  const pa=snowGeo.attributes.position.array;for(let i=0;i<SNOW;i++){pa[i*3+1]-=dt*(1.2+(i%5)*0.25);pa[i*3]+=Math.sin(time+i)*dt*0.3;if(pa[i*3+1]<0)pa[i*3+1]=22;}
  snowGeo.attributes.position.needsUpdate=true;snow.position.set(camT.x,0,camT.z);
  // guide
  const ob=movedT>0.3?objective():null;
  if(ob){guide.visible=true;guide.position.set(ob.x,(ob.node?3.2:1.4)+Math.abs(Math.sin(time*4))*0.5,ob.z);guide.rotation.y+=dt*2;
    const dx=ob.x-player.pos.x,dz=ob.z-player.pos.z,d=Math.hypot(dx,dz);
    if(d>3){gArrow.visible=true;gArrow.position.set(player.pos.x+dx/d*1.5,0.05,player.pos.z+dz/d*1.5);gArrow.rotation.y=Math.atan2(-dx,-dz);}else gArrow.visible=false;}
  else{guide.visible=false;gArrow.visible=false;}
}
function loop(now){if(!alive)return;rafId=requestAnimationFrame(loop);const elapsed=(now-last)/1000,dt=Math.min(0.05,elapsed);last=now;update(dt,elapsed);renderer.render(scene,camera);}
camera.position.set(camT.x+CAM_OFF.x,CAM_OFF.y,camT.z+CAM_OFF.z);camera.lookAt(camT.x,0,camT.z);
rafId=requestAnimationFrame(loop);


return ()=>{
  alive=false;if(window.__camp)delete window.__camp;cancelAnimationFrame(rafId);ac.abort();timers.forEach(clearTimeout);
  pops.forEach(p=>p.el.remove());
  scene.traverse(o=>{if(o.geometry)o.geometry.dispose();const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>{if(x.map)x.map.dispose();x.dispose();});});
  renderer.dispose();renderer.domElement.remove();
  if(AC)AC.close();
};
}
