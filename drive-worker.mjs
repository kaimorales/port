import {evaluate,generation,rng} from './drive-core.mjs';
let track,weights,random,round=0;
self.onmessage=({data})=>{
 try{
  if(data.type==='init'){track=data.track;weights=data.weights;random=rng(731);round=0;self.postMessage({type:'ready',result:evaluate(track,weights),weights});}
  if(data.type==='step'){
   const start=performance.now(),next=generation(track,weights,random,16);weights=next.weights;round++;
   self.postMessage({type:'generation',round,result:next.result,attempts:next.attempts,weights:next.weights,winnerIndex:next.winnerIndex,incumbent:next.incumbent,computeMs:performance.now()-start});
  }
 }catch(error){self.postMessage({type:'error',message:error.message});}
};
