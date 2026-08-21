import { useEffect, useRef, useState } from "react";

type UseEventSourceOptions = {
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onTransportError?: () => void;
};

export function useEventSource(url: string | null, { onMessage, onOpen, onTransportError }: UseEventSourceOptions) {
  const [error, setError] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onTransportErrorRef = useRef(onTransportError);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onTransportErrorRef.current = onTransportError;
  }, [onMessage, onOpen, onTransportError]);

  useEffect(() => {
    if (!url) {
      setError(null);
      return;
    }
    let closed = false;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let errorTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      if (closed) {
        return;
      }
      source = new EventSource(url);
      source.onopen = () => {
        onOpenRef.current?.();
      };
      source.onmessage = (event) => {
        if (errorTimer) {
          clearTimeout(errorTimer);
          errorTimer = null;
        }
        setError(null);
        try {
          onMessageRef.current(JSON.parse(event.data) as unknown);
        } catch {
          onMessageRef.current({ msg: event.data });
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) {
          return;
        }
        if (!errorTimer) {
          errorTimer = setTimeout(() => {
            if (!closed) {
              setError("Соединение с логом потеряно. Повторная попытка...");
            }
          }, 1500);
        }
        onTransportErrorRef.current?.();
        reconnectTimer = setTimeout(connect, 2000);
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      if (errorTimer) {
        clearTimeout(errorTimer);
      }
      source?.close();
    };
  }, [url]);

  return { error };
}
