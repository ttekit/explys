import Button from "../../components/Button";
import LabelRegister from "../../components/LabelRegister";
import { Link, useNavigate } from "react-router";
import { useContext, FormEvent, useState, useEffect } from "react";
import { RegistrationContext } from "../../context/RegistrationContext";
<<<<<<< HEAD
import Select from "react-select";
=======
import MultiSelect from "../../components/MultiSelect";
import { registerUser } from "../../lib/registerUser";
import { apiFetch } from "../../lib/api";
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56

export default function RegistrationPreferences() {
  const context = useContext(RegistrationContext);
  if (!context) throw new Error("RegistrationContext is not available");

  const { formData, updateFormData } = context;
  const navigate = useNavigate();
  const isTeacher = formData.role === "teacher";

<<<<<<< HEAD
  const [genreOptions, setGenreOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [showLevelTestModal, setShowLevelTestModal] = useState(false);
=======
  useEffect(() => {
    if (isTeacher) {
      navigate("/registrationDetails", { replace: true });
    }
  }, [isTeacher, navigate]);

  const [genreOptions, setGenreOptions] = useState<
    { value: number; label: string }[]
  >([]);
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56

  useEffect(() => {
    if (isTeacher) return;

    const fetchGenres = async () => {
      try {
<<<<<<< HEAD
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/genres`,
        );
        if (response.ok) {
          const data = await response.json();
          setGenreOptions(data.map((g: any) => ({ value: g.id, label: g.name })));
=======
        const response = await apiFetch("/genres", { method: "GET" });
        if (response.ok) {
          const data = (await response.json()) as { id: number; name: string }[];
          setGenreOptions(
            data.map((g) => ({ value: g.id, label: g.name })),
          );
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
        }
      } catch (error) {
        console.error("Error fetching genres:", error);
      }
    };
<<<<<<< HEAD
    fetchGenres();
  }, []);
=======
    void fetchGenres();
  }, [isTeacher]);
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56

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

<<<<<<< HEAD
    const { confirmPassword, studentNames, teacherGrades, teacherTopics, ...rawFormData } = formData as any;

    const dataToSend: any = {
      ...rawFormData,
      favoriteGenres: isTeacher ? [] : (formData.favoriteGenres ?? []),
      hatedGenres: isTeacher ? [] : (formData.hatedGenres ?? []),
    };

    if (isTeacher) {
      dataToSend.studentNames = studentNames ?? [];
      dataToSend.teacherGrades = teacherGrades;
      dataToSend.teacherTopics = teacherTopics;
    }

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
        if (formData.role === "student" || formData.role === "adult") {
          setShowLevelTestModal(true);
        } else {
          navigate("/loginForm");
        }
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
    <div className="min-h-screen flex items-center justify-center p-2 relative">
=======
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
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
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
<<<<<<< HEAD
          <Select
=======
          <MultiSelect
            inputId="favorite-genres"
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
            options={genreOptions}
            isMulti
            name="favoriteGenres"
            placeholder="Choose genres"
            onChange={handleFavoriteGenreChange}
<<<<<<< HEAD
            value={genreOptions.filter((option: any) =>
              (formData.favoriteGenres ?? []).includes(option.value),
            )}
            onMenuOpen={() => { }}
            onMenuClose={() => { }}
          />

          <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
          <Select
=======
            value={genreOptions.filter((option) =>
              (formData.favoriteGenres ?? []).includes(option.value),
            )}
          />

          <LabelRegister isRequired={false}>Hated genres:</LabelRegister>
          <MultiSelect
            inputId="hated-genres"
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
            options={genreOptions}
            isMulti
            name="hatedGenres"
            placeholder="Choose genres"
            onChange={handleHatedGenreChange}
<<<<<<< HEAD
            value={genreOptions.filter((option: any) =>
              (formData.hatedGenres ?? []).includes(option.value),
            )}
            onMenuOpen={() => { }}
            onMenuClose={() => { }}
=======
            value={genreOptions.filter((option) =>
              (formData.hatedGenres ?? []).includes(option.value),
            )}
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
          />
        </div>

        <div className="mt-4 flex flex-col">
          <Button type="submit">Register</Button>
          <Link to="/registrationDetails"><Button type="button">Back</Button></Link>
        </div>
      </form>
<<<<<<< HEAD

      {showLevelTestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full flex flex-col gap-2 shadow-2xl">
            <div className="w-16 h-16 bg-blue-600/20 text-blue-500 rounded-2xl flex items-center justify-center mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>

            <h2 className="text-2xl font-bold text-white">Determine your level</h2>
            <p className="text-zinc-400 mb-4 leading-relaxed">
              We noticed you are registering as a student or adult. Take a quick placement test so we can recommend the best videos for your current English level.
            </p>

            <div className="flex flex-col gap-3 mt-2">
              <button
                onClick={() => navigate("/level-test")}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors active:scale-95"
              >
                Take the Test
              </button>
              <button
                onClick={() => navigate("/loginForm")}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 transition-colors active:scale-95"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
=======
    </div>
  );
}
>>>>>>> f297073fc2ecff765884d17e75ee35f6207fcf56
