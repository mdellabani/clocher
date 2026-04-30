import {
  POST_TYPE_LABELS,
  POST_TYPE_COLORS,
} from "@pretou/shared";
import type { PostType } from "@pretou/shared";
import { Megaphone, Calendar, HeartHandshake, MessageCircle, Wrench } from "lucide-react";

const POST_TYPE_ICON: Record<PostType, React.ComponentType<{ className?: string; size?: number }>> = {
  annonce: Megaphone,
  evenement: Calendar,
  entraide: HeartHandshake,
  discussion: MessageCircle,
  service: Wrench,
};

export function PostTypeBadge({ type }: { type: PostType }) {
  const Icon = POST_TYPE_ICON[type];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: POST_TYPE_COLORS[type] }}
    >
      <Icon size={11} />
      {POST_TYPE_LABELS[type]}
    </span>
  );
}
