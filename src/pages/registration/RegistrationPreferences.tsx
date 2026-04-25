import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import ValidateError from "../../components/ValidateError";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import MultiSelect from "../../components/MultiSelect";
import toast from "react-hot-toast";
import { apiUrl, getResponseErrorMessage } from "../../lib/api";
import type { MultiValue } from "react-select";

type GenreOption = { value: number; label: string };

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();

  const [genreOptions, setGenreOptions] = useState<GenreOption[]>([]);
  const [genreLoadError, setGenreLoadError] = useState(false);
  const [genresLoading, setGenresLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchGenres = async () => {
      setGenresLoading(true);
      setGenreLoadError(false);
      try {
        const response = await fetch(apiUrl("/genres"));

        if (!response.ok) {
          const message = await getResponseErrorMessage(response);
          throw new Error(message);
        }

        const data: unknown = await response.json();
        if (!Array.isArray(data)) {
          throw new Error("Invalid genres response");
        }

        const formattedOptions: GenreOption[] = data.map((genre: unknown) => {
          if (!genre || typeof genre !== "object") {
            throw new Error("Invalid genre entry");
          }
          const g = genre as { id?: unknown; name?: unknown };
          const id = Number(g.id);
          const name = g.name;
          if (!Number.isFinite(id) || typeof name !== "string") {
            throw new Error("Invalid genre entry");
          }
          return { value: id, label: name };
        });

        if (!cancelled) {
          setGenreOptions(formattedOptions);
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error ? error.message : "Could not load genres";
          toast.error(message);
          setGenreLoadError(true);
        }
      } finally {
        if (!cancelled) {
          setGenresLoading(false);
        }
      }
    };

    fetchGenres();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFavoriteGenreChange = (selected: MultiValue<GenreOption>) => {
    updateFormData({ favoriteGenres: selected.map((option) => option.value) });
  };

  const handleHatedGenreChange = (selected: MultiValue<GenreOption>) => {
    updateFormData({ hatedGenres: selected.map((option) => option.value) });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();


    const {
      confirmPassword,

      favoriteGenres,
      hatedGenres,
      hobbies,
      englishLevel,
      education,
      workField,
      teacherGrades,
      studentGrade,
      ...restData
    } = formData;


    const dataToSend = {
      name,
      email,
      password,
      englishLevel: englishLevel === "choose" ? undefined : englishLevel,
      education: education === "choose" ? undefined : education,
      workField: workField === "choose" ? undefined : workField,
      teacherGrades: teacherGrades === "choose" ? undefined : teacherGrades,
      studentGrade: studentGrade === "choose" ? undefined : studentGrade,
      hobbies: hobbies,
      favoriteGenres: favoriteGenres,
      hatedGenres: hatedGenres,
    };

    try {
      const response = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        toast.success("Account created. You can sign in.");
        navigate("/loginForm");
      } else {
        const errorData = await response.json();
        console.error("Registration error:", errorData);
        alert(`Reg error: ${errorData.message || "Invalid data"}`);
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Network error. ");
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-2">
        <form
          className="w-full max-w-100 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)] p-7 flex flex-col"
          onSubmit={handleSubmit}
          tabIndex={0}
        >
          <div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              Create an account
            </p>
            <div className="flex">
              <p className="text-gray-500 mb-8">Account Credentials</p>
              <p>- Page 3</p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col">
            {genreLoadError && (
              <ValidateError>
                Could not load genres. Check your connection and API settings,
                then refresh the page.
              </ValidateError>
            )}
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Favorite genres:</LabelRegister>
            </div>
            <MultiSelect
              isMulti
              options={genreOptions}
              name="favoriteGenres"
              placeholder={
                genresLoading ? "Loading genres…" : "Choose favorite genres"
              }
              onChange={handleFavoriteGenreChange}
              isDisabled={genresLoading || genreLoadError}
            />
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
            </div>
            <MultiSelect
              isMulti
              options={genreOptions}
              name="hatedGenres"
              placeholder={
                genresLoading ? "Loading genres…" : "Choose hated genres"
              }
              onChange={handleHatedGenreChange}
              isDisabled={genresLoading || genreLoadError}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit">Register</Button>
            <Link to="/registrationDetails">
              <Button type="button">Back</Button>
            </Link>
          </div>
          <div className="mt-6 flex justify-center gap-4 text-gray-500 font-medium">
            <p className="opacity-70">Already have an account?</p>
            <Link to="/loginForm">
              <p className="text-[#7c66f5] hover:underline">Sign in</p>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
