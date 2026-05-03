import Link from "next/link";
import Button from "@/components/Button";

export default function ProfilePage() {
  return (
    <div className="m-4 bg-(--gray-background) rounded-[40px] shadow-[0_20px_20px_rgba(0,0,0,0.1)]">
      <div className="flex flex-row justify-between">
        <div className="m-6 flex flex-row">
          <Link href="/video-page">
            <img
              src="/mainIcon.svg"
              alt="Back to home"
              className="hover:cursor-pointer"
              width={40}
              height={40}
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
            alt=""
            className="w-14 h-14 hover:cursor-pointer"
            width={56}
            height={56}
          />
        </div>
      </div>
      <hr className="mx-3 border border-gray-900/30" />
      <div className="flex flex-row">
        <Button className="my-4 mr-2 ml-4">Edit profile</Button>
        <Button className="my-4 mr-4 ml-2">Subscription</Button>
      </div>
    </div>
  );
}
