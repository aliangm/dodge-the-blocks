import { BLOCK_UNIT } from './Block';

type Props = {
  row: number;
  col: number;
  height: number;
  isDead: boolean;
  isInvulnerable: boolean;
};

export default function Character({ row, col, isDead, isInvulnerable, height }: Props) {
  return (
    <div
      className={`absolute bg-orange-300 transition duration-500 ease-linear transition ${
        isDead || isInvulnerable ? 'blink' : ''
      }`}
      style={{
        transform: `translate(${col * BLOCK_UNIT}px, ${row * BLOCK_UNIT}px)`,
        width: BLOCK_UNIT,
        height: BLOCK_UNIT * height,
        opacity: isDead ? 0 : 1,
        transitionDuration: isDead ? '3000ms' : '500ms',
      }}
    ></div>
  );
}
