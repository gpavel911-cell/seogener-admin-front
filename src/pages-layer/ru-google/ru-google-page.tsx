"use client";
import { useState } from "react";
import styled from "styled-components";
import { baseApi } from "@shared/store/base-api";

type Scope={domain:string;propertyUrl:string;sitemapSha256:string;expiresAt:number};
type Check={domain:string;status:string;propertyUrl?:string;sitemapSha256?:string;urlCount?:number};
type Approval={approvalId:string;scope:Scope;issuedAt:number};
type RecordRow={approval:Approval;status:string;executionStatus?:string};
const api=baseApi.injectEndpoints({endpoints:(b)=>({
  ruGoogleCapabilities:b.query<{canApprove:boolean;canExecute:boolean},void>({query:()=>"/api/v1/pipeline/ru-google/capabilities"}),
  ruGoogleCheck:b.query<Check,string>({query:(domain)=>({url:"/api/v1/pipeline/ru-google/preflight",params:{domain}})}),
  ruGoogleRecords:b.query<{items:RecordRow[];total:number;hasMore:boolean},void>({query:()=>"/api/v1/pipeline/ru-google/approvals"}),
  ruGoogleApprove:b.mutation<Approval,Scope>({query:(body)=>({url:"/api/v1/pipeline/ru-google/approvals",method:"POST",body})}),
  ruGoogleRevoke:b.mutation<{revoked:boolean},string>({query:(id)=>({url:`/api/v1/pipeline/ru-google/approvals/${id}/revoke`,method:"POST"})}),
  ruGoogleExecute:b.mutation<{status:string;googleWrites:boolean},{id:string;scope:Scope}>({query:({id,scope})=>({url:`/api/v1/pipeline/ru-google/approvals/${id}/execute`,method:"POST",body:scope})}),
})});

export function RuGooglePage(){
  const rights=api.useRuGoogleCapabilitiesQuery();
  const registry=api.useRuGoogleRecordsQuery(undefined,{skip:!rights.data?.canApprove});
  const [check]=api.useLazyRuGoogleCheckQuery();const [approve]=api.useRuGoogleApproveMutation();
  const [revoke]=api.useRuGoogleRevokeMutation();const [execute]=api.useRuGoogleExecuteMutation();
  const [text,setText]=useState("altay-cosmos-resort.ru\namur-khabarovsk.ru\naquaterm-mashuk.ru\nataman-temryuk.ru\nay-petri-crimea.ru");
  const [rows,setRows]=useState<Check[]>([]);const [selected,setSelected]=useState<Set<string>>(new Set());
  const [busy,setBusy]=useState(false);const [uncertain,setUncertain]=useState(false);const [message,setMessage]=useState("");
  async function inspect(){
    const domains=[...new Set(text.split(/[\s,;]+/).filter(Boolean))];
    if(!domains.length||domains.length>20||domains.some(d=>d.length>253||!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+ru$/.test(d))){setMessage("Укажите до 20 точных .ru доменов, по одному на строку.");return;}
    setBusy(true);setRows([]);setSelected(new Set());setMessage("");
    for(const domain of domains){
      setRows(old=>[...old,{domain,status:"checking"}]);
      let result:Check;try{result=await check(domain,false).unwrap();}catch{result={domain,status:"check_failed"};}
      setRows(old=>old.map(row=>row.domain===domain?result:row));
    }
    setBusy(false);
  }
  async function issue(){
    if(busy||uncertain||!selected.size)return;setBusy(true);setMessage("");let count=0;
    try{for(const row of rows.filter(r=>selected.has(r.domain))){
      if(!row.propertyUrl||!row.sitemapSha256||row.status!=="preflight_passed")throw new Error();
      await approve({domain:row.domain,propertyUrl:row.propertyUrl,sitemapSha256:row.sitemapSha256,expiresAt:Math.floor(Date.now()/1000)+86400}).unwrap();
      count++;setSelected(old=>{const n=new Set(old);n.delete(row.domain);return n;});
    }setMessage(`Одобрено ${count}. Отправка в Google ещё не выполнялась.`);}
    catch{setUncertain(true);setMessage(`Сохранено ${count}. Последний результат не подтверждён. Обновите реестр; автоматического повтора нет.`);}
    finally{setBusy(false);void registry.refetch();}
  }
  async function refresh(){
    const result=await registry.refetch();if(!result.data)return;
    if(uncertain&&result.data.hasMore){setMessage("Неопределённый результат требует проверки полного реестра; повтор заблокирован.");return;}
    const items=result.data.items;
    setSelected(old=>new Set([...old].filter(domain=>!items.some(r=>r.status==="approved"&&r.approval.scope.domain===domain
      &&rows.some(row=>row.domain===domain&&row.propertyUrl===r.approval.scope.propertyUrl&&row.sitemapSha256===r.approval.scope.sitemapSha256)))));
    setUncertain(false);
  }
  async function act(row:RecordRow,action:"execute"|"revoke"){
    if(busy)return;setBusy(true);
    try{if(action==="revoke"){await revoke(row.approval.approvalId).unwrap();setMessage("Одобрение отозвано. Уже начатые или завершённые отправки этим не отменяются.");}
      else{const r=await execute({id:row.approval.approvalId,scope:row.approval.scope}).unwrap();setMessage(r.status==="already_submitted"?"Этот sitemap уже отправлен; повторного запроса не было.":"Sitemap отправлен. Это не гарантия индексации страниц.");}}
    catch{setMessage(action==="execute"?"Отправка не подтверждена. Не повторяйте её автоматически: проверьте реестр и результат операции.":"Отзыв не подтверждён — обновите реестр.");}
    finally{setBusy(false);void registry.refetch();}
  }
  const labels:Record<string,string>={checking:"Проверяется",preflight_passed:"Права и sitemap подтверждены",verified_property_required:"Нужны полные права Google",check_failed:"Проверка не завершена — не означает отсутствие данных"};
  return <Panel><p className="eyebrow">ДЕЙСТВУЮЩИЕ .RU ОТЕЛИ · SEARCH CONSOLE</p><h1>Google для .ru отелей</h1>
    <p>Отдельная очередь: только проверка прав и отправка точного sitemap. GA4, DNS, страницы сайта и подключения Яндекса не меняются.</p>
    <aside>Одобрение действует 24 часа и привязано к домену, ресурсу Google и хешу sitemap. Перед отправкой всё проверяется заново.</aside>
    {rights.isLoading?<p>Проверяем доступ…</p>:rights.error?<p role="alert">Нет доступа или серверная проверка недоступна. Требуется активная учётка оператора.</p>:<>
      <section><h2>1. Проверить сайты</h2><label>Домены — до 20 за проверку<textarea disabled={busy} rows={5} value={text} onChange={e=>setText(e.target.value)} /></label>
        <button disabled={busy} onClick={()=>{void inspect();}}>Проверить права и sitemap</button><small>Только чтение, без отправки и создания ресурсов Google.</small>
        {!!rows.length&&<><div className="toolbar"><button disabled={busy} onClick={()=>setSelected(new Set(rows.filter(r=>r.status==="preflight_passed").map(r=>r.domain)))}>Выбрать готовые</button><button disabled={busy} onClick={()=>setSelected(new Set())}>Снять выбор</button></div>
          {rows.map(row=><label className="row" key={row.domain}><input type="checkbox" disabled={busy||row.status!=="preflight_passed"} checked={selected.has(row.domain)} onChange={()=>setSelected(old=>{const n=new Set(old);n.has(row.domain)?n.delete(row.domain):n.add(row.domain);return n;})}/><span><strong>{row.domain}</strong><small>{labels[row.status]??row.status}</small>{row.sitemapSha256&&<small>{row.urlCount} URL · SHA {row.sitemapSha256.slice(0,16)}</small>}</span></label>)}
          <button className="primary" disabled={busy||uncertain||!selected.size} onClick={()=>{void issue();}}>Одобрить выбранные · {selected.size}</button></>}
      </section>
      <section><div className="toolbar"><h2>2. Одобрения и отправка · {registry.data?.total??"—"}</h2><button disabled={busy||registry.isFetching} onClick={()=>{void refresh();}}>Обновить</button></div>
        <aside>{rights.data?.canExecute?"Отправка доступна только для действующего точного одобрения.":"Исполнение пока выключено. Можно проверить сайты и сохранить одобрения; Google-запрос PUT не запускается."}</aside>
        {registry.error?<p role="alert">Реестр недоступен — это не означает, что он пуст.</p>:registry.isLoading?<p>Загружаем…</p>:!registry.data?.items.length?<p>Одобрений пока нет.</p>:registry.data.items.map(row=><article className="record" key={row.approval.approvalId}>
          <strong>{row.approval.scope.domain}</strong><small>{row.approval.scope.propertyUrl} · SHA {row.approval.scope.sitemapSha256.slice(0,16)}</small>
          <small>До {new Date(row.approval.scope.expiresAt*1000).toLocaleString("ru-RU")} · {row.status} · {row.executionStatus??"not_started"}</small>
          {row.status==="approved"&&<div className="toolbar"><button disabled={busy||!rights.data?.canExecute||row.executionStatus==="unknown"||row.executionStatus==="submitted"} onClick={()=>{void act(row,"execute");}}>Отправить sitemap</button><button disabled={busy} onClick={()=>{void act(row,"revoke");}}>Отозвать</button></div>}</article>)}
        {registry.data?.hasMore&&<p>Показаны последние 200 записей. Неопределённые результаты требуют полного реестра.</p>}
      </section>
    </>}{message&&<p role="status" className="message">{message}</p>}
  </Panel>;
}
const Panel=styled.main`
  max-width:1100px;padding:28px;color:#172b4d;box-sizing:border-box;width:100%;
  h1{font-size:28px}h2{font-size:20px}p,small{line-height:1.55}small{display:block;color:#536880;margin:6px 0;overflow-wrap:anywhere}
  .eyebrow{font-size:12px;letter-spacing:.1em;color:#2563eb;font-weight:700}section{background:#fff;border:1px solid #dbe4ef;padding:22px;margin:20px 0;border-radius:16px}
  aside,.message{padding:16px;background:#edf4ff;border:1px solid #c4d9fa;border-radius:12px;line-height:1.6}
  textarea{display:block;width:100%;box-sizing:border-box;margin:10px 0 16px;padding:12px;border:1px solid #b8cbe3;border-radius:10px;font:inherit}
  button{border:1px solid #b8cbe3;background:#fff;color:#203c63;min-height:40px;border-radius:9px;padding:10px 14px;font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:not-allowed}.primary{background:#2563eb;color:white;margin-top:16px}
  button:focus-visible,textarea:focus-visible,input:focus-visible{outline:3px solid #8db7f8;outline-offset:2px}.toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:16px 0}.toolbar h2{flex:1}
  .row{display:flex;align-items:center;gap:14px;padding:14px;border:1px solid #dbe4ef;border-radius:10px;margin:10px 0}.row input{width:18px;height:18px;flex-shrink:0}.record{padding:16px;border:1px solid #dbe4ef;border-radius:12px;margin:14px 0}
  @media(max-width:650px){padding:18px 12px;section{padding:16px}h1{font-size:24px}}
`;
