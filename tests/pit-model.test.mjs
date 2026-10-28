import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../pit-model.mjs';

test('one stop costs exactly 20 seconds and every lap contributes to elapsed time', () => {
  assert.equal(typeof model.simulate, 'function');
  const run = model.simulate({pit:12,start:'medium',finish:'hard'},{rain:0});
  assert.equal(run.laps.length,24);
  assert.equal(run.laps.filter(l=>l.pit).length,1);
  assert.equal(run.laps[11].pit,true);
  assert.equal(run.total,run.laps.reduce((sum,l)=>sum+l.time,0));
  assert.equal(run.laps[11].time-run.laps[11].pace,20);
  assert.equal(run.laps[12].age,0);
});
test('solver finds a global minimum over all 368 allowed one-stop strategies', () => {
  assert.equal(typeof model.solve,'function');
  for (const rain of [0,7,17,23]) {
    const options={rain};
    const solved=model.solve(options);
    assert.equal(solved.all.length,368);
    for(const run of solved.all) assert.ok(run.total>=solved.best.total-1e-8);
    assert.equal(model.simulate(solved.best.strategy,options).total,solved.best.total);
  }
});
test('rain changes optimal tire choice and the solver responds to conditions',()=>{
  assert.equal(typeof model.solve,'function');
  const dry=model.solve({rain:0}).best;
  const wet=model.solve({rain:12}).best;
  assert.notEqual(dry.strategy.finish,'inter');
  assert.equal(wet.strategy.finish,'inter');
  assert.ok(model.simulate(dry.strategy,{rain:12}).total>wet.total);
});
test('playback progress is monotone and stops at the finish line',()=>{
  assert.equal(typeof model.progress,'function');
  const run=model.simulate({pit:9,start:'soft',finish:'medium'},{rain:0});
  assert.equal(model.progress(run,0),0);
  assert.equal(model.progress(run,run.total+100),24);
  let previous=0;
  for(let t=0;t<=run.total;t+=7){const next=model.progress(run,t);assert.ok(next>=previous);previous=next;}
  const entry=run.laps.slice(0,8).reduce((s,l)=>s+l.time,0)+run.laps[8].pace;
  assert.ok(Math.abs(model.progress(run,entry+10)-8.96)<1e-8);
});
test('invalid laps, tires and weather are rejected',()=>{
  assert.equal(typeof model.simulate,'function');
  for(const pit of [0,24,2.5,NaN]) assert.throws(()=>model.simulate({pit,start:'soft',finish:'hard'},{rain:0}));
  assert.throws(()=>model.simulate({pit:12,start:'unknown',finish:'hard'},{rain:0}));
  assert.throws(()=>model.solve({rain:25}));
});
