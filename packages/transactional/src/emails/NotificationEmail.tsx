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

export type ContextRow = { label: string; value: string };

export type NotificationEmailProps = {
  appName?: string;
  previewText: string;
  title: string;
  body: string;
  context?: ContextRow[];
  ctaText?: string;
  ctaUrl?: string;
};

const NotificationEmail = ({
  appName = "Site Haus",
  previewText,
  title,
  body,
  context,
  ctaText,
  ctaUrl,
}: NotificationEmailProps): React.JSX.Element => (
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
      <Preview>{previewText}</Preview>
      <Body className="bg-[#f6f6f6] font-sans">
        <Container className="mx-auto my-10 w-full max-w-[560px] rounded-2xl bg-white p-8 shadow-sm">
          <Heading className="m-0 text-[24px] font-bold text-brand">
            {appName}
          </Heading>

          <Text className="mt-4 text-[15px] font-semibold text-[#1a1a1a]">
            {title}
          </Text>
          <Text className="mt-1 text-[13px] text-[#555]">{body}</Text>

          {context && context.length > 0 && (
            <Section className="mt-4 rounded-xl border border-[#eee] bg-[#fafafa] p-4">
              {context.map((row) => (
                <Text key={row.label} className="m-0 py-1 text-[13px] text-[#555]">
                  <span className="font-semibold text-[#333]">{row.label}:</span>{" "}
                  {row.value}
                </Text>
              ))}
            </Section>
          )}

          {ctaText && ctaUrl && (
            <Section className="mt-6 text-center">
              <Button
                href={ctaUrl}
                className="rounded-xl bg-brand px-4 py-3 text-[14px] font-medium text-white no-underline"
              >
                {ctaText}
              </Button>
            </Section>
          )}

          <Hr className="my-8 border-[#eee]" />

          <Text className="text-[12px] text-[#aaa]">
            © {new Date().getFullYear()} {appName}. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

export default NotificationEmail;
