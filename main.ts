import {mkdirSync,readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const IN=process.env.MAKEFUN_INPUT_DIR??'/input',OUT=process.env.MAKEFUN_OUTPUT_DIR??'/output';
const DX=[0,0,-1,1],DY=[-1,1,0,0],MC='udlr';
const BIT:bigint[]=[];for(let i=0;i<64;i++)BIT.push(1n<<BigInt(i));
const has=(m:bigint,i:number)=>(m&BIT[i])!==0n;
// min-heap of [f,h,g,box,pc,reg,key]; better = lower f, then higher h
function better(a:any[],b:any[]){return a[0]<b[0]||(a[0]===b[0]&&a[1]>b[1]);}
function hpush(h:any[],e:any[]){h.push(e);let i=h.length-1;while(i>0){const p=(i-1)>>1;if(better(h[p],e))break;h[i]=h[p];i=p;}h[i]=e;}
function hpop(h:any[]){const t=h[0],l=h.pop();if(h.length){let i=0;for(;;){const a=2*i+1,b=a+1;let m=-1;if(a<h.length)m=a;if(b<h.length&&better(h[b],h[m]))m=b;if(m<0||better(l,h[m]))break;h[i]=h[m];i=m;}h[i]=l;}return t;}

// Push-optimal A* for one room. cells: [x,y] of room floor + entry cell last.
// box0/goalMask: bitmasks over cells. entry: index of the entry (hallway) cell.
// last: true for the final room (player need not exit). Returns {m: moves, p: pushes}.
function solveRoom(cells:number[][],box0:bigint,goalMask:bigint,entry:number,last:boolean):{m:string,p:number}{
  const n=cells.length;
  const pos=new Map<number,number>();
  cells.forEach((c,i)=>pos.set(c[1]*1024+c[0],i));
  const nb:number[][]=[];
  for(let i=0;i<n;i++){const r:number[]=[];for(let d=0;d<4;d++){const j=pos.get((cells[i][1]+DY[d])*1024+(cells[i][0]+DX[d]));r.push(j===undefined?-1:j);}nb.push(r);}
  const goals:number[]=[];
  for(let i=0;i<n;i++)if(has(goalMask,i))goals.push(i);
  const G=goals.length;
  // dist[j][i]: min pushes moving a box from cell i to goal goals[j] (other boxes ignored)
  const dist:number[][]=[];
  for(let j=0;j<G;j++){
    const d=new Array<number>(n).fill(Infinity);
    d[goals[j]]=0;const q=[goals[j]];
    for(let qi=0;qi<q.length;qi++){const cur=q[qi];
      for(let dd=0;dd<4;dd++){const c=nb[cur][dd^1];if(c<0)continue;const s=nb[c][dd^1];if(s<0)continue;
        if(d[c]===Infinity){d[c]=d[cur]+1;q.push(c);}}}
    dist.push(d);
  }
  const perms:number[][]=[];
  const pa:number[]=[];for(let i=0;i<G;i++)pa.push(i);
  (function gen(k:number){if(k===G){perms.push(pa.slice());return;}for(let i=k;i<G;i++){const t=pa[k];pa[k]=pa[i];pa[i]=t;gen(k+1);const u=pa[k];pa[k]=pa[i];pa[i]=u;}})(0);
  function flood(box:bigint,start:number):bigint{
    let reg=0n;const q=[start];reg|=BIT[start];
    for(let qi=0;qi<q.length;qi++){const c=q[qi];
      for(let d=0;d<4;d++){const m=nb[c][d];if(m<0||has(reg,m)||has(box,m))continue;reg|=BIT[m];q.push(m);}}
    return reg;
  }
  function minBit(m:bigint):number{for(let i=0;i<n;i++)if(has(m,i))return i;return -1;}
  function heur(box:bigint):number{
    const bs:number[]=[];for(let i=0;i<n;i++)if(has(box,i))bs.push(i);
    let best=Infinity;
    for(const p of perms){let s=0;for(let i=0;i<G;i++){const d=dist[p[i]][bs[i]];if(d===Infinity){s=Infinity;break;}s+=d;}if(s<best)best=s;}
    return best;
  }
  // permanently-frozen boxes (pushes blocked by walls / frozen boxes only)
  function frozen(box:bigint):boolean{
    let pf=0n;
    for(let i=0;i<n;i++){if(!has(box,i))continue;let open=false;
      for(let d=0;d<4;d++){const t=nb[i][d],s=nb[i][d^1];if(t<0||s<0||t===entry)continue;if(has(box,t)||has(box,s))continue;open=true;break;}
      if(!open)pf|=BIT[i];}
    if(!pf)return false;
    for(;;){let ch=false;
      for(let i=0;i<n;i++){if(!has(pf,i))continue;
        for(let d=0;d<4;d++){const t=nb[i][d],s=nb[i][d^1];if(t<0||s<0||t===entry)continue;if(has(pf,t)||has(pf,s))continue;pf&=~BIT[i];ch=true;break;}}
      if(!ch)break;}
    return (pf&~goalMask)!==0n;
  }
  const evC=new Map<bigint,number>();
  function ev(box:bigint):number{const c=evC.get(box);if(c!==undefined)return c;const r=frozen(box)?Infinity:heur(box);evC.set(box,r);return r;}
  function walk(box:bigint,from:number,to:number):string{
    if(from===to)return '';
    const prev=new Map<number,number>(),pd=new Map<number,number>();
    const q=[from];prev.set(from,-1);
    for(let qi=0;qi<q.length;qi++){const c=q[qi];
      for(let d=0;d<4;d++){const m=nb[c][d];if(m<0||prev.has(m)||has(box,m))continue;
        prev.set(m,c);pd.set(m,d);
        if(m===to){let s='',cur=m;while(cur!==from){s=MC[pd.get(cur)!]+s;cur=prev.get(cur)!;}return s;}
        q.push(m);}}
    return '';
  }
  const reg0=flood(box0,entry);
  const key0=(box0<<6n)|BigInt(minBit(reg0));
  const gs=new Map<bigint,number>(),came=new Map<bigint,any>();
  const heap:any[]=[];
  const h0=ev(box0);
  if(h0===Infinity)return {m:'',p:-1};
  gs.set(key0,0);came.set(key0,{pk:null,pc:entry,bf:-1,bt:-1,d:-1});
  hpush(heap,[h0,h0,0,box0,entry,reg0,key0]);
  let goalKey:bigint|null=null,goalPc=entry;
  while(heap.length){
    const [f,h,g,box,pc,reg,key]=hpop(heap);
    if(g>(gs.get(key)??Infinity))continue;
    if(box===goalMask&&(last||has(reg,entry))){goalKey=key;goalPc=pc;break;}
    for(let b=0;b<n;b++){
      if(!has(box,b))continue;
      for(let d=0;d<4;d++){
        const t=nb[b][d],s=nb[b][d^1];
        if(t<0||s<0||t===entry)continue;
        if(has(box,t)||has(box,s))continue;
        if(!has(reg,s))continue;
        const box2=box-BIT[b]+BIT[t];
        const reg2=flood(box2,b);
        const key2=(box2<<6n)|BigInt(minBit(reg2));
        const g2=g+1;
        if((gs.get(key2)??Infinity)<=g2)continue;
        const h2=ev(box2);
        if(h2===Infinity)continue;
        gs.set(key2,g2);came.set(key2,{pk:key,pc:b,bf:b,bt:t,d});
        hpush(heap,[g2+h2,h2,g2,box2,b,reg2,key2]);
      }
    }
  }
  if(goalKey===null)return {m:'',p:-1};
  const chain:any[]=[];let k:bigint|null=goalKey;
  while(k!==null){const c=came.get(k);if(!c||c.pk===null)break;chain.push(c);k=c.pk;}
  chain.reverse();
  let m='';
  for(const c of chain){
    const par=came.get(c.pk);
    const parPc=par?par.pc:entry;
    const parBox=c.pk>>6n;
    const stand=nb[c.bf][c.d^1];
    m+=walk(parBox,parPc,stand);
    m+=MC[c.d];
  }
  if(!last)m+=walk(goalMask,goalPc,entry);
  return {m,p:gs.get(goalKey)!};
}

// Solve one level (XSB text) -> move string (u/d/l/r).
function solve(text:string):string{
  const rows=text.replace(/\r/g,'').split('\n').filter(r=>r.length>0);
  const H=rows.length,W=Math.max(...rows.map(r=>r.length));
  const g=rows.map(r=>r.padEnd(W,'#'));
  const floor=(x:number,y:number)=>x>=0&&y>=0&&x<W&&y<H&&g[y][x]!=='#';
  let px=0,py=0;const boxes:number[]=[],goals:number[]=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const c=g[y][x];
    if(c==='@'||c==='+'){px=x;py=y;}
    if(c==='$'||c==='*')boxes.push(y*W+x);
    if(c==='.'||c==='*'||c==='+')goals.push(y*W+x);}
  const h=py;
  function transit(from:number,to:number,boxSet:Set<number>):string{
    if(from===to)return '';
    const prev=new Map<number,number>(),pd=new Map<number,number>();
    const q=[from];prev.set(from,-1);
    for(let qi=0;qi<q.length;qi++){const c=q[qi],cx=c%W,cy=(c/W)|0;
      for(let d=0;d<4;d++){const nx=cx+DX[d],ny=cy+DY[d],nk=ny*W+nx;
        if(!floor(nx,ny)||boxSet.has(nk)||prev.has(nk))continue;
        prev.set(nk,c);pd.set(nk,d);
        if(nk===to){let s='',cur=nk;while(cur!==from){s=MC[pd.get(cur)!]+s;cur=prev.get(cur)!;}return s;}
        q.push(nk);}}
    return '';
  }
  const seen=new Set<number>();
  const rooms:any[]=[];
  for(let y=0;y<H;y++){if(y===h)continue;
    for(let x=0;x<W;x++){const k=y*W+x;
      if(!floor(x,y)||seen.has(k))continue;
      const comp:number[]=[];const q=[k];seen.add(k);
      for(let qi=0;qi<q.length;qi++){const c=q[qi];comp.push(c);const cx=c%W,cy=(c/W)|0;
        for(let d=0;d<4;d++){const nx=cx+DX[d],ny=cy+DY[d];
          if(ny===h||!floor(nx,ny))continue;const nk=ny*W+nx;
          if(seen.has(nk))continue;seen.add(nk);q.push(nk);}}
      const rb=comp.filter(c=>boxes.includes(c));
      if(!rb.length)continue;
      let door=-1,entry=-1;
      for(const c of comp){const cx=c%W,cy=(c/W)|0;
        for(const dy of [-1,1]){const ny=cy+dy;
          if(ny===h&&floor(cx,ny)){door=c;entry=ny*W+cx;break;}}
        if(door>=0)break;}
      if(door<0)continue;
      rooms.push({comp,boxes:rb,goals:comp.filter(c=>goals.includes(c)),door,entry});
    }}
  rooms.sort((a,b)=>a.entry%W-b.entry%W);
  const boxSet=new Set<number>(boxes);
  let moves='';let cur=py*W+px;
  for(let ri=0;ri<rooms.length;ri++){
    const r=rooms[ri],last=ri===rooms.length-1;
    moves+=transit(cur,r.entry,boxSet);
    cur=r.entry;
    const cells=r.comp.map((c:number)=>[c%W,(c/W)|0]);
    cells.push([r.entry%W,(r.entry/W)|0]);
    const entryIdx=cells.length-1;
    const ci=new Map<number,number>();
    cells.forEach((c:number[],i:number)=>ci.set(c[1]*W+c[0],i));
    let box0=0n,goalMask=0n;
    for(const b of r.boxes)box0|=BIT[ci.get(b)!];
    for(const gg of r.goals)goalMask|=BIT[ci.get(gg)!];
    const res=solveRoom(cells,box0,goalMask,entryIdx,last);
    moves+=res.m;
    for(const b of r.boxes)boxSet.delete(b);
    for(const gg of r.goals)boxSet.add(gg);
  }
  return moves;
}

for(const id of readdirSync(IN).sort()){
  const moves=solve(readFileSync(join(IN,id,'level.txt'),'utf8'));
  mkdirSync(join(OUT,id),{recursive:true});
  writeFileSync(join(OUT,id,'solution.txt'),`${moves}\n`);
}
