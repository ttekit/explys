import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent } from "react";
import { RegistrationContext } from "./RegistrationContext";
import Select from "react-select";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();

  const genreOptions: { value: string; label: string }[] = [
    { value: "action", label: "Action" },
    { value: "comedy", label: "Comedy" },
    { value: "drama", label: "Drama" },
    { value: "thriller", label: "Thriller" },
    { value: "horror", label: "Horror" },

    { value: "sci-fi", label: "Sci-Fi" },
    { value: "fantasy", label: "Fantasy" },
    { value: "adventure", label: "Adventure" },

    { value: "romance", label: "Romance" },
    { value: "family", label: "Family" },
    { value: "animation", label: "Animation" },

    { value: "mystery", label: "Mystery" },
    { value: "crime", label: "Crime" },
    { value: "documentary", label: "Documentary" },
    { value: "biography", label: "Biography" },
    { value: "historical", label: "Historical" },

    { value: "western", label: "Western" },
    { value: "musical", label: "Musical" },
    { value: "noir", label: "Noir" },
  ];

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
        // const data = await response.json();
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
      <div className="min-h-screen flex items-center justify-center">
        <form
          className="w-full max-w-75 mx-auto flex flex-col items-center justify-center rounded-2xl shadow-[0_0_25px_rgba(0,0,0,0.15)] my-5 pb-5"
          onSubmit={handleSubmit}
          tabIndex={0}
        >
          <div className="justify-start my-2">
            <p className="font-bold text-2xl m-0">Create an account</p>
            <div className="flex">
              <p className="font-semibold m-0 pr-1">Account Credentials</p>
              <p>- Page 3</p>
            </div>
          </div>
          <div className="mb-1.5 flex flex-col">
            <LabelRegister isRequired={false}>Favorite genres:</LabelRegister>
            <Select
              options={genreOptions}
              isMulti
              name="favoriteGenres"
              placeholder="Choose favotite genres"
              onChange={handleFavoriteGenreChange}
              value={genreOptions.filter((options: any) =>
                formData.favoriteGenres?.includes(options.value),
              )}
            />
            <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
            <Select
              options={genreOptions}
              isMulti
              name="hatedGenres"
              placeholder="Choose hated genres"
              onChange={handleHatedGenreChange}
              value={genreOptions.filter((options: any) =>
                formData.hatedGenres?.includes(options.value),
              )}
            />
          </div>
          <div>
            <Button type="submit">Register</Button>
            <Link to="/registrationDetails">
              <Button type="button">Back</Button>
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
