// The interface is separate from the deterministic, independently tested model.
import('./pit-model.mjs').then(({TIRES,LAPS,simulate,solve,progress,wetness}) => {
  const $=id=>document.getElementById(id);
  const form=$('strategy-form');
  const line=$('race-line');
  const length=line.getTotalLength();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let race,optimal,all,weather,strategy;
  let phase='idle', elapsed=0, frame=0, previousStamp=null;
  let maxTime=0;
  const clock=seconds=>`${Math.floor(seconds/60)}:${(seconds%60).toFixed(1).padStart(4,'0')}`;
  const describe=s=>`${TIRES[s.start].name.toLowerCase()} → ${TIRES[s.finish].name.toLowerCase()}, pit on lap ${s.pit}`;
  function placeCar(id,p,offset) {
    const distance=(p%LAPS%1)*length;
    const point=line.getPointAtLength(distance);
    const ahead=line.getPointAtLength((distance+1)%length);
    const angle=Math.atan2(ahead.y-point.y,ahead.x-point.x);
    $(id).setAttribute('transform',`translate(${point.x-Math.sin(angle)*offset} ${point.y+Math.cos(angle)*offset}) rotate(${angle*180/Math.PI})`);
  }
  function currentTire(run,p) {return TIRES[p>=run.strategy.pit?run.strategy.finish:run.strategy.start].name;}
  function stopped(run,t) {
    const lap=run.laps.find(l=>l.elapsed>t);
    if(!lap?.pit) return false;
    const before=lap.elapsed-lap.time;
    return t>=before+lap.pace*.96 && t<before+lap.pace*.96+20;
  }
  function paint() {
    const yours=progress(race,elapsed),ghost=progress(optimal,elapsed);
    placeCar('your-car',yours, -4);
    placeCar('ghost-car',ghost, 5);
    const yourStop=stopped(race,elapsed),ghostStop=stopped(optimal,elapsed);
    if(yourStop) $('your-car').setAttribute('transform','translate(400 310)');
    if(ghostStop) $('ghost-car').setAttribute('transform','translate(410 316)');
    const lap=Math.min(LAPS,Math.floor(yours)+1);
    $('lap-count').textContent=phase==='idle'?'LAP — / 24':`LAP ${String(lap).padStart(2,'0')} / 24`;
    $('your-time').textContent=phase==='idle'?'—':clock(Math.min(elapsed,race.total));
    const completed=Math.min(23,Math.floor(Math.min(yours,ghost))-1);
    const gap=completed>=0 ? race.laps[completed].elapsed-optimal.laps[completed].elapsed:0;
    $('ghost-time').textContent=phase==='idle'?'—':phase==='finished'?clock(optimal.total):`${gap>=0?'−':'+'}${Math.abs(gap).toFixed(1)}s`;
    $('your-tire').textContent=yourStop?'In the pit box · +20s':`${currentTire(race,yours)}${yours>=24?' · finished':''}`;
    $('ghost-tire').textContent=phase==='idle'?'Revealed when you race':ghostStop?'In the pit box · +20s':`${currentTire(optimal,ghost)}${phase==='finished'?' · finished':' · gap at last shared lap'}`;
    const wet=phase==='idle'?0:wetness(lap,weather.rain);
    $('rain-overlay').setAttribute('opacity',wet*.5);
    $('race-progress').value=String(Math.round(elapsed/maxTime*1000));
    if(phase!=='finished') {
      let message='We have one stop. Make it count.';
      if(phase!=='idle') {
        if(yourStop) message='Box, box. New tires on. Twenty seconds feels like a lifetime.';
        else if(yours>=24) message='Your race is done. Waiting for the other car to cross the line.';
        else if(wet && currentTire(race,yours)!=='Intermediate') message='Rain on the circuit. Those slicks are costing us time.';
        else if(wet) message='Intermediates are working. This is the window we planned for.';
        else if(lap>strategy.pit) message='Stop complete. Bring these tires home.';
        else if(lap===strategy.pit) message='Box this lap. Commit to the call.';
        else if(lap>7 && strategy.start==='soft') message='The softs are fading. How much longer do you stay out?';
        else message=weather.rain?`Track is dry. Rain expected on lap ${weather.rain}.`:'Clear skies. It’s a trade between fresh grip and tire life.';
      }
      $('radio-message').textContent=message;
    }
  }
  function stopAnimation() {cancelAnimationFrame(frame);previousStamp=null;}
  function prepare() {
    stopAnimation();phase='idle';elapsed=0;
    const data=new FormData(form);
    strategy={start:data.get('start'),finish:data.get('finish'),pit:Number($('pit-lap').value)};
    weather={rain:$('weather').value==='rain'?Number($('rain-lap').value):0};
    race=simulate(strategy,weather);
    const solution=solve(weather); optimal=solution.best;all=solution.all;
    maxTime=Math.max(race.total,optimal.total);
    $('pit-value').textContent=String(strategy.pit);
    $('rain-value').textContent=$('rain-lap').value;
    $('rain-control').hidden=!weather.rain;
    $('forecast-end').textContent=weather.rain?'WET FINISH':'DRY FINISH';
    $('weather-strip').replaceChildren(...Array.from({length:LAPS},(_,i)=>{
      const cell=document.createElement('span');
      const wet=wetness(i+1,weather.rain);
      if(wet) cell.style.background=`rgba(104,141,167,${.25+wet*.65})`;
      return cell;
    }));
    $('debrief').hidden=true;$('playback').hidden=true;
    $('race-state').textContent='READY ON THE GRID';
    $('run-race').textContent='Race your strategy →';
    $('run-race').disabled=false;
    paint();
  }
  function landscape() {
    const runs=all.filter(r=>r.strategy.start===strategy.start);
    const fastest=runs[0];
    const slowest=runs[runs.length-1];
    const container=$('landscape');container.replaceChildren();
    $('landscape-caption').textContent=`Starting on ${TIRES[strategy.start].name.toLowerCase()} · 92 possible calls`;
    for(const finish of Object.keys(TIRES)) {
      const label=document.createElement('span');label.className='row-label';label.textContent=TIRES[finish].letter==='I'?'Inter':TIRES[finish].name;container.append(label);
      for(let pit=1;pit<LAPS;pit++) {
        const run=runs.find(r=>r.strategy.finish===finish&&r.strategy.pit===pit);
        const fraction=(run.total-fastest.total)/(slowest.total-fastest.total||1);
        const button=document.createElement('button');button.type='button';
        const rgb=[56,100,80].map((v,i)=>Math.round(v+( [237,241,233][i]-v)*fraction));
        button.style.background=`rgb(${rgb.join(',')})`;
        if(fraction>.45) button.style.color='#304c3a';
        const selected=finish===strategy.finish&&pit===strategy.pit;
        button.dataset.selected=String(selected);
        button.textContent=run===fastest?'★':selected?'○':'';
        const loss=(run.total-optimal.total).toFixed(1);
        button.setAttribute('aria-label',`Race ${TIRES[finish].name} after lap ${pit}, ${loss} seconds from global optimum${selected?', your current call':''}`);
        button.title=`${TIRES[finish].name} after lap ${pit} · +${loss}s`;
        button.addEventListener('click',()=>{
          form.elements.finish.value=finish;$('pit-lap').value=String(pit);
          prepare();start();
        });
        container.append(button);
      }
    }
    container.append(document.createElement('span'));
    for(let i=1;i<LAPS;i++){const label=document.createElement('span');label.className='lap-label';label.textContent=String(i);container.append(label);}
  }
  function finish() {
    stopAnimation();phase='finished';elapsed=maxTime;paint();
    $('race-state').textContent='CHEQUERED FLAG';
    $('pause-race').textContent='Replay';$('finish-race').hidden=true;
    $('run-race').textContent='Race again →';
    const loss=Math.max(0,race.total-optimal.total);
    const rank=all.filter(r=>r.total<race.total-1e-8).length+1;
    const headline=rank===1?'You found the optimal call.':`${loss<.1?'Less than 0.1':loss.toFixed(1)} seconds left on the table.`;
    $('result-heading').textContent=headline;
    $('result-explanation').textContent=`Your call ranked ${rank} of 368. The fastest strategy was ${describe(optimal.strategy)}. ${weather.rain?'The rain rewards being on the right tire at the right moment.':'On a dry track, fresh grip has to earn back the cost of slower, durable tires.'}`;
    $('radio-message').textContent=rank===1?'That’s the one. Now change the weather and see if it holds.':loss<8?'A good call. The last few seconds are in the details.':'There’s time to find. Look at the calls we could have made.';
    $('debrief').hidden=false;
    $('try-best').hidden=rank===1;
    landscape();
    $('announcement').textContent=`Race finished. ${headline} Your call ranked ${rank} of 368.`;
    $('result-heading').focus({preventScroll:true});
    $('debrief').scrollIntoView({block:'start',behavior:reduced.matches?'auto':'smooth'});
  }
  function tick(stamp) {
    if(phase!=='running') return;
    if(previousStamp!==null) elapsed+=Math.min(stamp-previousStamp,100)*maxTime/36000;
    previousStamp=stamp;
    if(elapsed>=maxTime){finish();return;}
    paint();frame=requestAnimationFrame(tick);
  }
  function start() {
    stopAnimation();elapsed=0;phase='running';
    $('debrief').hidden=true;$('playback').hidden=false;$('finish-race').hidden=false;
    $('pause-race').textContent='Pause';$('run-race').textContent='Restart race →';
    $('race-state').textContent='RACE IN PROGRESS';
    $('announcement').textContent=`Race started. ${describe(strategy)}. ${weather.rain?`Rain on lap ${weather.rain}.`:'Dry conditions.'}`;
    if(reduced.matches){finish();return;}
    const view=document.querySelector('.race-view');
    view.focus({preventScroll:true});
    view.scrollIntoView({block:'start',behavior:'smooth'});
    paint();frame=requestAnimationFrame(tick);
  }
  form.addEventListener('submit',e=>{e.preventDefault();start();});
  form.addEventListener('input',prepare);
  $('pause-race').addEventListener('click',()=>{
    if(phase==='finished'){start();return;}
    if(phase==='running'){stopAnimation();phase='paused';$('pause-race').textContent='Resume';$('race-state').textContent='RACE PAUSED';}
    else if(reduced.matches){finish();}
    else {phase='running';$('pause-race').textContent='Pause';$('race-state').textContent='RACE IN PROGRESS';frame=requestAnimationFrame(tick);}
  });
  $('finish-race').addEventListener('click',finish);
  $('race-progress').addEventListener('input',()=>{
    stopAnimation();elapsed=Number($('race-progress').value)/1000*maxTime;
    if(elapsed>=maxTime){finish();return;}
    phase='paused';$('debrief').hidden=true;$('finish-race').hidden=false;
    $('pause-race').textContent='Resume';$('race-state').textContent='REPLAY PAUSED';paint();
  });
  $('try-best').addEventListener('click',()=>{
    const best=optimal.strategy;
    form.elements.start.value=best.start;form.elements.finish.value=best.finish;$('pit-lap').value=String(best.pit);
    prepare();start();
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden && phase==='running') {stopAnimation();phase='paused';$('pause-race').textContent='Resume';$('race-state').textContent='RACE PAUSED';}
  });
  reduced.addEventListener('change',()=>{if(reduced.matches&&phase==='running')finish();});
  prepare();
}).catch(error=>{
  document.getElementById('load-error').hidden=false;
  document.getElementById('run-race').textContent='Race unavailable';
  console.error('Pit wall could not initialize:',error);
});
