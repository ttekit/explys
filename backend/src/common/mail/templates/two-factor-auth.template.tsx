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

interface TwoFactorAuthTemplateProps {
  token: string;
}

export function TwoFactorAuthTemplate({ token }: TwoFactorAuthTemplateProps) {
  return (
    <Html>
      <Head />
      <Preview>Ваш код двофакторної автентифікації 🦎</Preview>
      <Tailwind>
        <Body className="bg-[#09090b] my-auto mx-auto font-sans">
          <Container className="border border-solid border-[#27272a] rounded-[12px] my-[40px] mx-auto p-[40px] max-w-[465px]">
            <Section className="mt-[32px] text-center">
              <Text className="text-[40px] m-0">🦎</Text>
            </Section>
            
            <Heading className="text-white text-[24px] font-bold text-center p-0 my-[30px] mx-0">
              Вхід у систему
            </Heading>
            
            <Text className="text-[#a1a1aa] text-[14px] leading-[24px] text-center">
              Для підтвердження вашої особи, будь ласка, використайте цей код:
            </Text>
            
            <Section className="bg-[#18181b] border border-solid border-[#27272a] rounded-[8px] p-[20px] my-[32px] text-center">
              <Text className="text-[#7c3aed] text-[32px] font-mono font-bold tracking-[10px] m-0">
                {token}
              </Text>
            </Section>
            
            <Text className="text-[#a1a1aa] text-[14px] leading-[24px]">
              Введіть цей код на сторінці авторизації. Зверніть увагу, що код дійсний лише протягом короткого часу.
            </Text>
            
            <Text className="text-[#71717a] text-[12px] leading-[20px] mt-[24px]">
              Якщо ви не намагалися увійти у свій акаунт, будь ласка, проігноруйте цей лист або зверніться до служби підтримки, якщо вважаєте, що ваш акаунт у небезпеці.
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