import { Star } from "lucide-react";
import { GUEST_PREF_AREAS, type GuestProfileDTO } from "@/lib/guest-profile";
import { Badge } from "@/components/ui/badge";

export function GuestPreferencesNotice({
  profile,
}: {
  profile: GuestProfileDTO | null;
}) {
  if (!profile) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin indicaciones cargadas para este huésped.
      </p>
    );
  }

  const prefs = GUEST_PREF_AREAS.map((area) => ({
    label: area.label,
    value: profile[area.key],
  })).filter((pref) => pref.value && pref.value.trim().length > 0);

  return (
    <div className="flex flex-col gap-3 rounded-md border p-3 text-sm">
      {profile.vip ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
            <Star className="mr-1 size-3 fill-current" />
            VIP
          </Badge>
          {profile.vipMotivo ? (
            <span className="text-muted-foreground">{profile.vipMotivo}</span>
          ) : null}
        </div>
      ) : null}

      {prefs.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {prefs.map((pref) => (
            <li key={pref.label}>
              <span className="font-medium">{pref.label}:</span>{" "}
              <span className="text-muted-foreground">{pref.value}</span>
            </li>
          ))}
        </ul>
      ) : profile.vip ? null : (
        <p className="text-muted-foreground">Sin preferencias cargadas.</p>
      )}
    </div>
  );
}
