import InputText from "../components/InputText";
import Button from "../components/Button";
import LabelRegister from "../components/LabelRegister";
import { Link } from "react-router";

export default function RegistrationDetails() {
  return (
    <>
      <form className="flex flex-col items-center justify-center">
        <h3 className="font-bold">Registration</h3>
        <div className="mb-1.5 flex flex-col items-center justify-center">
          <LabelRegister>Favorite genres:</LabelRegister>
          <InputText type="text" placeholder="Select" />
          <LabelRegister>Hated genres:</LabelRegister>
          <InputText type="text" placeholder="Select" />
        </div>
        <div>
          <Button>Register</Button>
          <Link to="/registrationDetails">
            <Button>Back</Button>
          </Link>
        </div>
      </form>
    </>
  );
}
