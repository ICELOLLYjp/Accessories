import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccessoryManualClient} from './manual-inventory-client.mjs';
import {manualInventoryEndpoint} from './manual-inventory-config.mjs';
const input={sku:{designId:'d',quantityField:'piercing'},expectedRevision:3,expectedQuantity:5,quantity:4};
function fixture(responses=[]){
  const store=new Map(),requests=[];let id=0;
  const storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
  const create=()=>createAccessoryManualClient({endpoint:'/v1/inventory/manual-edit',storage,getToken:async()=>'token',key:'test-uid',newId:()=>`op-${++id}`,fetchImpl:async(url,options)=>{
    const op=JSON.parse(options.body);requests.push({url,op,options});const res=responses.shift();if(res instanceof Error)throw res;
    return {status:res?.status||200,ok:!(res?.status>=400),json:async()=>res?.body||{operationId:op.operationId,path:'accessoryStock/shared',beforeQuantity:op.expectedQuantity,quantity:op.quantity,revision:op.expectedRevision+1,replayed:false,fingerprint:'a'.repeat(64)}};
  }});
  return {create,store,requests,storage};
}
test('A01 lost reply then reload looks up original ID, never sends a new quantity',async()=>{
 const f=fixture([new Error('lost')]);await assert.rejects(f.create().submit(input));
 assert.equal((await f.create().submit({...input,quantity:2})).status,'recovered');
 assert.equal(f.requests[1].url,'/v1/inventory/manual-edit/result');assert.deepEqual(f.requests[1].op,f.requests[0].op);assert.equal(f.store.size,0);
});
test('A02 unknown lookup retains ID; explicit retry submits identical payload',async()=>{
 const f=fixture([new Error('lost'),{body:{status:'unknown',operationId:'op-1'}}]);const c=f.create();await assert.rejects(c.submit(input));
 assert.equal((await c.submit({...input,quantity:2})).status,'unknown');await c.retryPending();assert.deepEqual(f.requests[0].op,f.requests[2].op);
});
test('A03 expected conflicts require fresh explicit input',async()=>{
 for(const error of ['inventory-conflict','reserved-stock-floor','reservation-evidence-required','reservation-authority-required']){
 const f=fixture([{status:409,body:{error}}]);assert.equal((await f.create().submit(input)).status,'conflict');assert.equal(f.store.size,0);assert.equal(f.requests.length,1);
 }
});
test('A04 forged receipt, unauthorized and unknown conflict preserve pending',async()=>{
 for(const r of [{body:{path:'wrong'}},{status:409,body:{error:'operation-id-conflict'}},{status:401,body:{error:'unauthenticated'}}]){
 const f=fixture([r]);await assert.rejects(f.create().submit(input));assert.equal(f.store.size,1);
 }
});
test('A05 failed storage blocks transmission',async()=>{
 const f=fixture();f.storage.setItem=()=>{throw Error('quota');};await assert.rejects(f.create().submit(input));assert.equal(f.requests.length,0);
});
test('A06 accessory SKU and immutable intent are transmitted',async()=>{
 const f=fixture();const result=await f.create().submit(input);assert.equal(result.status,'saved');
 assert.deepEqual(f.requests[0].op,{version:1,operationId:'op-1',stock:'accessory',...input});
});
test('A07 invalid stored JSON does not silently replace the operation',async()=>{
 const f=fixture();f.store.set('test-uid','not-json');await assert.rejects(f.create().submit(input));assert.equal(f.requests.length,0);
});
test('A08 endpoint remains disabled in repository',()=>assert.equal(manualInventoryEndpoint,null));
