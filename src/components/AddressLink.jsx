import { MapPin } from "lucide-react";

// Renders an address as a clickable link that opens Google Maps in a new tab.
// No API key needed — plain maps search URL.
export default function AddressLink({ address, className = "", iconClassName = "w-3.5 h-3.5 shrink-0", showIcon = true }) {
  if (!address) return null;
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Open ${address} in Google Maps`}
      className={`inline-flex items-center gap-1.5 min-w-0 hover:text-primary transition-colors ${className}`}
    >
      {showIcon && <MapPin className={iconClassName} />}
      <span className="truncate">{address}</span>
    </a>
  );
}