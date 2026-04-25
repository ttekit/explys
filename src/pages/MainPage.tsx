import Button from "../components/Button";
import { Link } from "react-router";
import Navigation from "./mainpage/Navigation";

export default function MainPage() {
  return (
    <>
      <Navigation />
      <Link to="/registrationMain">
        <Button>Register</Button>
      </Link>
      <Link to="/loginForm">
        <Button>Login</Button>
      </Link>
      <Link to="/contentPage">
        <Button>Content</Button>{" "}
      </Link>
      <Link to="/profileMain">
        <Button>Profile</Button>
      </Link>
    </>
  );
}
