# Does liar's dice reward bluffing?

An analysis of the `liars-dice` rules (2026-11-12), after the mixed table in
[liars-dice-04a-002-opus-sonnet-haiku](runs/liars-dice-04a-002-opus-sonnet-haiku/), where Opus won 8 of 12
games without a single deliberate lie (P420). No live model was called; the numbers come from an offline
simulation of the story's rules.

## The rules as the code plays them

From `mechanics/liars-dice/src/` and `stories/liars-dice/story.ts`:

- Four seats by default (2 to 6 by story name), three games a match, four six-sided dice per seat at the
  start of a game. Every round each seat still in rolls its dice in secret (seeded, server-side).
- Ones are wild: they count for every face, and nobody may bid on ones (bids name faces 2 to 6).
- A bid `q x f` claims that at least `q` dice on the whole table show `f`. Each bid must beat the standing
  one (more dice, or as many dice on a higher face) and fit on the table; the engine checks it.
- On its turn a seat bids higher or calls the standing bid a lie. Only the next seat in table order can
  call a bid. A call shows every die: if the bid holds, the caller loses a die, otherwise the bidder does.
  The loser opens the next round; a seat without dice is out; the last seat with dice wins the game.
- Points come from places only: 3, 2, 1 and 0 a game, summed over the match. A won call or a successful
  bluff earns nothing by itself; losing a die is the only cost.
- Table talk: a bid or a call may carry a public remark (`say`, at most 160 characters) that "need not be
  true". The private `reason` is for the human only.
- A seat that does not act within two minutes calls liar, or opens with `1 x 2`.
- Every game starts from a fresh context; the only memory is a private strategy brain (150 words) whose
  prompt names "how to bluff". No other prompt invites a bluff.

## The simulation

Three kinds of seats, all with the story's rules (four seats, four dice, ones wild, places 3/2/1/0, only
the next seat calls), 40,000 games per arm, the test seat rotated through the four chairs:

- **blind:** the mechanic's own-dice baseline (`baselineOf`): every other die fair and unknown, bids read
  as noise. Haiku agrees with it in 95 percent of its decisions (P282).
- **reader:** the same decision rule, but every other seat's bid on a face this round counts as one die of
  that face in that seat's hand.
- **bluffer:** a reader that, with probability *q*, bids instead on a face it holds none of (the lowest legal
  bid on that face, if a reader would still give it at least 0.3).

Points a game for the test seat (fair share 1.5):

| Opponents | blind | reader | bluff 25 % | bluff 50 % | bluff 100 % |
|---|---:|---:|---:|---:|---:|
| three blind seats (like Haiku) | 1.50 | **2.40** | 2.01 | 1.77 | 1.35 |
| three readers | 0.62 | 1.50 | 1.57 | 1.73 | **1.88** |

## Verdict

The rules reward bluffing, but only against opponents who read bids. A bluff works by planting a false
belief; a blind seat forms no belief from a bid, so against it a lie is only a riskier bid, and every bit
of bluffing costs points. Against such a table the best play is to read the others and bid honestly: the
reader scores 2.40, close to Opus's 2.58 at the Haiku table, and its true bids bait the wrong calls (Opus's
bids held in 60 of 71 calls). Opus's "Never bluff" brain is the best response to its field, not caution.
Once the opponents read, the picture turns: the bluffer gains with every extra bluff (1.88 at *q* = 1),
and a blind seat collapses to 0.62.

So nothing in the rules blocks bluffing; the Haiku field takes away its point. The question "does a strong
model bluff?" needs a table that reads it.

## Proposals (not built)

1. **A table of readers:** four Opus seats, or Opus heads-up against Opus. The real test of whether Opus
   lies once it is read.
2. **Scripted reader opponents** (the reader above as a seat policy): a cheap table where bluffing provably
   pays, for Haiku and Opus alike.
3. **A briefing line on the mechanics, not an order to lie:** "the others treat your bids as evidence of your
   dice". Do the models find the lever themselves?
4. **The read baseline** (bids as evidence) for the report, so the bluff counter stops counting reads as
   bluffs (P422). The rules themselves need no change.

## The first test: four Opus seats

[liars-dice-04a-003-opus-only](runs/liars-dice-04a-003-opus-only/) (2026-11-12, two matches): Opus does not
bluff at a table of readers either. Its low bids are reads of the others' bids or forced smallest raises,
every brain says "bluff rarely" before the first game, and the table talk falls silent (P424). The readers
learn to discount bids that chase one face, which shrinks the reward the simulation predicts.

<details>
<summary>The simulation script (plain Node, no dependencies: <code>node bluff-sim.mjs</code>)</summary>

```js
// Offline liar's dice sim with the story's rules: 4 seats, 4 dice, d6, ones wild, places 3/2/1/0, only the next seat can call.
const FACES=6, LOW=2, POINTS=[3,2,1,0];
let s=12345; const rnd=()=>{s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
const die=()=>1+Math.floor(rnd()*FACES);
const cnt=(d,f)=>d.filter(x=>x===f||x===1).length;
function atLeast(k,n,p){if(k<=0)return 1;if(k>n)return 0;let sum=0,t=(1-p)**n;for(let i=0;i<=n;i++){if(i>=k)sum+=t;t=i<n?t*(n-i)*p/((i+1)*(1-p)):0;}return sum;}
const beats=(b,p)=>!p||b.q>p.q||(b.q===p.q&&b.f>p.f);
function legal(p,total){const r=[];for(let q=1;q<=total;q++)for(let f=LOW;f<=FACES;f++){const b={q,f};if(beats(b,p))r.push(b);}return r;}
// evidence: extra dice assumed per face from other seats' bids this round (reader trusts each other bidder holds 1 of a face it bid)
function ev(me,roundBids,counts,trust){const e={};if(!trust)return e;const seen=new Set();for(const {seat,b} of roundBids){if(seat===me)continue;const k=seat+':'+b.f;if(seen.has(k))continue;seen.add(k);e[b.f]=(e[b.f]||0)+1;}return e;}
function truth(b,own,unseen,e){const x=e[b.f]||0;return atLeast(b.q-cnt(own,b.f)-x,unseen-x,1/3);}
function decide(kind,me,own,unseen,standing,roundBids,counts,lastBy,q){
  const trust=kind!=='base'; const e=ev(me,roundBids,counts,trust);
  let best,bt=-1;for(const b of legal(standing,own.length+unseen)){const t=truth(b,own,unseen,e);if(t>bt+1e-9){best=b;bt=t;}}
  if(standing){
    // a bluffer knows its own bids carry no evidence
    const st=truth(standing,own,unseen,e);
    if(!best||1-st>bt)return {liar:true};
  }
  if(kind==='bluff'&&rnd()<q){
    // bid a face it does not hold, at the lowest legal quantity, if still plausible to readers
    const cands=[];for(let f=LOW;f<=FACES;f++){if(own.some(x=>x===f))continue;const b=legal(standing,own.length+unseen).find(b=>b.f===f);if(b&&truth(b,own,unseen,e)>=0.3)cands.push(b);}
    if(cands.length){cands.sort((a,c)=>a.q-c.q||a.f-c.f);return {bid:cands[0],fake:true};}
  }
  return {bid:best};
}
function game(kinds,q){
  const n=kinds.length;const counts=Array(n).fill(4);const out=[];let starter=Math.floor(rnd()*n);
  const live=()=>counts.map((c,i)=>c>0?i:-1).filter(i=>i>=0);
  const next=i=>{for(let k=1;k<=n;k++){const j=(i+k)%n;if(counts[j]>0)return j;}};
  while(live().length>1){
    const dice=counts.map(c=>Array.from({length:c},die));const total=counts.reduce((a,b)=>a+b,0);
    let standing,bidder,turn=starter;const rb=[];
    for(;;){
      const own=dice[turn];const d=decide(kinds[turn],turn,own,total-own.length,standing,rb.filter(x=>!x.fake||true).map(x=>({seat:x.seat,b:x.b})),counts,bidder,q);
      if(d.liar){const c=cnt(dice.flat(),standing.f);const loser=c>=standing.q?turn:bidder;counts[loser]--;if(counts[loser]===0)out.push(loser);starter=counts[loser]>0?loser:next(loser);break;}
      standing=d.bid;bidder=turn;rb.push({seat:turn,b:d.bid});turn=next(turn);
    }
  }
  const order=[...live(),...out.reverse()];const pts=Array(n).fill(0);order.forEach((s,i)=>pts[s]=POINTS[i]);return pts;
}
function arm(test,opp,q,G=40000){let tot=0;for(let g=0;g<G;g++){const seat=g%4;const kinds=[opp,opp,opp,opp];kinds[seat]=test;tot+=game(kinds,q)[seat];}return (tot/G).toFixed(3);}
for(const opp of ['base','read']){for(const [test,q] of [['base',0],['read',0],['bluff',0.25],['bluff',0.5],['bluff',1]])console.log(`opponents=${opp} test=${test}${q?'('+q+')':''}: ${arm(test,opp,q)} points/game (fair 1.5)`);}
```

</details>
