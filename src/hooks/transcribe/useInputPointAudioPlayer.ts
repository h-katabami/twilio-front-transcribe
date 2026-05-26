import { useCallback, useEffect, useRef, useState } from "react";
import type { InputPoint } from "../../types/transcribe/domain.ts";

type UseInputPointAudioPlayerParams = {
  resetKey?: string;
  recordingUrl?: string;
};

function parseSeconds(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null;
  }

  return seconds;
}

export function useInputPointAudioPlayer(params: UseInputPointAudioPlayerParams) {
  const { resetKey, recordingUrl } = params;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeInputPointIndex, setActiveInputPointIndex] = useState<number | null>(null);
  const [activeInputPointEndTime, setActiveInputPointEndTime] = useState<number | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const onTimeUpdate = () => {
      if (activeInputPointEndTime === null) {
        return;
      }

      if (audio.currentTime >= activeInputPointEndTime) {
        audio.pause();
        setActiveInputPointEndTime(null);
        setActiveInputPointIndex(null);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [activeInputPointEndTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
    }
    setActiveInputPointIndex(null);
    setActiveInputPointEndTime(null);
  }, [resetKey, recordingUrl]);

  const onInputPointPlayToggle = useCallback(
    (inputPoint: InputPoint, index: number) => {
      const audio = audioRef.current;
      if (!audio || !recordingUrl) {
        return;
      }

      if (audio.src !== recordingUrl) {
        audio.src = recordingUrl;
      }

      if (activeInputPointIndex === index && !audio.paused) {
        audio.pause();
        setActiveInputPointIndex(null);
        setActiveInputPointEndTime(null);
        return;
      }

      const startTime = parseSeconds(inputPoint.startTime);
      const endTime = parseSeconds(inputPoint.endTime);

      if (startTime !== null) {
        audio.currentTime = startTime;
      }

      if (startTime !== null && endTime !== null && endTime > startTime) {
        setActiveInputPointEndTime(endTime);
      } else {
        setActiveInputPointEndTime(null);
      }

      setActiveInputPointIndex(index);
      void audio.play().catch(() => {
        setActiveInputPointIndex(null);
      });
    },
    [activeInputPointIndex, recordingUrl],
  );

  return {
    audioRef,
    activeInputPointIndex,
    onInputPointPlayToggle,
    hasPlayableAudio: Boolean(recordingUrl),
  };
}
