import OTPCodeEmail, { OTPCodeEmailProps } from "../emails/OTPCode.js";
import { renderHtml, renderText } from "./index.js";

export async function renderOTPCodeEmail(props: OTPCodeEmailProps) {
  const subject = `${props.appName ?? "Site Haus"} verification code: ${props.code}`;
  const node = <OTPCodeEmail {...props} />;
  return { subject, html: renderHtml(node), text: renderText(node) };
}

export type { OTPCodeEmailProps };
