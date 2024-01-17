'use client';

import { useEffect, useMemo, useState } from 'react';

import useWindowDimensions from '../hooks/useWindowDimensions';
import { BLOCK_UNIT } from './Block';
import Board from './Board';

export default function Game() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [seconds, setSeconds] = useState(0);
  const [lifes, setLifes] = useState(3);
  const [characterDead, setCharacterDead] = useState(false);
  const [characterInvulnerable, setCharacterInvulnerable] = useState(true);

  const loaded = useMemo(() => {
    if (screenWidth) {
      return true;
    }
    return false;
  }, [screenWidth]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);

    // Cleanup function to clear the interval when the component is unmounted
    return () => clearInterval(intervalId);
  }, []);

  const formatTime = (timeInSeconds: number) => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = timeInSeconds % 60;

    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
      seconds
    ).padStart(2, '0')}`;

    return formattedTime;
  };

  useEffect(() => {
    setTimeout(() => setCharacterInvulnerable(false), 3000);
  }, []);

  if (!loaded) {
    return;
  }

  const boardWidth = screenWidth - 300 - ((screenWidth - 300) % BLOCK_UNIT);
  const boardHeight = screenHeight - (screenHeight % BLOCK_UNIT);
  const cols = boardWidth / BLOCK_UNIT;
  const rows = boardHeight / BLOCK_UNIT;

  return (
    <div className="flex w-screen h-screen">
      <Board
        width={boardWidth}
        height={boardHeight}
        rows={rows}
        cols={cols}
        characterDead={characterDead}
        characterInvulnerable={characterInvulnerable}
        reduceLife={() => setLifes(lifes - 1)}
        setCharacterDead={setCharacterDead}
      />
      <div className="flex flex-col h-full w-60 ml-auto items-center">
        <div className="text-3xl mt-20">{formatTime(seconds)}</div>
        <div className="mt-3 text-2xl">Life left: {lifes}</div>

        <button
          className={`focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-10 ${
            characterDead && lifes > 0 ? 'opacity-1' : 'opacity-0'
          } transition`}
          onClick={() => {
            setCharacterDead(false);
            setCharacterInvulnerable(true);
            setTimeout(() => setCharacterInvulnerable(false), 3000);
          }}
        >
          Retry
        </button>
        <div className="mt-10 text-sm px-3 text-center">
          To defy gravity and jump,
          <br /> press the W key repeatedly
        </div>
      </div>
    </div>
  );
}
