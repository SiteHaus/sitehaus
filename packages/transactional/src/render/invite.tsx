import InviteEmail, { InviteEmailProps } from "../emails/Invite.js";
import { renderHtml, renderText } from "./index.js";

export async function renderInviteRoleEmail(props: InviteEmailProps) {
  const roleLabel = props.roles?.length ? props.roles.join(", ") : "User";
  const subject = `You've been invited to ${props.clientName ?? props.appName ?? "Site Haus"} as ${roleLabel}`;
  const node = <InviteEmail {...props} />;
  const [html, text] = await Promise.all([renderHtml(node), renderText(node)]);
  return { subject, html, text };
}

export type { InviteEmailProps };
