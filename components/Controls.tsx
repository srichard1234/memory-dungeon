interface ControlsProps {
  onForward: () => void;
  onBack: () => void;
  onTurnLeft: () => void;
  onTurnRight: () => void;
  disabled?: boolean;
}

const buttonClass =
  "flex h-16 w-16 items-center justify-center rounded-xl bg-[#2c2640] text-2xl font-bold text-[#ede6f5] shadow-md active:bg-[#3b3550] hover:bg-[#352e4d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166] disabled:opacity-40 sm:h-20 sm:w-20";

export default function Controls({ onForward, onBack, onTurnLeft, onTurnRight, disabled }: ControlsProps) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 place-items-center" role="group" aria-label="Movement controls">
      <div />
      <button type="button" onClick={onForward} disabled={disabled} aria-label="Step forward" className={buttonClass}>
        ▲
      </button>
      <div />

      <button type="button" onClick={onTurnLeft} disabled={disabled} aria-label="Turn left" className={buttonClass}>
        ◀
      </button>
      <div className="flex h-16 w-16 items-center justify-center text-xs text-[#8a80a3] sm:h-20 sm:w-20">
        turn
      </div>
      <button type="button" onClick={onTurnRight} disabled={disabled} aria-label="Turn right" className={buttonClass}>
        ▶
      </button>

      <div />
      <button type="button" onClick={onBack} disabled={disabled} aria-label="Step back" className={buttonClass}>
        ▼
      </button>
      <div />
    </div>
  );
}
