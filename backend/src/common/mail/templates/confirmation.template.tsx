import {
  Body,
  Heading,
  Html,
  Text,
  Link,
  Tailwind,
} from "@react-email/components";
import * as React from "react";
interface ConfirmationTemplateProps {
  domain: string;
  token: string;
}

export function ConfirmationTemplate({
  domain,
  token,
}: ConfirmationTemplateProps) {
  const confirmLink = `${domain}/auth/new-verification?token=${token}`;

  return (
    <Tailwind>
      <Html>
        <Body>
          <Heading>Email confirmation</Heading>
          <Text>
            Hi! To confirm your email address, please click the following link:
          </Text>
          <Link href={confirmLink}>Confirm your email</Link>
          <Text>
            This link is valid for 1 hour. If you did not request verification,
            please ignore this message
          </Text>
          <Text>Thanks for using our service!</Text>
        </Body>
      </Html>
    </Tailwind>
  );
}
