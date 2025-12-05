import OTPCodeEmail, { OTPCodeEmailProps } from "../emails/OTPCode.js";
import { renderHtml, renderText } from "./index.js";

export const renderOTPCodeEmail = async (props: OTPCodeEmailProps) => {
  const subject = `${props.appName ?? "Site Haus"} verification code: ${props.code}`;
  const node = <OTPCodeEmail {...props} />;
  const [html, text] = await Promise.all([renderHtml(node), renderText(node)]);
  return { subject, html, text };
};

export type { OTPCodeEmailProps };
