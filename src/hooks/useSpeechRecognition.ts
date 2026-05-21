
import { useState, useEffect, useRef, useCallback } from "react";

// Web Speech API type declarations (not in default TS lib)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export type SpeechStatus = "idle" | "listening" | "stopped" | "unsupported" | "denied";

export interface TranscriptLine {
  id: number;
  text: string;
  isFinal: boolean;
}

interface UseSpeechRecognitionReturn {
  status: SpeechStatus;
  transcripts: TranscriptLine[];
  interimText: string;
  start: () => void;
  stop: () => void;
  isSupported: boolean;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechStatus>("idle");
  const [transcripts, setTranscripts] = useState<TranscriptLine[]>([]);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const restartRef = useRef(false);
  const idCounterRef = useRef(0);
  const lastFinalRef = useRef("");

  const SpeechRecognitionAPI: SpeechRecognitionConstructor | undefined =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  const isSupported = !!SpeechRecognitionAPI;

  const stop = useCallback(() => {
    restartRef.current = false;
    recognitionRef.current?.stop();
    setStatus("stopped");
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setStatus("unsupported");
      return;
    }

    restartRef.current = true;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setStatus("listening");
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (text) {
            const normalized = text.toLowerCase();
            if (normalized === lastFinalRef.current) continue;
            lastFinalRef.current = normalized;
            idCounterRef.current += 1;
            const id = idCounterRef.current;
            setTranscripts(prev => [...prev.slice(-20), { id, text, isFinal: true }]);
            setInterimText("");
          }
        } else {
          interim += result[0].transcript;
        }
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setStatus("denied");
        restartRef.current = false;
      } else if (event.error === "no-speech") {
        // safe to ignore — will auto-restart
      } else {
        setStatus("stopped");
      }
      setInterimText("");
    };

    recognition.onend = () => {
      setInterimText("");
      if (restartRef.current) {
        try {
          recognition.start();
        } catch {
          // already started
        }
      } else {
        setStatus("stopped");
      }
    };

    try {
      recognition.start();
    } catch {
      setStatus("stopped");
    }
  }, [SpeechRecognitionAPI]);

  useEffect(() => {
    return () => {
      restartRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return { status, transcripts, interimText, start, stop, isSupported };
}
