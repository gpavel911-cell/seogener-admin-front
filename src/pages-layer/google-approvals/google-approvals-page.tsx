"use client";

import { useState } from "react";
import styled from "styled-components";
import { baseApi } from "@shared/store/base-api";

type Scope = { projectId: "booking-trip"; domain: string; operation: "ga_setup" | "gsc_sitemap";
  inputSha256: string; packageSha256: string; previewRunId: string | null;
  releaseReceiptSha256: string | null; expiresAt: number };
type Approval = { approvalId: string; scope: Scope; approvedBy: number; issuedAt: number };
type Row = { approval: Approval; status: "approved" | "expired" | "revoked" };
const api = baseApi.injectEndpoints({ endpoints: (build) => ({
  googleApprovalCapabilities: build.query<{ canApprove: boolean; canExecute: boolean }, void>({
    query: () => "/api/v1/pipeline/google-approvals/capabilities" }),
  googleApprovals: build.query<{ items: Row[]; total: number; hasMore: boolean }, void>({
    query: () => "/api/v1/pipeline/google-approvals" }),
  issueGoogleApproval: build.mutation<Approval, Scope>({
    query: (body) => ({ url: "/api/v1/pipeline/google-approvals", method: "POST", body }) }),
  revokeGoogleApproval: build.mutation<{ revoked: boolean }, string>({
    query: (id) => ({ url: `/api/v1/pipeline/google-approvals/${id}/revoke`, method: "POST" }) }),
}) });

function readRequests(value: unknown): Scope[] {
  if (!value || typeof value !== "object") throw new Error("Ожидается JSON-манифест GoogleApprovalBatch.");
  const batch = value as { contract?: string; schema_version?: number; project_id?: string; requests?: Scope[] };
  if (batch.contract !== "GoogleApprovalBatch" || batch.schema_version !== 1 || batch.project_id !== "booking-trip"
      || !Array.isArray(batch.requests) || !batch.requests.length || batch.requests.length > 200)
    throw new Error("Нужен манифест Booking/Trip на 1–200 объектов, не список доменов.");
  const seen = new Set<string>();
  for (const row of batch.requests) {
    if (row.projectId !== "booking-trip" || !/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(row.domain ?? "")
        || !/^[a-f0-9]{64}$/.test(row.inputSha256 ?? "") || !/^[a-f0-9]{64}$/.test(row.packageSha256 ?? "")
        || !["ga_setup", "gsc_sitemap"].includes(row.operation)) throw new Error("Некорректный домен, операция или хеш пакета.");
    if (row.operation === "gsc_sitemap" && (!/^[a-f0-9]{32}$/.test(row.previewRunId ?? "")
        || !/^[a-f0-9]{64}$/.test(row.releaseReceiptSha256 ?? ""))) throw new Error("Для sitemap нужен подтверждённый выпуск.");
    if (row.operation === "ga_setup" && (row.previewRunId != null || row.releaseReceiptSha256 != null))
      throw new Error("GA4 требует отдельного одобрения до финальной сборки.");
    const key = row.domain + ":" + row.operation;
    if (seen.has(key)) throw new Error("Повтор домена и операции в манифесте.");
    seen.add(key);
  }
  return batch.requests;
}

const operation = (name: string) => name === "ga_setup" ? "Подготовка GA4" : "Отправка sitemap";
const stateLabel = { approved: "Действует", expired: "Истекло", revoked: "Отозвано" };

export function GoogleApprovalsPage() {
  const rights = api.useGoogleApprovalCapabilitiesQuery();
  const records = api.useGoogleApprovalsQuery(undefined, { skip: !rights.data?.canApprove });
  const [issue] = api.useIssueGoogleApprovalMutation();
  const [revoke] = api.useRevokeGoogleApprovalMutation();
  const [requests, setRequests] = useState<Scope[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [message, setMessage] = useState("");
  const toggle = (index: number) => setSelected((old) => { const next = new Set(old); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  async function upload(file?: File) {
    setMessage("");
    try {
      if (!file || file.size > 256000) throw new Error("Выберите JSON-файл до 256 КБ.");
      const parsed = readRequests(JSON.parse(await file.text())); setRequests(parsed); setSelected(new Set());
    } catch (error) { setRequests([]); setSelected(new Set()); setMessage(error instanceof Error ? error.message : "Не удалось прочитать файл."); }
  }
  async function approve() {
    if (busy || uncertain || !selected.size) return;
    setBusy(true); setMessage(""); let count = 0;
    try {
      for (const index of [...selected].sort((a, b) => a - b)) {
        await issue({ ...requests[index], expiresAt: Math.floor(Date.now() / 1000) + hours * 3600 }).unwrap();
        count++; setSelected((old) => { const next = new Set(old); next.delete(index); return next; });
      }
      setMessage(`Сохранено одобрений: ${count}. Google-операции не запускались.`);
    } catch { setUncertain(true); setMessage(`Сохранено: ${count}. Следующий результат не подтверждён. Обновите реестр перед повтором; автоматического повтора нет.`); }
    finally { setBusy(false); records.refetch(); }
  }
  async function refresh() {
    const result = await records.refetch();
    const data = result.data;
    if (!data) return;
    if (uncertain && data.hasMore) {
      setMessage("Реестр содержит больше 200 записей. Неопределённый результат требует проверки оператором; повтор заблокирован.");
      return;
    }
    setSelected((old) => new Set([...old].filter((i) => !data.items.some(({ approval: a, status }) =>
      status === "approved" && a.scope.domain === requests[i]?.domain && a.scope.operation === requests[i]?.operation
      && a.scope.inputSha256 === requests[i]?.inputSha256 && a.scope.packageSha256 === requests[i]?.packageSha256
      && a.scope.previewRunId === requests[i]?.previewRunId
      && a.scope.releaseReceiptSha256 === requests[i]?.releaseReceiptSha256))));
    setUncertain(false);
  }
  async function withdraw(id: string) {
    if (busy) return; setBusy(true);
    try { await revoke(id).unwrap(); setMessage("Одобрение отозвано. Уже выполненные действия этим не отменяются."); }
    catch { setMessage("Отзыв не подтверждён — обновите реестр."); }
    finally { setBusy(false); records.refetch(); }
  }
  return <Panel>
    <header><p className="eyebrow">BOOKING / TRIP · КОНТРОЛЬ GOOGLE</p><h1>Одобрения Google-шагов</h1>
      <p>Разрешение на точный домен и пакет, не запуск публикации. Google-доступ остаётся на сервере.</p></header>
    <aside className="notice"><strong>Исполнение пока выключено</strong><span>GA4 и sitemap не запускаются этой кнопкой. Яндекс-проект и ранее выпущенные сайты не меняются.</span></aside>
    {rights.isLoading ? <p role="status">Проверяем права оператора…</p> : rights.error ?
      <p role="alert">Доступ ограничен учёткой admin@example.com. Если сессия истекла, войдите заново.</p> : <>
      <section className="card"><h2>Новые одобрения</h2><p>Загрузите манифест генератора с доменами, действиями и хешами. Пароли, токены и ключи не нужны.</p>
        <label className="file">Манифест JSON<input disabled={busy} type="file" accept=".json,application/json" onChange={(e) => { void upload(e.target.files?.[0]); }} /></label>
        {!!requests.length && <><div className="toolbar"><button disabled={busy} onClick={() => setSelected(new Set(requests.map((_, i) => i)))}>Выбрать все</button><button disabled={busy} onClick={() => setSelected(new Set())}>Снять выбор</button><span>Выбрано {selected.size} из {requests.length}</span></div>
          <div className="requests">{requests.map((row, i) => <label className="request" key={`${row.domain}:${row.operation}`}><input disabled={busy} type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} /><span><strong>{row.domain}</strong><small>{operation(row.operation)} · пакет {row.packageSha256.slice(0, 12)}</small></span></label>)}</div>
          <div className="toolbar"><label>Срок <select disabled={busy} value={hours} onChange={(e) => setHours(Number(e.target.value))}><option value={24}>24 часа</option><option value={72}>3 дня</option><option value={168}>7 дней</option></select></label><button className="primary" disabled={busy || uncertain || !selected.size} onClick={() => { void approve(); }}>{busy ? "Сохраняем…" : `Одобрить выбранные · ${selected.size}`}</button></div></>}
      </section>
      <section className="card"><div className="toolbar"><h2>Серверный реестр · {records.data?.total ?? "—"}</h2><button disabled={busy || records.isFetching} onClick={() => { void refresh(); }}>Обновить</button></div>
        {records.error ? <p role="alert">Не удалось получить реестр. Это не означает, что одобрений нет.</p> : records.isLoading ? <p>Загружаем…</p> : !records.data?.items.length ? <p>Одобрений пока нет. Ничего не запускается автоматически.</p> :
          <div className="records">{records.data.items.map(({ approval: a, status }) => <article key={a.approvalId} className="record"><div><strong>{a.scope.domain}</strong><p>{operation(a.scope.operation)} · пакет {a.scope.packageSha256.slice(0, 12)}</p><small>До {new Date(a.scope.expiresAt * 1000).toLocaleString("ru-RU")} · ID {a.approvalId}</small></div><span className="state">{stateLabel[status]}</span>{status === "approved" && <button disabled={busy} onClick={() => { void withdraw(a.approvalId); }}>Отозвать</button>}</article>)}</div>}
        {records.data?.hasMore && <p>Показаны последние 200 записей.</p>}
      </section>
    </>}
    {message && <p className="message" role="status">{message}</p>}
  </Panel>;
}

const Panel = styled.main`
  max-width:1120px;width:100%;padding:28px;box-sizing:border-box;color:#172b4d;
  h1{font-size:28px;margin:8px 0 12px} h2{font-size:19px;margin:0} p{line-height:1.6;color:#52647c}
  .eyebrow{font-size:12px;letter-spacing:.12em;font-weight:700;color:#2563eb}
  .notice{display:flex;flex-direction:column;gap:8px;background:#edf4ff;border:1px solid #c4d9fa;padding:18px;border-radius:14px;margin:22px 0}
  .card{background:#fff;border:1px solid #dbe4ef;border-radius:16px;padding:22px;margin:20px 0}
  .file{display:grid;gap:10px;max-width:540px} input[type=file]{border:1px dashed #9db4d1;padding:16px;border-radius:10px;width:100%;box-sizing:border-box}
  button,select{font:inherit;min-height:40px;padding:9px 14px;border-radius:9px;border:1px solid #cbd8e9;background:#fff;color:#203c63;cursor:pointer}
  button:disabled{opacity:.5;cursor:not-allowed}.primary{background:#2563eb;color:white;border-color:#2563eb}
  button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #8db7f8;outline-offset:2px}
  .toolbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:16px 0}.toolbar h2{flex:1}.toolbar label{display:flex;align-items:center;gap:10px}
  .requests{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin:18px 0}
  .request{display:flex;gap:12px;align-items:center;border:1px solid #dbe4ef;padding:15px;border-radius:10px;cursor:pointer}.request small{display:block;margin-top:6px;color:#60738f}
  input[type=checkbox]{width:18px;height:18px;flex-shrink:0}.records{display:grid;gap:12px}.record{display:flex;align-items:center;gap:16px;padding:18px;border:1px solid #dbe4ef;border-radius:12px}.record>div{flex:1;min-width:0}.record p{margin:5px 0}.record small{overflow-wrap:anywhere;color:#667a94}.state{background:#eef3f9;padding:6px 10px;border-radius:20px;font-size:13px}.message{padding:16px;border-radius:10px;background:#f1f5fa}
  @media(max-width:650px){padding:18px 12px;.card{padding:16px}.record{flex-wrap:wrap}.record>div{flex-basis:100%}h1{font-size:24px}}
`;
