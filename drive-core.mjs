export const INPUTS=14, HIDDEN=24, PARAMS=INPUTS*HIDDEN+HIDDEN+2*HIDDEN+2, DT=1/30;
export const PHYSICS_VERSION='grip-v2';
export const GRIP=95, ENGINE_ACCEL=40, BRAKE_ACCEL=75, MAX_CURVATURE=.035;
const PREVIEW=[0,30,65,110,170,230];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function rng(seed=1){let s=seed>>>0;return ()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};}
export function randomWeights(seed=1){const r=rng(seed);return Array.from({length:PARAMS},()=> (r()-.5)*.7);}
export function network(weights,input){
 const hidden=[],bias=INPUTS*HIDDEN,output=bias+HIDDEN,outputBias=output+2*HIDDEN;
 let k=0;
 for(let j=0;j<HIDDEN;j++){let z=0;for(let i=0;i<INPUTS;i++)z+=weights[k++]*input[i];hidden.push(Math.tanh(z+weights[bias+j]));}
 const result=[];k=output;
 for(let j=0;j<2;j++){let z=0;for(let i=0;i<HIDDEN;i++)z+=weights[k++]*hidden[i];result.push(Math.tanh(z+weights[outputBias+j]));}return result;
}
export function makeTrack(raw,width=19){
 if(raw.length<4)throw Error('Draw a longer loop.');
 let points=raw.map(p=>({x:p.x,y:p.y}));
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))throw Error('Invalid track points.');
 if(Math.hypot(points[0].x-points.at(-1).x,points[0].y-points.at(-1).y)<1)points.pop();
 for(let pass=0;pass<2;pass++){const smooth=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];smooth.push({x:a.x*.75+b.x*.25,y:a.y*.75+b.y*.25},{x:a.x*.25+b.x*.75,y:a.y*.25+b.y*.75});}points=smooth;}
 const lengths=[0];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];lengths.push(lengths.at(-1)+Math.hypot(b.x-a.x,b.y-a.y));}
 const total=lengths.at(-1);if(total<280)throw Error('Give the driver a larger loop.');
 const samples=[];let j=0;
 for(let i=0;i<128;i++){const d=i*total/128;while(lengths[j+1]<d)j++;const a=points[j],b=points[(j+1)%points.length],t=(d-lengths[j])/(lengths[j+1]-lengths[j]||1);samples.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});}
 const area=Math.abs(samples.reduce((a,p,i)=>{const q=samples[(i+1)%samples.length];return a+p.x*q.y-q.x*p.y;},0))/2;
 if(area<2000)throw Error('Give the loop some room inside.');
 const segments=[];let arc=0;
 for(let i=0;i<samples.length;i++){const a=samples[i],b=samples[(i+1)%samples.length],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);segments.push({a,b,dx,dy,length,arc});arc+=length;}
 for(let i=0;i<128;i++)for(let j=i+2;j<128;j++){
  if(i===0&&j===127)continue;
  const a=segments[i],b=segments[j];
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  if(cross(a.a,a.b,b.a)*cross(a.a,a.b,b.b)<0&&cross(b.a,b.b,a.a)*cross(b.a,b.b,a.b)<0)throw Error('Keep the loop from crossing itself.');
 }
 return {points:samples,segments,length:arc,width};
}
export function preset(seed=1){const r=rng(seed);const phase=r()*Math.PI*2,phase2=r()*Math.PI*2;const points=[];for(let i=0;i<40;i++){const a=i/40*Math.PI*2;const radius=1+.15*Math.sin(3*a+phase)+.09*Math.cos(2*a+phase2);points.push({x:360+260*radius*Math.cos(a),y:230+145*radius*Math.sin(a)});}return makeTrack(points);}
export function pointAt(track,arc){arc=((arc%track.length)+track.length)%track.length;let lo=0,hi=127;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(track.segments[mid].arc<=arc)lo=mid;else hi=mid-1;}const s=track.segments[lo],t=(arc-s.arc)/s.length;return{x:s.a.x+s.dx*t,y:s.a.y+s.dy*t,angle:Math.atan2(s.dy,s.dx)};}
export function nearest(track,state){let best=null,bestD=Infinity;for(let i=0;i<128;i++){const s=track.segments[i];const t=clamp(((state.x-s.a.x)*s.dx+(state.y-s.a.y)*s.dy)/(s.length*s.length),0,1);const x=s.a.x+s.dx*t,y=s.a.y+s.dy*t;const d=(state.x-x)**2+(state.y-y)**2;if(d<bestD){bestD=d;best={x,y,arc:s.arc+t*s.length,distance:Math.sqrt(d),offset:((state.y-y)*s.dx-(state.x-x)*s.dy)/s.length,angle:Math.atan2(s.dy,s.dx)};}}return best;}
export function curvatureAt(track,arc){
 const a=pointAt(track,arc-12).angle,b=pointAt(track,arc+12).angle;
 return Math.atan2(Math.sin(b-a),Math.cos(b-a))/24;
}
export function observe(track,state,near=nearest(track,state)){
 const error=state.angle-near.angle;
 return [clamp(near.offset/track.width,-2,2),Math.sin(error),Math.cos(error),state.speed/140,
  ...[15,35,65,100].map(d=>{const p=pointAt(track,near.arc+d);return Math.sin(Math.atan2(p.y-state.y,p.x-state.x)-state.angle);}),
  ...PREVIEW.map(d=>clamp(curvatureAt(track,near.arc+d)/.04,-2,2))];
}
const dragAt=speed=>1+.0009*speed*speed;
export function stepVehicle(state,steer,pedal,dt=DT){
 steer=clamp(steer,-1,1);pedal=clamp(pedal,-1,1);
 const longitudinal=pedal*(pedal>=0?ENGINE_ACCEL:BRAKE_ACCEL);
 const lateral=state.speed*state.speed*steer*MAX_CURVATURE;
 const demand=Math.hypot(longitudinal,lateral),scale=demand>GRIP?GRIP/demand:1;
 const tireAcceleration=longitudinal*scale,lateralAcceleration=lateral*scale;
 const speed=clamp(state.speed+(tireAcceleration-dragAt(state.speed))*dt,0,150);
 const acceleration=(speed-state.speed)/dt;
 const angle=state.angle+lateralAcceleration/Math.max(state.speed,1)*dt;
 return {x:state.x+Math.cos(angle)*speed*dt,y:state.y+Math.sin(angle)*speed*dt,angle,speed,
  steer,pedal,acceleration,lateralAcceleration,grip:Math.hypot(tireAcceleration,lateralAcceleration)/GRIP,requestedGrip:demand/GRIP};
}
export function teacher(track,state){
 const near=nearest(track,state),look=18+state.speed*.25,p=pointAt(track,near.arc+look);
 const distance=Math.hypot(p.x-state.x,p.y-state.y);
 const turn=clamp(2*Math.sin(Math.atan2(p.y-state.y,p.x-state.x)-state.angle)/(Math.max(distance,1)*MAX_CURVATURE),-.95,.95);
 let target=115;
 for(const ahead of PREVIEW){
  const curve=Math.max(.001,Math.abs(curvatureAt(track,near.arc+ahead)));
  const cornerSpeed=Math.sqrt(GRIP*.58/curve);
  target=Math.min(target,Math.sqrt(cornerSpeed*cornerSpeed+2*32*Math.max(0,ahead-18)));
 }
 const desired=(target-state.speed)*1.4+dragAt(state.speed);
 const pedal=clamp(desired/(desired>=0?ENGINE_ACCEL:BRAKE_ACCEL),-.95,.95);
 return [turn,pedal];
}
export function evaluate(track,weights,record=true){
 if(weights.length!==PARAMS||weights.some(v=>!Number.isFinite(v)))throw Error('Invalid driver weights.');
 const initial=pointAt(track,0);let state={x:initial.x,y:initial.y,angle:initial.angle,speed:30,steer:0,pedal:0,acceleration:0,lateralAcceleration:0,grip:0,requestedGrip:0};
 let distance=0,lastArc=0,elapsed=0,crashed=false,completed=false;
 const trace=record?[{...state,t:0}]:[];
 for(let step=0;step<2400;step++){
  const near=nearest(track,state);if(near.distance>track.width-2){crashed=true;break;}
  let delta=near.arc-lastArc;if(delta>track.length/2)delta-=track.length;if(delta<-track.length/2)delta+=track.length;
  if(Math.abs(delta)>15){crashed=true;break;}distance+=delta;lastArc=near.arc;
  if(distance>=track.length-3){completed=true;break;}
  if(distance< -30 || (elapsed>10&&distance<20)){crashed=true;break;}
  const [steer,pedal]=network(weights,observe(track,state,near));
  state=stepVehicle(state,steer,pedal);elapsed+=DT;
  if(record&&step%3===0)trace.push({...state,t:elapsed});
 }
 if(record)trace.push({...state,t:elapsed});
 const fraction=clamp(distance/track.length,0,1);
 const score=completed?1000+(80-elapsed)*5:fraction*700-elapsed*.1;
 return {score,completed,crashed,fraction,time:elapsed,trace};
}
export function mutate(weights,random,sigma=.035){
 const next=weights.slice();for(let i=0;i<next.length;i++){const u=Math.max(1e-10,random()),v=random();next[i]+=Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)*sigma;}return next;
}
export function generation(track,bestWeights,random,count=16){
 const incumbent=evaluate(track,bestWeights,true),attempts=[];
 let best=incumbent,winner=bestWeights,winnerIndex=-1;
 for(let i=0;i<count;i++){
  const candidate=mutate(bestWeights,random,[.012,.025,.05,.1][i%4]);
  const result=evaluate(track,candidate,true);attempts.push(result);
  if(result.score>best.score){best=result;winner=candidate;winnerIndex=i;}
 }
 return {weights:winner,result:best,attempts,incumbent,winnerIndex};
}
export function reshapeTrack(track,index,target){
 if(!Number.isInteger(index)||index<0||index>=track.points.length)throw Error('Choose a point on the track.');
 if(!Number.isFinite(target.x)||!Number.isFinite(target.y))throw Error('Invalid track point.');
 const anchor=track.points[index],dx=clamp(target.x,25,695)-anchor.x,dy=clamp(target.y,25,435)-anchor.y;
 const points=track.points.map((p,i)=>{
  const gap=Math.abs(i-index),distance=Math.min(gap,track.points.length-gap),weight=Math.exp(-.5*(distance/10)**2);
  return {x:clamp(p.x+dx*weight,25,695),y:clamp(p.y+dy*weight,25,435)};
 });
 return makeTrack(points,track.width);
}
