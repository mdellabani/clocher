"use client";

import { useState } from "react";
import { voteAction, removeVoteAction } from "@/app/app/posts/[id]/poll-actions";
import type { Poll, PollOption } from "@rural-community-platform/shared";

interface PollDisplayProps {
  poll: Poll;
  userId: string;
}

export function PollDisplay({ poll, userId }: PollDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userVotes = new Set(
    poll.poll_options
      .flatMap((opt) =>
        (opt.poll_votes ?? [])
          .filter((v) => v.user_id === userId)
          .map(() => opt.id)
      )
  );

  const handleVote = async (optionId: string) => {
    setIsLoading(true);
    setError(null);

    const isAlreadyVoted = userVotes.has(optionId);

    if (isAlreadyVoted && poll.allow_multiple) {
      // Remove vote for multi-choice
      const result = await removeVoteAction(optionId);
      if (result.error) {
        setError(result.error);
      }
    } else if (!isAlreadyVoted) {
      // Add or replace vote
      const result = await voteAction(optionId, poll.id, poll.allow_multiple);
      if (result.error) {
        setError(result.error);
      }
    }

    setIsLoading(false);
  };

  if (poll.poll_type === "participation") {
    return (
      <div className="space-y-3 rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
        <p className="text-sm font-medium">{poll.question}</p>
        <div className="grid grid-cols-3 gap-2">
          {poll.poll_options.map((option) => {
            const voteCount = option.poll_votes?.length ?? 0;
            const isSelected = userVotes.has(option.id);

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={isLoading}
                className={`relative flex flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isSelected
                    ? "border border-blue-500 bg-blue-50 text-blue-900"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                } disabled:opacity-50`}
              >
                <span className="line-clamp-2 text-center">{option.label}</span>
                {voteCount > 0 && (
                  <span className="inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs font-semibold text-gray-700">
                    {voteCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  // Vote type (horizontal bar chart)
  const totalVotes = poll.poll_options.reduce(
    (sum, opt) => sum + (opt.poll_votes?.length ?? 0),
    0
  );

  return (
    <div className="space-y-3 rounded-[14px] border border-[#f0e8da] bg-white p-5 shadow-[0_2px_8px_rgba(140,120,80,0.08)]">
      <p className="text-sm font-medium">{poll.question}</p>
      <div className="space-y-3">
        {poll.poll_options.map((option) => {
          const voteCount = option.poll_votes?.length ?? 0;
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = userVotes.has(option.id);

          return (
            <button
              key={option.id}
              onClick={() => handleVote(option.id)}
              disabled={isLoading}
              className="group w-full text-left"
            >
              <div className="flex items-center justify-between gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 disabled:opacity-50">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {option.label}
                    </span>
                    {isSelected && (
                      <span className="text-lg">✓</span>
                    )}
                  </div>
                  <div
                    className={`h-2 w-full rounded-full transition-colors ${
                      isSelected
                        ? "bg-blue-500"
                        : "bg-gray-200"
                    }`}
                    style={{ width: "100%", maxWidth: `${Math.max(100 / poll.poll_options.length, percentage * 4)}px` }}
                  />
                </div>
                <div className="min-w-fit text-right text-xs font-medium text-gray-600">
                  <div>{percentage > 0 ? percentage.toFixed(0) : 0}%</div>
                  <div>{voteCount}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
