import { KeyboardEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { Alchemy, AlchemySubscription, Network } from 'alchemy-sdk';

import Block, { BlockInfo } from './Block';
import { debounce } from 'lodash';
import Character, { CHARACTER_HEIGHT_MULTIPLER } from './Character';
import alchemy from '../alchemy/client';

type Props = {
  width: number;
  height: number;
  rows: number;
  cols: number;
  characterDead: boolean;
  characterInvulnerable: boolean;

  reduceLife: () => void;
  setCharacterDead: (isDead: boolean) => void;
};

export default function Board({
  width,
  height,
  rows,
  cols,
  characterDead,
  characterInvulnerable,
  setCharacterDead,
  reduceLife,
}: Props) {
  const [blocks, setBlocks] = useState<BlockInfo[]>([]);
  const [characterPosition, setCharacterPosition] = useState({ col: 0, row: rows - CHARACTER_HEIGHT_MULTIPLER });

  // Stores available row lines per each column where character can move
  const BOARD_MAP = useRef<number[]>(Array(cols).fill(rows));
  const INTERVAL = useRef<NodeJS.Timeout>();

  const boardRef = useRef<HTMLDivElement>(null);

  const handleNewTransaction = useCallback(
    (tx: any) => {
      const hash = tx.hash;
      const colIndex = Math.floor(Math.random() * cols) % cols;

      setBlocks((blocks: BlockInfo[]) => {
        const block = blocks.findIndex(block => block.hash === tx.hash);
        if (block !== -1) return blocks;

        blocks.push({ hash, row: 0, col: colIndex, width: 1, height: 1 });

        return blocks;
      });
    },
    [cols]
  );

  // Collision check between blocks and the character
  useEffect(() => {
    if (!characterDead && !characterInvulnerable) {
      for (let block of blocks) {
        if (block.row === characterPosition.row && block.col === characterPosition.col) {
          clearInterval(INTERVAL.current);
          reduceLife();
          setCharacterDead(true);
          alchemy.ws.removeAllListeners();
          break;
        }
      }
    }
  }, [blocks, characterPosition, characterDead, characterInvulnerable, setCharacterDead, reduceLife]);

  // Key press handler
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = event => {
    switch (event.key) {
      case 'a':
      case 'A':
        // There is no block on the left
        if (BOARD_MAP.current[characterPosition.col - 1] - characterPosition.row >= CHARACTER_HEIGHT_MULTIPLER) {
          setCharacterPosition(characterPosition => ({
            col: Math.max(0, characterPosition.col - 1),
            row: characterPosition.row,
          }));
        }
        break;
      case 'd':
      case 'D':
        // There is no block on the right
        if (BOARD_MAP.current[characterPosition.col + 1] - characterPosition.row >= CHARACTER_HEIGHT_MULTIPLER) {
          setCharacterPosition(characterPosition => ({
            col: Math.min(cols - 1, characterPosition.col + 1),
            row: characterPosition.row,
          }));
        }
        break;
      case 'w':
      case 'W':
        setCharacterPosition(characterPosition => ({
          col: characterPosition.col,
          row: Math.max(characterPosition.row - CHARACTER_HEIGHT_MULTIPLER * 2, 0),
        }));
        break;
    }
  };

  // If retrying
  useEffect(() => {
    // Is alive
    if (!characterDead) {
      if (boardRef.current) {
        boardRef.current.focus();
      }

      // Refresh blocks
      setBlocks([]);

      const connectToBlockchain = async () => {
        // Subscription for Alchemy's pendingTransactions API
        alchemy.ws.on(
          {
            method: AlchemySubscription.PENDING_TRANSACTIONS,
          },
          debounce(tx => handleNewTransaction(tx), 100)
        );
      };

      connectToBlockchain();

      BOARD_MAP.current = Array(cols).fill(rows);

      console.log('calling intervals start');
      // Set intervals for falling blocks
      INTERVAL.current = setInterval(() => {
        console.log('calling intervals');
        setBlocks(prevBlocks =>
          prevBlocks.map(block => {
            if (block.row + 1 === BOARD_MAP.current[block.col]) {
              BOARD_MAP.current[block.col] = BOARD_MAP.current[block.col] - block.height;
              return block;
            }

            if (block.row >= BOARD_MAP.current[block.col]) {
              return block;
            }

            return {
              ...block,
              row: block.row + 1,
            };
          })
        );

        setCharacterPosition(characterPosition => {
          // If character is going to drop onto fallen blocks
          if (characterPosition.row + CHARACTER_HEIGHT_MULTIPLER >= BOARD_MAP.current[characterPosition.col]) {
            return {
              row: BOARD_MAP.current[characterPosition.col] - CHARACTER_HEIGHT_MULTIPLER,
              col: characterPosition.col,
            };
          }

          return {
            ...characterPosition,
            row: characterPosition.row + 1,
          };
        });
      }, 500);

      return () => {
        clearInterval(INTERVAL.current);
      };
    }
  }, [characterDead, cols, rows, handleNewTransaction]);

  // Remove block from board
  const handleRemoveBlock = (index: number) => {
    const newBlocks = [...blocks];
    BOARD_MAP.current[blocks[index].col] = rows;

    setBlocks(newBlocks.splice(index, 1));
  };

  return (
    <div
      className="border-2 border-black my-auto mx-auto box-content overflow-hidden relative"
      style={{ width, height }}
      tabIndex={0}
      onKeyDown={debounce(handleKeyDown, 100)}
      ref={boardRef}
    >
      <Character {...characterPosition} isDead={characterDead} isInvulnerable={characterInvulnerable} />
      {blocks.map((block: any, index) => (
        <Block key={block.hash} {...block} onTxConfirmed={() => handleRemoveBlock(index)} />
      ))}
    </div>
  );
}
