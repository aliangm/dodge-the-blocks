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
      const isUniswap = '0xE592427A0AEce92De3Edee1F18E0157C05861564'.toLowerCase() === tx.to.toLowerCase();
      console.log('this is tx', isUniswap);
      setBlocks((blocks: BlockInfo[]) => {
        const block = blocks.findIndex(block => block.hash === tx.hash);
        if (block !== -1) return blocks;
        let width = Math.random() > 0.5 ? 2 : 1;
        blocks.push({ hash, row: 0, col: colIndex, width, height: 1 });

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

      // Set intervals for falling blocks
      INTERVAL.current = setInterval(() => {
        setBlocks(prevBlocks =>
          prevBlocks.map(block => {
            // stop falling
            for (let i = 0; i < block.width; i++) {
              if (block.row + 1 === BOARD_MAP.current[block.col + i]) {
                const newgap = BOARD_MAP.current[block.col + i] - block.height;
                for (let j = 0; j < block.width; j++) {
                  BOARD_MAP.current[block.col + j] = newgap;
                }

                return block;
              }

              if (block.row >= BOARD_MAP.current[block.col + i]) {
                return block;
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
  const handleRemoveBlock = (hash: string) => {
    console.log('this is hash', hash);
    const index = blocks.findIndex(block => block.hash === hash);
    if (index === -1) {
      return;
    }

    const confirmedBlock = blocks[index];

    for (let i = 0; i < confirmedBlock.width; i++) {
      // Confirmed block is still in air
      if (confirmedBlock.row < BOARD_MAP.current[confirmedBlock.col + i]) {
        continue;
      }

      BOARD_MAP.current[confirmedBlock.col + i] = Math.min(
        BOARD_MAP.current[confirmedBlock.col + i] + confirmedBlock.height,
        rows
      );

      let minRowInCol = rows + 1;
      blocks.forEach(block => {
        if (block.col === confirmedBlock.col + i) {
          if (block.row > BOARD_MAP.current[confirmedBlock.col + i]) {
            minRowInCol = Math.min(block.row, minRowInCol);
          }
        }
      });

      BOARD_MAP.current[confirmedBlock.col + i] = minRowInCol - 1;
    }

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
      <Character {...characterPosition} isDead={characterDead} isInvulnerable={characterInvulnerable} />
      {blocks.map((block: any) => (
        <Block key={block.hash} {...block} onTxConfirmed={() => handleRemoveBlock(block.hash)} />
      ))}
    </div>
  );
}
