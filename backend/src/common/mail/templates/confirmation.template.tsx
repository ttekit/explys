import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
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
  const confirmLink = `${domain}/email-confirmation?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>Підтвердіть свою пошту для навчання 🦎</Preview>
      <Tailwind>
        <Body className="bg-[#09090b] my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#27272a] rounded-[12px] my-[40px] mx-auto p-[40px] max-w-[465px]">
            <Section className="mt-[32px] text-center">
              <Text className="text-[40px] m-0">🦎</Text>
            </Section>
            
            <Heading className="text-white text-[24px] font-bold text-center p-0 my-[30px] mx-0">
              Підтвердження пошти
            </Heading>
            
            <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
              Привіт!
            </Text>
            
            <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
              Дякуємо за реєстрацію! Щоб почати свою подорож у вивченні англійської та отримати доступ до платформи, будь ласка, натисніть кнопку нижче:
            </Text>
            
            <Section className="text-center mt-[32px] mb-[32px]">
              <Link
                className="bg-[#7c3aed] rounded-[8px] text-white text-[14px] font-semibold no-underline text-center px-[26px] py-[14px] inline-block"
                href={confirmLink}
              >
                Підтвердити пошту
              </Link>
            </Section>
            
            <Text className="text-[#71717a] text-[12px] leading-[20px]">
              Це посилання дійсне протягом 1 години. Якщо ви не реєструвалися на нашому сайті, просто ігноруйте цей лист.
            </Text>
            
            <Hr className="border border-solid border-[#27272a] my-[26px] mx-0 w-full" />
            
            <Text className="text-[#52525b] text-[12px] text-center italic">
              З повагою, команда вашого сервісу
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}