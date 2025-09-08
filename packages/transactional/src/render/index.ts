import { render } from "@react-email/components";
import type { ReactElement } from "react";

export const renderHtml = async (node: ReactElement) => {
  return render(node, { pretty: true });
};

export const renderText = (node: ReactElement) => {
  return render(node, { plainText: true });
};
