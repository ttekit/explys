"use client";

import Button from "@/components/Button";
import LabelRegister from "@/components/LabelRegister";
import { useRouter } from "next/navigation";
import { useContext, type FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "@/context/RegistrationContext";
import MultiSelect from "@/components/MultiSelect";
import { registerUser, storeRegisterSuccess } from "@/lib/registerUser";
import { apiFetch } from "@/lib/api";
import toast from "react-hot-toast";

export default function RegisterPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const router = useRouter();
  const isTeacher = formData.role === "teacher";

  useEffect(() => {
    if (isTeacher) {
      router.replace("/register/details");
    }
  }, [isTeacher, router]);

  const [genreOptions, setGenreOptions] = useState<
    { value: number; label: string }[]
  >([]);

  useEffect(() => {
    if (isTeacher) return;

    const fetchGenres = async () => {
      try {
        const response = await apiFetch("/genres", { method: "GET" });
        if (response.ok) {
          const data = (await response.json()) as { id: number; name: string }[];
          setGenreOptions(
            data.map((g) => ({ value: g.id, label: g.name })),
          );
        }
      } catch (e) {
        console.error("Error fetching genres:", e);
      }
    };
    void fetchGenres();
  }, [isTeacher]);

  const handleFavoriteGenreChange = (selectedOptions: unknown) => {
    const opts = selectedOptions as { value: number }[] | null;
    const values = opts ? opts.map((o) => o.value) : [];
    updateFormData({ favoriteGenres: values });
  };

  const handleHatedGenreChange = (selectedOptions: unknown) => {
    const opts = selectedOptions as { value: number }[] | null;
    const values = opts ? opts.map((o) => o.value) : [];
    updateFormData({ hatedGenres: values });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = await registerUser(formData);
    if (result.success) {
      storeRegisterSuccess({
        generatedStudents: result.generatedStudents,
        name: formData.name,
        email: formData.email,
      });
      router.push("/register/success");
    } else {
      toast.error(result.message);
    }
  };

  if (isTeacher) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-2">
      <form
        className="w-full max-w-100 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col"
        onSubmit={handleSubmit}
      >
        <div>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            Create an account
          </p>
          <div className="flex text-gray-500 mb-8">
            <p>Preferences</p>
            <p className="ml-1">- Page 3</p>
          </div>
        </div>

        <div className="mb-4 flex flex-col px-5">
          <LabelRegister isRequired={false}>Favorite genres:</LabelRegister>
          <MultiSelect
            inputId="favorite-genres"
            options={genreOptions}
            isMulti
            name="favoriteGenres"
            placeholder="Choose genres"
            onChange={handleFavoriteGenreChange}
            value={genreOptions.filter((option) =>
              (formData.favoriteGenres ?? []).includes(option.value),
            )}
          />

          <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
          <MultiSelect
            inputId="hated-genres"
            options={genreOptions}
            isMulti
            name="hatedGenres"
            placeholder="Choose genres"
            onChange={handleHatedGenreChange}
            value={genreOptions.filter((option) =>
              (formData.hatedGenres ?? []).includes(option.value),
            )}
          />
        </div>

        <div className="mt-4 flex flex-col">
          <Button type="submit">Register</Button>
          <Button
            type="button"
            onClick={() => {
              router.push("/register/details");
            }}
          >
            Back
          </Button>
        </div>
      </form>
    </div>
  );
}
