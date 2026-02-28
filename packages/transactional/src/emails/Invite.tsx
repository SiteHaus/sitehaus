import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

export type InviteEmailProps = {
  appName?: string;
  clientName?: string;
  inviterName?: string | null;
  roles?: string[];
  code: string;
  acceptUrl: string;
  expiresAt?: string;
  expiresInMinutes?: number;
};

const InviteEmail = ({
  appName = "Site Haus",
  clientName,
  inviterName,
  roles,
  code,
  acceptUrl,
  expiresAt,
  expiresInMinutes,
}: InviteEmailProps): React.JSX.Element => {
  const roleLabel = roles?.length
    ? roles.length === 1
      ? roles[0]
      : roles.join(", ")
    : "User";

  const expiryText = (() => {
    if (expiresAt) {
      try {
        const d = new Date(expiresAt);
        return `This invite expires on ${d.toLocaleString()}.`;
      } catch {}
    }

    if (typeof expiresInMinutes === "number") {
      return `This invite expires in ${expiresInMinutes} minutes.`;
    }

    return `This invite will expire soon.`;
  })();

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
        <Body className="bg-[#f6f6f6] font-sans">
          <Container className="mx-auto my-10 w-full max-w-[560px] rounded-2xl bg-white p-8 shadow-sm">
            <Heading className="m-0 text-[24px] font-bold text-brand">
              {appName}
            </Heading>
            <Text className="mt-1 text-[13px] text-[#666]">
              {inviterName
                ? `${inviterName} invited you to join${clientName ? ` ${clientName}` : ""} as ${roleLabel}.`
                : `You've been invited to join${clientName ? ` ${clientName}` : ""} as ${roleLabel}.`}
            </Text>

            <Section className="mt-6 text-center">
              <Button
                href={acceptUrl}
                className="rounded-xl bg-brand px-4 py-3 text-[14px] font-medium text-white no-underline"
              >
                Accept Invitation
              </Button>
              <Text className="mt-3 text-[12px] text-[#777]">
                If the button doesn't work, copy and paste this link:
                <br />
                <Link href={acceptUrl} className="break-all text-[12px]">
                  {acceptUrl}
                </Link>
              </Text>
            </Section>

            <Text className="mt-4 text-[12px] text-[#777]">
              {expiryText}
            </Text>

            <Hr className="my-8 border-[#eee]" />

            <Text className="text-[12px] leading-5 text-[#666]">
              If you weren't expecting this invitation, you can safely ignore
              this email.
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

export default InviteEmail;
