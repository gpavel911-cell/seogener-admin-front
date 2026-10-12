"use client";
import { useState } from "react";
import { baseApi } from "@shared/store/base-api";

type Operation="CREATE_PROPERTY"|"READ_TOKEN"|"ADD_TXT"|"VERIFY_OWNERSHIP";
type Release={projectId:string;batchId:string;domain:string;buildId:string;packageId:string;releaseReceiptSha256:string;sitemapSha256:string;firstPublication:boolean};
type Scope={release:Release;operation:Operation;googleProfile:string;propertyUrl:string;hostId:string|null;registrarProfile:string|null;token:string|null;expiresAt:number};
type Grant={grantId:string;scope:Scope;approvedBy:number;issuedAt:number};
type Lookup={items:{grant:Grant;status:"approved"|"revoked"}[];complete:boolean};
const api=baseApi.injectEndpoints({endpoints:(b)=>({
  ruOnboardingLookup:b.mutation<Lookup,Scope>({query:(body)=>({url:"/api/v1/pipeline/ru-onboarding/grants/lookup",method:"POST",body})}),
  ruOnboardingIssue:b.mutation<Grant,Scope>({query:(body)=>({url:"/api/v1/pipeline/ru-onboarding/grants",method:"POST",body})}),
  ruOnboardingRevoke:b.mutation<{revoked:boolean},Grant>({query:(g)=>({url:`/api/v1/pipeline/ru-onboarding/grants/${g.grantId}/revoke`,method:"POST",body:g.scope})}),
})});
const labels:Record<Operation,string>={CREATE_PROPERTY:"Создать ресурс Search Console",READ_TOKEN:"Получить свежий TXT-токен",ADD_TXT:"Добавить один TXT, сохранив остальные записи",VERIFY_OWNERSHIP:"Проверить DNS и подтвердить владение"};
const sha=/^[a-f0-9]{64}$/;
const pageStyles=`.ru-onboarding{max-width:980px;margin:8px auto;color:#162b49;line-height:1.5}.ru-onboarding h1{font-size:28px;line-height:1.2;margin:0 0 16px}.ru-onboarding h2{font-size:23px;margin:0 0 8px}.ru-onboarding p{margin:12px 0 20px;color:#405873}.ru-onboarding textarea{box-sizing:border-box;border:1px solid #b7cbe0;border-radius:10px;padding:14px;background:#fff;color:#203955;font:13px/1.5 monospace;resize:vertical;margin:8px 0 12px}.ru-onboarding button{border:1px solid #adc5de;border-radius:8px;background:#fff;color:#173b65;padding:10px 15px;font:600 14px/1.3 inherit;cursor:pointer;margin:4px 8px 4px 0}.ru-onboarding button:disabled{opacity:.5;cursor:default}.ru-onboarding button:focus-visible,.ru-onboarding textarea:focus-visible{outline:3px solid #8ab9eb;outline-offset:2px}.ru-onboarding section{margin-top:22px;padding:22px;border:1px solid #c5d6e8;border-radius:14px;background:#fff}.ru-onboarding dl{display:grid;grid-template-columns:180px minmax(0,1fr);gap:8px 16px;margin:18px 0}.ru-onboarding dl>div{display:contents}.ru-onboarding dt{font-size:13px;color:#58718a}.ru-onboarding dd{margin:0;font-size:14px;overflow-wrap:anywhere}.ru-onboarding label{font-weight:500}.ru-onboarding input{margin-right:8px;accent-color:#245e98}.ru-onboarding [role=status]:not(:empty){background:#edf5ff;border-left:3px solid #5b91c5;padding:14px;border-radius:6px}@media(max-width:640px){.ru-onboarding h1{font-size:23px}.ru-onboarding section{padding:16px}.ru-onboarding dl{grid-template-columns:minmax(0,1fr);gap:5px}.ru-onboarding dd{margin-bottom:10px}.ru-onboarding button{max-width:100%;white-space:normal}}`;
const shellStyles=`body:has(.ru-onboarding) main:not(.ru-onboarding){min-width:0}@media(max-width:760px){body:has(.ru-onboarding) aside{width:64px;min-width:64px;max-width:64px;flex:0 0 64px;padding:12px 6px;margin:8px 0 8px 8px}body:has(.ru-onboarding) aside nav a{padding:10px;gap:0;justify-content:center}body:has(.ru-onboarding) aside nav a>span:last-child{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}body:has(.ru-onboarding) main:not(.ru-onboarding){margin:8px 8px 8px 0;padding:14px 12px}body:has(.ru-onboarding) aside>div:first-child{justify-content:center}}`;
export function parseScope(raw:string):Scope {
  if(raw.length>16384)throw new Error("Слишком большой документ разрешения.");
  const s=JSON.parse(raw) as Scope;const r=s?.release;const now=Math.floor(Date.now()/1000);
  if(!r||r.projectId!=="yandex-hotels"||r.firstPublication!==true||!Object.prototype.hasOwnProperty.call(labels,s.operation)
    ||typeof r.domain!=="string"||!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+ru$/.test(r.domain)
    ||typeof r.batchId!=="string"||!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$/.test(r.batchId)
    ||![r.buildId,r.packageId,r.releaseReceiptSha256,r.sitemapSha256].every(v=>typeof v==="string"&&sha.test(v))
    ||s.propertyUrl!==`sc-domain:${r.domain}`||typeof s.googleProfile!=="string"||!s.googleProfile.trim()
    ||!Number.isInteger(s.expiresAt)||s.expiresAt<=now||s.expiresAt>now+604800)throw new Error("Точный новый RU-выпуск и срок до 7 дней обязательны.");
  if(s.operation==="CREATE_PROPERTY"?s.hostId!==null:typeof s.hostId!=="string"||!/^[a-zA-Z0-9:/._-]{1,253}$/.test(s.hostId))throw new Error("Нужен точный host ID; при создании — null.");
  if(s.operation==="ADD_TXT"?typeof s.registrarProfile!=="string"||!s.registrarProfile.trim():s.registrarProfile!==null)throw new Error("Профиль регистратора нужен только для ADD_TXT.");
  if(["ADD_TXT","VERIFY_OWNERSHIP"].includes(s.operation)?typeof s.token!=="string"||!/^google-site-verification=[a-zA-Z0-9_-]{1,230}$/.test(s.token):s.token!==null)throw new Error("Точный TXT нужен только для добавления и подтверждения.");
  return s;
}
function sameScope(a:Scope,b:Scope){
  const fields=["operation","googleProfile","propertyUrl","hostId","registrarProfile","token","expiresAt"] as const;
  const releaseFields=["projectId","batchId","domain","buildId","packageId","releaseReceiptSha256","sitemapSha256","firstPublication"] as const;
  return fields.every(k=>a[k]===b[k])&&releaseFields.every(k=>a.release[k]===b.release[k]);
}

/** Staged standalone page. No execution API, machine key or browser persistence. */
export function RuOnboardingPage(){
  const [raw,setRaw]=useState("");const [scope,setScope]=useState<Scope|null>(null);
  const [grant,setGrant]=useState<Grant|null>(null);const [selected,setSelected]=useState(false);
  const [uncertain,setUncertain]=useState(false);const [message,setMessage]=useState("");
  const [checked,setChecked]=useState(false);const [revoked,setRevoked]=useState(false);
  const [lookup,{isLoading:looking}]=api.useRuOnboardingLookupMutation();
  const [issue,{isLoading:issuing}]=api.useRuOnboardingIssueMutation();
  const [revoke,{isLoading:revoking}]=api.useRuOnboardingRevokeMutation();const busy=issuing||revoking||looking;
  async function inspect(){if(busy)return;setChecked(false);setSelected(false);
    let s:Scope;try{s=parseScope(raw);}catch(e){setScope(null);setMessage(e instanceof Error?e.message:"Не удалось прочитать scope.");return;}
    try{setScope(s);const found=await lookup(s).unwrap();
      if(!found.complete||found.items.length>1)throw new Error("Реестр неполный или содержит несколько разрешений: нужна проверка оператора.");
      const row=found.items[0];if(row&&(!sameScope(parseScope(JSON.stringify(row.grant.scope)),s)||!["approved","revoked"].includes(row.status)
        ||!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(row.grant.grantId)||!(row.grant.approvedBy>0)))throw new Error("Результат реестра не совпадает.");
      setGrant(row?.grant??null);setRevoked(row?.status==="revoked");setUncertain(false);setChecked(true);
      setMessage(row?row.status==="revoked"?"Точное разрешение отозвано; повторная выдача заблокирована.":"Найдено ранее сохранённое разрешение: повторная выдача не нужна.":"Точный scope проверен в реестре. Можно сохранить разрешение.");
    }catch{setUncertain(true);setMessage("Реестр не подтвердил точное разрешение. Выдача заблокирована; повторите только проверку реестра.");}}
  async function approve(){if(!scope||!checked||!selected||busy||uncertain||grant)return;
    try{const fresh=parseScope(JSON.stringify(scope));const g=await issue(fresh).unwrap();
      if(!sameScope(parseScope(JSON.stringify(g.scope)),fresh)||!g.grantId||!(g.approvedBy>0))throw new Error();
      setGrant(g);setMessage("Разрешение сохранено. Google/DNS операции не запускались.");
    }catch{setUncertain(true);setMessage("Результат сохранения неизвестен. Повтор заблокирован: оператор должен проверить серверный реестр, прежде чем выдавать новое разрешение.");}}
  function download(){if(!grant||revoked||uncertain)return;const url=URL.createObjectURL(new Blob([JSON.stringify(grant,null,2)],{type:"application/json"}));
    const a=document.createElement("a");a.href=url;a.download=`ru-onboarding-${grant.grantId}.json`;a.click();URL.revokeObjectURL(url);}
  async function cancel(){if(!grant||busy||uncertain||revoked)return;try{await revoke(grant).unwrap();setRevoked(true);setMessage("Разрешение отозвано. Это не отменяет уже выполненную операцию.");setSelected(false);}
    catch{setUncertain(true);setMessage("Отзыв не подтверждён — нужна проверка серверного реестра.");}}
  return <article className="ru-onboarding"><style>{pageStyles+shellStyles}</style>
    <h1>Новый RU-выпуск · Google-подключение</h1>
    <p>Одна операция для точного пакета. Только разрешение: публикация, GA4 и DNS здесь не запускаются. Права оператора проверяет backend.</p>
    <label htmlFor="scope">Точный scope из задания выпуска</label><br/>
    <textarea id="scope" value={raw} disabled={busy||uncertain||!!grant} onChange={e=>{setRaw(e.target.value);setScope(null);setChecked(false);setSelected(false);}} rows={12} style={{width:"100%"}}/>
    <button onClick={inspect} disabled={busy||!raw.trim()}>Проверить состав и серверный реестр</button>
    {scope&&<section aria-label="Точный объём разрешения"><h2>{scope.release.domain}</h2>
      <p>{labels[scope.operation]}</p><dl>
        <dt>Ресурс / профиль</dt><dd>{scope.propertyUrl} / {scope.googleProfile}</dd>
        <dt>Партия</dt><dd>{scope.release.batchId}</dd>
        {(["buildId","packageId","releaseReceiptSha256","sitemapSha256"] as const).map(k=><div key={k}><dt>{k}</dt><dd style={{overflowWrap:"anywhere"}}>{scope.release[k]}</dd></div>)}
        <dt>Срок</dt><dd>{new Date(scope.expiresAt*1000).toLocaleString()}</dd>
        {scope.hostId&&<><dt>Host ID</dt><dd>{scope.hostId}</dd></>}
        {scope.registrarProfile&&<><dt>Регистратор</dt><dd>{scope.registrarProfile} · TXT @ · без замены записей</dd></>}
        {scope.token&&<><dt>Точный TXT</dt><dd style={{overflowWrap:"anywhere"}}>{scope.token}</dd></>}
      </dl><label><input type="checkbox" checked={selected} disabled={busy||uncertain||!!grant} onChange={e=>setSelected(e.target.checked)}/> Одобрить эту операцию для указанного выпуска</label><br/>
      <button onClick={approve} disabled={!checked||!selected||busy||uncertain||!!grant}>Сохранить разрешение</button>
    </section>}
    {grant&&<section><p>Разрешение {grant.grantId}</p><button onClick={download} disabled={revoked||uncertain}>Скачать для привязки к очереди</button> <button onClick={cancel} disabled={busy||uncertain||revoked}>Отозвать</button></section>}
    <p role="status">{message}</p>
  </article>;
}
