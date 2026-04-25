import { Link } from "react-router";
import Button from "../../components/Button";
import { useUser } from "../../context/UserContext";

export default function ProfileMain() {
  // const { user, isLoggedIn, isLoading } = useUser();

  // if (isLoading) {
  //   return (
  //     <div className="flex justify-center items-center h-screen text-gray-500">
  //       Loading profile...
  //     </div>
  //   );
  // }

  // if (!isLoggedIn || !user) {
  //   return (
  //     <div className="m-4 p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200">
  //       Please, login into your account.
  //     </div>
  //   );
  // }

  return (
    <>
      <div className="m-4 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)]">
        <div className="flex flex-row justify-between">
          <div className="m-6 flex flex-row">
            <Link to="/video-page">
              <img
                src="/mainIcon.svg"
                alt="Back to home"
                className="hover:cursor-pointer"
              />
            </Link>
            <div className="flex flex-col ml-3 justify-center">
              <p className="text-2xl font-bold text-gray-900">Profile</p>
              <p className="text-gray-500">Hi, user</p>
            </div>
          </div>
          <div className="m-6">
            <img
              src="/defaultProfileIcon.svg"
              alt="profileIcon"
              className="w-14 h-14 hover:cursor-pointer"
            />
          </div>
        </div>
        <hr className="mx-3 border border-gray-900/30" />
        <div className="flex flex-row">
          <Button className="my-4 mr-2 ml-4">Edit profile</Button>
          <Button className="my-4 mr-4 ml-2">Subscription</Button>
        </div>
      </div>
    </>
  );
}
