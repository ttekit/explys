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

interface ResetPasswordTemplateProps {
  domain: string;
  token: string;
}

export function ResetPasswordTemplate({
  domain,
  token,
}: ResetPasswordTemplateProps) {
  // Исправили ссылку на страницу сброса пароля (обычно это /new-password или /reset-password)
  const resetLink = `${domain}/auth/new-password?token=${token}`;

  return (
    <Html>
      <Head />
      <Preview>Скидання пароля для вашого акаунту 🦎</Preview>
      <Tailwind>
        <Body className="bg-[#09090b] my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#27272a] rounded-[12px] my-[40px] mx-auto p-[40px] max-w-[465px]">
            <Section className="mt-[32px] text-center">
              <Text className="text-[40px] m-0">🦎</Text>
            </Section>
            
            <Heading className="text-white text-[24px] font-bold text-center p-0 my-[30px] mx-0">
              Скидання пароля
            </Heading>
            
            <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
              Привіт!
            </Text>
            
            <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
              Ми отримали запит на скидання пароля для вашого акаунту. Якщо це зробили ви, натисніть кнопку нижче, щоб створити новий пароль:
            </Text>
            
            <Section className="text-center mt-[32px] mb-[32px]">
              <Link
                className="bg-[#7c3aed] rounded-[8px] text-white text-[14px] font-semibold no-underline text-center px-[26px] py-[14px] inline-block"
                href={resetLink}
              >
                Змінити пароль
              </Link>
            </Section>
            
            <Text className="text-[#71717a] text-[12px] leading-[20px]">
              Це посилання дійсне протягом 1 години. Якщо ви не надсилали цей запит, просто ігноруйте цей лист — ваш пароль залишиться незмінним.
            </Text>
            
            <Hr className="border border-solid border-[#27272a] my-[26px] mx-0 w-full" />
            
            <Text className="text-[#52525b] text-[12px] text-center italic">
              З повагою, команда вашої освітньої платформи
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}