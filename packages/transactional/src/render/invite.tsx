import InviteEmail, { InviteEmailProps } from "../emails/Invite.js";
import { renderHtml, renderText } from "./index.js";

export async function renderInviteRoleEmail(props: InviteEmailProps) {
  const subject = `${props.appName ?? "Site Haus"} role: ${props.roles}, code: ${props.code}`;
  const node = <InviteEmail {...props} />;
  const [html, text] = await Promise.all([renderHtml(node), renderText(node)]);
  return { subject, html, text };
}

export type { InviteEmailProps };
