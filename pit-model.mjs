// A deterministic teaching model, not telemetry or a real-world racing forecast.
export const LAPS = 24;
export const PIT_LOSS = 20;
export const TIRES = {
  soft: { name: 'Soft', letter: 'S', offset: -1.8, wear: .052 },
  medium: { name: 'Medium', letter: 'M', offset: 0, wear: .027 },
  hard: { name: 'Hard', letter: 'H', offset: 1.1, wear: .014 },
  inter: { name: 'Intermediate', letter: 'I', offset: 6, wear: .025 },
};
function validateWeather({rain}) {
  if (!Number.isInteger(rain) || rain < 0 || rain > LAPS) throw new RangeError('Rain must be 0 (dry) or a lap from 1 to 24.');
}
export function wetness(lap, rain) {
  return rain && lap >= rain ? Math.min(1, (lap-rain+1)/3) : 0;
}
export function simulate(strategy, weather) {
  validateWeather(weather);
  const {pit,start,finish}=strategy;
  if (!Number.isInteger(pit) || pit<1 || pit>=LAPS || !Object.hasOwn(TIRES,start) || !Object.hasOwn(TIRES,finish)) throw new RangeError('Choose two tires and a pit lap from 1 to 23.');
  let elapsed=0;
  const laps=[];
  for(let lap=1;lap<=LAPS;lap++) {
    const compound=lap<=pit ? start : finish;
    const age=lap<=pit ? lap-1 : lap-pit-1;
    const tire=TIRES[compound];
    const wet=wetness(lap,weather.rain);
    const weatherCost=compound==='inter' ? -4*wet : 17*wet;
    const degradation=tire.wear*age*age*(compound==='inter' ? 1-.65*wet : 1);
    const pace=76+tire.offset+degradation+weatherCost-.06*(lap-1);
    const time=pace+(lap===pit ? PIT_LOSS : 0);
    elapsed+=time;
    laps.push({lap,compound,age,pace,time,pit:lap===pit,elapsed});
  }
  return {strategy:{...strategy},laps,total:elapsed};
}
export function solve(weather) {
  validateWeather(weather);
  const all=[];
  for(const start of Object.keys(TIRES)) for(const finish of Object.keys(TIRES)) for(let pit=1;pit<LAPS;pit++) all.push(simulate({start,finish,pit},weather));
  all.sort((a,b)=>a.total-b.total);
  return {best:all[0],all};
}
export function progress(run,time) {
  if(time<=0) return 0;
  let previous=0;
  for(const lap of run.laps) {
    if(time<lap.elapsed) {
      const local=time-previous;
      // Stop at the pit box near the end of the lap, then rejoin the straight.
      if(lap.pit) {
        const entry=lap.pace*.96;
        if(local<entry) return lap.lap-1+local/lap.pace;
        if(local<entry+PIT_LOSS) return lap.lap-1+.96;
        return lap.lap-1+(local-PIT_LOSS)/lap.pace;
      }
      return lap.lap-1+local/lap.pace;
    }
    previous=lap.elapsed;
  }
  return LAPS;
}
