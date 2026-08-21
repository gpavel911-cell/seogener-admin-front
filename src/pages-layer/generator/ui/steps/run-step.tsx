"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styled from "styled-components";
import {
  useGetGeneratorProjectQuery,
  useIssueGeneratorStreamTicketMutation,
  useRunGeneratorProjectMutation,
  useStopGeneratorProjectMutation,
} from "@entities/generator/api";
import type { GeneratorLogEvent, GeneratorProjectSnapshot, GeneratorStreamStage, GeneratorStreamStatus } from "@entities/generator/types";
import { API_ROUTES } from "@shared/config/api-routes";
import { useEventSource } from "@shared/lib/use-event-source";
import { Button, Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow, TableWrapper, useToast } from "@shared/ui";
import { apiErrorMessage } from "../../lib/api-error";
import { formatRunAt, STREAM_STAGE_LABEL, STREAM_STATUS_LABEL, wizardHref } from "../../lib/wizard";
import { WizardHint } from "../fields";

type Props = {
  snapshot: GeneratorProjectSnapshot;
  onSaved: (next: GeneratorProjectSnapshot) => void;
};

type DomainRow = {
  domain: string;
  stage: GeneratorStreamStage | null;
  status: GeneratorStreamStatus;
  time: string | null;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const TICKET_REFRESH_AFTER_MS = 50_000;

function asStreamStage(value: string | undefined | null): GeneratorStreamStage | null {
  if (!value) return null;
  const upper = value.toUpperCase() as GeneratorStreamStage;
  return ["CONTENT", "IMAGES", "BUILD", "DEPLOY"].includes(upper) ? upper : null;
}

function asStreamStatus(value: string | undefined | null): GeneratorStreamStatus | null {
  if (!value) return null;
  const upper = value.toUpperCase() as GeneratorStreamStatus;
  return ["WAITING", "RUNNING", "DONE", "ERROR"].includes(upper) ? upper : null;
}

function statusRank(status: GeneratorStreamStatus): number {
  if (status === "WAITING") return 0;
  if (status === "RUNNING") return 1;
  return 2;
}

function rowsFromSnapshot(snapshot: GeneratorProjectSnapshot): DomainRow[] {
  return snapshot.domains.map((item) => ({
    domain: item.domain,
    stage: asStreamStage(item.stage),
    status: asStreamStatus(item.status) ?? "WAITING",
    time: item.lastRunAt ?? null,
  }));
}

function mergeDomainRows(view: GeneratorProjectSnapshot, current: DomainRow[]): DomainRow[] {
  const persisted = rowsFromSnapshot(view);
  const liveByDomain = new Map(current.map((row) => [row.domain, row]));
  const seen = new Set(persisted.map((row) => row.domain));
  const merged = persisted.map((row) => {
    const live = liveByDomain.get(row.domain);
    if (!live) {
      return row;
    }
    if (statusRank(row.status) >= statusRank(live.status)) {
      return {
        ...row,
        stage: row.stage ?? live.stage,
        time: row.time ?? live.time,
      };
    }
    return {
      ...live,
      time: live.time ?? row.time,
    };
  });
  return [...merged, ...current.filter((row) => !seen.has(row.domain))];
}

function waitingRows(snapshot: GeneratorProjectSnapshot): DomainRow[] {
  return snapshot.domains.map((item) => ({
    domain: item.domain,
    stage: null,
    status: "WAITING" as const,
    time: null,
  }));
}

export function RunStep({ snapshot, onSaved }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [forceRegenerate, setForceRegenerate] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [rows, setRows] = useState<DomainRow[]>(() => rowsFromSnapshot(snapshot));
  const logRef = useRef<HTMLDivElement | null>(null);
  const replayLinesRef = useRef<string[]>([]);
  const acceptReplayRef = useRef(true);
  const ticketIssuedAtRef = useRef(0);
  const [runProject, { isLoading: isStarting }] = useRunGeneratorProjectMutation();
  const [stopProject, { isLoading: isStopping }] = useStopGeneratorProjectMutation();
  const [issueTicket] = useIssueGeneratorStreamTicketMutation();
  const live = useGetGeneratorProjectQuery(snapshot.id, {
    pollingInterval: 4000,
  });
  const view = live.data ?? snapshot;

  const refreshTicket = useCallback(async () => {
    try {
      const next = await issueTicket(snapshot.id).unwrap();
      ticketIssuedAtRef.current = Date.now();
      setTicket(next.ticket);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось получить поток логов.") });
    }
  }, [issueTicket, showToast, snapshot.id]);

  useEffect(() => {
    void refreshTicket();
  }, [refreshTicket]);

  useEffect(() => {
    if (isStarting || view.running) {
      return;
    }
    setRows((current) => mergeDomainRows(view, current));
  }, [isStarting, view]);

  const streamUrl = ticket ? `${apiBaseUrl}${API_ROUTES.GENERATOR.RUN_STREAM(snapshot.id)}?ticket=${encodeURIComponent(ticket)}` : null;

  const applyRowEvent = useCallback((event: GeneratorLogEvent) => {
    if (!event.domain) {
      return;
    }
    const stage = asStreamStage(event.stage);
    const status = asStreamStatus(event.status) ?? "RUNNING";
    setRows((current) => {
      const exists = current.some((item) => item.domain === event.domain);
      const nextRow: DomainRow = {
        domain: event.domain as string,
        stage,
        status,
        time: event.time ?? null,
      };
      if (!exists) {
        return [...current, nextRow];
      }
      return current.map((item) => (item.domain === event.domain ? { ...item, ...nextRow } : item));
    });
  }, []);

  const handleMessage = useCallback((data: unknown) => {
    const event = (data ?? {}) as GeneratorLogEvent;
    if (event.replay) {
      if (!acceptReplayRef.current) {
        return;
      }
      if (event.msg) {
        replayLinesRef.current = [...replayLinesRef.current.slice(-400), event.msg];
        setLines(replayLinesRef.current);
      }
      applyRowEvent(event);
      return;
    }
    acceptReplayRef.current = false;
    if (event.msg) {
      setLines((current) => [...current.slice(-400), event.msg as string]);
    }
    applyRowEvent(event);
  }, [applyRowEvent]);

  const { error: streamError } = useEventSource(streamUrl, {
    onOpen: () => {
      replayLinesRef.current = [];
      acceptReplayRef.current = true;
    },
    onMessage: handleMessage,
    onTransportError: () => {
      if (Date.now() - ticketIssuedAtRef.current >= TICKET_REFRESH_AFTER_MS) {
        void refreshTicket();
      }
    },
  });

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines]);

  const stepsComplete = Boolean(
    view.completedSteps.project
      && view.completedSteps.brief
      && view.completedSteps.keywords
      && view.completedSteps.domains
      && view.completedSteps.design
      && view.completedSteps.seo,
  );
  const resultsEnabled = Boolean(view.lastRunAt) && !view.running;
  const depthLabel = view.seoSettings?.contentDepth === "EXPERT" ? "Экспертный" : "Подробный";

  const handleStart = async () => {
    const previous = view;
    acceptReplayRef.current = false;
    replayLinesRef.current = [];
    setLines([]);
    setRows(waitingRows(view));
    onSaved({ ...view, running: true, status: "RUNNING" });
    try {
      const next = await runProject({ id: snapshot.id, forceRegenerate }).unwrap();
      onSaved(next);
    } catch (error) {
      onSaved(previous);
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось запустить генерацию.") });
    }
  };

  const handleStop = async () => {
    try {
      const next = await stopProject(snapshot.id).unwrap();
      onSaved(next);
    } catch (error) {
      showToast({ variant: "error", message: apiErrorMessage(error, "Не удалось остановить генерацию.") });
    }
  };

  return (
    <Layout>
      <SideCard>
        <Block>
          <Label>Дизайн</Label>
          <Value>{view.design?.name || (view.design?.phase === "approved" ? "Утверждён" : "Не выбран")}</Value>
        </Block>
        <Block>
          <Label>Глубина контента</Label>
          <Value>{depthLabel}</Value>
        </Block>
        <Block>
          <Label>Доменов в очереди</Label>
          <Value>{view.domainCount}</Value>
        </Block>
        {view.lastRunAt ? (
          <Block>
            <Label>Последний запуск</Label>
            <Value>{formatRunAt(view.lastRunAt)}</Value>
          </Block>
        ) : null}
        <label>
          <input type="checkbox" checked={forceRegenerate} onChange={(event) => setForceRegenerate(event.target.checked)} />{" "}
          Принудительная регенерация
        </label>
        <Button type="button" variant="primary" disabled={!stepsComplete || view.running || isStarting} onClick={() => void handleStart()}>
          Запустить
        </Button>
        <Button type="button" disabled={!view.running || isStopping} onClick={() => void handleStop()}>
          Остановить
        </Button>
        <Button type="button" disabled={!resultsEnabled} onClick={() => router.push(wizardHref(snapshot.id, "RESULTS"))}>
          Перейти к результатам
        </Button>
      </SideCard>
      <Main>
        {streamError ? <WizardHint>{streamError}</WizardHint> : null}
        <LogBox ref={logRef}>
          {lines.length ? lines.map((line, index) => <LogLine key={index}>{line}</LogLine>) : <WizardHint>Лог появится после запуска.</WizardHint>}
        </LogBox>
        <TableWrapper>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>Домен</TableHeaderCell>
                <TableHeaderCell>Этап</TableHeaderCell>
                <TableHeaderCell>Статус</TableHeaderCell>
                <TableHeaderCell>Время</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.domain}>
                  <TableCell>{row.domain}</TableCell>
                  <TableCell>{row.stage ? STREAM_STAGE_LABEL[row.stage] : "—"}</TableCell>
                  <TableCell>{STREAM_STATUS_LABEL[row.status]}</TableCell>
                  <TableCell>{formatRunAt(row.time) || row.time || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableWrapper>
      </Main>
    </Layout>
  );
}

const Layout = styled.div`
  display: flex;
  gap: 16px;
  min-height: 0;
  align-items: stretch;
`;

const SideCard = styled.div`
  width: 250px;
  min-width: 250px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  border-radius: ${({ theme }) => theme.tokens.radius.md};
  background: ${({ theme }) => theme.tokens.color.bgSurface};
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.tokens.color.textSecondary};
`;

const Value = styled.div`
  font-size: 14px;
  font-weight: 500;
`;

const LogBox = styled.div`
  height: 280px;
  overflow: auto;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.tokens.color.borderSubtle};
  background: #0f172a;
  color: #e2e8f0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
`;

const LogLine = styled.div`
  white-space: pre-wrap;
`;
