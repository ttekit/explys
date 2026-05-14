import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import * as React from "react";

interface PasswordChangedTemplateProps {
  email: string;
}

export function PasswordChangedTemplate({
  email,
}: PasswordChangedTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Ваш пароль успішно змінено 🦎</Preview>
      <Tailwind>
        <Body className="bg-[#09090b] my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#27272a] rounded-[12px] my-[40px] mx-auto p-[40px] max-w-[465px]">
            <Section className="mt-[32px] text-center">
              <Text className="text-[40px] m-0">🦎</Text>
            </Section>

            <Heading className="text-white text-[24px] font-bold text-center p-0 my-[30px] mx-0">
              Пароль змінено
            </Heading>

            <Text className="text-[#a1a1aa] text-[14px] leading-[24px] text-center">
              Вітаємо! Пароль для вашого акаунта <b>{email}</b> був успішно
              оновлений.
            </Text>

            <Section className="bg-[#18181b] border border-solid border-[#27272a] rounded-[8px] p-[20px] my-[32px] text-center">
              <Text className="text-white text-[16px] m-0">
                Якщо це були ви, можете сміливо ігнорувати цей лист.
              </Text>
            </Section>

            <Text className="text-[#71717a] text-[14px] leading-[24px]">
              Якщо ви <b>не змінювали</b> пароль, будь ласка, негайно зверніться
              до нашої служби підтримки або скористайтеся функцією відновлення
              пароля, щоб захистити свій акаунт.
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

export default PasswordChangedTemplate;
