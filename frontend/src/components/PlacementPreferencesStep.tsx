import { FormEvent, useEffect, useState } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import type { MultiValue } from "react-select";
import toast from "react-hot-toast";
import Button from "./Button";
import LabelRegister from "./LabelRegister";
import { apiFetch, readApiErrorBody } from "../lib/api";
import { useUser, type UserData } from "../context/UserContext";

type GenreOption = { value: number; label: string };
type HobbyOption = { value: string; label: string };

function hobbiesToOptions(h: string[]): HobbyOption[] {
  return h.map((x) => ({ value: x, label: x }));
}

function normalizeHobbySelection(sel: MultiValue<HobbyOption>): string[] {
  const raw = sel.map((o) => o.value.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

const selectDark = {
  control: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "oklch(0.22 0.03 285)",
    borderColor: "oklch(0.28 0.04 285)",
    borderRadius: 12,
    minHeight: 42,
  }),
  menu: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "oklch(0.18 0.03 285)",
    border: "1px solid oklch(0.28 0.04 285)",
  }),
  option: (
    base: Record<string, unknown>,
    state: { isFocused: boolean; isSelected: boolean },
  ) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "oklch(0.65 0.25 295)"
      : state.isFocused
        ? "color-mix(in oklch, oklch(0.65 0.25 295) 14%, transparent)"
        : "transparent",
    color: "#fafafa",
  }),
  multiValue: (base: Record<string, unknown>) => ({
    ...base,
    backgroundColor: "#3f3f46",
  }),
  multiValueLabel: (base: Record<string, unknown>) => ({
    ...base,
    color: "#fafafa",
  }),
  input: (base: Record<string, unknown>) => ({ ...base, color: "#fafafa" }),
  placeholder: (base: Record<string, unknown>) => ({
    ...base,
    color: "#71717a",
  }),
  multiValueRemove: (base: Record<string, unknown>) => ({
    ...base,
    color: "#a1a1aa",
    ":hover": { backgroundColor: "#52525b", color: "#fafafa" },
  }),
  clearIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: "#a1a1aa",
    ":hover": { color: "#fafafa" },
  }),
  dropdownIndicator: (base: Record<string, unknown>) => ({
    ...base,
    color: "#a1a1aa",
    ":hover": { color: "#fafafa" },
  }),
  singleValue: (base: Record<string, unknown>) => ({
    ...base,
    color: "#fafafa",
  }),
};

export default function PlacementPreferencesStep({
  user,
  onSuccess,
}: {
  user: UserData;
  onSuccess: (updatedProfile: UserData | null) => void;
}) {
  const { refreshProfile } = useUser();
  const [genreOptions, setGenreOptions] = useState<GenreOption[]>([]);
  const [hobbies, setHobbies] = useState<string[]>(() => [
    ...(user.hobbies ?? []),
  ]);
  const [favoriteGenres, setFavoriteGenres] = useState<number[]>(
    user.favoriteGenres ?? [],
  );
  const [hatedGenres, setHatedGenres] = useState<number[]>(
    user.hatedGenres ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiFetch("/genres");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { id: number; name: string }[];
        if (!cancelled) {
          setGenreOptions(data.map((g) => ({ value: g.id, label: g.name })));
        }
      } catch {
        if (!cancelled) toast.error("Could not load genres.");
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    const hobbiesPayload = hobbies.map((h) => h.trim()).filter(Boolean);
    if (hobbiesPayload.length < 1) {
      setFieldError("Add at least one hobby.");
      return;
    }
    if (favoriteGenres.length < 1) {
      setFieldError("Choose at least one genre you prefer.");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          hobbies: hobbiesPayload,
          favoriteGenres,
          hatedGenres: hatedGenres.length ? hatedGenres : [],
        }),
      });
      if (!res.ok) {
        toast.error(await readApiErrorBody(res));
        return;
      }
      const nextProfile = await refreshProfile();
      onSuccess(nextProfile);
    } catch {
      toast.error("Could not save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const onHobbiesChange = (sel: MultiValue<HobbyOption>) => {
    setHobbies(normalizeHobbySelection(sel));
  };

  const favoriteValue = genreOptions.filter((o) =>
    favoriteGenres.includes(o.value),
  );
  const hatedValue = genreOptions.filter((o) => hatedGenres.includes(o.value));

  const optionsForFavorite = genreOptions.filter(
    (o) => !hatedGenres.includes(o.value),
  );
  const optionsForHated = genreOptions.filter(
    (o) => !favoriteGenres.includes(o.value),
  );

  const onFavoriteChange = (sel: MultiValue<GenreOption>) => {
    const next = sel.map((o) => o.value);
    setFavoriteGenres(next);
    setHatedGenres((prev) => prev.filter((id) => !next.includes(id)));
  };
  const onHatedChange = (sel: MultiValue<GenreOption>) => {
    const next = sel.map((o) => o.value);
    setHatedGenres(next);
    setFavoriteGenres((prev) => prev.filter((id) => !next.includes(id)));
  };

  return (
    <form
      className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-2 [&_label]:text-foreground"
      onSubmit={(e) => void handleSubmit(e)}
    >
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Your tastes first
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Tell us what you enjoy so we can tailor the placement experience.
          Then you&apos;ll take the short entry test.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <LabelRegister isRequired={true}>Hobbies</LabelRegister>
        <CreatableSelect<HobbyOption, true>
          isMulti
          isClearable
          options={[]}
          value={hobbiesToOptions(hobbies)}
          onChange={onHobbiesChange}
          placeholder="Type a hobby, then press Enter"
          formatCreateLabel={(input) => {
            const t = input.trim();
            return t ? `Add \"${t}\"` : "Add";
          }}
          noOptionsMessage={() =>
            "Start typing a hobby, then press Enter to add it."
          }
          styles={selectDark}
        />
        <p className="text-[11px] text-muted-foreground">
          Add each hobby as a tag — like genres, but your own words.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <LabelRegister isRequired={true}>Genres you prefer</LabelRegister>
        <Select<GenreOption, true>
          isMulti
          options={optionsForFavorite}
          value={favoriteValue}
          onChange={onFavoriteChange}
          placeholder="Choose genres"
          styles={selectDark}
        />
      </div>

      <div className="flex flex-col gap-1">
        <LabelRegister isRequired={false}>Genres you avoid</LabelRegister>
        <Select<GenreOption, true>
          isMulti
          options={optionsForHated}
          value={hatedValue}
          onChange={onHatedChange}
          placeholder="Optional"
          styles={selectDark}
        />
      </div>

      {fieldError ? (
        <p className="text-destructive text-sm" role="alert">
          {fieldError}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="!mt-2">
        {saving ? "Saving…" : "Continue to entry test"}
      </Button>
    </form>
  );
}
