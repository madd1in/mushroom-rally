import test from 'node:test';
import assert from 'node:assert/strict';
import {isPrecisionFlight, ringBoostDuration} from './windring.mjs';
const ring = {off:2, y:4};
const flyer = {air:true, glideArmed:true, gliderOpen:1, stun:0, offset:2, y:3.1};
test('centered glider flight earns a bounded precision bonus',()=>{
  assert.equal(isPrecisionFlight(flyer, ring),true);
  assert.equal(ringBoostDuration(true),1.55);
  assert.equal(ringBoostDuration(false),1.3);
});
test('precision uses a round opening rather than admitting rectangle corners',()=>{
  assert.equal(isPrecisionFlight({...flyer,offset:3.3},ring),true);
  assert.equal(isPrecisionFlight({...flyer,offset:3.1,y:4.2},ring),false);
  assert.equal(isPrecisionFlight({...flyer,y:4.5},ring),false);
});
test('ordinary hops, rescue drops, hits and magnet rings cannot earn precision',()=>{
  for(const change of [{air:false},{glideArmed:false},{gliderOpen:.4},{stun:.1},{y:NaN}]) assert.equal(isPrecisionFlight({...flyer,...change},ring),false);
  assert.equal(isPrecisionFlight(flyer,{...ring,ag:1}),false);
});
