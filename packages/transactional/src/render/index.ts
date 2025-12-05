import { render } from "@react-email/components";
import type { ReactElement } from "react";

export const renderHtml = async (node: ReactElement) => {
  return await render(node, { pretty: true });
};

export const renderText = async (node: ReactElement) => {
  return await render(node, { plainText: true });
};
