import { useState } from "react";
import { MAX_NAME_LENGTH, normalizeName } from "@/lib/leaderboard";

type SubmitState = "idle" | "submitting" | "done" | "error";

interface WinScreenProps {
  steps: number;
  bestSteps: number | undefined;
  isNewBest: boolean;
  playerName: string;
  submitState: SubmitState;
  submitError: string | null;
  checkingLeaderboard: boolean;
  qualifiesForLeaderboard: boolean;
  onPlayAgain: () => void;
  onChangeDifficulty: () => void;
  onSubmitScore: (name: string) => void;
  onOpenLeaderboard: () => void;
}

export default function WinScreen({
  steps,
  bestSteps,
  isNewBest,
  playerName,
  submitState,
  submitError,
  checkingLeaderboard,
  qualifiesForLeaderboard,
  onPlayAgain,
  onChangeDifficulty,
  onSubmitScore,
  onOpenLeaderboard,
}: WinScreenProps) {
  const [name, setName] = useState(normalizeName(playerName));

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

      {checkingLeaderboard && (
        <p role="status" className="text-xs text-[#8a80a3]">
          Checking the leaderboard…
        </p>
      )}

      {qualifiesForLeaderboard && submitState !== "done" && (
        <div className="flex w-full max-w-xs flex-col items-center gap-2 rounded-md bg-[#2c2640] p-4">
          <p className="text-sm font-semibold text-[#ffd166]">You made it to the leaderboard!</p>
          <label htmlFor="leaderboard-name" className="text-xs text-[#c9c0dd]">
            Enter your name (up to {MAX_NAME_LENGTH} letters)
          </label>
          <input
            id="leaderboard-name"
            type="text"
            value={name}
            onChange={(e) => setName(normalizeName(e.target.value))}
            maxLength={MAX_NAME_LENGTH}
            placeholder="NAME"
            className="w-full rounded-md bg-[#0f0c18] px-3 py-2 text-center text-sm uppercase tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
          />
          <button
            type="button"
            onClick={() => onSubmitScore(name)}
            disabled={!name || submitState === "submitting"}
            className="rounded-md bg-[#5fd6a8] px-4 py-2 text-sm font-semibold text-[#0f0c18] hover:bg-[#4bc394] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
          >
            {submitState === "submitting" ? "Submitting…" : "Submit score"}
          </button>
          {submitState === "error" && (
            <p role="alert" className="text-xs text-[#e0567a]">
              {submitError === "name not allowed"
                ? "That name isn't allowed — try another."
                : submitError === "not a new best"
                  ? "You already have a better score on the leaderboard under this name."
                  : "Couldn't submit — try again."}
            </p>
          )}
        </div>
      )}

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

      <button
        type="button"
        onClick={onOpenLeaderboard}
        className="text-xs text-[#8a80a3] underline hover:text-[#c9c0dd] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ffd166]"
      >
        View leaderboard
      </button>
    </div>
  );
}
