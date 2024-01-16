import { BLOCK_UNIT } from './Block';

type Props = {
  row: number;
  col: number;
  isDead: boolean;
  isInvulnerable: boolean;
};

export const CHARACTER_HEIGHT_MULTIPLER = 2;

export default function Character({ row, col, isDead, isInvulnerable }: Props) {
  return (
    <div
      className={`absolute bg-orange-300 transition duration-500 ease-linear transition ${
        isDead || isInvulnerable ? 'blink' : ''
      }`}
      style={{
        transform: `translate(${col * BLOCK_UNIT}px, ${row * BLOCK_UNIT}px)`,
        width: BLOCK_UNIT,
        height: BLOCK_UNIT * CHARACTER_HEIGHT_MULTIPLER,
        opacity: isDead ? 0 : 1,
        transitionDuration: isDead ? '3000ms' : '500ms',
      }}
    ></div>
  );
}
