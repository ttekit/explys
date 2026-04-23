import Button from "../components/Button";
import { Link } from "react-router";

export default function MainPage() {
  return (
    <>
      <Link to="/registrationMain">
        <Button>Register</Button>
      </Link>
      <Link to="/loginForm">
        <Button>Login</Button>
      </Link>
      <Link to="/profileMain">
        <Button>Profile</Button>
      </Link>
    </>
  );
}
