import InviteEmail, { InviteProps } from "../emails/Invite.js";
import { renderHtml, renderText } from "./index.js";

export async function renderInviteRoleEmail(props: InviteProps) {
  const subject = `${props.appName ?? "Site Haus"} role: ${props.role}, code: ${props.code}`;
  const node = <InviteEmail {...props} />;
  return { subject, html: renderHtml(node), text: renderText(node) };
}

export type { InviteProps };
