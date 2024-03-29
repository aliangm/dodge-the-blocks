import { KeyboardEventHandler, useCallback, useEffect, useRef, useState } from 'react';
import { Alchemy, AlchemySubscription, Network } from 'alchemy-sdk';

import Block, { BlockInfo } from './Block';
import { debounce } from 'lodash';
import Character from './Character';
import alchemy from '../alchemy/client';

type Props = {
  width: number;
  height: number;
  rows: number;
  cols: number;
  characterDead: boolean;
  characterInvulnerable: boolean;
  gravity: number;

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
  gravity,
  setCharacterDead,
  reduceLife,
}: Props) {
  const [blocks, setBlocks] = useState<BlockInfo[]>([]);
  const [characterHeight, setCharacterHeight] = useState(2);
  const [characterPosition, setCharacterPosition] = useState({ col: 0, row: rows - characterHeight });

  // Stores available row lines per each column where character can move
  const BOARD_MAP = useRef<number[]>(Array(cols).fill(rows));
  const INTERVAL = useRef<NodeJS.Timeout>();

  const boardRef = useRef<HTMLDivElement>(null);

  const handleNewTransaction = useCallback(
    (tx: any) => {
      const hash = tx.hash;
      const colIndex = Math.floor(Math.random() * cols) % cols;
      // Check if uniswap transaction
      const isUniswap = '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD'.toLowerCase() === tx.to.toLowerCase();

      setBlocks((blocks: BlockInfo[]) => {
        const block = blocks.findIndex(block => block.hash === tx.hash);
        if (block !== -1) return blocks;
        let width = Number(tx.gas) > 300000 ? 2 : 1;
        blocks.push({ hash, row: 0, col: colIndex, width, height: 1, isUniswapTx: isUniswap });

        return blocks;
      });
    },
    [cols]
  );

  // Collision check between blocks and the character
  useEffect(() => {
    if (!characterDead && !characterInvulnerable) {
      for (let block of blocks) {
        for (let i = 0; i < block.width; i++) {
          if (block.row === characterPosition.row && block.col + i === characterPosition.col) {
            clearInterval(INTERVAL.current);
            reduceLife();
            setCharacterDead(true);
            alchemy.ws.removeAllListeners();
            return;
          }
        }
      }

      blocks.forEach(block => {
        if (block.isUniswapTx) {
          if (block.row === rows) {
            for (let i = 0; i < block.width; i++) {
              BOARD_MAP.current[block.col + i] = rows; // Restore blocks bottom line
            }
          }

          // Still uniswap block is on board
          if (block.row < rows) {
            for (let i = 0; i < block.width; i++) {
              if (block.row === BOARD_MAP.current[block.col + i]) {
                BOARD_MAP.current[block.col + i] = rows * 2; // Make blocks keep falling
              }
            }
          }
        }
      });

      const aliveBlocks = blocks.filter(block => !block.destroyed);
      if (aliveBlocks.length !== blocks.length) {
        setBlocks(aliveBlocks);
      }
    }
  }, [rows, blocks, characterPosition, characterDead, characterInvulnerable, setCharacterDead, reduceLife]);

  // Key press handler
  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = event => {
    switch (event.key) {
      case 'a':
      case 'A':
        // There is no block on the left
        if (BOARD_MAP.current[characterPosition.col - 1] - characterPosition.row >= characterHeight) {
          setCharacterPosition(characterPosition => ({
            col: Math.max(0, characterPosition.col - 1),
            row: characterPosition.row,
          }));
        }
        break;
      case 'd':
      case 'D':
        // There is no block on the right
        if (BOARD_MAP.current[characterPosition.col + 1] - characterPosition.row >= characterHeight) {
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
          row: Math.max(characterPosition.row - 1, 0),
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

      // Refresh blocks if not boosting
      if (gravity !== 2) {
        setBlocks([]);
      }

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

      // Set intervals for falling blocks
      if (INTERVAL.current) {
        clearInterval(INTERVAL.current);
      }
      INTERVAL.current = setInterval(() => {
        setBlocks(prevBlocks =>
          prevBlocks.map(block => {
            // stop falling
            if (!block.isUniswapTx) {
              for (let i = 0; i < block.width; i++) {
                if (block.row + 1 === BOARD_MAP.current[block.col + i]) {
                  const newgap = BOARD_MAP.current[block.col + i] - block.height;
                  for (let j = 0; j < block.width; j++) {
                    BOARD_MAP.current[block.col + j] = newgap;
                  }

                  return { ...block, fallen: true };
                }

                if (block.row >= BOARD_MAP.current[block.col + i]) {
                  if (block.width > 1) {
                    if (BOARD_MAP.current[block.col] >= rows * 2) {
                      BOARD_MAP.current[block.col + 1] = BOARD_MAP.current[block.col + 1] + 1;
                      return { ...block, fallen: true, destroyed: true };
                    }

                    if (BOARD_MAP.current[block.col + 1] >= rows * 2) {
                      BOARD_MAP.current[block.col] = BOARD_MAP.current[block.col] + 1;
                      return { ...block, fallen: true, destroyed: true };
                    }
                  }
                  return { ...block, fallen: true };
                }
              }
            }

            return {
              ...block,
              row: block.row + 1,
            };
          })
        );

        setCharacterPosition(characterPosition => {
          // If character is going to drop onto fallen blocks
          if (characterPosition.row + characterHeight >= BOARD_MAP.current[characterPosition.col]) {
            return {
              row: BOARD_MAP.current[characterPosition.col] - characterHeight,
              col: characterPosition.col,
            };
          }

          return {
            ...characterPosition,
            row: characterPosition.row + 1,
          };
        });
      }, 500 / gravity);

      return () => {
        clearInterval(INTERVAL.current);
      };
    }
  }, [characterDead, cols, rows, gravity, characterHeight, handleNewTransaction]);

  // Remove block from board
  const handleRemoveBlock = (hash: string) => {
    const index = blocks.findIndex(block => block.hash === hash);
    if (index === -1) {
      return;
    }

    BOARD_MAP.current = Array(cols).fill(rows);
    setBlocks(blocks.splice(index, 1));
  };

  return (
    <div
      className="border-2 border-black my-auto mx-auto box-content overflow-hidden relative"
      style={{ width, height }}
      tabIndex={0}
      onKeyDown={debounce(handleKeyDown, 100)}
      ref={boardRef}
    >
      <Character
        {...characterPosition}
        isDead={characterDead}
        isInvulnerable={characterInvulnerable}
        height={characterHeight}
      />
      {blocks.map((block: any) => (
        <Block key={block.hash} {...block} onTxConfirmed={() => handleRemoveBlock(block.hash)} />
      ))}
    </div>
  );
}
