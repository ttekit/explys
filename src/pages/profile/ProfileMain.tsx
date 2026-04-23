import { Link } from "react-router";

export default function ProfileMain() {
  return (
    <>
      <div className="m-4 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)]">
        <div className="flex flex-row justify-between">
          <div className="m-6 flex flex-row">
            <Link to="/">
              <img
                src="/mainIcon.svg"
                alt="logo"
                className="hover:cursor-pointer"
              />
            </Link>
            <div className="flex flex-col ml-3 justify-center">
              <p className="text-2xl font-bold text-gray-900">Profile</p>
              <p className="text-gray-500">Hi, user!</p>
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
      </div>
    </>
  );
}
