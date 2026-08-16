import type { Direction } from "@/lib/types";

interface CompassProps {
  facing: Direction;
}

const BEARING: Record<Direction, number> = { N: 0, E: 90, S: 180, W: 270 };

export default function Compass({ facing }: CompassProps) {
  // The dial's N/E/S/W labels stay fixed; the needle rotates so its red tip
  // always points toward true north relative to the player's current facing.
  const needleRotation = (360 - BEARING[facing]) % 360;

  return (
    <div
      className="pointer-events-none absolute right-3 top-3 h-14 w-14 rounded-full bg-[#1d1830]/90 ring-1 ring-[#3b3550]"
      aria-hidden="true"
    >
      <svg viewBox="0 0 56 56" className="h-full w-full">
        <circle cx="28" cy="28" r="26" fill="#1d1830" stroke="#3b3550" strokeWidth="1.5" />
        <text x="28" y="11" textAnchor="middle" fontSize="8" fontWeight={600} fill="#c9c0dd">
          N
        </text>
        <text x="47" y="31" textAnchor="middle" fontSize="8" fill="#8a80a3">
          E
        </text>
        <text x="28" y="49" textAnchor="middle" fontSize="8" fill="#8a80a3">
          S
        </text>
        <text x="9" y="31" textAnchor="middle" fontSize="8" fill="#8a80a3">
          W
        </text>
        <g transform={`rotate(${needleRotation} 28 28)`}>
          <polygon points="28,13 32,28 28,25 24,28" fill="#e0567a" />
          <polygon points="28,43 32,28 28,31 24,28" fill="#c9c0dd" />
        </g>
        <circle cx="28" cy="28" r="2" fill="#0f0c18" stroke="#8a80a3" strokeWidth="0.75" />
      </svg>
    </div>
  );
}
