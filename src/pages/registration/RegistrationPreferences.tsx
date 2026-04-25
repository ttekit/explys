import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
import MultiSelect from "../../components/MultiSelect";

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const isTeacher = formData.role === "teacher";

  const [genreOptions, setGenreOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    if (isTeacher) return;

    const fetchGenres = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/genres`,
        );
        if (response.ok) {
          const data = await response.json();
          setGenreOptions(data.map((g: any) => ({ value: g.id, label: g.name })));
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


    const { confirmPassword, ...rawFormData } = formData;

    // Prepare the final payload
    const dataToSend = {
      ...rawFormData,
      // If the user is a teacher, we ensure genres are empty arrays
      favoriteGenres: isTeacher ? [] : (formData.favoriteGenres ?? []),
      hatedGenres: isTeacher ? [] : (formData.hatedGenres ?? []),
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
        }
      );

      if (response.ok) {
        navigate("/loginForm");
      } else {

        const errorData = await response.json();
        console.error("Registration Error Details:", errorData);


        const errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(", ")
          : errorData.message;

        alert(`Registration failed: ${errorMessage || "Internal Server Error"}`);
      }
    } catch (error) {
      console.error("Network or parsing error:", error);
      alert("Network error. Please check if your backend server is running.");
    }
  };

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
          <Select
            options={genreOptions}
            isMulti
            name="favoriteGenres"
            placeholder="Choose genres"
            onChange={handleFavoriteGenreChange}
            // Fix: added null-check with ?? []
            value={genreOptions.filter((option: any) =>
              (formData.favoriteGenres ?? []).includes(option.value),
            )}
            onMenuOpen={() => {}}
            onMenuClose={() => {}}
          />

          <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
          <Select
            options={genreOptions}
            isMulti
            name="hatedGenres"
            placeholder="Choose genres"
            onChange={handleHatedGenreChange}
            // Fix: added null-check with ?? []
            value={genreOptions.filter((option: any) =>
              (formData.hatedGenres ?? []).includes(option.value),
            )}
            onMenuOpen={() => {}}
            onMenuClose={() => {}}
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
