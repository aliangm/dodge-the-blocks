'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import useWindowDimensions from '../hooks/useWindowDimensions';
import { BLOCK_UNIT } from './Block';
import Board from './Board';

export default function Game() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [seconds, setSeconds] = useState(0);
  const [lifes, setLifes] = useState(3);
  const [characterDead, setCharacterDead] = useState(false);
  const [characterInvulnerable, setCharacterInvulnerable] = useState(true);
  const [score, setScore] = useState(0);
  const [gravity, setGravity] = useState(1);
  const INTERVAL = useRef<NodeJS.Timeout>();

  const loaded = useMemo(() => {
    if (screenWidth) {
      return true;
    }
    return false;
  }, [screenWidth]);

  useEffect(() => {
    if (INTERVAL.current) {
      clearInterval(INTERVAL.current);
    }
    INTERVAL.current = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds + 1);
      setScore(score => gravity * gravity + score);
    }, 1000);

    // Cleanup function to clear the interval when the component is unmounted
    return () => clearInterval(INTERVAL.current);
  }, [gravity]);

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
        gravity={gravity}
        characterDead={characterDead}
        characterInvulnerable={characterInvulnerable}
        reduceLife={() => setLifes(lifes - 1)}
        setCharacterDead={setCharacterDead}
      />
      <div className="flex flex-col h-full w-60 ml-auto items-center">
        <div className="text-3xl mt-4">{formatTime(seconds)}</div>
        <div className="mt-3 text-2xl">Life left: {lifes}</div>

        <button
          className={`focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-5 ${
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
        <div className="mt-5 text-sm px-3 text-center">
          To defy gravity and jump,
          <br /> press the W key repeatedly
        </div>
        <div className="mt-5 text-sm">Score:</div>
        <div className="text-xl">{score}</div>
        <button
          className={`focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-2 dark:bg-purple-600 dark:hover:bg-purple-700 dark:focus:ring-purple-900 mt-10 ${
            !characterDead && lifes > 0 ? 'opacity-1' : 'opacity-0'
          } transition disabled:opacity-[50]`}
          onClick={() => {
            setGravity(2);
            setTimeout(() => {
              setGravity(1);
            }, 20000);
          }}
          disabled={gravity === 2}
        >
          Boost
        </button>
        <div className="mt-5 text-sm px-3 text-center">
          For a duration of 20 seconds, your score will increase as gravity is doubled for both the character and
          blocks.
          <br /> During this period of increased gravity, jumping for the character will become more challenging.
        </div>
        <div className="mt-5 text-sm px-3 text-center">
          Purple blocks are designated for Uniswap transactions and possess the capability to push any blocks they come
          into contact with beyond the bounds.
        </div>
      </div>
    </div>
  );
}
