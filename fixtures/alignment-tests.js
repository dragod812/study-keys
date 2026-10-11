import {alignReadingTarget} from '/src/reading-alignment.js';
const target=document.querySelector('#target'),main=document.querySelector('main'),results=document.querySelector('#results'),status=document.querySelector('#status');
const close=(a,b)=>{if(Math.abs(a-b)>1.1)throw Error(`${a} != ${b}`);};
function mode(nested){document.body.classList.toggle('nested',nested);window.scrollTo(0,0);target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true});}
document.querySelector('#page').onclick=()=>mode(false);
document.querySelector('#pane').onclick=()=>mode(true);
document.querySelector('#run').onclick=()=>{
 let passed=0,failed=0;results.replaceChildren();
 const test=(name,fn)=>{const li=document.createElement('li');try{fn();li.textContent='PASS · '+name;passed++;}catch(e){li.textContent='FAIL · '+name+' · '+e.message;failed++;}results.append(li);};
 for(const nested of [false,true]){
  mode(nested);const pane=nested?main:document.scrollingElement;
  const bounds=()=>nested?{top:main.getBoundingClientRect().top+main.clientTop+16,bottom:main.getBoundingClientRect().top+main.clientTop+main.clientHeight-24}:{top:64,bottom:innerHeight-20};
  for(const position of ['start','center','end'])test(`${nested?'nested':'page'} heading ${position}`,()=>{
   const x=pane.scrollLeft;alignReadingTarget(target,position);const r=target.getBoundingClientRect(),b=bounds();close(position==='start'?r.top:position==='end'?r.bottom:(r.top+r.bottom)/2,position==='start'?b.top:position==='end'?b.bottom:(b.top+b.bottom)/2);close(pane.scrollLeft,x);if(nested)close(scrollY,0);
  });
  test(`${nested?'nested':'page'} text range stays selected`,()=>{
   const p=document.querySelector('#passage'),r=document.createRange();r.setStart(p.firstChild,12);r.setEnd(p.firstChild,58);const s=getSelection();s.removeAllRanges();s.addRange(r);const quote=s.toString();
   for(const pos of ['start','center','end']){alignReadingTarget(r,pos);const rects=[...r.getClientRects()],first=rects[0],last=rects.at(-1),b=bounds();close(pos==='start'?first.top:pos==='end'?last.bottom:(first.top+last.bottom)/2,pos==='start'?b.top:pos==='end'?b.bottom:(b.top+b.bottom)/2);if(s.toString()!==quote)throw Error('Selection changed');}
   s.removeAllRanges();
  });
  test(`${nested?'nested':'page'} boundary clamps safely`,()=>{alignReadingTarget(document.querySelector('h1'),'end');close(pane.scrollTop,0);});
  test(`${nested?'nested':'page'} selection toolbar leaves the target readable`,()=>{const bottom=innerHeight/2;alignReadingTarget(target,'end',{bottom});close(target.getBoundingClientRect().bottom,bottom-(nested?24:20));});
 }
 test('detached and hidden targets do not scroll',()=>{const before=main.scrollTop;const detached=document.createElement('p');if(alignReadingTarget(detached,'start'))throw Error('Detached target accepted');target.hidden=true;if(alignReadingTarget(target,'start'))throw Error('Hidden target accepted');target.hidden=false;close(main.scrollTop,before);});
 mode(false);status.textContent=`${passed} passed, ${failed} failed`;results.scrollIntoView({block:'center'});
};
