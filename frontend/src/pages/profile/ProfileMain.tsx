import { Link } from "react-router";
import Button from "../../components/Button";

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
      <div className="text-foreground m-4 rounded-3xl border border-border bg-card p-4 shadow-xl sm:p-0">
        <div className="flex flex-row justify-between">
          <div className="m-6 flex flex-row">
            <Link to="/catalog">
              <img
                src="/mainIcon.svg"
                alt="Back to home"
                className="hover:cursor-pointer"
              />
            </Link>
            <div className="ml-3 flex flex-col justify-center">
              <p className="font-display text-2xl font-bold">Profile</p>
              <p className="text-muted-foreground">Hi, user</p>
            </div>
          </div>
          <div className="m-6">
            <img
              src="/defaultProfileIcon.svg"
              alt="profileIcon"
              className="h-14 w-14 hover:cursor-pointer"
            />
          </div>
        </div>
        <hr className="border-border mx-3 border" />
        <div className="flex flex-row">
          <Button className="mx-4 my-4 mr-2">Edit profile</Button>
          <Button className="mx-4 my-4 ml-2">Subscription</Button>
        </div>
      </div>
    </>
  );
}
