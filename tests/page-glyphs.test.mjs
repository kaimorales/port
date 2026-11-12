import test from 'node:test';
import assert from 'node:assert/strict';
import { pageGlyphs } from '../assets/tree/page-glyphs.mjs';

// Closed <details> descendants can keep layout bounds despite not being painted.
// Record the renderer's drawing calls with those same bounds, without a canvas dependency.
async function snapshotDisclosure(open) {
  const painted = [];
  const saved = Object.fromEntries(['document','NodeFilter','getComputedStyle'].map(key => [key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  const details = {open,parentElement:null,querySelector:()=>summary};
  const summary = {contains:element=>element===summary,closest:selector=>selector==='details:not([open])'&&!open?details:null};
  const paragraph = {closest:selector=>selector==='details:not([open])'&&!open?details:null};
  const nodes = [{textContent:'Visible',parentElement:summary},{textContent:'Secret',parentElement:paragraph}];
  let current, offset;
  const context = {
    measureText:()=>({fontBoundingBoxAscent:8,fontBoundingBoxDescent:2}),
    fillText:char=>painted.push(char),
    getImageData:()=>({data:new Uint8ClampedArray(40*40*4)}),
  };
  try {
    globalThis.NodeFilter = {SHOW_TEXT:4};
    globalThis.getComputedStyle = ()=>({visibility:'visible',display:'block',fontStyle:'normal',fontWeight:'400',fontSize:'10px',fontFamily:'Georgia',color:'#30332f'});
    globalThis.document = {
      createElement:()=>({getContext:()=>context}),
      createTreeWalker:()=>({nextNode:()=>nodes.shift()||null}),
      createRange:()=>({setStart:(node,index)=>{current=node;offset=index;},setEnd:()=>{},
        getBoundingClientRect:()=>({left:offset*4,top:current.parentElement===summary?5:20,width:4,height:10,bottom:30})}),
    };
    await pageGlyphs({querySelector:()=>null,querySelectorAll:()=>[]},40,40);
    return painted.join('');
  } finally {
    for (const [key,descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key];
    }
  }
}

test('snapshot includes a collapsed disclosure summary but excludes its hidden body', async () => {
  assert.equal(await snapshotDisclosure(false),'Visible');
});

test('snapshot includes disclosure content when the visitor expands it', async () => {
  assert.equal(await snapshotDisclosure(true),'VisibleSecret');
});
