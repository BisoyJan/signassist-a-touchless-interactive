"use client";

import { useCallback, useRef, useState } from "react";

interface UseSpeechOutputOptions {
  language?: "en" | "fil";
  rate?: number;
  onStart?: () => void;
  onEnd?: () => void;
}

export function useSpeechOutput(options: UseSpeechOutputOptions = {}) {
  const { language = "en", rate = 0.9, onStart, onEnd } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support on first call
  const checkSupport = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setIsSupported(false);
      return false;
    }
    return true;
  }, []);

  // Speak the given text
  const speak = useCallback(
    (text: string, lang?: "en" | "fil") => {
      if (!checkSupport()) return;

      // Cancel any current speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const targetLang = lang || language;

      utterance.lang = targetLang === "fil" ? "fil" : "en-US";
      utterance.rate = rate;
      utterance.volume = 1.0;
      utterance.pitch = 1.0;

      // Try to find a good voice
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = targetLang === "fil" ? "fil" : "en";
      const preferredVoice = voices.find(
        (v) =>
          v.lang.startsWith(langPrefix) &&
          (v.name.includes("Google") || v.name.includes("Microsoft"))
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        onStart?.();
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [language, rate, checkSupport, onStart, onEnd]
  );

  // Stop speaking
  const stop = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
  };
}
