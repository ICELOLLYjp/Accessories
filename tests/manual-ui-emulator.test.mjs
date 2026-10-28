// Executes the unmodified index.html handlers in a VM with a small DOM harness.
// HTTP, Auth, Firestore and the post-save browser SDK read are real emulators.
// This is not a browser rendering/device test.
import test,{before,beforeEach,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {once} from 'node:events';
import {createAccessoryManualClient} from '../manual-inventory-client.mjs';
if(!process.env.METHOD_B_TEST_DIR)throw Error('METHOD_B_TEST_DIR required');
const base=pathToFileURL(process.env.METHOD_B_TEST_DIR.replaceAll('\\','/')+'/');
const require=createRequire(new URL('package.json',base));
const web=require('firebase/firestore'),authSDK=require('firebase/auth'),appSDK=require('firebase/app');
const {runtime,UIDS,PROJECT}=await import(new URL('runtime.mjs',base));
const {server}=await import(new URL('http.mjs',base));
const {hash}=await import(new URL('inventory.mjs',base));
const {Timestamp}=require('firebase-admin/firestore');
let rt,api,endpoint,app,db,user,sharedRef;
const path='accessoryStock/shared';
const initial=()=>({inventoryRevision:0,inventoryReservationAuthority:1,
 inventoryReservations:{schema:'inventory-reservations-v1',complete:true,entries:[{id:'fixture-held',kind:'ec',state:'held',sku:{designId:'a',quantityField:'piercing'},quantity:2}]},
 designs:[{id:'a',name:'Synthetic A',piercing:5,earring:3},{id:'b',piercing:8,earring:null}],keep:'fixture-metadata'});
before(async()=>{
 rt=runtime();await rt.auth.createUser({uid:UIDS[0],email:'accessory@example.test',emailVerified:true,password:'fixture-password-only'});
 app=appSDK.initializeApp({projectId:PROJECT,apiKey:'fake',authDomain:PROJECT+'.firebaseapp.com'},'accessory-ui-test');
 const auth=authSDK.getAuth(app);authSDK.connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true});
 user=(await authSDK.signInWithEmailAndPassword(auth,'accessory@example.test','fixture-password-only')).user;
 db=web.getFirestore(app);web.connectFirestoreEmulator(db,'127.0.0.1',8087);sharedRef=web.doc(db,path);
 api=server(rt);api.listen(0,'127.0.0.1');await once(api,'listening');endpoint=`http://127.0.0.1:${api.address().port}/v1/inventory/manual-edit`;
});
beforeEach(async()=>{
 await rt.db.doc(path).set(initial());
 // Synthetic reconciliation fixture, never a production bootstrap.
 await rt.db.doc('inventoryReservationAuthorities/accessory').set({schema:'reservation-authority-v1',path,
  ledgerHash:hash(initial().inventoryReservations),ecComplete:true,eventComplete:true,
  reconciliationId:'synthetic-ui-test',reconciledAt:Timestamp.fromMillis(1)});
});
after(async()=>{api?.closeAllConnections();if(api)await new Promise(r=>api.close(r));if(db)await web.terminate(db);if(app)await appSDK.deleteApp(app);await rt?.close();});
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').replaceAll('\r\n','\n');
const functions=html.slice(html.indexOf('    async function saveAccessoryQuantityViaMethodB'),html.indexOf('    function designsEqual'));
const listeners=html.slice(html.indexOf('    document.addEventListener("click",'),html.indexOf('    normalizePriorities();\n    showLoginScreen();'));
function harness({storage=new Map(),fetchImpl=fetch,configured=endpoint}={}){
 const events={},alerts=[],statuses=[],requests=[];
 const env={structuredClone,crypto,clearTimeout,setTimeout,manualInventoryEndpoint:configured,currentUser:user,cloudReady:true,
 accessoryManualBusy:false,designSaveBusy:false,designDirty:false,designSaveBlocked:false,applyingCloudSnapshot:false,
 designBaseline:initial(),state:{designs:initial().designs},sharedRef,getDocFromServer:web.getDocFromServer,
 localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
 createAccessoryManualClient:options=>createAccessoryManualClient({...options,fetchImpl:async(...args)=>{requests.push({url:args[0],body:JSON.parse(args[1].body)});return fetchImpl(...args);}}),
 alert:x=>alerts.push(x),confirm:()=>false,setSyncStatus:(...x)=>statuses.push(x),saveLocal(){},
 render(){if(env.target)env.target.value=String(env.state.designs[0][env.target.dataset.field]);},
 document:{addEventListener:(name,fn)=>events[name]=fn},
 saveInventoryEdit(){throw Error('legacy write reached');}
 };
 env.methodBRequired=()=>Boolean(env.manualInventoryEndpoint||env.designBaseline?.inventoryReservationAuthority===1);
 vm.runInNewContext(functions+'\n'+listeners,env);
 async function input(value,field='piercing'){
  env.target={id:'',name:'',value:String(value),dataset:{id:'a',field},matches:selector=>selector==='[data-action="number"]'};
  await events.input({target:env.target});await events.change({target:env.target});
 }
 async function click(action,field='earring'){await events.click({target:{closest:()=>({dataset:{action,id:'a',field}})}});}
 return {env,input,click,alerts,statuses,requests,storage};
}
const read=async()=>(await rt.db.doc(path).get()).data();
test('UI01 actual change and +/- handlers persist piercing/earring through authenticated API and SDK reread',async()=>{
 const h=harness();await h.input(4);await h.click('increment');await h.click('decrement');
 const data=await read();assert.equal(data.designs[0].piercing,4);assert.equal(data.designs[0].earring,3);assert.equal(data.inventoryRevision,3);
 assert.equal(data.designs[1].earring,null);assert.equal(data.keep,'fixture-metadata');assert.equal(h.env.designBaseline.inventoryRevision,3);
 assert.equal(h.statuses.filter(x=>x[1]==='ok').length,3);assert.equal(h.storage.size,0);
});
test('UI02 reservation floor and stale revision reject without success; fresh quantities replace input',async()=>{
 const h=harness();await h.input(1);assert.equal((await read()).inventoryRevision,0);assert.equal(h.env.target.value,'5');
 await rt.db.doc(path).update({inventoryRevision:1,'designs':[{...initial().designs[0],piercing:4},initial().designs[1]]});
 await h.input(3);assert.equal((await read()).designs[0].piercing,4);assert.equal(h.env.target.value,'4');assert.equal(h.statuses.some(x=>x[1]==='ok'),false);
});
test('UI03 committed lost response reload resolves original ID without applying new input',async()=>{
 const h=harness({fetchImpl:async(...args)=>{await fetch(...args);throw Error('lost after commit');}});await h.input(4);
 assert.equal((await read()).designs[0].piercing,4);assert.equal(h.storage.size,1);assert.equal(h.statuses.some(x=>x[1]==='ok'),false);
 const reload=harness({storage:h.storage});await reload.input(2);
 assert.equal(reload.requests[0].url,endpoint+'/result');assert.deepEqual(reload.requests[0].body,h.requests[0].body);
 assert.equal((await read()).inventoryRevision,1);assert.equal(reload.env.target.value,'4');assert.equal(reload.storage.size,0);
 assert.equal(reload.statuses.some(x=>x[1]==='ok'),false);
});
test('UI04 unknown result requires explicit same-payload retry',async()=>{
 const h=harness({fetchImpl:async()=>{throw Error('lost before send');}});await h.input(4);
 const reload=harness({storage:h.storage});await reload.input(2);assert.equal(reload.storage.size,1);assert.equal((await read()).inventoryRevision,0);
 reload.env.confirm=()=>true;await reload.input(3);
 assert.deepEqual(reload.requests[2].body,h.requests[0].body);assert.equal((await read()).designs[0].piercing,4);
 assert.equal(reload.statuses.some(x=>x[1]==='ok'),false);
});
test('UI05 unauthorized and disabled API never show unsaved input as confirmed quantity',async()=>{
 const disabled=harness({configured:null});await disabled.input(2);assert.equal(disabled.requests.length,0);assert.equal(disabled.env.target.value,'5');
 const h=harness();h.env.currentUser={uid:user.uid,getIdToken:async()=>'invalid-token'};await h.input(2);
 assert.equal(h.storage.size,1);assert.equal((await read()).inventoryRevision,0);assert.equal(h.env.target.value,'5');assert.equal(h.statuses.some(x=>x[1]==='ok'),false);
});
test('UI06 legacy save and flush fail closed in migration mode',async()=>{
 const h=harness();h.env.designDirty=true;h.env.saveDesigns();await h.env.flushDesigns();
 assert.equal(h.env.designSaveBlocked,true);assert.equal(h.requests.length,0);assert.equal((await read()).inventoryRevision,0);
});
test('UI07 invalid numeric input and unknown baseline quantity never submit',async()=>{
 const h=harness();for(const value of ['','-1','1.5','9007199254740992'])await h.input(value);
 h.env.designBaseline.designs[0].earring=null;await h.input(1,'earring');assert.equal(h.requests.length,0);assert.equal((await read()).inventoryRevision,0);
});
