import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from "react-native";
import { CheckCircle, HelpCircle, XCircle } from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import { useTheme } from "@/lib/theme-context";
import type { Poll } from "@rural-community-platform/shared";

interface PollDisplayProps {
  poll: Poll;
  userId: string;
  onVoteChange?: () => void;
}

const PARTICIPATION_LABELS: Record<string, string> = {
  going: "Je participe",
  maybe: "Peut-être",
  not_going: "Pas disponible",
};

const PARTICIPATION_ICONS = {
  going: CheckCircle,
  maybe: HelpCircle,
  not_going: XCircle,
};

export function PollDisplay({ poll, userId, onVoteChange }: PollDisplayProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [barWidths] = useState<Animated.Value[]>(
    poll.poll_options.map(() => new Animated.Value(0))
  );

  // Get user's votes
  const userVotes = new Set(
    poll.poll_options
      .flatMap((opt) =>
        (opt.poll_votes ?? [])
          .filter((v) => v.user_id === userId)
          .map(() => opt.id)
      )
  );

  // Animate bar widths on mount
  useEffect(() => {
    const totalVotes = poll.poll_options.reduce(
      (sum, opt) => sum + (opt.poll_votes?.length ?? 0),
      0
    );

    poll.poll_options.forEach((option, idx) => {
      const voteCount = option.poll_votes?.length ?? 0;
      const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;

      Animated.timing(barWidths[idx], {
        toValue: percentage,
        duration: 500,
        useNativeDriver: false,
      }).start();
    });
  }, [poll.poll_options, barWidths]);

  const handleVote = async (optionId: string, pollId: string) => {
    setLoading(true);
    setError(null);

    try {
      const isAlreadyVoted = userVotes.has(optionId);

      // For single-choice polls, delete existing votes first
      if (!poll.allow_multiple && userVotes.size > 0) {
        const existingVote = Array.from(userVotes)[0];
        if (existingVote !== optionId) {
          // Delete old vote
          const { error: deleteError } = await supabase
            .from("poll_votes")
            .delete()
            .eq("poll_option_id", existingVote)
            .eq("user_id", userId);

          if (deleteError) throw deleteError;
          userVotes.clear();
        }
      }

      // Handle multi-choice toggle
      if (isAlreadyVoted && poll.allow_multiple) {
        const { error: deleteError } = await supabase
          .from("poll_votes")
          .delete()
          .eq("poll_option_id", optionId)
          .eq("user_id", userId);

        if (deleteError) throw deleteError;
      } else if (!isAlreadyVoted || !poll.allow_multiple) {
        // Insert new vote
        const { error: insertError } = await supabase
          .from("poll_votes")
          .upsert({ poll_option_id: optionId, user_id: userId });

        if (insertError) throw insertError;
      }

      setLoading(false);
      if (onVoteChange) {
        onVoteChange();
      }
    } catch (err) {
      setLoading(false);
      setError("Impossible de voter");
      Alert.alert("Erreur", "Impossible de voter");
    }
  };

  if (poll.poll_type === "participation") {
    return (
      <View style={[styles.participationCard, { backgroundColor: "#FFFFFF" }]}>
        <Text style={styles.question}>{poll.question}</Text>
        <View style={styles.participationButtonRow}>
          {(["going", "maybe", "not_going"] as const).map((status) => {
            const optionId = poll.poll_options.find(
              (opt) => opt.label === PARTICIPATION_LABELS[status]
            )?.id;
            if (!optionId) return null;

            const voteCount = poll.poll_options.find(
              (opt) => opt.id === optionId
            )?.poll_votes?.length ?? 0;
            const isSelected = userVotes.has(optionId);
            const Icon = PARTICIPATION_ICONS[status];

            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.participationButton,
                  isSelected && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => handleVote(optionId, poll.id)}
                disabled={loading}
              >
                <Icon
                  size={16}
                  color={isSelected ? "#FFFFFF" : theme.muted}
                />
                <Text
                  style={[
                    styles.participationButtonText,
                    isSelected && styles.participationButtonTextActive,
                  ]}
                >
                  {PARTICIPATION_LABELS[status]}
                </Text>
                {voteCount > 0 && (
                  <Text
                    style={[
                      styles.participationCount,
                      isSelected && styles.participationCountActive,
                    ]}
                  >
                    {voteCount}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  // Vote type (horizontal bar chart)
  const totalVotes = poll.poll_options.reduce(
    (sum, opt) => sum + (opt.poll_votes?.length ?? 0),
    0
  );

  return (
    <View style={[styles.voteCard, { backgroundColor: "#FFFFFF" }]}>
      <Text style={styles.question}>{poll.question}</Text>
      <View style={styles.optionsContainer}>
        {poll.poll_options.map((option, idx) => {
          const voteCount = option.poll_votes?.length ?? 0;
          const percentage =
            totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = userVotes.has(option.id);

          return (
            <TouchableOpacity
              key={option.id}
              style={styles.voteOptionWrapper}
              onPress={() => handleVote(option.id, poll.id)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <View style={styles.voteOptionHeader}>
                <View style={styles.voteOptionLabel}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.voteStats}>
                  {percentage > 0 ? percentage.toFixed(0) : 0}% ({voteCount})
                </Text>
              </View>
              <View
                style={[
                  styles.barContainer,
                  { backgroundColor: "#f0f0f0" },
                ]}
              >
                <Animated.View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: isSelected
                        ? theme.primary
                        : "#9ca3af",
                      width: barWidths[idx].interpolate({
                        inputRange: [0, 100],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  voteCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  participationCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  question: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#18181b",
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 12,
  },
  voteOptionWrapper: {
    gap: 8,
  },
  voteOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 4,
  },
  voteOptionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  optionLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: "#18181b",
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: "#18181b",
  },
  voteStats: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: "#6b7280",
  },
  barContainer: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    borderRadius: 4,
  },
  participationButtonRow: {
    flexDirection: "row",
    gap: 8,
  },
  participationButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
  },
  participationButtonText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    color: "#52525b",
    textAlign: "center",
  },
  participationButtonTextActive: {
    color: "#FFFFFF",
    fontFamily: "DMSans_600SemiBold",
  },
  participationCount: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: "#18181b",
  },
  participationCountActive: {
    color: "#FFFFFF",
  },
  error: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: "#dc2626",
    marginTop: 8,
  },
});
