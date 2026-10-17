import * as THREE from 'three';

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
const CAM_OFF=V(18,24,18);
function resize(){const w=innerWidth,h=innerHeight,a=w/h;const vh=a<1?Math.min(11.5/a,28):15;const vw=vh*a;camera.left=-vw/2;camera.right=vw/2;camera.top=vh/2;camera.bottom=-vh/2;camera.updateProjectionMatrix();renderer.setSize(w,h);}
listen(window,'resize',resize);resize();

scene.add(new THREE.HemisphereLight(0xffffff,0xa9bfd8,0.82));
const sun=new THREE.DirectionalLight(0xfff4e6,0.55);
sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-26,right:26,top:26,bottom:-26,near:1,far:90});
sun.shadow.bias=-0.0006;scene.add(sun);scene.add(sun.target);
const SUN_OFF=V(-9,24,7);

const matCache={};
function mat(c){return matCache[c]||(matCache[c]=new THREE.MeshLambertMaterial({color:c}));}
function mesh(geo,m,cast=true){const o=new THREE.Mesh(geo,typeof m==='number'?mat(m):m);o.castShadow=cast;return o;}

const ground=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshLambertMaterial({color:0xe8f0f7}));
ground.rotation.x=-PI/2;ground.receiveShadow=true;scene.add(ground);

function decal(w,h,matl,x,z,y=0.01){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),matl);m.rotation.x=-PI/2;m.position.set(x,y,z);m.receiveShadow=true;scene.add(m);return m;}
// soft dirt road
(function(){const c=document.createElement('canvas');c.width=4;c.height=128;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,0,128);
  g.addColorStop(0,'rgba(233,160,120,0)');g.addColorStop(.18,'rgba(233,160,120,.95)');g.addColorStop(.82,'rgba(233,160,120,.95)');g.addColorStop(1,'rgba(233,160,120,0)');
  x.fillStyle=g;x.fillRect(0,0,4,128);const t=new THREE.CanvasTexture(c);
  decal(52,3.4,new THREE.MeshLambertMaterial({map:t,transparent:true,depthWrite:false}),6,-3,0.012);
})();
// frozen lake
(function(){const m1=new THREE.MeshLambertMaterial({color:0xc4d9ec,transparent:true,opacity:.9,depthWrite:false});
  const l=new THREE.Mesh(new THREE.CircleGeometry(7,28),m1);l.rotation.x=-PI/2;l.scale.set(1.5,1,1);l.position.set(-21,0.011,15);l.receiveShadow=true;scene.add(l);
  const l2=new THREE.Mesh(new THREE.CircleGeometry(4.5,24),new THREE.MeshLambertMaterial({color:0xd6e6f4,transparent:true,opacity:.9,depthWrite:false}));l2.rotation.x=-PI/2;l2.scale.set(1.5,1,1);l2.position.set(-20,0.013,15.5);scene.add(l2);
})();

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
const ITEMS={wood:{h:0.26},meat:{h:0.2},gold:{h:0.17},cash:{h:0.09},plank:{h:0.11},steak:{h:0.12},ingot:{h:0.2},tool:{h:0.16}};
const PRICE={wood:2,meat:4,gold:8,plank:6,steak:12,ingot:25,tool:90};
const RANGE={wood:[2,4],meat:[1,3],gold:[1,2],plank:[1,3],steak:[1,3],ingot:[1,2],tool:[1,2]};
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
function updHUD(){setPill('cash',money);const c={wood:0,meat:0,gold:0,plank:0,steak:0,ingot:0,tool:0};player.carry.forEach(i=>c[i.type]++);for(const k in c)setPill(k,c[k]);}
const toastEl=document.getElementById('toast');let toastT=0;
function toast(t){toastEl.textContent=t;toastEl.classList.add('show');toastT=2.2;}

/* ================= Agents (player + workers) ================= */
const agents=[];
function makeAgent(color,o){
  const g=makePerson(color);giveAxe(g);g.position.set(o.x,0,o.z);scene.add(g);
  const a={g,pos:g.position,carry:[],cap:o.cap,speed:o.speed,chopRate:o.chopRate,chopCD:0,swing:0,moving:false,filter:o.filter||null,isPlayer:!!o.isPlayer,depCD:0,state:'gather',target:null,lean:0,maxT:0,face:0};
  agents.push(a);return a;
}
function stackY(a,idx){let y=0;for(let i=0;i<idx;i++)y+=ITEMS[a.carry[i].type].h;return y;}
function addToCarry(a,type,from,m){const it={type,mesh:m||makeItem(type),arrived:false};a.carry.push(it);
  fly(it.mesh,from,a.g.userData.anchor,V(0,stackY(a,a.carry.length-1),0),0.32,()=>{it.arrived=true;if(a.isPlayer)updHUD();},1.0);}
function takeFromCarry(a,type){for(let i=a.carry.length-1;i>=0;i--){const it=a.carry[i];if(it.type===type&&it.arrived){a.carry.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);if(it.mesh.parent)it.mesh.parent.remove(it.mesh);return {mesh:it.mesh,w};}}return null;}
function updStack(a,dt){a.lean+=((a.moving?1:0)-a.lean)*Math.min(1,dt*5);let y=0;
  a.carry.forEach((it,i)=>{if(it.arrived){const p=it.mesh.position,k=Math.min(1,dt*16);p.y+=(y-p.y)*k;p.z+=(-a.lean*i*i*0.004-p.z)*k;p.x+=(0-p.x)*k;}y+=ITEMS[it.type].h;});}

/* ================= Piles ================= */
function makePile(anchor,slotFn){return {anchor,items:[],slotFn};}
function pileAdd(p,m,from,extra){const it=Object.assign({mesh:m,arrived:false},extra||{});p.items.push(it);fly(m,from,p.anchor,p.slotFn(p.items.length-1),0.3,()=>{it.arrived=true;},0.9);return it;}
function pilePlace(p,m,extra){const it=Object.assign({mesh:m,arrived:true},extra||{});p.items.push(it);p.anchor.add(m);m.position.copy(p.slotFn(p.items.length-1));return it;}
function pileTake(p){for(let i=p.items.length-1;i>=0;i--){const it=p.items[i];if(it.arrived){p.items.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);p.anchor.remove(it.mesh);return {it,w};}}return null;}
function pileTakeType(p,t){for(let i=p.items.length-1;i>=0;i--){const it=p.items[i];if(it.arrived&&it.type===t){p.items.splice(i,1);const w=V(0,0,0);it.mesh.getWorldPosition(w);p.anchor.remove(it.mesh);return {it,w};}}return null;}
function pileUpd(p,dt){p.items.forEach((it,i)=>{if(it.arrived)it.mesh.position.lerp(p.slotFn(i),Math.min(1,dt*14));});}

/* ================= World nodes ================= */
const nodes=[];const unlocked={wood:true,meat:false,gold:false};
function addNode(type,g,x,z,o){g.position.set(x,0,z);g.rotation.y=rand(0,PI*2);scene.add(g);
  const n={type,g,pos:g.position,hp:o.hp,maxHp:o.hp,r:o.r,alive:true,respawn:0,respawnTime:o.respawn,shake:0,solid:o.solid,area:o.area||null,wt:null,pause:rand(0,2)};nodes.push(n);return n;}
const AREAS={meat:{x0:3.5,x1:11,z0:-12,z1:-5.5},gold:{x0:14.5,x1:21.5,z0:-12,z1:-5.5}};
for(const x of [-11,-8.4,-5.8,-3.2])for(const z of [-12.2,-9.6,-7])addNode('wood',makeTree(),x+rand(-.4,.4),z+rand(-.4,.4),{hp:3,r:0.45,respawn:6,solid:true});

// decorative border forest
(function(){let n=0,tries=0;while(n<95&&tries<3000){tries++;const x=rand(-34,44),z=rand(-38,26);
  if(x>-16&&x<29&&z>-22&&z<20)continue;if(Math.hypot(x+21,z-15)<11)continue;
  const t=makeTree();t.position.set(x,0,z);t.scale.setScalar(rand(1.2,1.9));t.rotation.y=rand(0,6);scene.add(t);n++;}
  for(let i=0;i<26;i++){const m=mesh(new THREE.SphereGeometry(rand(.5,1.1),8,6),0xffffff);m.scale.y=0.4;let x,z;do{x=rand(-16,28);z=rand(-21,19);}while((x>-13&&x<27&&z>-13&&z<18));m.position.set(x,0,z);m.receiveShadow=true;scene.add(m);}
})();

/* ================= Shops ================= */
const SHOPS={wood:{x:-4,z:1.5},meat:{x:7,z:1.5},gold:{x:18,z:1.5},market:{x:1.5,z:10.5}};
const marketAccepts=[];
const shops={};const tables=[];
const CUST_COLORS=[0x2fa6e6,0x3bb3d6,0x5b8fe8,0x3fc1b6,0x7b7fe6,0xe56f8f,0xf0a23a,0x9b6be0];
function zoneTex(type,col,fil){const c=document.createElement('canvas');c.width=256;c.height=180;const x=c.getContext('2d');
  rr(x,10,10,236,160,26);x.fillStyle=fil||'rgba(120,200,90,.28)';x.fill();x.setLineDash([30,18]);x.lineWidth=12;x.strokeStyle=col||'#4fdc62';x.stroke();x.setLineDash([]);
  (Array.isArray(type)?type:[type]).forEach((t,i,a)=>drawIcon(x,t,128+(i-(a.length-1)/2)*84,92,a.length>1?62:70));return new THREE.CanvasTexture(c);}
function buildShop(type,anim){
  const d=SHOPS[type];const root=new THREE.Group();scene.add(root);
  const s={type,x:d.x,z:d.z,accepts:type==='market'?marketAccepts:[type],customers:[],leaving:[],serveCD:0,root};
  const t=new THREE.Group();t.position.set(d.x,0,d.z);root.add(t);
  [0xf2a46b,0xe48a52,0xf2a46b].forEach((c,i)=>{const p=mesh(new THREE.BoxGeometry(2.7,0.14,0.36),c);p.position.set(0,0.72,(i-1)*0.37);p.receiveShadow=true;t.add(p);});
  [[1.15,0.42],[-1.15,0.42],[1.15,-0.42],[-1.15,-0.42]].forEach(([x,z])=>{const l=mesh(new THREE.BoxGeometry(0.15,0.68,0.15),0xc8703c);l.position.set(x,0.34,z);t.add(l);});
  tables.push({x:d.x,z:d.z,hx:1.4,hz:0.62});
  s.stockAnchor=new THREE.Group();s.stockAnchor.position.set(d.x,0.79,d.z);root.add(s.stockAnchor);
  const h=type==='market'?0.2:ITEMS[type].h;
  s.stock=makePile(s.stockAnchor,i=>{const L=Math.floor(i/6),j=i%6;return V((j%3-1)*0.64,L*h,(Math.floor(j/3)-0.5)*0.42);});
  s.drop={x:d.x,z:d.z-1.65};
  const z=new THREE.Mesh(new THREE.PlaneGeometry(2.3,1.62),new THREE.MeshBasicMaterial({map:zoneTex(type==='market'?'plank':type),transparent:true,depthWrite:false}));z.rotation.x=-PI/2;z.position.set(s.drop.x,0.02,s.drop.z);root.add(z);
  s.cashPos={x:d.x+2.45,z:d.z+0.35};
  const cp=mesh(new THREE.BoxGeometry(1.5,0.06,1.3),0x4b5663,false);cp.receiveShadow=true;cp.position.set(s.cashPos.x,0.03,s.cashPos.z);root.add(cp);
  s.cashAnchor=new THREE.Group();s.cashAnchor.position.set(s.cashPos.x,0.07,s.cashPos.z);root.add(s.cashAnchor);
  s.cash=makePile(s.cashAnchor,i=>{const L=Math.floor(i/6),j=i%6;return V((j%2-0.5)*0.5,L*0.09,(Math.floor(j/2)-1)*0.3);});
  // crates for flavour
  const cr=mesh(new THREE.BoxGeometry(0.7,0.6,0.7),0xb57a48);cr.position.set(d.x-2.1,0.3,d.z-0.2);cr.rotation.y=0.3;root.add(cr);
  const cr2=mesh(new THREE.BoxGeometry(0.5,0.45,0.5),0xc98a55);cr2.position.set(d.x-2.15,0.82,d.z-0.25);cr2.rotation.y=-0.2;root.add(cr2);
  tables.push({x:d.x-2.1,z:d.z-0.2,hx:0.45,hz:0.45});
  shops[type]=s;
  for(let i=0;i<5;i++)spawnCustomer(s,true);
  if(anim){popIn(t);s.customers.forEach((c,i)=>popIn(c.g,0.15+i*0.07));}
  return s;
}
function slotPos(s,i){return {x:s.x+(i>0?Math.sin(i*1.4)*0.35:0),z:s.z+1.35+i*1.15};}
function spawnCustomer(s,initial){
  const g=makePerson(pick(CUST_COLORS));const i=s.customers.length;const sp=slotPos(s,i);
  if(initial)g.position.set(sp.x,0,sp.z);else g.position.set(s.x+3.5,0,s.z+13);
  g.rotation.y=PI;scene.add(g);
  const wt=s.type==='market'?pick(s.accepts):s.type;
  const want=(s.type==='wood'&&initial&&i===0)?4:randInt(RANGE[wt][0],RANGE[wt][1]);
  s.customers.push({g,pos:g.position,want,wantType:wt,got:0,recv:0,moving:false,bubble:null,canvas:null,tex:null,path:null});
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
function updShop(s,dt){
  pileUpd(s.stock,dt);pileUpd(s.cash,dt);
  // deposit
  for(const a of agents){if(Math.abs(a.pos.x-s.drop.x)<1.2&&Math.abs(a.pos.z-s.drop.z)<0.85){a.depCD-=dt;
    if(a.depCD<=0&&s.stock.items.length<42){let r=null,t=null;for(const k of s.accepts){r=takeFromCarry(a,k);if(r){t=k;break;}}if(r){a.depCD=0.06;pileAdd(s.stock,r.mesh,r.w,{type:t});sfx('drop');if(a.isPlayer)updHUD();}}}}
  // queue
  s.customers.forEach((c,i)=>{const t=slotPos(s,i);walkTo(c,t,dt,3.4);if(!c.moving)c.g.rotation.y=angLerp(c.g.rotation.y,PI,Math.min(1,dt*8));animPerson(c.g,c.moving,dt);});
  const f=s.customers[0];
  if(f&&!f.moving&&d2(f.pos,slotPos(s,0))<0.1){
    ensureBubble(f,f.wantType);s.serveCD-=dt;
    if(f.got<f.want&&s.serveCD<=0){const r=pileTakeType(s.stock,f.wantType);if(r){s.serveCD=0.16;f.got++;const m=r.it.mesh;fly(m,r.w,f.g,V(0,0.95,0.35),0.28,()=>{f.g.remove(m);f.recv++;drawBubble(f,f.wantType);},0.8);}}
    if(f.recv>=f.want){
      const val=Math.round(PRICE[f.wantType]*(1+0.2*houses));for(let k=0;k<f.want;k++){const from=V(f.pos.x,1.2,f.pos.z);
        if(s.cash.items.length>=48){const it=pick(s.cash.items);it.value+=val;}else pileAdd(s.cash,makeItem('cash'),from,{value:val});}
      popText(V(f.pos.x,2.6,f.pos.z),'+$'+(val*f.want),'cash');sfx('sell');
      f.g.remove(f.bubble);f.bubble=null;f.g.userData.jump=1;
      f.path=[V(s.x+1.9,0,s.z+2.2),V(s.x+4.5,0,s.z+16)];s.customers.shift();s.leaving.push(f);
    }
  }
  for(let i=s.leaving.length-1;i>=0;i--){const c=s.leaving[i];if(walkTo(c,c.path[0],dt,3.6)){c.path.shift();if(!c.path.length){scene.remove(c.g);s.leaving.splice(i,1);continue;}}animPerson(c.g,true,dt);}
  while(s.customers.length<5)spawnCustomer(s,false);
  // collect
  if(d2(player.pos,s.cashPos)<1.35){for(let k=0;k<3;k++){const r=pileTake(s.cash);if(!r)break;const m=r.it.mesh,val=r.it.value;
    fly(m,r.w,player.g,V(0,1.0,0),0.22,()=>{player.g.remove(m);money+=val;updHUD();sfx('cash');},0.7);}}
}

/* ================= Player & input ================= */
const player=makeAgent(0x29a8e8,{x:-1.2,z:-0.6,cap:5,speed:5.6,chopRate:0.42,isPlayer:true});
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
const SR=V(Math.SQRT1_2,0,-Math.SQRT1_2),SF=V(-Math.SQRT1_2,0,-Math.SQRT1_2);
let movedT=0;const hintEl=document.getElementById('hint');

function pushOut(a){
  for(const n of nodes){if(!n.solid||!n.alive)continue;const dx=a.pos.x-n.pos.x,dz=a.pos.z-n.pos.z,d=Math.hypot(dx,dz),m=n.r+0.3;if(d<m&&d>1e-4){a.pos.x=n.pos.x+dx/d*m;a.pos.z=n.pos.z+dz/d*m;}}
  for(const t of tables){const cx=clamp(a.pos.x,t.x-t.hx,t.x+t.hx),cz=clamp(a.pos.z,t.z-t.hz,t.z+t.hz);const dx=a.pos.x-cx,dz=a.pos.z-cz,d=Math.hypot(dx,dz);
    if(d<0.3){if(d>1e-4){a.pos.x=cx+dx/d*0.3;a.pos.z=cz+dz/d*0.3;}else{a.pos.z=t.z-t.hz-0.3;}}}
  a.pos.x=clamp(a.pos.x,-16,28);a.pos.z=clamp(a.pos.z,-20,17);
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
  if(a.carry.length>=a.cap){if(a.isPlayer){a.maxT-=dt;if(a.maxT<=0){a.maxT=1.2;popText(V(a.pos.x,1.6+stackY(a,a.carry.length),a.pos.z),'MAX','max');sfx('max');}}return null;}
  if(!a.moving)a.g.rotation.y=angLerp(a.g.rotation.y,Math.atan2(n.pos.x-a.pos.x,n.pos.z-a.pos.z),Math.min(1,dt*12));
  if(a.chopCD<=0){a.chopCD=a.chopRate*(a.fedT>0?0.65:1);a.swing=1;hitNode(n,a);}
  return n;
}
function moveAgentTo(a,t,dt){const dx=t.x-a.pos.x,dz=t.z-a.pos.z,d=Math.hypot(dx,dz);if(d<0.08){a.moving=false;return true;}
  const st=Math.min(d,a.speed*(a.fedT>0?1.4:1)*dt);a.pos.x+=dx/d*st;a.pos.z+=dz/d*st;a.moving=true;a.g.rotation.y=angLerp(a.g.rotation.y,Math.atan2(dx,dz),Math.min(1,dt*10));return false;}
const crews={};
function crewStats(l){return {cap:3+Math.round(l*1.5),speed:3.3+l*0.4,chopRate:0.85*Math.pow(0.8,l-1)};}
function drawBadge(w,l){const x=w.badgeC.getContext('2d');x.clearRect(0,0,128,56);rr(x,4,4,120,48,24);x.fillStyle=w.fedT>0?'rgba(40,150,70,.95)':'rgba(26,38,54,.85)';x.fill();
  x.font='34px "Lilita One", sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#ffcf3f';x.fillText('★ '+l,64,31);w.badgeT.needsUpdate=true;}
function hireWorker(type,x,z){
  const c=crews[type]||(crews[type]={level:1,members:[]});const st=crewStats(c.level);const col=type==='courier'?0x9b6be0:0xf08a3c;
  const w=makeAgent(col,{x,z,cap:st.cap,speed:st.speed,chopRate:st.chopRate,filter:type==='courier'?'none':type});
  w.role=type==='courier'?'courier':'harvester';w.crew=type;w.slot=((c.members.length%3)-1)*0.55;c.members.push(w);
  w.badgeC=document.createElement('canvas');w.badgeC.width=128;w.badgeC.height=56;w.badgeT=new THREE.CanvasTexture(w.badgeC);
  const b=new THREE.Sprite(new THREE.SpriteMaterial({map:w.badgeT,depthTest:false,transparent:true}));b.scale.set(0.8,0.35,1);b.position.y=1.75;b.renderOrder=9;w.g.add(b);drawBadge(w,c.level);
  popIn(w.g);burst(V(x,0.5,z),[0xffffff,col],12,3,4);return w;
}
function levelUpCrew(type){const c=crews[type];c.level++;const st=crewStats(c.level);
  c.members.forEach(w=>{w.cap=st.cap;w.speed=st.speed;w.chopRate=st.chopRate;drawBadge(w,c.level);w.g.userData.jump=1;burst(V(w.pos.x,1,w.pos.z),[0xffcf3f,0xffffff],10,2,4);});
  if(c.level===3||c.level===5){const f=c.members[0];hireWorker(type,f.pos.x+0.8,f.pos.z+0.6);later(()=>toast('Niveau '+c.level+' : un ouvrier de plus !'),900);}
}
function updWorker(w,dt){
  if(w.role==='courier')return updCourier(w,dt);
  const s=shops[w.filter],mc=machines[w.filter];
  if(w.state==='gather'){
    if(w.carry.length>=w.cap){w.state='deliver';w.dest=(mc&&mc.inp.items.length<20)?'m':'s';}
    else{if(!w.target||!w.target.alive)w.target=nearestNode(w.pos,w.filter);
      if(w.target){const d=d2(w.pos,w.target.pos);if(d>w.target.r+0.85){const dir=V(w.target.pos.x-w.pos.x,0,w.target.pos.z-w.pos.z).normalize();moveAgentTo(w,{x:w.target.pos.x-dir.x*(w.target.r+0.6),z:w.target.pos.z-dir.z*(w.target.r+0.6)},dt);}else w.moving=false;}
      else w.moving=false;}
  }
  if(w.state==='deliver'){
    if(!w.carry.some(i=>i.type===w.filter)){w.state='gather';w.target=null;}
    else if(w.dest==='m'&&mc)moveAgentTo(w,{x:mc.inPos.x+(w.slot||0)*0.6,z:mc.inPos.z+0.1},dt);
    else moveAgentTo(w,{x:s.drop.x+(w.slot||0),z:s.drop.z-0.1},dt);
  }
}
function updCourier(w,dt){
  const mk=shops.market;if(!mk){w.moving=false;return;}
  if(w.state==='gather'){
    if(w.carry.length>=w.cap){w.state='deliver';return;}
    let best=null,bn=0;for(const k in machines){const m=machines[k];const n=m.outp.items.filter(i=>i.arrived).length;if(n>bn){bn=n;best=m;}}
    if(!best){if(w.carry.length>0)w.state='deliver';else w.moving=false;return;}
    moveAgentTo(w,{x:best.outPos.x,z:best.outPos.z+(w.slot||0)*0.5},dt);
  }else{
    if(w.carry.length===0){w.state='gather';return;}
    if(canteen&&canteen.inp.items.length<12&&w.carry.some(i=>i.type==='steak'))moveAgentTo(w,{x:canteen.inPos.x,z:canteen.inPos.z+(w.slot||0)*0.5},dt);
    else moveAgentTo(w,{x:mk.drop.x+(w.slot||0),z:mk.drop.z-0.1},dt);
  }
}

/* ================= Machines (transformation) ================= */
const MACH={
  wood:{x:-9.5,z:5,out:'plank',T:0.8,c:0xb57a48,rec:{wood:1}},
  meat:{x:12.5,z:6,out:'steak',T:1.1,c:0x6b7480,rec:{meat:1}},
  gold:{x:23.5,z:6,out:'ingot',T:1.5,c:0x7d8794,rec:{gold:1}},
  tool:{x:8.5,z:12.5,out:'tool',T:2.2,c:0x8a6a4a,rec:{plank:1,ingot:1}},
};
const machines={};
const inZone=(p,c,hx,hz)=>Math.abs(p.x-c.x)<hx&&Math.abs(p.z-c.z)<hz;
function buildMachine(type){
  const d=MACH[type];const root=new THREE.Group();scene.add(root);
  const m={type,out:d.out,rec:d.rec,T:d.T,busy:0,anim:0,fxT:0,x:d.x,z:d.z,root};
  const body=new THREE.Group();body.position.set(d.x,0,d.z);root.add(body);m.body=body;
  const base=mesh(new THREE.BoxGeometry(2,0.9,1.6),d.c);base.position.y=0.45;base.receiveShadow=true;body.add(base);
  const trim=mesh(new THREE.BoxGeometry(2.1,0.12,1.7),0x3a4350);trim.position.y=0.94;body.add(trim);
  if(type==='wood'){const b=mesh(new THREE.CylinderGeometry(0.62,0.62,0.06,18),0xd6dee8);b.rotation.x=PI/2;b.position.set(0,1.3,0);body.add(b);m.spin=b;
    const hub=mesh(new THREE.CylinderGeometry(0.15,0.15,0.1,8),0xc8703c);hub.rotation.x=PI/2;hub.position.set(0,1.3,0);body.add(hub);}
  else if(type==='meat'){const g=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.05,1.3),new THREE.MeshBasicMaterial({color:0xff7a2a}));g.position.y=1.02;body.add(g);m.glow=g;
    for(let i=-3;i<=3;i++){const r=mesh(new THREE.BoxGeometry(0.05,0.06,1.4),0x2b2f36,false);r.position.set(i*0.24,1.06,0);body.add(r);}
    const h=mesh(new THREE.CylinderGeometry(0.12,0.12,1.2,6),0x5f6874);h.position.set(-0.7,1.5,-0.6);body.add(h);m.smokeAt=V(d.x-0.7,2.2,d.z-0.6);}
  else if(type==='gold'){const cr=mesh(new THREE.CylinderGeometry(0.55,0.45,0.5,10),0x5f6874);cr.position.y=1.2;body.add(cr);
    const melt=new THREE.Mesh(new THREE.CylinderGeometry(0.45,0.45,0.05,10),new THREE.MeshBasicMaterial({color:0xffa52a}));melt.position.y=1.46;body.add(melt);m.glow=melt;
    const ch=mesh(new THREE.CylinderGeometry(0.22,0.28,1.6,8),0x5f6874);ch.position.set(0.65,1.7,-0.5);body.add(ch);m.smokeAt=V(d.x+0.65,2.6,d.z-0.5);}
  else{const anv=mesh(new THREE.BoxGeometry(0.9,0.35,0.5),0x3a4350);anv.position.y=1.2;body.add(anv);
    const horn=mesh(new THREE.ConeGeometry(0.2,0.5,6),0x3a4350);horn.rotation.z=PI/2;horn.position.set(0.68,1.25,0);body.add(horn);
    const hm=new THREE.Group();hm.position.set(-0.2,1.45,0.45);body.add(hm);
    const hh=mesh(new THREE.CylinderGeometry(0.04,0.04,0.7,5),0xa8623a);hh.rotation.x=PI/2;hh.position.z=-0.3;hm.add(hh);
    const hd=mesh(new THREE.BoxGeometry(0.3,0.16,0.16),0xb8c4d2);hd.position.z=-0.62;hm.add(hd);m.hammer=hm;}
  tables.push({x:d.x,z:d.z,hx:1.05,hz:0.85});
  m.inPos={x:d.x-2.25,z:d.z};m.outPos={x:d.x+2.25,z:d.z};
  const ins=Object.keys(d.rec);
  const zi=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.25),new THREE.MeshBasicMaterial({map:zoneTex(ins.length>1?ins:ins[0]),transparent:true,depthWrite:false}));zi.rotation.x=-PI/2;zi.position.set(m.inPos.x,0.02,m.inPos.z);root.add(zi);
  const zo=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.25),new THREE.MeshBasicMaterial({map:zoneTex(d.out,'#ffb03b','rgba(255,176,59,.25)'),transparent:true,depthWrite:false}));zo.rotation.x=-PI/2;zo.position.set(m.outPos.x,0.02,m.outPos.z);root.add(zo);
  m.inAnchor=new THREE.Group();m.inAnchor.position.set(m.inPos.x,0.03,m.inPos.z);root.add(m.inAnchor);
  m.outAnchor=new THREE.Group();m.outAnchor.position.set(m.outPos.x,0.03,m.outPos.z);root.add(m.outAnchor);
  const hi=ins.length>1?0.22:ITEMS[ins[0]].h,ho=ITEMS[d.out].h;
  m.inp=makePile(m.inAnchor,i=>{const L=Math.floor(i/4),j=i%4;return V((j%2-0.5)*0.64,L*hi,(Math.floor(j/2)-0.5)*0.42);});
  m.outp=makePile(m.outAnchor,i=>{const L=Math.floor(i/4),j=i%4;return V((j%2-0.5)*0.66,L*ho,(Math.floor(j/2)-0.5)*0.4);});
  machines[type]=m;popIn(body);
  if(!marketAccepts.includes(d.out))marketAccepts.push(d.out);
  if(!shops.market){buildShop('market',true);toast('Nouveau : le marché achète tes produits !');}
}
function updMachine(m,dt){
  pileUpd(m.inp,dt);pileUpd(m.outp,dt);
  const ins=Object.keys(m.rec);
  for(const a of agents){if(a.role==='courier')continue;
    if(inZone(a.pos,m.inPos,0.9,0.75)){a.depCD-=dt;if(a.depCD<=0&&m.inp.items.length<24){let r=null,t=null;
      for(const k of ins){if(ins.length>1&&m.inp.items.filter(i=>i.type===k).length>=12)continue;r=takeFromCarry(a,k);if(r){t=k;break;}}
      if(r){a.depCD=0.06;pileAdd(m.inp,r.mesh,r.w,{type:t});sfx('drop');if(a.isPlayer)updHUD();}}}}
  if(m.busy>0){m.busy-=dt;m.anim+=dt;
    if(m.busy<=0){if(m.outp.items.length<32){const top=V(m.x,1.4,m.z);pileAdd(m.outp,makeItem(m.out),top);burst(top,m.type==='wood'?[0xf3c27a,0xffffff]:[0xffd84a,0xffffff],4,1.5,2.5,0.6);}else m.busy=0.05;}}
  else if(ins.every(k=>m.inp.items.some(i=>i.arrived&&i.type===k))){for(const k of ins){const r=pileTakeType(m.inp,k);fly(r.it.mesh,r.w,null,V(m.x,1.2,m.z),0.3,null,0.8);}m.busy=m.T;}
  const on=m.busy>0;
  if(m.spin)m.spin.rotation.y+=dt*(on?22:1.5);
  if(m.hammer){m.hammer.rotation.x=on?-Math.abs(Math.sin(m.anim*9))*1.1:m.hammer.rotation.x*0.9;}
  m.body.scale.y=1+(on?Math.sin(m.anim*28)*0.035:0);
  if(m.glow){const k=on?1+Math.sin(m.anim*12)*0.15:0.6;m.glow.scale.set(k,1,k);}
  if(on){m.fxT-=dt;if(m.fxT<=0){m.fxT=0.4;if(m.smokeAt)smoke(m.smokeAt);else burst(V(m.x,1.3,m.z),m.hammer?[0xffd84a,0xff8a2a]:[0xf3c27a,0xe8b070],3,1.5,2,0.5);if(m.hammer)sfx('chop');}}
  for(const a of agents){if(!(a.isPlayer||a.role==='courier'))continue;
    if(inZone(a.pos,m.outPos,0.9,0.75)&&a.carry.length<a.cap){a.pickCD=(a.pickCD||0)-dt;if(a.pickCD<=0){const r=pileTake(m.outp);if(r){a.pickCD=0.07;addToCarry(a,m.out,r.w,r.it.mesh);sfx('pick');}}}}
}
/* ================= Cantine & maisons ================= */
let canteen=null,houses=0;
function buildCanteen(){
  const x=-9,z=10.5;const root=new THREE.Group();scene.add(root);const body=new THREE.Group();body.position.set(x,0,z);root.add(body);
  const w=mesh(new THREE.BoxGeometry(2.6,1.3,2),0xd98c5a);w.position.y=0.65;w.receiveShadow=true;body.add(w);
  const rf=mesh(new THREE.ConeGeometry(2.1,1.1,4),0xb5523b);rf.rotation.y=PI/4;rf.scale.set(1,1,0.8);rf.position.y=1.85;body.add(rf);
  const sn=mesh(new THREE.ConeGeometry(1.1,0.55,4),0xffffff);sn.rotation.y=PI/4;sn.scale.set(1,1,0.8);sn.position.y=2.15;body.add(sn);
  const dr=mesh(new THREE.BoxGeometry(0.5,0.8,0.05),0x6b4430,false);dr.position.set(0,0.4,1.01);body.add(dr);
  const ch=mesh(new THREE.BoxGeometry(0.3,0.9,0.3),0x7d8794);ch.position.set(0.7,2.1,-0.4);body.add(ch);
  tables.push({x,z,hx:1.35,hz:1.05});
  const inPos={x:x+2.45,z};
  const zi=new THREE.Mesh(new THREE.PlaneGeometry(1.75,1.25),new THREE.MeshBasicMaterial({map:zoneTex('steak'),transparent:true,depthWrite:false}));zi.rotation.x=-PI/2;zi.position.set(inPos.x,0.02,inPos.z);root.add(zi);
  const an=new THREE.Group();an.position.set(inPos.x,0.03,inPos.z);root.add(an);
  canteen={x,z,inPos,inp:makePile(an,i=>{const L=Math.floor(i/4),j=i%4;return V((j%2-0.5)*0.64,L*0.12,(Math.floor(j/2)-0.5)*0.42);}),eatT:2,fxT:0,smokeAt:V(x+0.7,2.8,z-0.4)};
  popIn(body);later(()=>toast('Apporte des steaks : les ouvriers nourris vont plus vite'),900);
}
function updCanteen(dt){
  const c=canteen;pileUpd(c.inp,dt);
  for(const a of agents){if(inZone(a.pos,c.inPos,0.9,0.75)){a.depCD-=dt;if(a.depCD<=0&&c.inp.items.length<20){const r=takeFromCarry(a,'steak');if(r){a.depCD=0.06;pileAdd(c.inp,r.mesh,r.w,{type:'steak'});sfx('drop');if(a.isPlayer)updHUD();}}}}
  c.eatT-=dt;
  if(c.eatT<=0){c.eatT=2.5;let w=null;for(const a of agents){if(a.role&&(a.fedT||0)<=3&&(!w||(a.fedT||0)<(w.fedT||0)))w=a;}
    if(w){const r=pileTake(c.inp);if(r){const m=r.it.mesh;fly(m,r.w,w.g,V(0,1.1,0.3),0.7,()=>{w.g.remove(m);w.fedT=45;drawBadge(w,crews[w.crew].level);burst(V(w.pos.x,1.2,w.pos.z),[0x5fdc6e,0xffffff],6,1.5,3,0.7);},2.5);}}}
  if(c.inp.items.length){c.fxT-=dt;if(c.fxT<=0){c.fxT=0.6;smoke(c.smokeAt);}}
}
const HOUSE_SPOTS=[[-6,15.6],[-9.6,15.6],[13,15.6],[16.6,15.6]];
function buildHouse(){
  const sp=HOUSE_SPOTS[houses];if(!sp)return;const col=[0xd98c5a,0xc9a06a,0xb87a5a,0xd0a070][houses];houses++;
  const g=new THREE.Group();g.position.set(sp[0],0,sp[1]);scene.add(g);
  const w=mesh(new THREE.BoxGeometry(2.2,1.3,1.9),col);w.position.y=0.65;w.receiveShadow=true;g.add(w);
  const rf=mesh(new THREE.ConeGeometry(1.75,1.1,4),0x9a4b3a);rf.rotation.y=PI/4;rf.scale.set(1,1,0.9);rf.position.y=1.85;g.add(rf);
  const sn=mesh(new THREE.ConeGeometry(0.95,0.55,4),0xffffff);sn.rotation.y=PI/4;sn.scale.set(1,1,0.9);sn.position.y=2.15;g.add(sn);
  const dr=mesh(new THREE.BoxGeometry(0.45,0.75,0.05),0x6b4430,false);dr.position.set(0,0.375,0.96);g.add(dr);
  [-0.65,0.65].forEach(x=>{const wi=new THREE.Mesh(new THREE.BoxGeometry(0.35,0.35,0.05),new THREE.MeshBasicMaterial({color:0xffd77a}));wi.position.set(x,0.85,0.96);g.add(wi);});
  const ch=mesh(new THREE.BoxGeometry(0.28,0.8,0.28),0x7d8794);ch.position.set(0.55,2.05,-0.3);g.add(ch);
  tables.push({x:sp[0],z:sp[1],hx:1.15,hz:1.0});popIn(g);
  later(()=>toast('Plus d’habitants : prix de vente +'+houses*20+' %'),900);
}

/* ================= Unlock pads ================= */
const pads=[];let unlockCount=0;const t0=performance.now();
function isDone(id){const p=pads.find(q=>q.id===id);return !!p&&(p.done||p.lv>0);}
function padRem(p){const r=[['cash',Math.max(0,p.cost-p.paid)]];for(const k in p.mats)r.push([k,Math.max(0,p.mats[k]-(p.got[k]||0))]);return r;}
function padFrac(p){let t=p.paid/p.cost,n=1;for(const k in p.mats){t+=Math.min(1,(p.got[k]||0)/p.mats[k]);n++;}return t/n;}
function drawPad(p){
  const x=p.canvas.getContext('2d');x.clearRect(0,0,256,256);
  rr(x,16,16,224,224,36);x.fillStyle='rgba(36,46,60,.8)';x.fill();
  const f=padFrac(p);if(f>0){x.save();rr(x,16,16,224,224,36);x.clip();x.fillStyle='rgba(80,214,104,.9)';x.fillRect(16,240-224*f,224,224*f);x.restore();}
  x.strokeStyle='#fff';x.lineWidth=9;x.lineCap='round';
  [[30,70,30,30,70,30],[186,30,226,30,226,70],[226,186,226,226,186,226],[70,226,30,226,30,186]].forEach(c=>{x.beginPath();x.moveTo(c[0],c[1]);x.lineTo(c[2],c[3]);x.lineTo(c[4],c[5]);x.stroke();});
  const rows=padRem(p),cp=rows.length>1;
  drawIcon(x,p.icon,128,cp?60:80,cp?60:74);
  x.textAlign='center';x.textBaseline='middle';x.fillStyle='#fff';let fs=30;do{x.font='900 '+fs+'px Nunito, sans-serif';fs-=2;}while(x.measureText(p.label).width>212&&fs>14);x.fillText(p.label,128,cp?108:140);
  if(!cp){const rem=rows[0][1];drawIcon(x,'cash',82,190,40);
    x.font='52px "Lilita One", sans-serif';x.textAlign='left';x.lineWidth=7;x.strokeStyle='#24303d';x.strokeText(String(rem),108,192);x.fillStyle='#fff';x.fillText(String(rem),108,192);}
  else rows.forEach(([k,v],i)=>{const col=i%2,row=Math.floor(i/2),cx=30+col*104,cy=(rows.length<=2?172:150+row*50);
    drawIcon(x,k,cx+18,cy,38);x.font='34px "Lilita One", sans-serif';x.textAlign='left';x.lineWidth=6;x.strokeStyle='#24303d';
    const t=v>0?String(v):'✓';x.strokeText(t,cx+42,cy+2);x.fillStyle=v>0?'#fff':'#8dff9c';x.fillText(t,cx+42,cy+2);});
  p.tex.needsUpdate=true;
}
function addPad(def){if(def.levels){def.cost=def.levels[0].cost;def.label=def.levels[0].label;def.mats=def.levels[0].mats;}def.mats=def.mats||{};def.got={};
  const c=document.createElement('canvas');c.width=c.height=256;const tex=new THREE.CanvasTexture(c);tex.anisotropy=4;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(2.5,2.5),new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));m.rotation.x=-PI/2;
  const g=new THREE.Group();g.add(m);g.position.set(def.x,0.03,def.z);g.rotation.y=PI/4;g.visible=false;scene.add(g);
  const p=Object.assign({paid:0,canvas:c,tex,g,m,shown:false,done:false,payCD:0},def);drawPad(p);pads.push(p);return p;
}
const T2={tool:2},T4={tool:4};
const crewLevels=(name,costs)=>costs.map((c,i)=>({cost:c,label:i===0?name:name+' niv.'+(i+1),mats:i===3?T2:i===4?T4:undefined}));
addPad({id:'bag1',x:1.4,z:-0.3,cost:10,label:'Sac +5',icon:'bag',req:()=>true,fn:()=>{player.cap+=5;}});
addPad({id:'axe1',x:-9,z:0.8,cost:24,label:'Hache rapide',icon:'axe',req:()=>isDone('bag1'),fn:()=>{player.chopRate*=0.6;}});
addPad({id:'lumber',x:1.8,z:4.6,icon:'worker',req:()=>isDone('bag1'),levels:crewLevels('Bûcheron',[40,150,400,800,1500]),fn:l=>l===0?hireWorker('wood',1.8,4.6):levelUpCrew('wood')});
addPad({id:'saw',x:-9.5,z:5,cost:50,label:'Scierie',icon:'plank',req:()=>isDone('lumber'),fn:()=>buildMachine('wood')});
addPad({id:'courier',x:-2.6,z:11,icon:'worker',req:()=>isDone('saw'),levels:crewLevels('Livreur',[120,300,600,1100,1800]),fn:l=>l===0?hireWorker('courier',-2.6,11):levelUpCrew('courier')});
addPad({id:'house',x:4.6,z:15.6,icon:'house',req:()=>isDone('saw'),levels:[{cost:200,label:'Maison',mats:{plank:10}},{cost:600,label:'Maison 2',mats:{plank:20,steak:5}},{cost:1500,label:'Maison 3',mats:{plank:30,ingot:6}},{cost:3000,label:'Maison 4',mats:{plank:40,tool:3}}],fn:()=>buildHouse()});
addPad({id:'hunt',x:7,z:1.5,cost:60,label:'Zone de chasse',icon:'meat',req:()=>isDone('axe1')||isDone('lumber'),fn:unlockHunt});
addPad({id:'hunter',x:12.4,z:-0.3,icon:'worker',req:()=>isDone('hunt'),levels:crewLevels('Chasseur',[150,350,700,1200,2000]),fn:l=>l===0?hireWorker('meat',12.4,-0.3):levelUpCrew('meat')});
addPad({id:'grill',x:12.5,z:6,cost:250,mats:{plank:6},label:'Grill',icon:'steak',req:()=>isDone('hunt')&&isDone('saw'),fn:()=>buildMachine('meat')});
addPad({id:'canteen',x:-9,z:10.5,cost:400,mats:{plank:15},label:'Cantine',icon:'steak',req:()=>isDone('grill'),fn:buildCanteen});
addPad({id:'bag2',x:-1.2,z:6.6,cost:300,mats:{plank:8},label:'Sac +10',icon:'bag',req:()=>isDone('hunt'),fn:()=>{player.cap+=10;}});
addPad({id:'mine',x:18,z:1.5,cost:400,mats:{plank:10},label:"Mine d'or",icon:'gold',req:()=>isDone('hunt'),fn:unlockMine});
addPad({id:'miner',x:23.2,z:-0.3,icon:'worker',req:()=>isDone('mine'),levels:crewLevels('Mineur',[400,700,1100,1700,2600]),fn:l=>l===0?hireWorker('gold',23.2,-0.3):levelUpCrew('gold')});
addPad({id:'forge',x:23.5,z:6,cost:600,mats:{plank:12},label:'Fonderie',icon:'ingot',req:()=>isDone('mine')&&isDone('saw'),fn:()=>buildMachine('gold')});
addPad({id:'workshop',x:8.5,z:12.5,cost:900,mats:{plank:20,ingot:8},label:'Atelier',icon:'tool',req:()=>isDone('forge'),fn:()=>{buildMachine('tool');later(()=>toast('Planche + lingot = outil'),900);}});
addPad({id:'axe2',x:-9,z:0.8,cost:800,mats:{tool:3},label:'Hache dorée',icon:'axe',req:()=>isDone('axe1')&&isDone('workshop'),fn:()=>{player.chopRate*=0.6;player.speed*=1.15;}});
addPad({id:'furnace',x:7,z:-15.5,cost:5000,mats:{plank:50,ingot:20,tool:6},label:'Grand fourneau',icon:'fire',req:()=>isDone('workshop')&&isDone('house'),fn:buildFurnace});

function unlockHunt(){unlocked.meat=true;buildShop('meat',true);
  for(let i=0;i<6;i++){const a=AREAS.meat;const n=addNode('meat',makeDeer(),rand(a.x0,a.x1),rand(a.z0,a.z1),{hp:3,r:0.5,respawn:4,solid:false,area:a});popIn(n.g,0.1*i);}}
function unlockMine(){unlocked.gold=true;buildShop('gold',true);let i=0;
  for(const x of [15.2,17.9,20.6])for(const z of [-11.4,-8.7,-6])addNode('gold',makeRock(),x+rand(-.3,.3),z+rand(-.3,.3),{hp:4,r:0.7,respawn:8,solid:true}),popIn(nodes[nodes.length-1].g,0.06*i++);}
let furnace=null;
function buildFurnace(){
  const g=new THREE.Group();g.position.set(7,0,-15.5);scene.add(g);
  const base=mesh(new THREE.CylinderGeometry(2.3,2.6,0.8,12),0x7d8794);base.position.y=0.4;base.receiveShadow=true;g.add(base);
  for(let i=0;i<12;i++){const a=i/12*PI*2;const b=mesh(new THREE.BoxGeometry(0.7,0.45,0.5),i%2?0x95a0ad:0x86919e);b.position.set(Math.cos(a)*2.35,0.95,Math.sin(a)*2.35);b.rotation.y=-a;g.add(b);}
  const body=mesh(new THREE.CylinderGeometry(1.3,1.7,2.2,10),0x5f6874);body.position.y=1.9;g.add(body);
  const ring=mesh(new THREE.TorusGeometry(1.35,0.14,6,16),0xc8703c);ring.rotation.x=PI/2;ring.position.y=3;g.add(ring);
  const fire=new THREE.Mesh(new THREE.ConeGeometry(0.9,1.6,8),new THREE.MeshBasicMaterial({color:0xff8a2a}));fire.position.y=3.7;g.add(fire);
  const fire2=new THREE.Mesh(new THREE.ConeGeometry(0.5,1.1,8),new THREE.MeshBasicMaterial({color:0xffe066}));fire2.position.y=3.6;g.add(fire2);
  const light=new THREE.PointLight(0xff8a3a,1.6,16);light.position.y=4;g.add(light);
  popIn(g);furnace={g,fire,fire2,t:0,smokeT:0};tables.push({x:7,z:-15.5,hx:2.3,hz:2.3});
  burst(V(7,3,-15.5),[0xff5a5a,0xffd84a,0x5fdc6e,0x4fb6ff,0xb57bff,0xffffff],60,6,10,1.2,9,1.8);
  later(showWin,1600);
}
function unlockPad(p){p.done=true;unlockCount++;sfx('unlock');toast('Débloqué : '+p.label);
  burst(V(p.x,0.4,p.z),[0xff5a5a,0xffd84a,0x5fdc6e,0x4fb6ff,0xffffff],26,4,7,1,10,1.1);
  const lv=p.lv||0;p.lv=lv+1;const more=p.levels&&p.lv<p.levels.length;
  tween(0.25,e=>p.g.scale.setScalar(Math.max(0.001,1-e)),()=>{p.g.visible=false;if(more){const L=p.levels[p.lv];p.cost=L.cost;p.label=L.label;p.mats=L.mats||{};p.got={};p.paid=0;p.done=false;drawPad(p);popIn(p.g,0.6);}});
  p.fn(lv);
}
function padReady(p){if(money<p.cost-p.paid)return false;for(const k in p.mats){const need=p.mats[k]-(p.got[k]||0);if(need>0&&player.carry.filter(i=>i.type===k).length<need)return false;}return true;}
function padComplete(p){if(p.paid<p.cost)return false;for(const k in p.mats)if((p.got[k]||0)<p.mats[k])return false;return true;}
function updPads(dt,time){
  for(const p of pads){
    if(!p.shown&&p.req()){p.shown=true;popIn(p.g,0.2);}
    if(!p.shown||p.done)continue;
    p.m.scale.setScalar(padReady(p)?1+Math.sin(time*6)*0.04:1);
    if(d2(player.pos,p)<1.15){p.payCD-=dt;let ch=false;
      while(p.payCD<=0){p.payCD+=0.035;let any=false;
        if(money>0&&p.paid<p.cost){const amt=Math.min(money,p.cost-p.paid,Math.max(1,Math.ceil(p.cost/32)));money-=amt;p.paid+=amt;any=true;
          fly(makeItem('cash'),V(player.pos.x,1.1,player.pos.z),null,V(p.x,0.1,p.z),0.25,null,0.8);sfx('pay');}
        for(const k in p.mats){if((p.got[k]||0)<p.mats[k]){const r=takeFromCarry(player,k);if(r){p.got[k]=(p.got[k]||0)+1;any=true;fly(r.mesh,r.w,null,V(p.x,0.1,p.z),0.3,null,1);sfx('drop');break;}}}
        if(!any){p.payCD=0;break;}ch=true;
        if(padComplete(p)){drawPad(p);updHUD();unlockPad(p);ch=false;break;}}
      if(ch){drawPad(p);updHUD();}
    }else p.payCD=0;
  }
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
function objective(){
  let best=null,bd=1e9;
  for(const p of pads){if(!p.shown||p.done)continue;if(padReady(p)){const d=d2(player.pos,p);if(d<bd){bd=d;best={x:p.x,z:p.z};}}}
  if(best)return best;
  for(const k in shops){const s=shops[k];if(s.cash.items.some(i=>i.arrived)){const d=d2(player.pos,s.cashPos);if(d<bd){bd=d;best={x:s.cashPos.x,z:s.cashPos.z};}}}
  if(best&&player.carry.length===0)return best;
  if(player.carry.length>=player.cap||(player.carry.length>0&&best)){const s=shops[player.carry[player.carry.length-1].type]||shops.market;return {x:s.drop.x,z:s.drop.z};}
  if(best)return best;
  const n=nearestNode(player.pos,null);return n?{x:n.pos.x,z:n.pos.z,node:true}:null;
}

/* ================= Snow ================= */
const SNOW=500;const snowGeo=new THREE.BufferGeometry();const sp=new Float32Array(SNOW*3);
for(let i=0;i<SNOW;i++){sp[i*3]=rand(-30,30);sp[i*3+1]=rand(0,22);sp[i*3+2]=rand(-30,30);}
snowGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
const snow=new THREE.Points(snowGeo,new THREE.PointsMaterial({color:0xffffff,size:3*Math.min(window.devicePixelRatio||1,2),sizeAttenuation:false,transparent:true,opacity:.9,depthWrite:false}));scene.add(snow);

/* ================= Boot ================= */
buildShop('wood',false);
for(let i=0;i<6;i++)pilePlace(shops.wood.cash,makeItem('cash'),{value:2});
updHUD();
const camT=V(player.pos.x,0,player.pos.z);
document.fonts&&document.fonts.ready.then(()=>{pads.forEach(drawPad);});

let last=performance.now(),time=0;
function update(dt){
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
  updPads(dt,time);
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
    furnace.smokeT-=dt;if(furnace.smokeT<=0){furnace.smokeT=0.3;smoke(V(7+rand(-.3,.3),4.6,-15.5+rand(-.3,.3)));}}
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
  const ob=(movedT>0.3&&unlockCount<4)?objective():null;
  if(ob){guide.visible=true;guide.position.set(ob.x,(ob.node?3.2:1.4)+Math.abs(Math.sin(time*4))*0.5,ob.z);guide.rotation.y+=dt*2;
    const dx=ob.x-player.pos.x,dz=ob.z-player.pos.z,d=Math.hypot(dx,dz);
    if(d>3){gArrow.visible=true;gArrow.position.set(player.pos.x+dx/d*1.5,0.05,player.pos.z+dz/d*1.5);gArrow.rotation.y=Math.atan2(-dx,-dz);}else gArrow.visible=false;}
  else{guide.visible=false;gArrow.visible=false;}
}
function loop(now){if(!alive)return;rafId=requestAnimationFrame(loop);const dt=Math.min(0.05,(now-last)/1000);last=now;update(dt);renderer.render(scene,camera);}
camera.position.set(camT.x+CAM_OFF.x,CAM_OFF.y,camT.z+CAM_OFF.z);camera.lookAt(camT.x,0,camT.z);
rafId=requestAnimationFrame(loop);


return ()=>{
  alive=false;cancelAnimationFrame(rafId);ac.abort();timers.forEach(clearTimeout);
  pops.forEach(p=>p.el.remove());
  scene.traverse(o=>{if(o.geometry)o.geometry.dispose();const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>{if(x.map)x.map.dispose();x.dispose();});});
  renderer.dispose();renderer.domElement.remove();
  if(AC)AC.close();
};
}
