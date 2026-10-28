import {readFileSync,writeFileSync} from 'node:fs';
import {preset,evaluate,nearest,generation,rng,PHYSICS_VERSION} from '../drive-core.mjs';
const model=JSON.parse(readFileSync(new URL('../driving-seed.json',import.meta.url)));
const measure=(track,run)=>{
 let seconds=0,braking=0,accelerating=0,coasting=0;
 for(let i=1;i<run.trace.length;i++){
  const sample=run.trace[i],dt=sample.t-run.trace[i-1].t;seconds+=dt;
  if(sample.pedal<-.05)braking+=dt;else if(sample.pedal>.05)accelerating+=dt;else coasting+=dt;
 }
 const round=n=>Number(n.toFixed(4));
 return {completed:run.completed,lapSeconds:round(run.time),brakingSeconds:round(braking),brakingFraction:round(braking/seconds),acceleratingFraction:round(accelerating/seconds),coastingFraction:round(coasting/seconds),minimumPedal:round(Math.min(...run.trace.map(s=>s.pedal))),maxCenterOffset:round(Math.max(...run.trace.map(s=>nearest(track,s).distance))),maxGripUtilization:round(Math.max(...run.trace.map(s=>s.grip)))};
};
const rows=[];
for(const seed of [2,11,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010]){
 const track=preset(seed),initial=evaluate(track,model.weights);let weights=model.weights,best=initial;
 const generations=[2,11,1001,1002,1003].includes(seed)?40:0,random=rng(731),start=performance.now();
 for(let i=0;i<generations;i++){const next=generation(track,weights,random);weights=next.weights;best=next.result;}
 rows.push({seed,generations,computeMilliseconds:Math.round(performance.now()-start),before:measure(track,initial),after:measure(track,best)});
}
const report={physicsVersion:PHYSICS_VERSION,modelVersion:model.version,architecture:model.architecture,trainingExamples:model.examples,evolutionSeed:731,candidatesPerGeneration:16,brakingThreshold:-.05,telemetrySampleSeconds:.1,notes:'Deterministic toy-physics rollouts. Braking fractions use durations between stored samples, not exact event boundaries. Center offset is distance from road center, not an ideal racing-line score. Seeds1001–1010 are excluded from training; same procedural track family. Compute timing depends on device.',rows};
writeFileSync(new URL('evaluation-grip-v2.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
