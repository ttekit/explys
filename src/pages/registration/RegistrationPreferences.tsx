import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "./RegistrationContext";
import MultiSelect from "../../components/MultiSelect";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();

  const [genreOptions, setGenreOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/genres`,
        );

        if (response.ok) {
          const data = await response.json();

          const formattedOptions = data.map((genre: any) => ({
            value: genre.id,
            label: genre.name,
          }));

          setGenreOptions(formattedOptions);
        } else {
          console.error("Failed to fetch genres");
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };

    fetchGenres();
  }, []);

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

    const {
      confirmPassword,
      favoriteGenres,
      hatedGenres,
      hobbies,
      englishLevel,
      education,
      workField,
      ...restData
    } = formData;

    const dataToSend = {
      ...restData,
      englishLevel: englishLevel === "choose" ? undefined : englishLevel,
      education: education === "choose" ? undefined : education,
      workField: workField === "choose" ? undefined : workField,
      hobbies: hobbies,
      favoriteGenres: favoriteGenres,
      hatedGenres: hatedGenres,
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSend),
        },
      );

      if (response.ok) {
        navigate("/loginForm");
      } else {
        const errorData = await response.json();
        console.error(errorData);
      }
    } catch (error) {
      console.error(error);
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
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Favorite genres:</LabelRegister>
            </div>
            <MultiSelect
              options={genreOptions}
              name="favoriteGenres"
              placeholder="Choose favorite genres"
              onChange={handleFavoriteGenreChange}
            />
            <div className="flex flex-row justify-end">
              <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
            </div>
            <MultiSelect
              options={genreOptions}
              name="hatedGenres"
              placeholder="Choose hated genres"
              onChange={handleHatedGenreChange}
            />
          </div>
          <div>
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
