import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@site-haus/ui/components/base/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@site-haus/ui/components/base/tooltip";
import { ExternalLink, HelpCircle } from "lucide-react";

interface ClientReadOnlyFieldProps {
  authForLabel: string;
}

export const ClientReadOnlyField = ({
  authForLabel,
}: ClientReadOnlyFieldProps) => {
  return (
    <InputGroup>
      <InputGroupInput
        className="ml-2 border-l border-r text-center"
        id="auth-for"
        value={authForLabel}
        disabled
        readOnly
      />
      <InputGroupAddon align="inline-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <InputGroupButton
              className="ml-1"
              variant="ghost"
              aria-label="Help"
              size="icon-sm"
            >
              <HelpCircle />
            </InputGroupButton>
          </TooltipTrigger>
          <TooltipContent>
            This app requested you to sign in. We&apos;ll send you back after
            login.
          </TooltipContent>
        </Tooltip>
      </InputGroupAddon>
      <InputGroupAddon align="inline-start">
        <ExternalLink />
      </InputGroupAddon>
    </InputGroup>
  );
};
