import { useEffect } from 'react';
import alchemy from '../alchemy/client';

export type BlockInfo = {
  hash: string;
  row: number;
  col: number;
  width: number;
  height: number;
  isUniswapTx: boolean;
  fallen?: boolean;
  destroyed?: boolean;
  //gas: number;
};

export type Prop = BlockInfo & {
  onTxConfirmed: () => void;
};

export const BLOCK_UNIT = 40;

export default function Block({ hash, row, col, width, isUniswapTx, onTxConfirmed }: Prop) {
  useEffect(() => {
    const checkIfTxConfirmed = async () => {
      // Getting the status of the transaction using getTransactionReceipt and logging accordingly
      const isConfirmed = await alchemy.core.getTransactionReceipt(hash).then((tx: any) => {
        if (!tx) {
          return false;
        } else if (tx.status === 1) {
          return true;
        }

        return false;
      });

      return isConfirmed;
    };

    const intervals = setInterval(async () => {
      const confirmed = await checkIfTxConfirmed();
      if (confirmed) {
        onTxConfirmed();
        clearInterval(intervals);
      }
    }, 120000); // I set this to 120 seconds to allow users to see blocks on the board before tx is confirmed

    return () => {
      clearInterval(intervals);
    };
  }, []);

  const bgColor = isUniswapTx ? 'bg-purple-500' : 'bg-blue-500';
  return (
    <div
      className={`${bgColor} absolute transition-transform duration-500 ease-linear border border-black`}
      style={{
        transform: `translate(${col * BLOCK_UNIT}px, ${row * BLOCK_UNIT}px)`,
        width: BLOCK_UNIT * width,
        height: BLOCK_UNIT,
      }}
    ></div>
  );
}
