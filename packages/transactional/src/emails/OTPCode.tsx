import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

export type OTPCodeEmailProps = {
  code: string;
  appName?: string;
  supportUrl?: string;
};

const OTPCodeEmail = ({
  code,
  appName = "Site Haus",
  supportUrl,
}: OTPCodeEmailProps): React.JSX.Element => {
  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
        theme: {
          extend: {
            colors: {
              brand: "#2c2c2c",
              brandAccent: "#111111",
            },
          },
        },
      }}
    >
      <Html>
        <Head />
        <Preview>
          Your {appName} verification code: {code}
        </Preview>
        <Body className="bg-[#f6f6f6] font-sans">
          <Container className="mx-auto my-10 w-full max-w-[560px] rounded-2xl bg-white p-8 shadow-sm">
            <Heading className="m-0 text-[24px] font-bold text-brand">{appName}</Heading>
            <Text className="mt-1 text-[13px] text-[#666]">
              Use the one-time code below to continue.
            </Text>

            <Section className="mt-6 rounded-xl border border-[#eee] bg-[#fafafa] p-6 text-center">
              <div className="mx-auto inline-block rounded-lg bg-brand px-6 py-4">
                <code className="text-[26px] font-semibold tracking-[6px] text-white">
                  {code ?? "000000"}
                </code>
              </div>
              <Text className="mt-3 text-[12px] text-[#777]">
                This code expires in 15 minutes. Don't share it with anyone.
              </Text>
            </Section>

            <Section className="mt-6 text-center">
              <Button
                href={supportUrl ?? "https://sitehaus.dev/help"}
                className="rounded-xl bg-brand px-4 py-3 text-[14px] font-medium text-white no-underline"
              >
                Open {appName}
              </Button>
            </Section>

            <Hr className="my-8 border-[#eee]" />

            <Text className="text-[12px] leading-5 text-[#666]">
              If you didn't request this code, you can safely ignore this email.
            </Text>
            <Text className="mt-2 text-[12px] text-[#aaa]">
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </Text>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
};

export default OTPCodeEmail;
