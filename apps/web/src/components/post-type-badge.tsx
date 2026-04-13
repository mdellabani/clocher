import { Badge } from "@/components/ui/badge";
import {
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
} from "@rural-community-platform/shared";
import type { PostType } from "@rural-community-platform/shared";

export function PostTypeBadge({ type }: { type: PostType }) {
  return (
    <Badge style={{ backgroundColor: POST_TYPE_COLORS[type], color: "white" }}>
      {POST_TYPE_LABELS[type]}
    </Badge>
  );
}
