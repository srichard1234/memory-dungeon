interface WinScreenProps {
  steps: number;
  bestSteps: number | undefined;
  isNewBest: boolean;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
}

export default function WinScreen({
  steps,
  bestSteps,
  isNewBest,
  onPlayAgain,
  onChangeDifficulty,
}: WinScreenProps) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-xl bg-[#1d1830] p-8 text-center">
      <h2 className="text-3xl font-bold text-[#5fd6a8]">You found the exit! 🎉</h2>
      <p className="text-lg">
        You collected all the treasure and escaped in <span className="text-[#ffd166]">{steps}</span>{" "}
        steps.
      </p>
      {isNewBest ? (
        <p className="rounded-md bg-[#2c2640] px-4 py-2 font-semibold text-[#ffd166]">
          🏆 New best score!
        </p>
      ) : bestSteps !== undefined ? (
        <p className="text-sm text-[#8a80a3]">Your best for this difficulty: {bestSteps} steps</p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onPlayAgain}
          className="rounded-md bg-[#2c2640] px-5 py-3 font-semibold hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          Play again (same difficulty)
        </button>
        <button
          type="button"
          onClick={onChangeDifficulty}
          className="rounded-md bg-[#2c2640] px-5 py-3 font-semibold hover:bg-[#3b3550] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
        >
          Change difficulty
        </button>
      </div>
    </div>
  );
}
