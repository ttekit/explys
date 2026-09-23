import { useAppMessages } from "../hooks/useAppMessages";
import { Link } from "react-router";
import { MoveLeft } from "lucide-react";

export function Error404Page() {
  const h = useAppMessages().errorPage;

  return (
    <>
      <div className="pl-3.75 h-18 fixed w-full font-display backdrop-blur-md flex min-w-0 shrink items-center gap-2 sm:gap-3 border-b border-border">
        <img
          src={`${import.meta.env.BASE_URL}Icon.svg`}
          alt=""
          className="m-1 h-17 w-15 shrink-0 rounded-full p-1"
        />
        <p className="truncate text-2xl font-bold sm:text-3xl md:text-[35px]">
          Explys
        </p>
      </div>
      <div className="min-h-screen w-full  flex flex-col justify-center items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.25_295/0.15)_0%,transparent_50%)] opacity-0 sm:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-1/4 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-1/4 left-0 h-72 w-72 rounded-full bg-accent/10 blur-3xl " />

        <div className="relative flex flex-col justify-center items-center">
          <img src="./SadIcon.svg" className="w-28 h-35 m-8 animate-float" />
          <div className="flex flex-col justify-center items-center font-display">
            <p className="text-[50px] font-bold text-primary">404</p>
            <p className="text-muted-foreground">
              {h.notFound || "Page not found"}
            </p>
            <Link to="/">
              <div className="flex flex-row text-primary items-center hover:cursor-pointer px-1 mt-2 border-b-2 border-transparent hover:border-primary/30 transition-all duration-300 ease-in-out">
                <MoveLeft className="size-4 mr-1" />
                <p className="">{h.returnToMain || "Return to main page"}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
