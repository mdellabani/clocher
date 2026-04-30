import { MapPin, Clock, Phone, Mail, Truck } from "lucide-react";
import { PRODUCER_CATEGORIES } from "@pretou/shared";
import type { Producer } from "@pretou/shared";

type ViewMode = "list" | "grid";

export function ProducerCard({
  producer,
  viewMode = "list",
}: {
  producer: Producer;
  viewMode?: ViewMode;
}) {
  const categoryLabels = producer.categories
    ?.map(
      (cat) =>
        PRODUCER_CATEGORIES.find((c) => c.value === cat)?.label || cat
    )
    .join(", ");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  };

  const PhotoPlaceholder = () => (
    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600 text-2xl font-bold text-white">
      {getInitials(producer.name)}
    </div>
  );

  if (viewMode === "grid") {
    return (
      <div className="rounded-[14px] border border-[#f0e8da] bg-white p-4 shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]">
        {/* Photo */}
        <div className="mb-4 flex justify-center">
          {producer.photo_path ? (
            <img
              src={producer.photo_path}
              alt={producer.name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>

        {/* Info */}
        <h3 className="text-center font-semibold text-[var(--foreground)]">
          {producer.name}
        </h3>

        {/* Categories */}
        <div className="mt-2 flex flex-wrap justify-center gap-1">
          {producer.categories?.map((category) => (
            <span
              key={category}
              className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
            >
              {
                PRODUCER_CATEGORIES.find((c) => c.value === category)
                  ?.label
              }
            </span>
          ))}
        </div>

        {/* Commune */}
        <p className="mt-2 text-center text-xs text-[var(--muted-foreground)]">
          {producer.communes?.name}
        </p>

        {/* Description */}
        <p className="mt-3 line-clamp-2 text-xs text-[var(--muted-foreground)]">
          {producer.description}
        </p>

        {/* Pickup/Delivery */}
        <div className="mt-3 space-y-1 text-xs text-[var(--muted-foreground)]">
          {producer.pickup_location && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="shrink-0 mt-0.5" />
              <span className="line-clamp-1">{producer.pickup_location}</span>
            </div>
          )}
          {producer.delivers && (
            <div className="flex items-center gap-2">
              <Truck size={14} />
              <span>Livraison possible</span>
            </div>
          )}
        </div>

        {/* Schedule */}
        {producer.schedule && (
          <div className="mt-3 flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
            <Clock size={14} className="shrink-0 mt-0.5" />
            <span className="line-clamp-2">{producer.schedule}</span>
          </div>
        )}

        {/* Contact */}
        <div className="mt-4 flex gap-3 text-[var(--muted-foreground)]">
          {producer.contact_phone && (
            <a
              href={`tel:${producer.contact_phone}`}
              className="inline-flex items-center justify-center rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
              title={producer.contact_phone}
            >
              <Phone size={16} />
            </a>
          )}
          {producer.contact_email && (
            <a
              href={`mailto:${producer.contact_email}`}
              className="inline-flex items-center justify-center rounded-full bg-gray-100 p-2 hover:bg-gray-200 transition-colors"
              title={producer.contact_email}
            >
              <Mail size={16} />
            </a>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="rounded-[14px] border border-[#f0e8da] bg-white shadow-[0_2px_8px_rgba(140,120,80,0.08)] transition-all hover:shadow-[0_4px_16px_rgba(140,120,80,0.14)]">
      <div className="flex gap-4 p-5">
        {/* Left: info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[var(--foreground)]">
            {producer.name}
          </h3>

          {/* Categories */}
          <div className="mt-2 flex flex-wrap gap-1">
            {producer.categories?.map((category) => (
              <span
                key={category}
                className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800"
              >
                {
                  PRODUCER_CATEGORIES.find((c) => c.value === category)
                    ?.label
                }
              </span>
            ))}
          </div>

          {/* Commune */}
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {producer.communes?.name}
          </p>

          {/* Description */}
          <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
            {producer.description}
          </p>

          {/* Pickup/Delivery */}
          <div className="mt-3 space-y-1 text-xs text-[var(--muted-foreground)]">
            {producer.pickup_location && (
              <div className="flex items-start gap-2">
                <MapPin size={14} className="shrink-0 mt-0.5" />
                <span>{producer.pickup_location}</span>
              </div>
            )}
            {producer.delivers && (
              <div className="flex items-center gap-2">
                <Truck size={14} />
                <span>Livraison possible</span>
              </div>
            )}
          </div>

          {/* Schedule */}
          {producer.schedule && (
            <div className="mt-2 flex items-start gap-2 text-xs text-[var(--muted-foreground)]">
              <Clock size={14} className="shrink-0 mt-0.5" />
              <span>{producer.schedule}</span>
            </div>
          )}

          {/* Contact */}
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {producer.contact_phone && (
              <a
                href={`tel:${producer.contact_phone}`}
                className="inline-flex items-center gap-1 text-[var(--theme-primary)] hover:underline"
              >
                <Phone size={14} />
                {producer.contact_phone}
              </a>
            )}
            {producer.contact_email && (
              <a
                href={`mailto:${producer.contact_email}`}
                className="inline-flex items-center gap-1 text-[var(--theme-primary)] hover:underline"
              >
                <Mail size={14} />
                {producer.contact_email}
              </a>
            )}
          </div>
        </div>

        {/* Right: photo */}
        <div className="shrink-0">
          {producer.photo_path ? (
            <img
              src={producer.photo_path}
              alt={producer.name}
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <PhotoPlaceholder />
          )}
        </div>
      </div>
    </div>
  );
}
