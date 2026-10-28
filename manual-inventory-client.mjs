// Accessories: persist a complete intent before transmission. Never fall back
// to direct Firestore writes, and never generate a new ID for an unknown result.
export function createAccessoryManualClient({endpoint,storage,getToken,fetchImpl=fetch,newId=()=>crypto.randomUUID(),key}) {
  if(!endpoint || !storage || !getToken || !key) throw new Error('在庫APIの設定が不足しています');
  let busy=false;
  const pending=()=>{const raw=storage.getItem(key);return raw?JSON.parse(raw):null;};
  async function request(operation,lookup){
    const response=await fetchImpl(endpoint+(lookup?'/result':''),{
      method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${await getToken()}`},
      body:JSON.stringify(operation),signal:AbortSignal.timeout(15000)
    });
    const body=await response.json();
    if(response.status===409 && ['inventory-conflict','reserved-stock-floor','reservation-evidence-required','reservation-authority-required','invalid-stored-revision'].includes(body.error)){
      storage.removeItem(key);return {status:'conflict',reason:body.error};
    }
    if(!response.ok) throw new Error(body.error||'保存結果を確認できません');
    if(lookup && body.status==='unknown' && body.operationId===operation.operationId) return {status:'unknown'};
    if(body.operationId!==operation.operationId || body.path!=='accessoryStock/shared'
      || body.beforeQuantity!==operation.expectedQuantity || body.quantity!==operation.quantity
      || body.revision!==operation.expectedRevision+1 || typeof body.replayed!=='boolean'
      || !/^[a-f0-9]{64}$/.test(body.fingerprint||'')) throw new Error('保存結果が一致しません');
    storage.removeItem(key);return {status:'saved',result:body};
  }
  return {
    pending,
    async submit(input){
      if(busy)return {status:'busy'};busy=true;
      try{
        const previous=pending();
        if(previous){const result=await request(previous,true);return {...result,status:result.status==='saved'?'recovered':result.status};}
        const operation={version:1,operationId:newId(),stock:'accessory',...input};
        storage.setItem(key,JSON.stringify(operation));
        return await request(operation,false);
      }finally{busy=false;}
    },
    async retryPending(){
      if(busy)return {status:'busy'};busy=true;
      try{const operation=pending();if(!operation)return {status:'none'};return await request(operation,false);}finally{busy=false;}
    }
  };
}
