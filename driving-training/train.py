import json
from pathlib import Path
import numpy as np
root=Path(__file__).parent
rng=np.random.default_rng(271)
source=json.loads((root/'training-data.json').read_text())
inputs,hidden,outputs=source['architecture']
data=np.array(source['rows'],dtype=np.float32)
x,y=data[:,:inputs],data[:,inputs:]
w1=rng.normal(0,.2,(hidden,inputs)).astype(np.float32);b1=np.zeros(hidden,np.float32)
w2=rng.normal(0,.15,(outputs,hidden)).astype(np.float32);b2=np.zeros(outputs,np.float32)
params=[w1,b1,w2,b2];m=[np.zeros_like(p) for p in params];v=[np.zeros_like(p) for p in params]
t=0
for epoch in range(180):
 idx=rng.permutation(len(x));loss=0
 for begin in range(0,len(x),256):
  a=idx[begin:begin+256];xb,yb=x[a],y[a];h=np.tanh(xb@w1.T+b1);out=np.tanh(h@w2.T+b2)
  err=out-yb;loss+=float(np.sum(err*err));d=2*err/len(a)*(1-out*out)
  dh=(d@w2)*(1-h*h)
  grads=[dh.T@xb,dh.sum(0),d.T@h,d.sum(0)];t+=1
  for p,g,mi,vi in zip(params,grads,m,v):
   mi*=.9;mi+=.1*g;vi*=.999;vi+=.001*g*g
   p-=.0015*(mi/(1-.9**t))/(np.sqrt(vi/(1-.999**t))+1e-8)
 if epoch%30==0:print('epoch',epoch,'mse',round(loss/(len(x)*2),6),flush=True)
weights=np.concatenate([w1.ravel(),b1,w2.ravel(),b2]).astype(float).tolist()
model={'version':2,'physicsVersion':source['physicsVersion'],'architecture':source['architecture'],'method':'Behavioral cloning of a conservative preview-curvature controller with direct pedal labels under combined grip limits','examples':len(x),'trainingTracks':source['tracks'],'dataSeed':source['randomSeed'],'trainingSeed':271,'epochs':180,'optimizer':'Adam','learningRate':.0015,'trainingMSE':round(loss/(len(x)*2),6),'outputs':['steering','signed pedal: negative brake, positive throttle, zero coast'],'weights':weights}
(root.parent/'driving-seed.json').write_text(json.dumps(model,separators=(',',':')))
print('Saved',len(weights),'learned weights. Final training MSE:',round(loss/(len(x)*2),6))
