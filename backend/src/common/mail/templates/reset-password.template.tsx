import {
  Body,
  Heading,
  Html,
  Text,
  Link,
  Tailwind,
} from "@react-email/components";
import * as React from "react";
interface ResetPasswordTemplateProps {
  domain: string;
  token: string;
}

export function ResetPasswordTemplate({
  domain,
  token,
}: ResetPasswordTemplateProps) {
  const confirmLink = `${domain}/auth/new-verification?token=${token}`;

  return (
    <Tailwind>
      <Html>
        <Body>
          <Heading>Reset password</Heading>
          <Text>
            Hello! You requested a password reset. Please follow the link below
            to create a new password:
          </Text>
          <Link href={confirmLink}>Confirm password reset</Link>
          <Text>
            This link is valid for 1 hour. If you did not request a password
            reset, please ignore this message.
          </Text>
        </Body>
      </Html>
    </Tailwind>
  );
}
