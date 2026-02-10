"use client";

import { useRef, useCallback, useState, useEffect } from "react";

/**
 * Seconds of silence (no new letter) before the word is auto-finalized.
 * The user can also finalize early by showing a "done" gesture.
 */
const AUTO_FINALIZE_DELAY = 3;

/**
 * Minimum gap between accepting two consecutive letters (ms).
 * Prevents the same held pose from adding duplicate letters.
 */
const MIN_LETTER_GAP_MS = 1200;

interface UseWordBuilderOptions {
  /**
   * Called when the word is finalized (either by timeout or explicit confirm).
   * Receives the assembled word string.
   */
  onWordComplete?: (word: string) => void;
}

export interface WordBuilderState {
  /** Letters accumulated so far. */
  letters: string[];
  /** Joined word preview. */
  word: string;
  /** Whether a spelling session is active. */
  isSpelling: boolean;
  /** Seconds remaining before auto-finalize (null if not spelling). */
  countdown: number | null;
}

export function useWordBuilder(options: UseWordBuilderOptions = {}) {
  const { onWordComplete } = options;

  const lettersRef = useRef<string[]>([]);
  const lastLetterTimeRef = useRef<number>(0);
  const lastLetterRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep a stable ref so the timer can call the latest callback
  const onWordCompleteRef = useRef(onWordComplete);
  useEffect(() => {
    onWordCompleteRef.current = onWordComplete;
  }, [onWordComplete]);

  const [state, setState] = useState<WordBuilderState>({
    letters: [],
    word: "",
    isSpelling: false,
    countdown: null,
  });

  const syncState = useCallback(() => {
    const letters = [...lettersRef.current];
    setState({
      letters,
      word: letters.join(""),
      isSpelling: letters.length > 0,
      countdown: letters.length > 0 ? AUTO_FINALIZE_DELAY : null,
    });
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  /** Finalize the current word and reset. */
  const finalizeWord = useCallback(() => {
    clearTimers();
    const word = lettersRef.current.join("");
    if (word.length > 0) {
      onWordCompleteRef.current?.(word);
    }
    lettersRef.current = [];
    lastLetterRef.current = "";
    lastLetterTimeRef.current = 0;
    setState({ letters: [], word: "", isSpelling: false, countdown: null });
  }, [clearTimers]);

  /** Start or restart the auto-finalize countdown. */
  const restartCountdown = useCallback(() => {
    clearTimers();

    // Countdown state update
    let remaining = AUTO_FINALIZE_DELAY;
    setState((prev) => ({ ...prev, countdown: remaining }));

    countdownIntervalRef.current = setInterval(() => {
      remaining--;
      setState((prev) => ({ ...prev, countdown: Math.max(0, remaining) }));
    }, 1000);

    // Auto-finalize after delay
    timerRef.current = setTimeout(() => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      finalizeWord();
    }, AUTO_FINALIZE_DELAY * 1000);
  }, [clearTimers, finalizeWord]);

  /**
   * Add a detected letter to the word.
   * Call this when the static classifier recognizes a letter_* label.
   *
   * @param letterLabel — e.g. "letter_a", "letter_v"
   */
  const addLetter = useCallback(
    (letterLabel: string) => {
      // Extract the letter character from "letter_x"
      const char = letterLabel.replace("letter_", "").toUpperCase();
      if (char.length !== 1) return;

      const now = Date.now();

      // Debounce — don't accept the exact same letter too fast
      if (
        char === lastLetterRef.current &&
        now - lastLetterTimeRef.current < MIN_LETTER_GAP_MS
      ) {
        // Same letter held — just restart the auto-finalize countdown
        restartCountdown();
        return;
      }

      lastLetterRef.current = char;
      lastLetterTimeRef.current = now;
      lettersRef.current.push(char);
      syncState();
      restartCountdown();
    },
    [restartCountdown, syncState]
  );

  /** Remove the last letter (e.g. triggered by a "back" gesture). */
  const deleteLast = useCallback(() => {
    if (lettersRef.current.length === 0) return;
    lettersRef.current.pop();
    if (lettersRef.current.length === 0) {
      clearTimers();
      lastLetterRef.current = "";
      lastLetterTimeRef.current = 0;
      setState({ letters: [], word: "", isSpelling: false, countdown: null });
    } else {
      syncState();
      restartCountdown();
    }
  }, [clearTimers, syncState, restartCountdown]);

  /** Discard the current word without confirming. */
  const cancelWord = useCallback(() => {
    clearTimers();
    lettersRef.current = [];
    lastLetterRef.current = "";
    lastLetterTimeRef.current = 0;
    setState({ letters: [], word: "", isSpelling: false, countdown: null });
  }, [clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    /** Current spelling state. */
    ...state,
    /** Add a letter from a "letter_*" detection. */
    addLetter,
    /** Remove last letter. */
    deleteLast,
    /** Finalize the word immediately. */
    finalizeWord,
    /** Discard the word. */
    cancelWord,
  };
}
