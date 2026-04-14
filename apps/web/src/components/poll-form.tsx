"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PollType } from "@rural-community-platform/shared";

export interface PollFormData {
  question: string;
  poll_type: PollType;
  allow_multiple: boolean;
  options: string[];
}

interface PollFormProps {
  onPollChange: (poll: PollFormData | null) => void;
}

const PARTICIPATION_OPTIONS = ["Je participe", "Peut-être", "Pas disponible"];

export function PollForm({ onPollChange }: PollFormProps) {
  const [pollType, setPollType] = useState<PollType>("vote");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleQuestionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuestion = e.target.value;
    setQuestion(newQuestion);
    updatePoll(newQuestion, options, allowMultiple);
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
    updatePoll(question, newOptions, allowMultiple);
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      const newOptions = [...options, ""];
      setOptions(newOptions);
      updatePoll(question, newOptions, allowMultiple);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
      updatePoll(question, newOptions, allowMultiple);
    }
  };

  const handleAllowMultipleChange = (checked: boolean) => {
    setAllowMultiple(checked);
    updatePoll(question, options, checked);
  };

  const handleTypeChange = (type: PollType) => {
    setPollType(type);
    if (type === "participation") {
      setQuestion("Qui participe ?");
      setOptions(PARTICIPATION_OPTIONS);
      setAllowMultiple(false);
      updatePoll("Qui participe ?", PARTICIPATION_OPTIONS, false);
    } else {
      setQuestion("");
      setOptions(["", ""]);
      setAllowMultiple(false);
      updatePoll("", ["", ""], false);
    }
  };

  const updatePoll = (q: string, opts: string[], multiple: boolean) => {
    const validOptions = opts.filter((o) => o.trim().length > 0);
    const isValid = q.trim().length > 0 && validOptions.length >= 2;

    if (isValid) {
      onPollChange({
        question: q,
        poll_type: pollType,
        allow_multiple: multiple,
        options: validOptions,
      });
    } else {
      onPollChange(null);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">Type de sondage</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleTypeChange("vote")}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
              pollType === "vote"
                ? "bg-blue-500 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Vote
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("participation")}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
              pollType === "participation"
                ? "bg-blue-500 text-white"
                : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Participation
          </button>
        </div>
      </div>

      {pollType === "vote" ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="poll-question">Question</Label>
            <Input
              id="poll-question"
              value={question}
              onChange={handleQuestionChange}
              placeholder="Quel est votre avis ?"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label>Options (min 2, max 6)</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + Ajouter une option
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              id="allow-multiple"
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => handleAllowMultipleChange(e.target.checked)}
              className="h-4 w-4 rounded border border-gray-300"
            />
            <label htmlFor="allow-multiple" className="text-sm font-medium">
              Choix multiple
            </label>
          </div>
        </>
      ) : (
        <div className="space-y-2 rounded bg-white p-3">
          <p className="text-sm font-medium">Question : Qui participe ?</p>
          <p className="text-xs text-gray-600">
            Les options sont définies automatiquement pour ce type de sondage.
          </p>
          <div className="flex gap-2 pt-2">
            {PARTICIPATION_OPTIONS.map((opt) => (
              <span
                key={opt}
                className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
              >
                {opt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
