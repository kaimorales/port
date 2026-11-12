import {preset,makeTrack,pointAt,nearest,randomWeights,reshapeTrack,INPUTS,HIDDEN,PARAMS,PHYSICS_VERSION} from './drive-core.mjs';
const $=id=>document.getElementById(id), canvas=$('drive-canvas'),ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const colors=['#536e81','#727b82','#61795f','#876f62'];
let track=preset(2),seed=2,model,worker,epoch=0,ready=false,currentWeights;
let initial,best,archive=[],round=0,targetRound=60,training=false,busy=false;
let view=null,frame=0,lastStamp=null,timer,editing=false,originalTrack,drag=null;
let followed=null,hovered=null;
let drawing=false,stroke=[],pointer=null,cursor={x:160,y:120};
const handles=Array.from({length:12},(_,i)=>Math.round(i*128/12));
const metric=r=>r?.completed?`${r.time.toFixed(2)}s`:r?`${(r.fraction*100).toFixed(1)}%`:'—';
function error(text=''){$('school-error').textContent=text;$('school-error').hidden=!text;}
function status(text){$('training-status').textContent=text;progress();}
function note(text){$('learning-note').textContent=text;}
function controls(){
 const edit=editing||drawing;
 for(const id of ['draw-track','reshape-track','new-track','starting-driver','reset-driver'])$(id).disabled=!ready||edit;
 $('practice').disabled=!ready||edit;$('replay').disabled=!ready||edit||!view?.committed||busy;
 $('practice').textContent=training?'pause':'run';
 $('edit-tools').hidden=!editing;$('draw-cancel').hidden=!drawing;$('handles').hidden=!editing;
 $('draw-instruction').hidden=!drawing;canvas.classList.toggle('drawing',drawing);
 canvas.classList.toggle('reshaping',editing);
 $('reshape-help').hidden=!editing;
 $('follow-driver').disabled=edit||!best;
 for(const option of $('follow-driver').options)if(option.value!==''&&option.value!=='best')option.disabled=!view;document.querySelector('.quiet-controls').hidden=edit;
}
function fitCanvas(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.width*460/720*dpr);ctx.setTransform(canvas.width/720,0,0,canvas.height/460,0,0);draw();}
new ResizeObserver(fitCanvas).observe(canvas);
function path(points,close=false){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(close)ctx.closePath();}
function pose(run,time){
 if(!run?.trace.length)return null;const points=run.trace;if(time>=run.time)return points.at(-1);
 let lo=0,hi=points.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(points[m].t<=time)lo=m;else hi=m;}
 const a=points[lo],b=points[hi],t=Math.max(0,Math.min(1,(time-a.t)/(b.t-a.t||1)));
 const da=Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle));
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:a.angle+da*t,speed:a.speed+(b.speed-a.speed)*t};
}
function trace(run,color,width,time=Infinity){
 if(!run?.trace.length)return;ctx.save();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();
 const points=run.trace;ctx.moveTo(points[0].x,points[0].y);
 for(const p of points){if(p.t>time)break;ctx.lineTo(p.x,p.y);}
 const p=pose(run,time);if(p)ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();
}
// Colors encode the recorded pedal command, never inferred from track shape.
function controlTrace(run,time){
 if(!run?.trace.length)return;
 ctx.save();ctx.lineWidth=2;ctx.lineCap='round';
 for(let i=1;i<run.trace.length;i++){
  const a=run.trace[i-1],b=run.trace[i];if(a.t>=time)break;
  const end=b.t>time?pose(run,time):b;
  ctx.strokeStyle=b.pedal<-.08?'#ad7962':b.pedal>.08?'#386450':'#8b9397';
  path([a,end]);ctx.stroke();if(b.t>=time)break;
 }
 ctx.restore();
}
function inspectedRun(){
 if(editing||drawing)return null;
 const focus=followed??hovered;
 if(focus==='best')return view?(view.done?view.data.result:view.data.incumbent):best;
 return focus===null?null:view?.data.attempts[focus];
}
function telemetryAt(run,time){
 let p=run.trace[0];for(const sample of run.trace){if(sample.t>time)break;p=sample;}return p;
}
function car(p,color,champion=false){
 if(!p)return;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);
 const size=Math.max(1.12,480/Math.max(1,canvas.clientWidth));ctx.scale(size,size);
 if(champion){ctx.beginPath();ctx.arc(0,0,8,0,Math.PI*2);ctx.strokeStyle='rgba(56,100,80,.25)';ctx.lineWidth=1;ctx.stroke();}
 ctx.fillStyle=color;ctx.strokeStyle='white';ctx.lineWidth=.8;ctx.beginPath();ctx.roundRect(-6,-3.2,12,6.4,1.5);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.fillRect(1,-1.7,2.5,3.4);ctx.restore();
}
function cross(p){ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#b77e68';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(-3,-3);ctx.lineTo(3,3);ctx.moveTo(3,-3);ctx.lineTo(-3,3);ctx.stroke();ctx.restore();}
function road(){
 path(track.points,true);ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle='#cdd5cb';ctx.lineWidth=track.width*2+2;ctx.stroke();ctx.strokeStyle='#fafbf8';ctx.lineWidth=track.width*2;ctx.stroke();
 const p=pointAt(track,0);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.strokeStyle='#c1cac1';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-track.width);ctx.lineTo(0,track.width);ctx.stroke();ctx.restore();
}

function draw(){
 if(!ctx)return;ctx.clearRect(0,0,720,460);
 if(drawing){
  ctx.fillStyle='#dfe4dc';for(let x=30;x<720;x+=30)for(let y=30;y<460;y+=30)ctx.fillRect(x,y,1,1);
  if(stroke.length){path(stroke);ctx.strokeStyle='#a5b5a0';ctx.lineWidth=track.width*2;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();}
  ctx.beginPath();ctx.arc(cursor.x,cursor.y,5,0,Math.PI*2);ctx.fillStyle='#386450';ctx.fill();return;
 }
 road();if(editing)return;
 for(const run of archive)trace(run,'rgba(56,100,80,.07)',.6);
 if(view){
  const time=view.time,done=view.done,d=view.data;
  ctx.save();if(done)ctx.globalAlpha=.18;
  d.attempts.forEach(run=>trace(run,'rgba(90,114,130,.36)',.9,time));
  trace(d.incumbent,'rgba(56,100,80,.4)',1.2,time);
  d.attempts.forEach((run,i)=>{
   if(time>=run.time){if(run.crashed)cross(run.trace.at(-1));else if(run.completed)car(pose(run,time),colors[i%4]);}
   else car(pose(run,time),colors[i%4]);
  });
  car(pose(d.incumbent,time),'#386450',!done);ctx.restore();
  // Reveal the actual selected policy only after the whole generation finishes.
  if(done){trace(d.result,'#386450',2.2);car(pose(d.result,time),'#386450',true);}
  if($('show-sight').checked){const p=pose(d.incumbent,time),n=nearest(track,p);ctx.strokeStyle='rgba(56,100,80,.35)';ctx.lineWidth=.8;for(const ahead of[15,35,65,100]){const q=pointAt(track,n.arc+ahead);path([p,q]);ctx.stroke();}}
 }else if(best){car(pose(best,0),'#386450',true);}
 const inspected=inspectedRun(),inspectTime=view?view.time:Infinity;
 if(inspected){controlTrace(inspected,inspectTime);if(inspectTime<inspected.time||inspected.completed)car(pose(inspected,inspectTime),'#386450',true);}

}
function stats(){
 $('first-result').textContent=metric(initial);$('best-result').textContent=metric(best);const timed=initial?.completed&&best?.completed;
 $('gain-label').textContent=timed?'Time found':'Progress gained';$('gain-result').textContent=timed?`${Math.max(0,initial.time-best.time).toFixed(2)}s`:initial&&best?`+${Math.max(0,(best.fraction-initial.fraction)*100).toFixed(1)}%`:'—';
 progress();
}
function progress(){
 const gen=round+(view&&!view.committed?1:0);
 let tail=best?(best.completed?`best lap ${best.time.toFixed(2)}s`:`best attempt ${(best.fraction*100).toFixed(0)}%`):'preparing';
 const phase=$('training-status').textContent;
 if(editing)tail='reshaping';else if(drawing)tail='drawing';
 else if(phase==='SELECTION')tail+=view?.data.winnerIndex<0?' · survivor retained':` · driver ${view.data.winnerIndex+1} selected`;
 else if(phase==='SWARM PAUSED')tail+=' · paused';
 $('progress-line').textContent=`generation ${gen} · ${tail}`;
}
function updateFollow(){
 const focus=followed??hovered,run=inspectedRun(),time=view?view.time:Infinity;
 $('follow-note').hidden=!run;$('control-legend').hidden=!run;
 if(run){const ended=time>=run.time,p=telemetryAt(run,time),action=p.pedal<-.08?'braking':p.pedal>.08?'accelerating':'coasting';
  const name=focus==='best'?'best driver':`driver ${String(focus+1).padStart(2,'0')}`;
  $('follow-note').textContent=`${name} · ${ended?(run.completed?metric(run):run.crashed?'out':'timed out'):action}${followed!==null?' · click empty space to release':''}`;
 }
}
function stopFrames(){cancelAnimationFrame(frame);lastStamp=null;}
function pause(){training=false;clearTimeout(timer);stopFrames();if(ready)status('SWARM PAUSED');controls();}
function nextRound(){
 if(!training||busy||!ready||editing||drawing)return;
 busy=true;controls();status('PREPARING THE NEXT GENERATION');worker.postMessage({type:'step'});
}
function finishRound(){
 if(!view)return;view.done=true;
 if(!view.committed){
  view.committed=true;round++;best=view.data.result;currentWeights=view.data.weights.slice();archive.push(best);archive=archive.slice(-6);
  const finished=view.data.attempts.filter(a=>a.completed).length,crashed=view.data.attempts.filter(a=>a.crashed).length;
  note(`${finished} finished, ${crashed} went out. ${view.data.winnerIndex<0?'The existing driver keeps its place.':`Driver ${String(view.data.winnerIndex+1).padStart(2,'0')} becomes the parent of the next generation.`}`);
 }
 stats();updateFollow();draw();controls();status('SELECTION');
 if(round>=targetRound){training=false;status('PRACTICE COMPLETE');controls();}
 if(training)timer=setTimeout(nextRound,1800);
}
function tick(stamp){
 if(!view||view.done)return;
 if(lastStamp!==null)view.time+=Math.min(100,stamp-lastStamp)/1000*Number($('play-speed').value);lastStamp=stamp;
 const end=Math.max(view.data.incumbent.time,...view.data.attempts.map(a=>a.time));
 if(view.time>=end){view.time=end;finishRound();return;}
 draw();updateFollow();frame=requestAnimationFrame(tick);
}
function animate(){stopFrames();if(reduced.matches){view.time=Infinity;finishRound();}else frame=requestAnimationFrame(tick);}
function boot(weights,{keepSession=false,message='The starter knows the basics. Watch its variations find their own way.'}={}){
 pause();worker?.terminate();const token=++epoch;ready=false;busy=false;view=null;followed=null;hovered=null;$('follow-driver').value='';error();
 if(!keepSession){round=0;initial=null;best=null;archive=[];}
 controls();stats();updateFollow();draw();status('PREPARING DRIVER');
 currentWeights=weights.slice();worker=new Worker(new URL('./drive-worker.mjs',import.meta.url),{type:'module'});
 worker.onerror=()=>{if(token!==epoch)return;pause();ready=false;controls();error('The training worker could not start. Refresh to try again.');};
 worker.onmessage=({data})=>{
  if(token!==epoch)return;
  if(data.type==='error'){pause();busy=false;error(data.message);return;}
  if(data.type==='ready'){
   ready=true;if(!keepSession){initial=data.result;best=data.result;}
   currentWeights=data.weights.slice();controls();stats();draw();status('READY TO EVOLVE');note(message);
  }
  if(data.type==='generation'){
   stopFrames();busy=false;view={data,time:0,done:false,committed:false};stats();updateFollow();draw();controls();
   if(training){status('A GENERATION ON THE ROAD');animate();}else status('SWARM PAUSED');
  }
 };
 worker.postMessage({type:'init',track,weights:currentWeights});
}
function starter(){return $('starting-driver').value==='random'?randomWeights(91):model.weights;}
$('practice').addEventListener('click',()=>{
 if(training){pause();note(view&&!view.done?'Paused exactly here. Resume to finish this generation.':'Paused between generations. The selected driver is kept.');return;}
 training=true;targetRound=round+60;controls();
 if(view&&!view.done){status('A GENERATION ON THE ROAD');animate();}else nextRound();
});
$('replay').addEventListener('click',()=>{if(!view)return;pause();if(!view.committed){status('SWARM PAUSED');note('Resume the swarm to finish this generation.');return;}view.time=0;view.done=false;status('REPLAYING THE LAST GENERATION');animate();});
$('show-sight').addEventListener('change',draw);
$('starting-driver').addEventListener('change',()=>{$('baseline-label').textContent='First attempt';boot(starter());});
$('reset-driver').addEventListener('click',()=>{$('baseline-label').textContent='First attempt';boot(starter());});
$('new-track').addEventListener('click',()=>{track=preset(++seed);$('baseline-label').textContent='First attempt';boot(starter());});
function suspendForEdit(){$('options').open=false;followed=null;hovered=null;pause();worker?.terminate();epoch++;busy=false;view=null;updateFollow();stopFrames();originalTrack=track;}
function positionHandles(){handles.forEach((index,i)=>{const p=track.points[index],b=$('handle-'+i);b.style.left=`${p.x/720*100}%`;b.style.top=`${p.y/460*100}%`;b.setAttribute('aria-label',`Track point ${i+1}. Use arrow keys to reshape.`);});}
function moveHandle(base,index,target){try{track=reshapeTrack(base,index,target);error();positionHandles();draw();return true;}catch(e){error(e.message);return false;}}
$('reshape-track').addEventListener('click',()=>{suspendForEdit();editing=true;controls();positionHandles();draw();status('RESHAPE THE CIRCUIT');note('Move a point to change a corner. Your learned driver will keep its weights.');$('handle-0').focus({preventScroll:true});});
$('apply-shape').addEventListener('click',()=>{editing=false;drag=null;controls();$('baseline-label').textContent='Before adapting';boot(currentWeights,{message:'Same learned driver, changed circuit. Release the swarm to see how it adapts.'});});
$('cancel-shape').addEventListener('click',()=>{track=originalTrack;editing=false;drag=null;controls();boot(currentWeights,{keepSession:true,message:'Original circuit restored. The learned driver is unchanged.'});});
function location(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*720,y:(e.clientY-r.top)/r.height*460};}
handles.forEach((index,i)=>{
 const b=document.createElement('button');b.type='button';b.id='handle-'+i;b.className='track-handle';b.textContent='';$('handles').append(b);
 b.addEventListener('pointerdown',e=>{if(!editing||drag)return;e.preventDefault();b.focus({preventScroll:true});drag={id:e.pointerId,base:track,index,button:b};b.setPointerCapture(e.pointerId);});
 b.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId||drag.button!==b)return;moveHandle(drag.base,drag.index,location(e));});
 const end=e=>{if(drag?.id!==e.pointerId||drag.button!==b)return;if(e.type==='pointercancel'){track=drag.base;positionHandles();draw();}drag=null;if(b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId);};
 b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);
 b.addEventListener('keydown',e=>{if(!editing)return;if(e.key==='Escape'){e.preventDefault();$('cancel-shape').click();return;}const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];if(!d)return;e.preventDefault();const p=track.points[index],step=e.shiftKey?15:5;moveHandle(track,index,{x:p.x+d[0]*step,y:p.y+d[1]*step});});
});
for(let i=0;i<16;i++){const option=document.createElement('option');option.value=String(i);option.textContent=`Driver ${String(i+1).padStart(2,'0')}`;$('follow-driver').append(option);}
$('follow-driver').addEventListener('change',()=>{followed=$('follow-driver').value===''?null:$('follow-driver').value==='best'?'best':Number($('follow-driver').value);hovered=null;draw();updateFollow();});
function hitDriver(e){
 if(!best||editing||drawing)return null;const p=location(e),radius=16*720/canvas.clientWidth;let index=null,distance=radius;
 const runs=view?view.data.attempts:[],time=view?view.time:0;
 const consider=(run,i)=>{const q=pose(run,time);if(!q)return;const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<=distance){distance=d;index=i;}};
 runs.forEach(consider);consider(view?(view.done?view.data.result:view.data.incumbent):best,'best');return index;
}
canvas.addEventListener('pointermove',e=>{if(drawing||editing||e.pointerType==='touch')return;hovered=hitDriver(e);canvas.classList.toggle('followable',hovered!==null);draw();updateFollow();});
canvas.addEventListener('pointerleave',()=>{hovered=null;canvas.classList.remove('followable');draw();updateFollow();});
canvas.addEventListener('click',e=>{if(drawing||editing)return;const hit=hitDriver(e);followed=hit===followed?null:hit;$('follow-driver').value=followed===null?'':String(followed);draw();updateFollow();});
canvas.addEventListener('keydown',e=>{if(!drawing&&!editing&&e.key==='Escape'){followed=null;hovered=null;$('follow-driver').value='';draw();updateFollow();}});

function drawingMode(on){drawing=on;stroke=[];pointer=null;cursor={x:160,y:120};controls();draw();if(on)canvas.focus({preventScroll:true});}
$('draw-track').addEventListener('click',()=>{suspendForEdit();error();drawingMode(true);status('DRAW A CIRCUIT');});
function cancelDrawing(){track=originalTrack;drawingMode(false);boot(currentWeights,{keepSession:true,message:'Drawing cancelled. Your driver and circuit are unchanged.'});}
$('draw-cancel').addEventListener('click',cancelDrawing);
canvas.addEventListener('pointerdown',e=>{if(!drawing||pointer!==null)return;e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);stroke=[location(e)];draw();});
canvas.addEventListener('pointermove',e=>{if(!drawing||pointer!==e.pointerId)return;const p=location(e),last=stroke.at(-1);if(Math.hypot(p.x-last.x,p.y-last.y)>4){stroke.push(p);if(stroke.length>600)stroke=stroke.filter((_,i)=>i%2===0);draw();}});
function finishDrawing(){try{if(stroke.length<12)throw Error('Draw a full loop with a little room to drive.');const a=stroke[0],b=stroke.at(-1);if(Math.hypot(a.x-b.x,a.y-b.y)>80)throw Error('Finish the loop closer to where you started.');track=makeTrack(stroke);drawingMode(false);$('baseline-label').textContent='First attempt';boot(starter());}catch(e){error(e.message);stroke=[];draw();}}
canvas.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;pointer=null;canvas.releasePointerCapture(e.pointerId);finishDrawing();});
canvas.addEventListener('pointercancel',()=>{pointer=null;stroke=[];draw();});
canvas.addEventListener('keydown',e=>{if(!drawing)return;if(e.key==='Escape'){e.preventDefault();cancelDrawing();return;}if(e.key==='Enter'){e.preventDefault();finishDrawing();return;}const d={ArrowUp:[0,-12],ArrowDown:[0,12],ArrowLeft:[-12,0],ArrowRight:[12,0]}[e.key];if(!d)return;e.preventDefault();if(!stroke.length)stroke=[{...cursor}];cursor={x:Math.max(25,Math.min(695,cursor.x+d[0])),y:Math.max(25,Math.min(435,cursor.y+d[1]))};stroke.push({...cursor});draw();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
reduced.addEventListener('change',()=>{pause();if(view&&!view.done&&reduced.matches){view.time=Infinity;finishRound();}});
fetch('driving-seed.json').then(r=>{if(!r.ok)throw Error('The pretrained driver could not load.');return r.json();}).then(data=>{if(data.physicsVersion!==PHYSICS_VERSION||data.architecture?.[0]!==INPUTS||data.architecture?.[1]!==HIDDEN||data.architecture?.[2]!==2||!Array.isArray(data.weights)||data.weights.length!==PARAMS||data.weights.some(v=>!Number.isFinite(v)))throw Error('The driver model is out of date. Refresh to load the latest version.');model=data;boot(starter());}).catch(e=>error(e.message));

// Keep the secondary controls easy to dismiss without adding more buttons.
document.addEventListener('pointerdown',e=>{const options=$('options');if(options.open&&!options.contains(e.target))options.open=false;});
$('options').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();$('options').open=false;$('options').querySelector('summary').focus();}});
