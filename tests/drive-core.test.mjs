import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as core from '../drive-core.mjs';
import {preset,makeTrack,pointAt,network,PARAMS,randomWeights,evaluate,generation,rng} from '../drive-core.mjs';
test('track geometry wraps and rejects invalid input',()=>{
 const t=preset(2);const p=pointAt(t,0),q=pointAt(t,t.length);
 assert.deepEqual(p,q);assert.ok(t.length>280);
 assert.throws(()=>makeTrack([{x:0,y:0}]));
 assert.throws(()=>makeTrack([{x:0,y:0},{x:300,y:0},{x:150,y:0},{x:50,y:0}]));
 assert.throws(()=>makeTrack([{x:80,y:80},{x:500,y:350},{x:80,y:350},{x:500,y:80}]));
});
test('the learned policy is driven by weights and inputs',()=>{
 assert.deepEqual(network(Array(PARAMS).fill(0),Array(core.INPUTS).fill(0)),[0,0]);
 const inputs=Array.from({length:core.INPUTS},(_,i)=>i===2?1:.1);
 const a=network(randomWeights(1),inputs);
 const b=network(randomWeights(2),inputs);
 assert.notDeepEqual(a,b);assert.ok(a.every(v=>v>=-1&&v<=1));
});
test('a car that never steers leaves a curved track',()=>{
 const result=evaluate(preset(5),Array(PARAMS).fill(0));
 assert.equal(result.completed,false);assert.equal(result.crashed,true);
 assert.ok(result.fraction<.5);
});
test('pretrained driver completes at least eight of ten held-out circuits',()=>{
 const model=JSON.parse(readFileSync(new URL('../driving-seed.json',import.meta.url)));
 assert.equal(model.weights.length,PARAMS);assert.equal(model.physicsVersion,core.PHYSICS_VERSION);
 assert.deepEqual(model.architecture,[core.INPUTS,core.HIDDEN,2]);
 const results=Array.from({length:10},(_,i)=>evaluate(preset(1001+i),model.weights,false));
 assert.ok(results.filter(r=>r.completed).length>=8,JSON.stringify(results));
});
test('evolution preserves the incumbent and is deterministic for a fixed seed',()=>{
 const t=preset(6),w=randomWeights(3),before=evaluate(t,w,false);
 const a=generation(t,w,rng(123),4),b=generation(t,w,rng(123),4);
 assert.ok(a.result.score>=before.score);assert.deepEqual(a.weights,b.weights);
});

test('a generation exposes every actual attempt and its selected survivor',()=>{
 const model=JSON.parse(readFileSync(new URL('../driving-seed.json',import.meta.url)));
 const track=preset(2),weights=model.weights.slice(),original=weights.slice();
 const next=generation(track,weights,rng(731),16);
 assert.equal(next.attempts.length,16);
 assert.ok(next.attempts.every(run=>run.trace.length>1&&run.trace[0].t===0&&run.trace.at(-1).t===run.time));
 assert.deepEqual(next.incumbent,evaluate(track,weights));
 const scores=[next.incumbent,...next.attempts].map(run=>run.score);
 assert.equal(next.result.score,Math.max(...scores));
 assert.deepEqual(next.result,next.winnerIndex===-1?next.incumbent:next.attempts[next.winnerIndex]);
 assert.deepEqual(evaluate(track,next.weights),next.result);
 assert.deepEqual(weights,original);
});
test('a generation identifies a retained incumbent when no mutations are evaluated',()=>{
 const weights=randomWeights(21),next=generation(preset(4),weights,rng(3),0);
 assert.equal(next.winnerIndex,-1);
 assert.deepEqual(next.weights,weights);
 assert.deepEqual(next.result,next.incumbent);
});
test('reshaping displaces a local road section without mutating the original',()=>{
 assert.equal(typeof core.reshapeTrack,'function');
 const track=preset(2),original=structuredClone(track),anchor=track.points[32];
 const reshaped=core.reshapeTrack(track,32,{x:anchor.x,y:anchor.y-45});
 assert.deepEqual(track,original);
 assert.ok(Math.abs(reshaped.length-track.length)>1);
 assert.ok(core.nearest(reshaped,{x:anchor.x,y:anchor.y-45}).distance<5);
 assert.ok(core.nearest(reshaped,track.points[96]).distance<2);
 assert.ok(reshaped.points.every(p=>p.x>=25&&p.x<=695&&p.y>=25&&p.y<=435));
 const weights=randomWeights(33),snapshot=weights.slice();
 const result=evaluate(reshaped,weights);
 assert.ok(Number.isFinite(result.score));
 assert.deepEqual(weights,snapshot);
 assert.throws(()=>core.reshapeTrack(track,32,{x:NaN,y:20}));
});

test('signed pedal gives braking, coasting, and acceleration without mutating input',()=>{
 assert.equal(typeof core.stepVehicle,'function');
 const state={x:0,y:0,angle:0,speed:70},before={...state};
 const brake=core.stepVehicle(state,0,-1),coast=core.stepVehicle(state,0,0),gas=core.stepVehicle(state,0,1);
 assert.ok(brake.acceleration<coast.acceleration&&coast.acceleration<gas.acceleration);
 assert.ok(brake.speed<coast.speed&&coast.speed<gas.speed);
 assert.ok(brake.acceleration< -30&&gas.acceleration>0);
 assert.deepEqual(state,before);
});
test('combined grip bounds cornering and speed produces understeer',()=>{
 assert.equal(typeof core.stepVehicle,'function');
 const low=core.stepVehicle({x:0,y:0,angle:0,speed:25},.7,0);
 const fast=core.stepVehicle({x:0,y:0,angle:0,speed:120},.7,0);
 const braking=core.stepVehicle({x:0,y:0,angle:0,speed:120},.7,-1);
 assert.ok(fast.requestedGrip>1);
 assert.ok(fast.grip<=1+1e-10&&braking.grip<=1+1e-10);
 const lowCurvature=low.angle/(25*core.DT),fastCurvature=fast.angle/(120*core.DT);
 assert.ok(fastCurvature<lowCurvature*.5);
 assert.ok(Math.abs(braking.lateralAcceleration)<Math.abs(fast.lateralAcceleration));
 const tireAcceleration=braking.acceleration+1+.0009*120*120;
 assert.ok(Math.hypot(tireAcceleration,braking.lateralAcceleration)<=core.GRIP+1e-9);
});
test('observations include enough preview for braking and traces contain finite telemetry',()=>{
 assert.equal(core.INPUTS,14);assert.equal(core.HIDDEN,24);assert.equal(core.PARAMS,410);
 const track=preset(2),p=pointAt(track,0),inputs=core.observe(track,{...p,speed:80});
 assert.equal(inputs.length,core.INPUTS);assert.ok(inputs.every(Number.isFinite));
 const weights=randomWeights(71),before=weights.slice(),a=evaluate(track,weights),b=evaluate(track,weights);
 assert.deepEqual(a,b);assert.deepEqual(weights,before);
 for(const sample of a.trace){
  for(const key of ['x','y','angle','speed','t','pedal','steer','acceleration','lateralAcceleration','grip','requestedGrip'])assert.ok(Number.isFinite(sample[key]),key);
  assert.ok(sample.grip<=1+1e-10);
 }
});

test('the pretrained direct-pedal policy actually brakes and accelerates on a held-out circuit',()=>{
 const model=JSON.parse(readFileSync(new URL('../driving-seed.json',import.meta.url)));
 const run=evaluate(preset(1001),model.weights);
 assert.ok(run.completed);
 assert.ok(run.trace.some(sample=>sample.pedal<-.1&&sample.acceleration<0));
 assert.ok(run.trace.some(sample=>sample.pedal>.1&&sample.acceleration>0));
});
