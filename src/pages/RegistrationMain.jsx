import InputText from "../components/InputText";
import Button from "../components/Button";
import { Link } from "react-router";

export default function RegistrationPage() {
  return (
    <>
      <form className="flex flex-col items-center justify-center">
        <h3 className="font-bold">Registration</h3>
        <div className="mb-1.5 flex flex-col items-center justify-center">
          <InputText type="text" placeholder="Username" />
          <InputText type="email" placeholder="Email" />
          <InputText type="password" placeholder="Create password" />
          <InputText type="password" placeholder="Confirm password" />
        </div>
        <div>
          <Link to="/registrationDetails">
            <Button>Next</Button>
          </Link>
          <Link to="/">
            <Button>Back</Button>
          </Link>
        </div>
      </form>
    </>
  );
}
