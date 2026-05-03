import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import MultiSelect from "../../components/MultiSelect";
import { registerUser } from "../../lib/registerUser";
import { apiFetch } from "../../lib/api";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const isTeacher = formData.role === "teacher";

  useEffect(() => {
    if (isTeacher) {
      navigate("/registrationDetails", { replace: true });
    }
  }, [isTeacher, navigate]);

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
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
    void fetchGenres();
  }, [isTeacher]);

  const handleFavoriteGenreChange = (selectedOptions: any) => {
    const values = selectedOptions
      ? selectedOptions.map((option: any) => option.value)
      : [];
    updateFormData({ favoriteGenres: values } as any);
  };

  const handleHatedGenreChange = (selectedOptions: any) => {
    const values = selectedOptions
      ? selectedOptions.map((option: any) => option.value)
      : [];
    updateFormData({ hatedGenres: values } as any);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const result = await registerUser(formData);
    if (result.success) {
      navigate("/registrationSuccess", {
        state: { generatedStudents: result.generatedStudents },
      });
    } else {
      alert(`Registration failed: ${result.message}`);
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
          <Link to="/registrationDetails"><Button type="button">Back</Button></Link>
        </div>
      </form>
    </div>
  );
}
