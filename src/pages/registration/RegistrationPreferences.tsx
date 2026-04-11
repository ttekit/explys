import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "./RegistrationContext";
import Select from "react-select";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();

  const [genreOptions, setGenreOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/genres`);

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
              placeholder="Choose favorite genres"
              onChange={handleFavoriteGenreChange}
              value={genreOptions.filter((option: any) =>
                formData.favoriteGenres?.includes(option.value),
              )}
            />
            <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
            <Select
              options={genreOptions}
              isMulti
              name="hatedGenres"
              placeholder="Choose hated genres"
              onChange={handleHatedGenreChange}
              value={genreOptions.filter((option: any) =>
                formData.hatedGenres?.includes(option.value),
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